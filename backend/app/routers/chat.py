from fastapi import APIRouter, Header, BackgroundTasks, Body, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import requests
import json
from datetime import datetime

from app.config import settings
from app.supabase_client import supabase
from app.supabase_client import get_supabase_client
from app.controllers.auth_controller import get_current_user
from app.agent import HealthDataAgent, AgentState

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    member_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None
    enable_agent: bool = True

chat_history = [
    {
        "role": "system",
        "content": (
            "You are MediSaathi, a responsible medical AI assistant. "
            "Provide general medical information only. "
            "Do not diagnose or prescribe. "
            "Encourage consulting healthcare professionals. "
            "If the user mentions medications or measurements, acknowledge that the system can automatically save them "
            "and politely ask for missing details (dosage, frequency, start date) instead of asking the user to save manually."
        )
    }
]

# In-memory agent instances per user
_agent_instances: Dict[str, HealthDataAgent] = {}


def get_or_create_agent(user_id: str) -> HealthDataAgent:
    if user_id not in _agent_instances:
        _agent_instances[user_id] = HealthDataAgent(user_id=user_id)
    return _agent_instances[user_id]

def _get_optional_user(authorization: Optional[str]) -> Optional[Any]:
    if not authorization:
        return None
    try:
        token = authorization.split(" ")[1]
        res = supabase.auth.get_user(token)
        if res and res.user:
            return res.user
    except Exception:
        return None
    return None


def _ollama_embed(text: str) -> Optional[List[float]]:
    try:
        r = requests.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.ollama_embed_model, "prompt": text},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("embedding")
    except Exception:
        return None


def _match_documents(user_id: str, member_id: Optional[str], query: str) -> List[Dict[str, Any]]:
    embedding = _ollama_embed(query)
    if not embedding:
        return []
    try:
        payload = {
            "query_embedding": embedding,
            "match_count": 4,
            "user_id": user_id,
            "member_id": member_id,
        }
        res = supabase.rpc("match_patient_documents", payload).execute()
        return res.data or []
    except Exception:
        return []


