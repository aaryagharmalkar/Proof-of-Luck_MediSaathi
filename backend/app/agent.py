import json
import re
import threading
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

import requests

from app.config import settings
from app.supabase_client import get_supabase_client


class AgentState(Enum):
    IDLE = "IDLE"
    THINKING = "THINKING"
    ACTING = "ACTING"
    REFLECTING = "REFLECTING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


@dataclass
class AgentDecision:
    reasoning: str
    has_health_data: bool
    confidence_score: float
    action: str
    action_input: Dict[str, Any]
    why_this_action: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    # Try direct load
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    # Extract first JSON object
    try:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
    except Exception:
        return None
    return None


def _to_date_str(value: Optional[str]) -> str:
    if not value:
        return datetime.now().strftime("%Y-%m-%d")
    if "T" in value:
        return value.split("T")[0]
    return value


def _parse_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except Exception:
        return None


def _parse_bp(value: Any) -> Tuple[Optional[float], Optional[float]]:
    if value is None:
        return None, None
    if isinstance(value, (int, float)):
        return float(value), None
    s = str(value)
    match = re.search(r"(\d{2,3})\s*/\s*(\d{2,3})", s)
    if match:
        return float(match.group(1)), float(match.group(2))
    match = re.search(r"(\d{2,3})", s)
    if match:
        return float(match.group(1)), None
    return None, None


