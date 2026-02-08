"""
Doctor-facing API: profile, onboarding, availability, appointments, patients.
Uses existing tables: doctors, doctor_availability, appointments, medical_reports, profiles.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.supabase_client import supabase
from app.controllers.auth_controller import get_current_user

router = APIRouter(prefix="/doctors", tags=["Doctors"])


# ---------------------------
# Public (for patients booking)
# ---------------------------

@router.get("")
async def list_doctors(
    specialization: Optional[str] = Query(None, description="Filter by specialization"),
    user=Depends(get_current_user),
):
    """List doctors who have completed onboarding (for patients to book appointments)."""
    try:
        query = supabase.table("doctors").select("id, full_name, email, specialization, fees_inr, bio").eq("onboarding_completed", True)
        if specialization and specialization.strip():
            query = query.ilike("specialization", f"%{specialization.strip()}%")
        r = query.order("full_name").execute()
        doctors = r.data or []
        # Shape for frontend (name, specialty, fees, id, location placeholder)
        out = []
        for d in doctors:
            out.append({
                "id": _normalize_doctor_id(d["id"]),
                "name": d.get("full_name") or "Doctor",
                "specialty": d.get("specialization") or "General Physician",
                "specialization": d.get("specialization") or "General Physician",
                "fees": d.get("fees_inr") or 500,
                "fees_inr": d.get("fees_inr") or 500,
                "experience": "Verified",
                "location": "Online",
            })
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _normalize_doctor_id(doctor_id) -> str:
    """Ensure doctor_id string is consistent for storage and query (UUIDs may vary in case)."""
    s = str(doctor_id).strip()
    if "-" in s and len(s) > 10:
        return s.lower()
    return s


def _get_doctor_row(user):
    """Return the doctor row for the current user, or None."""
    try:
        r = supabase.table("doctors").select("*").eq("user_id", user.id).maybe_single().execute()
        return r.data
    except Exception:
        return None


def _ensure_doctor_row(user):
    """Return doctor row; create a stub if missing (so GET /doctors/me never 404s for new doctors)."""
    row = _get_doctor_row(user)
    if row:
        return row
    name = (user.user_metadata or {}).get("name") or (user.email or "").split("@")[0] or "Doctor"
    try:
        supabase.table("doctors").insert({
            "user_id": user.id,
            "full_name": name,
            "email": user.email or "",
            "onboarding_completed": False,
        }).execute()
        r = supabase.table("doctors").select("*").eq("user_id", user.id).single().execute()
        return r.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not create doctor record: {e}")


# ---------------------------
# Profile & onboarding
# ---------------------------

@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """Get current doctor profile. Creates a stub row if none exists (onboarding_completed=false)."""
    row = _ensure_doctor_row(user)
    return row


class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    fees_inr: Optional[int] = None
    bio: Optional[str] = None


@router.patch("/me")
async def update_me(payload: DoctorUpdate, user=Depends(get_current_user)):
    """Update current doctor profile. Creates row if missing (during onboarding)."""
    doctor = _ensure_doctor_row(user)
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return doctor
    update_data["updated_at"] = datetime.utcnow().isoformat()
    try:
        supabase.table("doctors").update(update_data).eq("id", doctor["id"]).execute()
        r = supabase.table("doctors").select("*").eq("id", doctor["id"]).single().execute()
        return r.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class VerifyLicenseRequest(BaseModel):
    license_number: str


@router.post("/verify-license")
async def verify_license(payload: VerifyLicenseRequest, user=Depends(get_current_user)):
    """Mock license verification. In production would call medical register."""
    doctor = _ensure_doctor_row(user)
    try:
        supabase.table("doctors").update({
            "license_number": (payload.license_number or "").strip(),
            "license_verified": True,
            "license_verified_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", doctor["id"]).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"verified": True}


class AvailabilitySlot(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str


class AvailabilityPut(BaseModel):
    slots: List[AvailabilitySlot]


@router.put("/me/availability")
async def put_availability(payload: AvailabilityPut, user=Depends(get_current_user)):
    """Replace weekly availability for the current doctor."""
    doctor = _ensure_doctor_row(user)
    doctor_id = doctor["id"]
    try:
        supabase.table("doctor_availability").delete().eq("doctor_id", doctor_id).execute()
    except Exception:
        pass
    if not payload.slots:
        return {"slots": []}
    rows = [
        {
            "doctor_id": doctor_id,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
        }
        for s in payload.slots
    ]
    supabase.table("doctor_availability").insert(rows).execute()
    return {"slots": payload.slots}


@router.post("/me/complete-onboarding")
async def complete_onboarding(user=Depends(get_current_user)):
    """Mark doctor onboarding as complete."""
    doctor = _ensure_doctor_row(user)
    try:
        supabase.table("doctors").update({
            "onboarding_completed": True,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", doctor["id"]).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"success": True}


# ---------------------------
# Appointments & patients
# ---------------------------

@router.get("/me/appointments")
async def list_my_appointments(user=Depends(get_current_user)):
    """List appointments for the current doctor (upcoming first)."""
    doctor = _ensure_doctor_row(user)
    if not doctor:
        return []
    try:
        doc_id = _normalize_doctor_id(doctor["id"])
        r = supabase.table("appointments").select("*").eq("doctor_id", doc_id).in_("status", ["scheduled", "confirmed"]).order("date").order("time_slot").execute()
        data = r.data or []
        # If empty and id looks like UUID, try raw format (for existing rows stored before normalization)
        if not data and "-" in doc_id:
            r2 = supabase.table("appointments").select("*").eq("doctor_id", str(doctor["id"])).in_("status", ["scheduled", "confirmed"]).order("date").order("time_slot").execute()
            data = r2.data or []
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AppointmentStatusUpdate(BaseModel):
    status: str  # "confirmed" | "cancelled"


@router.patch("/me/appointments/{appointment_id}")
async def update_appointment_status(
    appointment_id: str,
    payload: AppointmentStatusUpdate,
    user=Depends(get_current_user),
):
    """Doctor approves (confirmed) or cancels an appointment."""
    doctor = _get_doctor_row(user)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if payload.status not in ("confirmed", "cancelled"):
        raise HTTPException(status_code=400, detail="Status must be 'confirmed' or 'cancelled'")
    try:
        doc_id = _normalize_doctor_id(doctor["id"])
        check = supabase.table("appointments").select("id").eq("id", appointment_id).eq("doctor_id", doc_id).maybe_single().execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Appointment not found")
        supabase.table("appointments").update({
            "status": payload.status,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", appointment_id).execute()
        r = supabase.table("appointments").select("*").eq("id", appointment_id).single().execute()
        return r.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me/patients")
async def list_my_patients(user=Depends(get_current_user)):
    """List distinct patients who have (or had) appointments with this doctor."""
    doctor = _ensure_doctor_row(user)
    if not doctor:
        return []
    try:
        doc_id = _normalize_doctor_id(doctor["id"])
        r = supabase.table("appointments").select("patient_id").eq("doctor_id", doc_id).execute()
        data = r.data or []
        seen = set()
        patient_ids = []
        for row in data:
            pid = row.get("patient_id")
            if pid and pid not in seen:
                seen.add(pid)
                patient_ids.append(pid)
        if not patient_ids:
            return []
        # Fetch profiles for these users
        profiles = supabase.table("profiles").select("user_id, full_name, age, location").in_("user_id", patient_ids).execute()
        profile_map = {p["user_id"]: p for p in (profiles.data or [])}
        # Count upcoming per patient
        r2 = supabase.table("appointments").select("patient_id").eq("doctor_id", doc_id).in_("status", ["scheduled", "confirmed"]).execute()
        count_by_patient = {}
        for row in (r2.data or []):
            pid = row.get("patient_id")
            if pid:
                count_by_patient[pid] = count_by_patient.get(pid, 0) + 1
        out = []
        for pid in patient_ids:
            p = profile_map.get(pid) or {}
            out.append({
                "user_id": pid,
                "full_name": p.get("full_name") or "Patient",
                "age": p.get("age"),
                "location": p.get("location"),
                "upcoming_count": count_by_patient.get(pid, 0),
            })
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me/patients/{patient_id}")
async def get_patient_detail(patient_id: str, user=Depends(get_current_user)):
    """Get one patient's profile and reports (only if they have an appointment with this doctor)."""
    doctor = _get_doctor_row(user)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    try:
        doc_id = _normalize_doctor_id(doctor["id"])
        appt = supabase.table("appointments").select("id").eq("doctor_id", doc_id).eq("patient_id", patient_id).limit(1).execute()
        if not appt.data:
            raise HTTPException(status_code=404, detail="Patient not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    try:
        profile = supabase.table("profiles").select("*").eq("user_id", patient_id).maybe_single().execute()
        reports = supabase.table("medical_reports").select("id, report_id, file_name, summary, created_at").eq("user_id", patient_id).order("created_at", desc=True).execute()
        return {
            "profile": profile.data or {},
            "reports": reports.data or [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me/patients/{patient_id}/report-summary")
async def get_report_summary(
    patient_id: str,
    report_id: str = Query(..., description="Report ID or UUID"),
    user=Depends(get_current_user),
):
    """Return summary for a report: stored if present, else on-demand from decrypted file (zero-content; not stored)."""
    doctor = _get_doctor_row(user)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    try:
        doc_id = _normalize_doctor_id(doctor["id"])
        appt = supabase.table("appointments").select("id").eq("doctor_id", doc_id).eq("patient_id", patient_id).limit(1).execute()
        if not appt.data:
            raise HTTPException(status_code=404, detail="Patient not found")
    except HTTPException:
        raise
    try:
        r = supabase.table("medical_reports").select("*").eq("user_id", patient_id).eq("id", report_id).limit(1).execute()
        if not r.data:
            r = supabase.table("medical_reports").select("*").eq("user_id", patient_id).eq("report_id", report_id).limit(1).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="Report not found")
        row = r.data[0]
        summary = (row.get("summary") or "").strip()
        if summary:
            return {"summary": summary}
        # Zero-content: get text from decrypted file, generate summary on-demand (don't store)
        from app.report_content import get_report_full_text
        full_text = get_report_full_text(row)
        if full_text and has_report_summary_llm():
            summary = await generate_summary_llm(full_text)
            return {"summary": summary}
        return {"summary": "No summary available."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def has_report_summary_llm():
    try:
        from app.config import settings
        return bool(getattr(settings, "openrouter_api_key", None))
    except Exception:
        return False


async def generate_summary_llm(text: str) -> str:
    try:
        from openai import OpenAI
        from app.config import settings
        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=settings.openrouter_api_key or "")
        completion = client.chat.completions.create(
            model="google/gemini-2.0-flash-001",
            messages=[{"role": "user", "content": f"Summarize the following medical text concisely:\n\n{text}"}],
        )
        return completion.choices[0].message.content or "Summary generation failed."
    except Exception as e:
        return f"Summary generation failed: {e}"