def _format_patient_context(user: Any, member_id: Optional[str]) -> str:
    if not user:
        return ""

    context_parts: List[str] = []

    if member_id and member_id != "me":
        try:
            member = (
                supabase.table("members")
                .select("*")
                .eq("id", member_id)
                .eq("user_id", user.id)
                .maybe_single()
                .execute()
            )
            if member and member.data:
                context_parts.append(f"Member profile: {member.data}")
        except Exception:
            pass
    else:
        try:
            profile = (
                supabase.table("profiles")
                .select("*")
                .eq("user_id", user.id)
                .maybe_single()
                .execute()
            )
            if profile and profile.data:
                context_parts.append(f"User profile: {profile.data}")
        except Exception:
            pass

    meds_query = supabase.table("medicines").select("*").eq("user_id", user.id)
    if member_id and member_id != "me":
        meds_query = meds_query.eq("member_id", member_id)
    else:
        meds_query = meds_query.is_("member_id", "null")
    meds = meds_query.limit(25).execute()
    if meds.data:
        context_parts.append(f"Medicines: {meds.data}")

    records = (
        supabase.table("health_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    if records.data:
        context_parts.append(f"Recent health records: {records.data}")

    return "\n".join(context_parts)


def _build_prompt(user: Any, member_id: Optional[str], question: str) -> str:
    context = _format_patient_context(user, member_id)
    docs = []
    if user:
        docs = _match_documents(user.id, member_id if member_id != "me" else None, question)
    doc_snippets = []
    for d in docs:
        content = d.get("content") or d.get("chunk") or ""
        if content:
            doc_snippets.append(content)

    doc_block = "\n".join(doc_snippets[:4])

    prompt_parts = [
        "You are MediSaathi, a responsible medical AI assistant.",
        "Provide general medical information only.",
        "Do not diagnose or prescribe.",
        "Encourage consulting healthcare professionals.",
    ]

    if context:
        prompt_parts.append(f"\nPatient context:\n{context}")
    if doc_block:
        prompt_parts.append(f"\nRetrieved documents:\n{doc_block}")

    prompt_parts.append(f"\nUser question: {question}\nAnswer:")
    return "\n".join(prompt_parts)


@router.post("/chat")
def chat(
    req: ChatRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    user = _get_optional_user(authorization)
    chat_history.append({
        "role": "user",
        "content": req.message
    })

    response_holder: Dict[str, str] = {"text": ""}

    def stream():
        full_response: List[str] = []
        try:
            # Auto-select model if configured model isn't available locally
            model = settings.ollama_chat_model
            try:
                res = requests.get(f"{settings.ollama_base_url}/api/tags", timeout=2)
                if res.status_code == 200:
                    models = [m["name"] for m in res.json().get("models", [])]
                    if not any(model in m for m in models):
                        if any("mistral" in m for m in models):
                            model = "mistral"
                        elif any("llava" in m for m in models):
                            model = "llava"
            except Exception:
                pass

            prompt = _build_prompt(user, req.member_id, req.message)

            with requests.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": True
                },
                stream=True,
                timeout=120
            ) as r:
                r.raise_for_status()
                for line in r.iter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line.decode("utf-8"))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        continue
                    if "error" in data:
                        err_msg = data.get("error", "Unknown error")
                        full_response.append(err_msg)
                        yield f"\n[Error from model: {err_msg}]\n"
                        break
                    if "response" in data:
                        chunk = data["response"]
                        full_response.append(chunk)
                        yield chunk
                    if data.get("done"):
                        break
        except requests.exceptions.ConnectError:
            msg = "Cannot reach the AI model (Ollama). Is Ollama running?"
            full_response.append(msg)
            yield msg
        except requests.exceptions.Timeout:
            msg = "The AI model took too long to respond. Please try again."
            full_response.append(msg)
            yield msg
        except requests.exceptions.RequestException as e:
            msg = f"AI service error: {str(e)[:200]}"
            full_response.append(msg)
            yield msg
        except Exception as e:
            msg = f"Something went wrong: {str(e)[:200]}"
            full_response.append(msg)
            yield msg
        finally:
            response_holder["text"] = "".join(full_response)

    response = StreamingResponse(stream(), media_type="text/plain")

    # Trigger agent after streaming completes
    if req.enable_agent and user and background_tasks is not None:
        background_tasks.add_task(
            run_agent_autonomously,
            user_id=user.id,
            user_message=req.message,
            assistant_response_holder=response_holder,
            member_id=req.member_id,
            conversation_history=req.conversation_history or [],
        )
        response.background = background_tasks

    return response


