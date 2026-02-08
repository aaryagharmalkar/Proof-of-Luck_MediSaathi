"""
Reports API: zero-content strategy.
- Upload: store encrypted file, create embeddings from extracted text, discard text (no full_text/summary stored).
- View: decrypt file, generate summary on-demand, return summary + PDF (don't store).
"""
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uuid
import base64
import fitz
from openai import OpenAI

from app.supabase_client import supabase, get_supabase_client
from app.config import settings
from app.controllers.auth_controller import get_current_user
from app.report_encryption import encrypt_pdf
from app.report_content import get_report_full_text, get_report_raw_bytes

router = APIRouter(prefix="/reports", tags=["Reports"])
logger = logging.getLogger(__name__)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key or "sk-or-v1-missing",
)
EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "google/gemini-2.0-flash-001"


class QueryRequest(BaseModel):
    query: str
    topK: int = 5


def get_embedding(text: str):
    try:
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text,
            dimensions=768,
        )
        return response.data[0].embedding
    except Exception as e:
        logger.warning("Embedding failed: %s", e)
        raise e


def chunk_text(text: str, size: int = 500, overlap: int = 100):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i : i + size]
        chunks.append(" ".join(chunk))
        i += size - overlap
    return chunks


def _generate_summary_llm(full_text: str) -> str:
    """Generate summary from full text (on-demand, not stored)."""
    if not full_text or not (settings.openrouter_api_key or "").strip():
        return "Summary not available."
    try:
        prompt = f"Summarize the following medical text concisely:\n\n{full_text[:10000]}"
        completion = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        return (completion.choices[0].message.content or "").strip() or "Summary not available."
    except Exception as e:
        logger.warning("Summary generation error: %s", e)
        return "Summary generation failed."


# ---------------------------------------------------------------------------
# Upload: encrypt store, embeddings only, discard text
# ---------------------------------------------------------------------------
@router.post("/upload")
async def upload_report(
    file: UploadFile = File(...),
    member_id: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    if member_id:
        member_check = (
            supabase.table("members")
            .select("id")
            .eq("id", member_id)
            .eq("user_id", user.id)
            .execute()
        )
        if not member_check.data:
            raise HTTPException(status_code=404, detail="Member not found")

    content = await file.read()
    report_id = str(uuid.uuid4())

    # Always encrypt: store encrypted file only; no plain PDF or full_text/summary stored
    encrypted = encrypt_pdf(content)
    path = f"{report_id}.enc"
    try:
        supabase.storage.from_("medical_reports").upload(
            path,
            encrypted,
            {"content-type": "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # Extract text (from original content for embeddings)
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        doc.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

    chunks = chunk_text(full_text)
    embeddings_data = []
    for chunk in chunks:
        try:
            embedding = get_embedding(chunk)
            embeddings_data.append({
                "filename": file.filename,
                "content": chunk,
                "embedding": embedding,
                "metadata": {"path": path, "report_id": report_id, "member_id": member_id},
            })
        except Exception as e:
            logger.warning("Embedding error for chunk: %s", e)
            continue

    if embeddings_data:
        try:
            supabase.table("document_chunks").insert(embeddings_data).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save embeddings: {str(e)}")

    # Save metadata only; never store full_text or summary (zero-content)
    report_data = {
        "user_id": user.id,
        "member_id": member_id,
        "report_id": report_id,
        "file_name": file.filename,
        "storage_path": path,
        "storage_encrypted": True,
    }
    try:
        supabase.table("medical_reports").insert(report_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save report metadata: {str(e)}")

    return {
        "filename": file.filename,
        "chunks": len(chunks),
        "message": "Report stored securely. Use view endpoint to generate summary on demand.",
        "storage_path": path,
        "report_id": report_id,
    }


# ---------------------------------------------------------------------------
# List: metadata only (no full_text/summary in response)
# ---------------------------------------------------------------------------
@router.get("/list")
async def list_reports(
    member_id: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    if member_id:
        member_check = (
            supabase.table("members")
            .select("id")
            .eq("id", member_id)
            .eq("user_id", user.id)
            .execute()
        )
        if not member_check.data:
            raise HTTPException(status_code=404, detail="Member not found")

    query = supabase.table("medical_reports").select("*").eq("user_id", user.id)
    if member_id:
        query = query.eq("member_id", member_id)
    else:
        query = query.is_("member_id", "null")
    result = query.order("created_at", desc=True).execute()
    rows = result.data or []
    # Zero-content: don't send full_text/summary to client
    for r in rows:
        r.pop("full_text", None)
        r.pop("summary", None)
    return rows


# ---------------------------------------------------------------------------
# View: decrypt + on-demand summary + PDF (don't store)
# ---------------------------------------------------------------------------
@router.get("/{report_id}/view")
async def view_report(report_id: str, user=Depends(get_current_user)):
    """Decrypt file, generate summary on-demand, return summary and PDF. Nothing is stored."""
    result = (
        supabase.table("medical_reports")
        .select("id, report_id, file_name, storage_path, storage_encrypted, full_text, summary")
        .eq("report_id", report_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    row = result.data

    # Prefer stored summary for legacy reports
    summary = (row.get("summary") or "").strip()
    full_text = get_report_full_text(row)
    if not summary and full_text:
        summary = _generate_summary_llm(full_text)

    if not summary:
        summary = "Summary not available."

    raw_pdf = get_report_raw_bytes(row)
    file_base64 = base64.b64encode(raw_pdf).decode("utf-8") if raw_pdf else None

    return JSONResponse(content={
        "summary": summary,
        "file_base64": file_base64,
        "file_name": row.get("file_name") or "report.pdf",
    })


@router.get("/{report_id}")
async def get_report(report_id: str, user=Depends(get_current_user)):
    """Get report metadata only (no full_text/summary in response)."""
    result = (
        supabase.table("medical_reports")
        .select("*")
        .eq("report_id", report_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    row = dict(result.data)
    row.pop("full_text", None)
    row.pop("summary", None)
    return row


@router.post("/query")
async def query_report(
    req: QueryRequest,
    member_id: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    try:
        query_embedding = get_embedding(req.query)
        response = supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_embedding,
                "match_threshold": 0.4,
                "match_count": req.topK,
            },
        ).execute()
        return {"results": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