def _is_uuid(value: Optional[str]) -> bool:
    if not value or not isinstance(value, str):
        return False
    return bool(re.match(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$", value))


def _split_symptoms(text: str) -> List[str]:
    if not text:
        return []
    parts = re.split(r",| and | & |;", text)
    return [p.strip() for p in parts if p.strip()]


def _source_has_number(text: Optional[str]) -> bool:
    if not text:
        return False
    return bool(re.search(r"\d", text))


def _normalize_frequency(freq: Optional[str]) -> str:
    if not freq:
        return "Daily"
    lower = freq.lower()
    if "alternate" in lower or "every other" in lower:
        return "Alternate Days"
    if "once" in lower or "daily" in lower or "every day" in lower:
        return "Daily"
    return freq


class HealthDataAgent:
    def __init__(
        self,
        *,
        user_id: str,
        max_iterations: int = 10,
        confidence_threshold: float = 0.5,
    ) -> None:
        self.user_id = user_id
        self.max_iterations = max_iterations
        self.confidence_threshold = confidence_threshold
        self.min_save_confidence = 0.5
        self.auto_save_confidence = 0.7
        self.current_state = AgentState.IDLE
        self.current_iteration = 0
        self.conversation_turns = deque(maxlen=10)
        self.extracted_data: Dict[str, List[Dict[str, Any]]] = {
            "health_records": [],
            "medicines": [],
            "appointments": [],
            "symptoms": [],
        }
        self.pending_clarifications: List[Dict[str, Any]] = []
        self.execution_trace: List[Dict[str, Any]] = []
        self.action_history: List[str] = []
        self.observations: List[str] = []
        self.last_saved: Dict[str, Any] = {"count": 0, "items": [], "timestamp": None}
        self._lock = threading.Lock()
        self._supabase = get_supabase_client(use_service_role=True)

    # ----------------------------
    # Public API
    # ----------------------------
    def process_conversation_turn(
        self,
        *,
        user_message: str,
        assistant_response: str,
        member_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        with self._lock:
            if member_id in ("", "me", "null") or not _is_uuid(member_id):
                member_id = None
            self.current_iteration = 0
            self.current_state = AgentState.THINKING
            session_id = str(uuid4())

            if conversation_history:
                self.conversation_turns.clear()
                for turn in conversation_history[-10:]:
                    role = turn.get("role", "user")
                    content = turn.get("content", "")
                    self.conversation_turns.append({"role": role, "content": content})
                # Ensure the latest user message is present
                if user_message and (not self.conversation_turns or self.conversation_turns[-1].get("content") != user_message):
                    self.conversation_turns.append({"role": "user", "content": user_message})
            else:
                self.conversation_turns.append({"role": "user", "content": user_message})
                if assistant_response:
                    self.conversation_turns.append({"role": "assistant", "content": assistant_response})

            saved_count = 0
            try:
                while self.current_iteration < self.max_iterations:
                    self.current_iteration += 1
                    self.current_state = AgentState.THINKING
                    decision = self._think()
                    if decision.action == "finish":
                        break

                    self.current_state = AgentState.ACTING
                    observation, delta_saved = self._execute_action(
                        decision.action,
                        decision.action_input or {},
                        member_id,
                    )
                    saved_count += delta_saved

                    self.current_state = AgentState.REFLECTING
                    self._reflect(decision, observation, session_id)

                    if decision.action == "ask_clarification" and self.pending_clarifications:
                        break

                self.current_state = AgentState.COMPLETED
                extracted_snapshot = json.loads(json.dumps(self.extracted_data))
                if not self.pending_clarifications:
                    self.extracted_data = {
                        "health_records": [],
                        "medicines": [],
                        "appointments": [],
                        "symptoms": [],
                    }
                return {
                    "success": True,
                    "extracted_data": extracted_snapshot,
                    "saved_items": saved_count,
                    "clarifications_needed": self.pending_clarifications,
                    "trace": self.execution_trace,
                }
            except Exception as exc:
                self.current_state = AgentState.ERROR
                self._log_execution(
                    session_id=session_id,
                    iteration=self.current_iteration,
                    state=self.current_state.value,
                    action="error",
                    action_input={},
                    observation=str(exc),
                    success=False,
                    reasoning="Agent failed during processing.",
                    confidence_score=0.0,
                )
                return {
                    "success": False,
                    "error": str(exc),
                    "extracted_data": self.extracted_data,
                    "saved_items": saved_count,
                    "clarifications_needed": self.pending_clarifications,
                    "trace": self.execution_trace,
                }

    def reset(self, *, full_reset: bool = False) -> None:
        self.extracted_data = {
            "health_records": [],
            "medicines": [],
            "appointments": [],
            "symptoms": [],
        }
        self.pending_clarifications = []
        self.execution_trace = []
        self.action_history = []
        self.observations = []
        if full_reset:
            self.conversation_turns.clear()
        self.current_state = AgentState.IDLE
        self.current_iteration = 0
        self.last_saved = {"count": 0, "items": [], "timestamp": None}

    # ----------------------------
    # Core loop
    # ----------------------------
    def _think(self) -> AgentDecision:
        prompt = self._build_reasoning_prompt()
        response = self._call_llm(prompt, system_prompt="You are an autonomous health data agent.")
        data = _safe_json_from_text(response) if response else None

        if not data or "action" not in data:
            return self._fallback_decision()

        decision = AgentDecision(
            reasoning=data.get("reasoning", ""),
            has_health_data=bool(data.get("has_health_data", False)),
            confidence_score=float(data.get("confidence_score", 0.0)),
            action=str(data.get("action", "finish")),
            action_input=data.get("action_input", {}) or {},
            why_this_action=data.get("why_this_action", ""),
        )
        return self._guard_decision(decision)

    def _execute_action(
        self,
        action: str,
        action_input: Dict[str, Any],
        member_id: Optional[str],
    ) -> Tuple[str, int]:
        if action == "extract_data":
            return self._tool_extract_data(action_input), 0
        if action == "validate_data":
            return self._tool_validate_data(), 0
        if action == "check_duplicates":
            return self._tool_check_duplicates(member_id), 0
        if action == "save_to_database":
            return self._tool_save_to_database(member_id), self.last_saved.get("count", 0)
        if action == "ask_clarification":
            return self._tool_ask_clarification(), 0
        if action == "search_knowledge":
            return self._tool_search_knowledge(action_input), 0
        if action == "calculate_metrics":
            return self._tool_calculate_metrics(), 0
        if action == "get_user_history":
            return self._tool_get_user_history(member_id), 0
        return "No-op action", 0

    def _reflect(self, decision: AgentDecision, observation: str, session_id: str) -> None:
        self.action_history.append(decision.action)
        self.observations.append(observation)
        self.execution_trace.append(
            {
                "iteration": self.current_iteration,
                "state": self.current_state.value,
                "action": decision.action,
                "observation": observation,
            }
        )
        self._log_execution(
            session_id=session_id,
            iteration=self.current_iteration,
            state=self.current_state.value,
            action=decision.action,
            action_input=decision.action_input,
            observation=observation,
            success=True,
            reasoning=decision.reasoning,
            confidence_score=decision.confidence_score,
        )

    def _get_last_user_message(self) -> str:
        for turn in reversed(self.conversation_turns):
            if turn.get("role") == "user":
                return str(turn.get("content", ""))
        return ""

    def _heuristic_symptom_extract(self, text: str) -> List[str]:
        if not text:
            return []
        lowered = text.lower()
        # Try to capture symptoms after common phrases
        patterns = [
            r"(?:i have|i am having|i'm having|i've been having|suffering from|symptoms?:)\\s*(.+)",
            r"(?:feeling|feel)\\s*(.+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, lowered)
            if match:
                segment = match.group(1)
                segment = re.split(r"\\s+since\\s+|\\s+for\\s+", segment)[0]
                return _split_symptoms(segment)

        # Simple keyword fallback
        common = [
            "fever",
            "cold",
            "cough",
            "headache",
            "nausea",
            "vomiting",
            "fatigue",
            "sore throat",
            "body ache",
            "diarrhea",
            "stomach pain",
            "chills",
            "dizziness",
        ]
        found = [symptom for symptom in common if symptom in lowered]
        return found

    def _guard_decision(self, decision: AgentDecision) -> AgentDecision:
        has_items = any(len(v) > 0 for v in self.extracted_data.values())
        recent = self.action_history[-2:]
        needs_validation = any(
            not item.get("_status", {}).get("validated", False)
            for items in self.extracted_data.values()
            for item in items
        )
        needs_duplicates = any(
            item.get("_status", {}).get("validated", False)
            and not item.get("_status", {}).get("duplicate_checked", False)
            for items in self.extracted_data.values()
            for item in items
        )
        has_pending_clarifications = any(
            item.get("_status", {}).get("needs_clarification", False)
            for items in self.extracted_data.values()
            for item in items
        )

        # If we just extracted, move forward (or finish if nothing found)
        if self.action_history and self.action_history[-1] == "extract_data":
            if has_items:
                return AgentDecision(
                    reasoning="Extraction complete; moving to validation.",
                    has_health_data=True,
                    confidence_score=decision.confidence_score,
                    action="validate_data",
                    action_input={},
                    why_this_action="Validate extracted data before saving.",
                )
            return AgentDecision(
                reasoning="Extraction found no data; finishing to avoid loops.",
                has_health_data=False,
                confidence_score=decision.confidence_score,
                action="finish",
                action_input={},
                why_this_action="No extractable data found.",
            )

        # Avoid infinite extract loops once we already have data
        if decision.action == "extract_data" and has_items and recent == ["extract_data", "extract_data"]:
            return AgentDecision(
                reasoning="Already extracted data twice; moving to validation.",
                has_health_data=True,
                confidence_score=decision.confidence_score,
                action="validate_data",
                action_input={},
                why_this_action="Prevent repeated extraction without progress.",
            )

        # If agent asks for clarification but nothing flagged, move forward
        if decision.action == "ask_clarification" and not has_pending_clarifications:
            next_action = "validate_data" if needs_validation else "check_duplicates" if needs_duplicates else "save_to_database"
            return AgentDecision(
                reasoning="No clarification flags; advancing to next step.",
                has_health_data=True,
                confidence_score=decision.confidence_score,
                action=next_action,
                action_input={},
                why_this_action="No clarifications needed.",
            )

        if has_pending_clarifications:
            return AgentDecision(
                reasoning="Missing data detected; requesting clarification.",
                has_health_data=True,
                confidence_score=decision.confidence_score,
                action="ask_clarification",
                action_input={},
                why_this_action="Need user clarification before saving.",
            )

        # Enforce pipeline if data exists
        if has_items:
            if needs_validation:
                return AgentDecision(
                    reasoning="Data extracted; must validate before saving.",
                    has_health_data=True,
                    confidence_score=decision.confidence_score,
                    action="validate_data",
                    action_input={},
                    why_this_action="Validation step required.",
                )
            if needs_duplicates:
                return AgentDecision(
                    reasoning="Validation done; check duplicates before saving.",
                    has_health_data=True,
                    confidence_score=decision.confidence_score,
                    action="check_duplicates",
                    action_input={},
                    why_this_action="Duplicate check required.",
                )
            if any(self._should_save_item(item) for items in self.extracted_data.values() for item in items):
                return AgentDecision(
                    reasoning="Ready to save validated items.",
                    has_health_data=True,
                    confidence_score=decision.confidence_score,
                    action="save_to_database",
                    action_input={},
                    why_this_action="Save extracted data to database.",
                )

        return decision

    # ----------------------------
    # Tools
    # ----------------------------
    def _tool_extract_data(self, action_input: Dict[str, Any]) -> str:
        prompt = self._build_extraction_prompt()
        response = self._call_llm(prompt, system_prompt="You extract structured health data.")
        data = _safe_json_from_text(response) if response else None
        if not data:
            self.extracted_data = {
                "health_records": [],
                "medicines": [],
                "appointments": [],
                "symptoms": [],
            }
            return "Extraction failed: invalid JSON."

        # Reset extracted data to avoid accumulation across turns
        self.extracted_data = {
            "health_records": [],
            "medicines": [],
            "appointments": [],
            "symptoms": [],
        }

        for key in ["health_records", "medicines", "appointments", "symptoms"]:
            items = data.get(key, []) or []
            if not isinstance(items, list):
                continue
            for item in items:
                item["_status"] = {
                    "validated": False,
                    "duplicate_checked": False,
                    "duplicate": False,
                    "saved": False,
                    "needs_clarification": False,
                    "issues": [],
                }
                if "confidence" not in item and "confidence_score" in item:
                    item["confidence"] = item.get("confidence_score")
                self.extracted_data[key].append(item)

        # Intent hints from decision
        hinted_name = (
            action_input.get("medicine")
            or action_input.get("medication")
            or action_input.get("name")
        )
        hinted_symptoms_raw = action_input.get("symptoms") or action_input.get("symptom")
        if hinted_symptoms_raw is None and action_input.get("key") == "symptoms":
            hinted_symptoms_raw = action_input.get("value")
        hinted_symptoms: List[str] = []
        if isinstance(hinted_symptoms_raw, list):
            hinted_symptoms = [str(s).strip() for s in hinted_symptoms_raw if str(s).strip()]
        elif isinstance(hinted_symptoms_raw, str) and hinted_symptoms_raw.strip():
            hinted_symptoms = [hinted_symptoms_raw.strip()]

        # Fallback: if extraction returned nothing but LLM suggested a medicine name
        if (
            not self.extracted_data["health_records"]
            and not self.extracted_data["medicines"]
            and not self.extracted_data["appointments"]
            and not self.extracted_data["symptoms"]
        ):
            if hinted_name:
                self.extracted_data["medicines"].append(
                    {
                        "name": hinted_name,
                        "dosage": None,
                        "frequency": None,
                        "duration": None,
                        "instructions": None,
                        "start_date": None,
                        "confidence": 0.7,
                        "source_text": f"User mentioned {hinted_name}.",
                        "_status": {
                            "validated": False,
                            "duplicate_checked": False,
                            "duplicate": False,
                            "saved": False,
                            "needs_clarification": False,
                            "issues": [],
                        },
                    }
                )
        # If LLM suggested a medicine name, keep only matching medicines
        if hinted_name:
            hint = str(hinted_name).strip().lower()
            self.extracted_data["medicines"] = [
                m for m in self.extracted_data["medicines"]
                if str(m.get("name", "")).strip().lower() == hint
            ]

        # If LLM hinted symptoms, ensure we capture them
        if hinted_symptoms:
            if not self.extracted_data["symptoms"]:
                for symptom in hinted_symptoms:
                    self.extracted_data["symptoms"].append(
                        {
                            "symptom": symptom,
                            "severity": None,
                            "duration": None,
                            "notes": None,
                            "started_at": None,
                            "confidence": 0.7,
                            "source_text": f"User mentioned {symptom}.",
                            "_status": {
                                "validated": False,
                                "duplicate_checked": False,
                                "duplicate": False,
                                "saved": False,
                                "needs_clarification": False,
                                "issues": [],
                            },
                        }
                    )
            else:
                # Keep only symptoms explicitly hinted
                hints_lower = {s.lower() for s in hinted_symptoms}
                self.extracted_data["symptoms"] = [
                    s for s in self.extracted_data["symptoms"]
                    if str(s.get("symptom", "")).strip().lower() in hints_lower
                ]

            # If intent is symptoms and no explicit medicine hint, drop hallucinated medicines
            if not hinted_name:
                self.extracted_data["medicines"] = []
        # If symptoms are still empty, try heuristic extraction from the last user message
        if not self.extracted_data["symptoms"]:
            last_user = self._get_last_user_message()
            guessed = self._heuristic_symptom_extract(last_user)
            if guessed:
                for symptom in guessed:
                    self.extracted_data["symptoms"].append(
                        {
                            "symptom": symptom,
                            "severity": None,
                            "duration": None,
                            "notes": None,
                            "started_at": None,
                            "confidence": 0.6,
                            "source_text": last_user,
                            "_status": {
                                "validated": False,
                                "duplicate_checked": False,
                                "duplicate": False,
                                "saved": False,
                                "needs_clarification": False,
                                "issues": [],
                            },
                        }
                    )
            elif action_input.get("field") == "symptoms":
                # Seed placeholder to trigger clarification if symptoms were intended
                self.extracted_data["symptoms"] = [
                    {
                        "symptom": None,
                        "severity": None,
                        "duration": None,
                        "notes": None,
                        "started_at": None,
                        "confidence": 0.3,
                        "source_text": last_user,
                        "_status": {
                            "validated": False,
                            "duplicate_checked": False,
                            "duplicate": False,
                            "saved": False,
                            "needs_clarification": False,
                            "issues": [],
                        },
                    }
                ]

        return (
            f"Extracted {len(self.extracted_data['health_records'])} health records, "
            f"{len(self.extracted_data['medicines'])} medicines, "
            f"{len(self.extracted_data['appointments'])} appointments, "
            f"{len(self.extracted_data['symptoms'])} symptoms."
        )

    def _tool_validate_data(self) -> str:
        total_issues = 0

        for record in self.extracted_data["health_records"]:
            issues = self._validate_health_record(record)
            record["_status"]["issues"] = issues
            record["_status"]["validated"] = len(issues) == 0
            if issues:
                record["_status"]["needs_clarification"] = True
                total_issues += len(issues)
            if float(record.get("confidence", 0.5) or 0.5) < self.min_save_confidence:
                record["_status"]["needs_clarification"] = True
                total_issues += 1

        for medicine in self.extracted_data["medicines"]:
            issues = self._validate_medicine(medicine)
            medicine["_status"]["issues"] = issues
            medicine["_status"]["validated"] = len(issues) == 0
            if issues:
                medicine["_status"]["needs_clarification"] = True
                total_issues += len(issues)
            if float(medicine.get("confidence", 0.5) or 0.5) < self.min_save_confidence:
                medicine["_status"]["needs_clarification"] = True
                total_issues += 1

        for appointment in self.extracted_data["appointments"]:
            issues = self._validate_appointment(appointment)
            appointment["_status"]["issues"] = issues
            appointment["_status"]["validated"] = len(issues) == 0
            if issues:
                appointment["_status"]["needs_clarification"] = True
                total_issues += len(issues)
            if float(appointment.get("confidence", 0.5) or 0.5) < self.min_save_confidence:
                appointment["_status"]["needs_clarification"] = True
                total_issues += 1

        for symptom in self.extracted_data["symptoms"]:
            issues = self._validate_symptom(symptom)
            symptom["_status"]["issues"] = issues
            symptom["_status"]["validated"] = len(issues) == 0
            if issues:
                symptom["_status"]["needs_clarification"] = True
                total_issues += len(issues)
            if float(symptom.get("confidence", 0.5) or 0.5) < self.min_save_confidence:
                symptom["_status"]["needs_clarification"] = True
                total_issues += 1

        return "Validation complete. Issues found: " + str(total_issues)

    def _tool_check_duplicates(self, member_id: Optional[str]) -> str:
        duplicates = 0

        for record in self.extracted_data["health_records"]:
            if record["_status"]["duplicate_checked"]:
                continue
            metric = record.get("type") or record.get("metric")
            date = _to_date_str(record.get("recorded_at"))
            query = self._supabase.table("health_records").select("id").eq("user_id", self.user_id).eq("metric", metric).eq("date", date)
            res = self._safe_execute(query, allow_retry_without_member=True, member_id=member_id)
            if res and res.data:
                record["_status"]["duplicate"] = True
                duplicates += 1
            record["_status"]["duplicate_checked"] = True

        for medicine in self.extracted_data["medicines"]:
            if medicine["_status"]["duplicate_checked"]:
                continue
            name = medicine.get("name")
            if name:
                query = (
                    self._supabase.table("medicines")
                    .select("id")
                    .eq("user_id", self.user_id)
                    .ilike("name", f"%{name}%")
                    .eq("is_active", True)
                )
                res = self._safe_execute(query, allow_retry_without_member=True, member_id=member_id)
                if res and res.data:
                    medicine["_status"]["duplicate"] = True
                    duplicates += 1
            medicine["_status"]["duplicate_checked"] = True

        for appointment in self.extracted_data["appointments"]:
            if appointment["_status"]["duplicate_checked"]:
                continue
            date = appointment.get("date")
            time_slot = appointment.get("time")
            query = (
                self._supabase.table("appointments")
                .select("id")
                .eq("patient_id", self.user_id)
                .eq("date", date or "")
                .eq("time_slot", time_slot or "")
            )
            res = self._safe_execute(query, allow_retry_without_member=False, member_id=member_id)
            if res and res.data:
                appointment["_status"]["duplicate"] = True
                duplicates += 1
            appointment["_status"]["duplicate_checked"] = True

        for symptom in self.extracted_data["symptoms"]:
            if symptom["_status"]["duplicate_checked"]:
                continue
            symptom_name = symptom.get("symptom")
            if symptom_name:
                date = _to_date_str(symptom.get("started_at"))
                query = (
                    self._supabase.table("health_records")
                    .select("id")
                    .eq("user_id", self.user_id)
                    .eq("metric", "symptom")
                    .eq("date", date)
                    .ilike("notes", f"%{symptom_name}%")
                )
                res = self._safe_execute(query, allow_retry_without_member=True, member_id=member_id)
                if res and res.data:
                    symptom["_status"]["duplicate"] = True
                    duplicates += 1
            symptom["_status"]["duplicate_checked"] = True

        return f"Duplicate check complete. Duplicates found: {duplicates}"

    def _tool_save_to_database(self, member_id: Optional[str]) -> str:
        saved_items: List[Dict[str, Any]] = []
        failed_items: List[str] = []

        for record in self.extracted_data["health_records"]:
            if not self._should_save_item(record):
                continue
            saved = self._save_health_record(record, member_id)
            if saved:
                record["_status"]["saved"] = True
                saved_items.append(saved)
            else:
                failed_items.append(f"health_record:{record.get('type')}")

        for medicine in self.extracted_data["medicines"]:
            if not self._should_save_item(medicine):
                continue
            saved = self._save_medicine(medicine, member_id)
            if saved:
                medicine["_status"]["saved"] = True
                saved_items.append(saved)
            else:
                err = medicine.get("_status", {}).get("save_error")
                suffix = f":{err}" if err else ""
                failed_items.append(f"medicine:{medicine.get('name')}{suffix}")

        for appointment in self.extracted_data["appointments"]:
            if not self._should_save_item(appointment):
                continue
            saved = self._save_appointment(appointment, member_id)
            if saved:
                appointment["_status"]["saved"] = True
                saved_items.append(saved)
            else:
                failed_items.append("appointment")

        symptom_candidates = [s for s in self.extracted_data["symptoms"] if self._should_save_item(s)]
        if symptom_candidates:
            saved = self._save_symptom_group(symptom_candidates, member_id)
            if saved:
                for symptom in symptom_candidates:
                    symptom["_status"]["saved"] = True
                saved_items.append(saved)
            else:
                failed_items.append("symptom_group")

        self.last_saved = {
            "count": len(saved_items),
            "items": saved_items,
            "timestamp": _now_iso() if saved_items else self.last_saved.get("timestamp"),
        }

        if failed_items:
            return f"Saved {len(saved_items)} items to database. Failed: {', '.join(failed_items)}"
        return f"Saved {len(saved_items)} items to database."

    def _tool_ask_clarification(self) -> str:
        clarifications: List[Dict[str, Any]] = []

        for record in self.extracted_data["health_records"]:
            if record["_status"].get("needs_clarification"):
                clarifications.append(self._build_clarification("health_record", record))

        for medicine in self.extracted_data["medicines"]:
            if medicine["_status"].get("needs_clarification"):
                clarifications.append(self._build_clarification("medicine", medicine))

        for appointment in self.extracted_data["appointments"]:
            if appointment["_status"].get("needs_clarification"):
                clarifications.append(self._build_clarification("appointment", appointment))

        for symptom in self.extracted_data["symptoms"]:
            if symptom["_status"].get("needs_clarification"):
                clarifications.append(self._build_clarification("symptom", symptom))

        # Deduplicate by question/context
        existing = {(c.get("question"), c.get("context")) for c in self.pending_clarifications}
        for clarification in clarifications:
            key = (clarification.get("question"), clarification.get("context"))
            if key not in existing:
                self.pending_clarifications.append(clarification)
                existing.add(key)

        return f"Queued {len(clarifications)} clarification(s)."

    def _tool_search_knowledge(self, action_input: Dict[str, Any]) -> str:
        # Placeholder: no external medical knowledge base wired.
        return "Knowledge search not configured."

    def _tool_calculate_metrics(self) -> str:
        weight = None
        height = None
        for record in self.extracted_data["health_records"]:
            metric = (record.get("type") or record.get("metric") or "").lower()
            if metric == "weight" and weight is None:
                weight = _parse_float(record.get("value"))
            if metric == "height" and height is None:
                height = _parse_float(record.get("value"))

        if weight and height:
            height_m = height / 100 if height > 3 else height
            if height_m > 0:
                bmi = round(weight / (height_m ** 2), 2)
                bmi_record = {
                    "type": "bmi",
                    "value": bmi,
                    "unit": "kg/m2",
                    "recorded_at": _now_iso(),
                    "confidence": 0.9,
                    "source_text": "Derived from weight and height",
                    "_status": {
                        "validated": True,
                        "duplicate_checked": False,
                        "duplicate": False,
                        "saved": False,
                        "needs_clarification": False,
                        "issues": [],
                    },
                }
                self.extracted_data["health_records"].append(bmi_record)
                return "Calculated BMI."
        return "No metrics calculated."

    def _tool_get_user_history(self, member_id: Optional[str]) -> str:
        query = self._supabase.table("health_records").select("*").eq("user_id", self.user_id).order("created_at", desc=True).limit(10)
        res = self._safe_execute(query, allow_retry_without_member=True, member_id=member_id)
        count = len(res.data) if res and res.data else 0
        return f"Fetched {count} past health records."

    # ----------------------------
    # Validation helpers
    # ----------------------------
    def _validate_health_record(self, record: Dict[str, Any]) -> List[str]:
        issues = []
        metric = (record.get("type") or record.get("metric") or "").lower()
        value = record.get("value")
        unit = record.get("unit")
        confidence = float(record.get("confidence", 0.5) or 0.5)

        if not metric:
            issues.append("Missing metric type.")
        if value is None:
            issues.append("Missing value.")

        if metric == "blood_pressure":
            systolic, diastolic = _parse_bp(value)
            if systolic is None:
                issues.append("Unable to parse blood pressure.")
            else:
                if systolic < 70 or systolic > 250:
                    issues.append("Systolic value out of range.")
                if diastolic is not None and (diastolic < 40 or diastolic > 150):
                    issues.append("Diastolic value out of range.")
            record["category"] = self._categorize_bp(systolic, diastolic)
        elif metric == "blood_sugar":
            val = _parse_float(value)
            if val is None:
                issues.append("Invalid blood sugar value.")
            elif val < 40 or val > 600:
                issues.append("Blood sugar value out of range.")
        elif metric == "weight":
            val = _parse_float(value)
            if val is None:
                issues.append("Invalid weight value.")
            elif val < 20 or val > 300:
                issues.append("Weight value out of range.")
        elif metric == "height":
            val = _parse_float(value)
            if val is None:
                issues.append("Invalid height value.")
            elif val < 50 or val > 250:
                issues.append("Height value out of range.")
        elif metric == "temperature":
            val = _parse_float(value)
            if val is None:
                issues.append("Invalid temperature value.")
            else:
                if unit and "c" in unit.lower():
                    if val < 32 or val > 43:
                        issues.append("Temperature value out of range.")
                else:
                    if val < 90 or val > 110:
                        issues.append("Temperature value out of range.")
        elif metric == "heart_rate":
            val = _parse_float(value)
            if val is None:
                issues.append("Invalid heart rate value.")
            elif val < 30 or val > 220:
                issues.append("Heart rate value out of range.")

        # Prevent hallucinated numeric metrics (e.g., fever without explicit number)
        if metric in {"temperature", "blood_sugar", "weight", "height", "heart_rate"}:
            if not _source_has_number(record.get("source_text")):
                issues.append("No numeric value mentioned in source text.")

        if confidence < self.min_save_confidence:
            issues.append("Low confidence.")

        return issues

    def _validate_medicine(self, medicine: Dict[str, Any]) -> List[str]:
        issues = []
        if not medicine.get("name"):
            issues.append("Missing medicine name.")
        confidence = float(medicine.get("confidence", 0.5) or 0.5)
        if confidence < self.min_save_confidence:
            issues.append("Low confidence.")
        return issues

    def _validate_appointment(self, appointment: Dict[str, Any]) -> List[str]:
        issues = []
        if not appointment.get("date"):
            issues.append("Missing appointment date.")
        if not appointment.get("time"):
            issues.append("Missing appointment time.")
        confidence = float(appointment.get("confidence", 0.5) or 0.5)
        if confidence < self.min_save_confidence:
            issues.append("Low confidence.")
        return issues

    def _validate_symptom(self, symptom: Dict[str, Any]) -> List[str]:
        issues = []
        if not symptom.get("symptom"):
            issues.append("Missing symptom name.")
        confidence = float(symptom.get("confidence", 0.5) or 0.5)
        if confidence < self.min_save_confidence:
            issues.append("Low confidence.")
        return issues

    # ----------------------------
    # Saving helpers
    # ----------------------------
    def _should_save_item(self, item: Dict[str, Any]) -> bool:
        status = item.get("_status", {})
        if status.get("saved"):
            return False
        if status.get("duplicate"):
            return False
        if status.get("needs_clarification"):
            return False
        if not status.get("validated"):
            return False
        confidence = float(item.get("confidence", 0.5) or 0.5)
        return confidence >= self.min_save_confidence

    def _save_health_record(self, record: Dict[str, Any], member_id: Optional[str]) -> Optional[Dict[str, Any]]:
        metric = record.get("type") or record.get("metric")
        date = _to_date_str(record.get("recorded_at"))
        confidence = float(record.get("confidence", 0.5) or 0.5)
        systolic, diastolic = _parse_bp(record.get("value")) if metric == "blood_pressure" else (None, None)
        value = record.get("value")
        notes = record.get("source_text") or ""
        if metric == "blood_pressure":
            if systolic is None:
                return None
            value = systolic
            if diastolic is not None:
                notes = (notes + " | " if notes else "") + f"Diastolic: {int(diastolic)}"

        unit = record.get("unit") or ("mmHg" if metric == "blood_pressure" else "")
        row = {
            "user_id": self.user_id,
            "metric": metric,
            "value": _parse_float(value) or 0,
            "unit": unit,
            "date": date,
            "status": None,
            "notes": notes,
            "confidence_score": confidence,
            "category": record.get("category"),
            "source": "chat_agent",
            "validated_at": _now_iso(),
        }
        if member_id:
            row["member_id"] = member_id

        try:
            res = self._supabase.table("health_records").insert(row).execute()
            return res.data[0] if res.data else row
        except Exception:
            # Retry without member_id if column missing
            row.pop("member_id", None)
            try:
                res = self._supabase.table("health_records").insert(row).execute()
                return res.data[0] if res.data else row
            except Exception:
                return None

    def _save_medicine(self, medicine: Dict[str, Any], member_id: Optional[str]) -> Optional[Dict[str, Any]]:
        confidence = float(medicine.get("confidence", 0.5) or 0.5)
        row = {
            "user_id": self.user_id,
            "member_id": member_id,
            "name": medicine.get("name"),
            "dosage": medicine.get("dosage"),
            "form": medicine.get("form") or "tablet",
            "frequency": _normalize_frequency(medicine.get("frequency")),
            "intake_times": [],
            "custom_times": [],
            "dose_count": medicine.get("doseCount") or medicine.get("dose_count") or 1,
            "unit": medicine.get("unit") or "tablet",
            "start_date": medicine.get("start_date") or medicine.get("startDate"),
            "end_date": medicine.get("end_date") or medicine.get("endDate"),
            "notes": medicine.get("instructions"),
            "confidence_score": confidence,
            "source": "chat_agent",
        }
        try:
            res = self._supabase.table("medicines").insert(row).execute()
            if res.data:
                return res.data[0]
            # If insert succeeded but no data returned, try to fetch the newest match
            lookup = (
                self._supabase.table("medicines")
                .select("*")
                .eq("user_id", self.user_id)
                .ilike("name", f"%{medicine.get('name') or ''}%")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            return lookup.data[0] if lookup.data else None
        except Exception as e:
            # Retry without optional columns if schema is missing them
            row.pop("confidence_score", None)
            row.pop("source", None)
            try:
                res = self._supabase.table("medicines").insert(row).execute()
                if res.data:
                    return res.data[0]
            except Exception as e2:
                medicine["_status"]["save_error"] = str(e2)
                return None
            return None

    def _save_appointment(self, appointment: Dict[str, Any], member_id: Optional[str]) -> Optional[Dict[str, Any]]:
        confidence = float(appointment.get("confidence", 0.5) or 0.5)
        row = {
            "patient_id": self.user_id,
            "member_id": member_id,
            "doctor_id": appointment.get("doctor_id") or "unknown",
            "doctor_name": appointment.get("doctor_name"),
            "specialization": appointment.get("specialty"),
            "date": appointment.get("date"),
            "time_slot": appointment.get("time"),
            "symptoms": appointment.get("reason"),
            "notes": appointment.get("location"),
            "status": "scheduled",
            "confidence_score": confidence,
            "source": "chat_agent",
        }
        try:
            res = self._supabase.table("appointments").insert(row).execute()
            return res.data[0] if res.data else row
        except Exception:
            return None

    def _save_symptom(self, symptom: Dict[str, Any], member_id: Optional[str]) -> Optional[Dict[str, Any]]:
        notes = symptom.get("notes") or symptom.get("source_text") or ""
        row = {
            "user_id": self.user_id,
            "metric": "symptom",
            "value": 0,
            "unit": "text",
            "date": _to_date_str(symptom.get("started_at")),
            "notes": f"{symptom.get('symptom')} ({symptom.get('severity')}) {notes}".strip(),
            "confidence_score": float(symptom.get("confidence", 0.5) or 0.5),
            "source": "chat_agent",
            "validated_at": _now_iso(),
        }
        if member_id:
            row["member_id"] = member_id
        try:
            res = self._supabase.table("health_records").insert(row).execute()
            return res.data[0] if res.data else row
        except Exception:
            row.pop("member_id", None)
            try:
                res = self._supabase.table("health_records").insert(row).execute()
                return res.data[0] if res.data else row
            except Exception:
                return None

    def _save_symptom_group(self, symptoms: List[Dict[str, Any]], member_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if not symptoms:
            return None
        source_text = ""
        parts = []
        max_conf = 0.0
        date = None
        for symptom in symptoms:
            name = symptom.get("symptom") or "symptom"
            severity = symptom.get("severity") or "mild"
            parts.append(f"{name} ({severity})")
            if symptom.get("source_text"):
                source_text = symptom.get("source_text")
            max_conf = max(max_conf, float(symptom.get("confidence", 0.5) or 0.5))
            if symptom.get("started_at") and not date:
                date = _to_date_str(symptom.get("started_at"))

        notes = "; ".join(parts)
        if source_text:
            notes = f"{notes} | {source_text}"

        row = {
            "user_id": self.user_id,
            "metric": "symptom",
            "value": 0,
            "unit": "text",
            "date": date or _now_iso().split("T")[0],
            "notes": notes,
            "confidence_score": max_conf,
            "source": "chat_agent",
            "validated_at": _now_iso(),
        }
        if member_id:
            row["member_id"] = member_id
        try:
            res = self._supabase.table("health_records").insert(row).execute()
            return res.data[0] if res.data else row
        except Exception:
            row.pop("member_id", None)
            try:
                res = self._supabase.table("health_records").insert(row).execute()
                return res.data[0] if res.data else row
            except Exception:
                return None

    # ----------------------------
    # Clarification helpers
    # ----------------------------
    def _build_clarification(self, item_type: str, item: Dict[str, Any]) -> Dict[str, Any]:
        question = "Could you clarify?"
        context = item.get("source_text") or ""
        if item_type == "health_record":
            metric = item.get("type") or item.get("metric")
            question = f"What was the exact {metric or 'measurement'} reading?"
        elif item_type == "medicine":
            question = "Which medication did you take?"
        elif item_type == "appointment":
            question = "When is the appointment (date and time)?"
        elif item_type == "symptom":
            question = "Can you describe the symptom and how long it has lasted?"

        return {
            "question": question,
            "context": context,
            "status": "pending",
            "priority": 2,
            "related_item_type": item_type,
            "related_item_data": item,
        }

    # ----------------------------
    # Utility helpers
    # ----------------------------
    def _build_reasoning_prompt(self) -> str:
        conversation = "\n".join(
            [f"{t['role'].capitalize()}: {t['content']}" for t in list(self.conversation_turns)[-5:]]
        )
        extracted_summary = {k: len(v) for k, v in self.extracted_data.items()}
        recent_actions = self.action_history[-3:]
        tools = [
            "extract_data",
            "validate_data",
            "check_duplicates",
            "save_to_database",
            "ask_clarification",
            "search_knowledge",
            "calculate_metrics",
            "get_user_history",
            "finish",
        ]

        return f"""
You are an autonomous health data management agent.
Your goal: Extract, validate, and save accurate health data from conversations.

CURRENT CONVERSATION:
{conversation}

CURRENT STATE:
Extracted Data: {extracted_summary}
Pending Clarifications: {len(self.pending_clarifications)}
Recent Actions: {recent_actions}

AVAILABLE TOOLS:
{tools}

Respond ONLY with JSON:
{{
  "reasoning": "...",
  "has_health_data": true,
  "confidence_score": 0.85,
  "action": "extract_data",
  "action_input": {{}},
  "why_this_action": "..."
}}
""".strip()

    def _build_extraction_prompt(self) -> str:
        conversation = "\n".join(
            [f"{t['role'].capitalize()}: {t['content']}" for t in list(self.conversation_turns)[-10:]]
        )
        return f"""
Extract ALL health-related data from this conversation.

Conversation:
{conversation}

Return ONLY valid JSON with this structure:
{{
  "health_records": [{{"type": "blood_pressure|blood_sugar|weight|height|temperature|heart_rate",
    "value": "...",
    "unit": "...",
    "recorded_at": "...",
    "confidence": 0.85,
    "source_text": "..."
  }}],
  "medicines": [{{"name": "...", "dosage": "...", "frequency": "...", "duration": "...",
    "instructions": "...", "start_date": "...", "confidence": 0.8, "source_text": "..."
  }}],
  "appointments": [{{"doctor_name": "...", "specialty": "...", "date": "...", "time": "...",
    "reason": "...", "location": "...", "confidence": 0.8, "source_text": "..."
  }}],
  "symptoms": [{{"symptom": "...", "severity": "...", "duration": "...", "notes": "...",
    "started_at": "...", "confidence": 0.7, "source_text": "..."
  }}]
}}
""".strip()

    def _call_llm(self, prompt: str, system_prompt: str) -> str:
        try:
            payload = {
                "model": settings.ollama_chat_model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.2},
            }
            if system_prompt:
                payload["system"] = system_prompt
            response = requests.post(
                f"{settings.ollama_base_url}/api/generate",
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
        except Exception:
            return ""

    def _fallback_decision(self) -> AgentDecision:
        has_extracted = any(len(v) > 0 for v in self.extracted_data.values())
        needs_validation = any(
            not item.get("_status", {}).get("validated", False)
            for items in self.extracted_data.values()
            for item in items
        )
        needs_duplicates = any(
            item.get("_status", {}).get("validated", False)
            and not item.get("_status", {}).get("duplicate_checked", False)
            for items in self.extracted_data.values()
            for item in items
        )
        needs_save = any(
            self._should_save_item(item)
            for items in self.extracted_data.values()
            for item in items
        )
        needs_clarification = any(
            item.get("_status", {}).get("needs_clarification", False)
            for items in self.extracted_data.values()
            for item in items
        )

        if not has_extracted:
            action = "extract_data"
        elif needs_validation:
            action = "validate_data"
        elif needs_clarification:
            action = "ask_clarification"
        elif needs_duplicates:
            action = "check_duplicates"
        elif needs_save:
            action = "save_to_database"
        else:
            action = "finish"

        return AgentDecision(
            reasoning="Fallback decision used due to parsing failure.",
            has_health_data=True,
            confidence_score=0.5,
            action=action,
            action_input={},
            why_this_action="Fallback strategy",
        )

    def _categorize_bp(self, systolic: Optional[float], diastolic: Optional[float]) -> Optional[str]:
        if systolic is None:
            return None
        if systolic < 120 and (diastolic is None or diastolic < 80):
            return "Normal BP"
        if 120 <= systolic < 130 and (diastolic is None or diastolic < 80):
            return "Elevated BP"
        if systolic >= 130 or (diastolic is not None and diastolic >= 80):
            return "High BP"
        return None

    def _safe_execute(self, query, *, allow_retry_without_member: bool, member_id: Optional[str]):
        try:
            if member_id and allow_retry_without_member:
                query = query.eq("member_id", member_id)
            return query.execute()
        except Exception:
            if allow_retry_without_member:
                try:
                    return query.execute()
                except Exception:
                    return None
            return None

    def _log_execution(
        self,
        *,
        session_id: str,
        iteration: int,
        state: str,
        action: str,
        action_input: Dict[str, Any],
        observation: str,
        success: bool,
        reasoning: str,
        confidence_score: float,
    ) -> None:
        try:
            row = {
                "user_id": self.user_id,
                "session_id": session_id,
                "iteration": iteration,
                "agent_state": state,
                "action": action,
                "action_input": action_input,
                "observation": observation,
                "success": success,
                "reasoning": reasoning,
                "confidence_score": confidence_score,
                "metadata": {},
                "duration_ms": None,
                "created_at": _now_iso(),
            }
            self._supabase.table("agent_execution_logs").insert(row).execute()
        except Exception:
            return