@router.post("/chat/stream")
def chat_stream(
    req: ChatRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    return chat(req, background_tasks, authorization)


def _store_pending_clarifications(
    *,
    user_id: str,
    member_id: Optional[str],
    clarifications: List[Dict[str, Any]],
) -> None:
    if not clarifications:
        return
    supabase_sr = get_supabase_client(use_service_role=True)
    try:
        existing = (
            supabase_sr.table("agent_clarifications")
            .select("question, context")
            .eq("user_id", user_id)
            .eq("status", "pending")
            .execute()
        )
        existing_keys = {(c.get("question"), c.get("context")) for c in (existing.data or [])}
    except Exception:
        existing_keys = set()

    rows = []
    for clarification in clarifications:
        key = (clarification.get("question"), clarification.get("context"))
        if key in existing_keys:
            continue
        rows.append(
            {
                "user_id": user_id,
                "member_id": member_id,
                "question": clarification.get("question"),
                "context": clarification.get("context"),
                "status": clarification.get("status", "pending"),
                "priority": clarification.get("priority", 2),
                "related_item_type": clarification.get("related_item_type"),
                "related_item_data": clarification.get("related_item_data"),
                "created_at": datetime.utcnow().isoformat(),
            }
        )

    if rows:
        try:
            supabase_sr.table("agent_clarifications").insert(rows).execute()
        except Exception:
            pass


def run_agent_autonomously(
    *,
    user_id: str,
    user_message: str,
    assistant_response_holder: Dict[str, str],
    member_id: Optional[str],
    conversation_history: List[Dict[str, Any]],
) -> None:
    try:
        agent = get_or_create_agent(user_id)
        result = agent.process_conversation_turn(
            user_message=user_message,
            assistant_response=assistant_response_holder.get("text", ""),
            member_id=member_id,
            conversation_history=conversation_history,
        )
        if result.get("success") and result.get("clarifications_needed"):
            _store_pending_clarifications(
                user_id=user_id,
                member_id=member_id,
                clarifications=result.get("clarifications_needed", []),
            )
    except Exception:
        return


@router.get("/chat/agent-status")
async def get_agent_status(user=Depends(get_current_user)):
    agent = get_or_create_agent(user.id)
    return {
        "agent_active": agent.current_state not in (AgentState.IDLE, AgentState.COMPLETED),
        "current_state": agent.current_state.value,
        "current_iteration": agent.current_iteration,
        "max_iterations": agent.max_iterations,
        "pending_clarifications": agent.pending_clarifications,
        "extracted_data_summary": {
            category: len(items) for category, items in agent.extracted_data.items()
        },
        "last_action": agent.execution_trace[-1] if agent.execution_trace else None,
        "last_saved": agent.last_saved,
    }


@router.get("/chat/pending-clarifications")
async def get_pending_clarifications(user=Depends(get_current_user)):
    supabase_sr = get_supabase_client(use_service_role=True)
    response = (
        supabase_sr.table("agent_clarifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("priority", desc=False)
        .order("created_at", desc=True)
        .execute()
    )
    return {"clarifications": response.data or [], "count": len(response.data or [])}


@router.post("/chat/answer-clarification/{clarification_id}")
async def answer_clarification(
    clarification_id: str,
    payload: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
):
    answer = payload.get("answer")
    dismiss = payload.get("dismiss", False)
    supabase_sr = get_supabase_client(use_service_role=True)
    update = {
        "status": "dismissed" if dismiss else "answered",
        "answer": answer,
        "answered_at": datetime.utcnow().isoformat(),
    }
    supabase_sr.table("agent_clarifications") \
        .update(update) \
        .eq("id", clarification_id) \
        .eq("user_id", user.id) \
        .execute()
    return {"message": "Clarification updated", "clarification_id": clarification_id}


@router.get("/chat/agent-log")
async def get_agent_execution_log(
    limit: int = 50,
    session_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    supabase_sr = get_supabase_client(use_service_role=True)
    try:
        query = supabase_sr.table("agent_execution_logs").select("*").eq("user_id", user.id)
        if session_id:
            query = query.eq("session_id", session_id)
        response = query.order("created_at", desc=True).limit(limit).execute()
        data = response.data or []
        if data:
            return {"log_entries": data, "total_entries": len(data)}
    except Exception:
        pass

    # Fallback to in-memory trace if DB logging isn't available yet
    agent = get_or_create_agent(user.id)
    fallback = [
        {
            "id": f"inmem-{idx}",
            "created_at": datetime.utcnow().isoformat(),
            "iteration": entry.get("iteration"),
            "agent_state": entry.get("state"),
            "action": entry.get("action"),
            "observation": entry.get("observation"),
        }
        for idx, entry in enumerate(agent.execution_trace[-limit:])
    ]
    return {"log_entries": fallback, "total_entries": len(fallback)}


@router.post("/chat/reset-agent")
async def reset_agent(user=Depends(get_current_user)):
    if user.id in _agent_instances:
        _agent_instances[user.id].reset(full_reset=True)
    supabase_sr = get_supabase_client(use_service_role=True)
    supabase_sr.table("agent_clarifications") \
        .update({"status": "dismissed"}) \
        .eq("user_id", user.id) \
        .eq("status", "pending") \
        .execute()
    return {"message": "Agent reset successfully", "user_id": user.id}
