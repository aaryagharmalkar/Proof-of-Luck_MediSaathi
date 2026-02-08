import logging
from fastapi import APIRouter, HTTPException, Depends, Query, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.appointments_store import (
    get_availability,
    book_slot,
    get_doctor as get_mock_doctor,
)
from app.supabase_client import supabase
from app.config import settings
from supabase import create_client
from app.controllers.auth_controller import get_current_user
from app.rag_store import store_patient_document

router = APIRouter()
logger = logging.getLogger(__name__)

# Default slot format for availability (frontend uses these labels)
DEFAULT_SLOTS = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM",
]


def _normalize_doctor_id(doctor_id: str) -> str:
    """Use consistent format for doctor_id (UUID lowercase) so doctor-side queries match."""
    s = str(doctor_id).strip()
    if "-" in s and len(s) > 10:
        return s.lower()
    return s


def _get_doctor_from_db(doctor_id: str):
    """Get doctor from Supabase by id (UUID). Returns None if not found or not onboarded."""
    try:
        r = supabase.table("doctors").select("*").eq("id", doctor_id).eq("onboarding_completed", True).maybe_single().execute()
        return r.data
    except Exception:
        return None


def _get_availability_from_db(doctor_id: str, date: str):
    """Build slots for a doctor on a date from doctor_availability and existing appointments."""
    try:
        # Day of week: 0=Sun, 1=Mon, ... (Python weekday: Mon=0 -> 1, Sun=6 -> 0)
        dt = datetime.strptime(date, "%Y-%m-%d")
        day_of_week = (dt.weekday() + 1) % 7
        avail = supabase.table("doctor_availability").select("start_time, end_time").eq("doctor_id", doctor_id).eq("day_of_week", day_of_week).execute()
        booked = supabase.table("appointments").select("time_slot").eq("doctor_id", doctor_id).eq("date", date).in_("status", ["scheduled", "confirmed"]).execute()
        booked_times = {r["time_slot"] for r in (booked.data or [])}
        # If no availability rows, all default slots are available (or we could mark none)
        slots = []
        for t in DEFAULT_SLOTS:
            slots.append({"time": t, "available": t not in booked_times})
        return slots
    except Exception:
        return [{"time": t, "available": True} for t in DEFAULT_SLOTS]


@router.get("/appointments")
async def list_appointments(
    member_id: Optional[str] = Query(None, description="Filter by family member ID"),
    user=Depends(get_current_user),
    authorization: str = Header(None)
):
    """List appointments for the current user or a specific family member."""
    try:
        # If member_id is provided, verify it belongs to the user
        if member_id:
            member_check = supabase.table("members").select("id").eq("id", member_id).eq("user_id", user.id).execute()
            if not member_check.data:
                raise HTTPException(status_code=404, detail="Member not found")
        
        token = authorization.split(" ")[1]
        client = create_client(settings.supabase_url, settings.supabase_key)
        client.postgrest.auth(token)

        query = client.table("appointments").select("*").eq("patient_id", user.id)
        if member_id:
            query = query.eq("member_id", member_id)
        else:
            query = query.is_("member_id", "null")
        result = query.order("date", desc=False).order("time_slot", desc=False).execute()
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AppointmentCreate(BaseModel):
    doctor_id: str
    date: str
    time: str
    symptoms: str
    fees: int
    member_id: Optional[str] = None
    doctor_name: Optional[str] = None
    specialization: Optional[str] = None


@router.get("/doctors/{doctor_id}/availability")
def doctor_availability(doctor_id: str, date: str):
    db_doctor = _get_doctor_from_db(doctor_id)
    if db_doctor:
        return {
            "doctor": {
                "id": str(db_doctor["id"]),
                "name": db_doctor.get("full_name") or "Doctor",
                "specialty": db_doctor.get("specialization") or "General Physician",
                "fees": db_doctor.get("fees_inr") or 500,
                "experience": "Verified",
                "location": "Online",
            },
            "date": date,
            "slots": _get_availability_from_db(doctor_id, date),
        }
    doctor = get_mock_doctor(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {
        "doctor": doctor,
        "date": date,
        "slots": get_availability(doctor_id, date),
    }


@router.post("/appointments")
async def create_appointment(payload: AppointmentCreate, user=Depends(get_current_user), authorization: str = Header(None)):
    token = authorization.split(" ")[1]
    client = create_client(settings.supabase_url, settings.supabase_key)
    client.postgrest.auth(token)

    if payload.member_id:
        member_check = client.table("members").select("id").eq("id", payload.member_id).eq("user_id", user.id).execute()
        if not member_check.data:
            raise HTTPException(status_code=404, detail="Member not found")

    db_doctor = _get_doctor_from_db(payload.doctor_id)
    if db_doctor:
        # Real doctor: check slot not already booked, insert with status 'scheduled' (pending approval)
        doc_id_norm = _normalize_doctor_id(payload.doctor_id)
        conflict = client.table("appointments").select("id").eq("doctor_id", doc_id_norm).eq("date", payload.date).eq("time_slot", payload.time).in_("status", ["scheduled", "confirmed"]).execute()
        if conflict.data:
            raise HTTPException(status_code=409, detail="Slot already booked")
        appointment_data = {
            "patient_id": user.id,
            "member_id": payload.member_id,
            "doctor_id": doc_id_norm,
            "doctor_name": db_doctor.get("full_name") or "Doctor",
            "specialization": db_doctor.get("specialization") or "General Physician",
            "date": payload.date,
            "time_slot": payload.time,
            "symptoms": payload.symptoms,
            "fees_inr": payload.fees,
            "status": "scheduled",
        }
        result = client.table("appointments").insert(appointment_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create appointment")
        row = result.data[0]
        try:
            summary = (
                f"Appointment with {row.get('doctor_name')} ({row.get('specialization')}) "
                f"on {row.get('date')} at {row.get('time_slot')}. "
                f"Symptoms: {row.get('symptoms') or 'not specified'}."
            )
            store_patient_document(
                user_id=user.id,
                member_id=row.get("member_id"),
                content=summary,
                metadata={"source": "appointment", "appointment_id": row.get("id")},
            )
        except Exception:
            pass
        return {
            "status": "scheduled",
            "message": "Appointment requested. The doctor will confirm shortly.",
            "appointment_id": row.get("id"),
            "appointment": row,
            "doctor": {"name": row.get("doctor_name"), "specialty": row.get("specialization")},
            "date": payload.date,
            "time": payload.time,
            "fees": payload.fees,
        }

    # Mock doctor fallback
    doctor = get_mock_doctor(payload.doctor_id)
    success = book_slot(payload.doctor_id, payload.date, payload.time)
    if not success:
        raise HTTPException(status_code=409, detail="Slot already booked")
    try:
        appointment_data = {
            "patient_id": user.id,
            "member_id": payload.member_id,
            "doctor_id": payload.doctor_id,
            "doctor_name": payload.doctor_name or (doctor.get("name") if doctor else "Doctor"),
            "specialization": payload.specialization or (doctor.get("specialty") if doctor else "General"),
            "date": payload.date,
            "time_slot": payload.time,
            "symptoms": payload.symptoms,
            "fees_inr": payload.fees,
            "status": "scheduled",
        }
        result = client.table("appointments").insert(appointment_data).execute()
        if result.data:
            try:
                row = result.data[0]
                summary = (
                    f"Appointment with {row.get('doctor_name')} ({row.get('specialization')}) "
                    f"on {row.get('date')} at {row.get('time_slot')}. "
                    f"Symptoms: {row.get('symptoms') or 'not specified'}."
                )
                store_patient_document(
                    user_id=user.id,
                    member_id=row.get("member_id"),
                    content=summary,
                    metadata={"source": "appointment", "appointment_id": row.get("id")},
                )
            except Exception:
                pass
            return {
                "status": "scheduled",
                "appointment_id": result.data[0].get("id"),
                "appointment": result.data[0],
                "doctor": doctor or {"name": payload.doctor_name, "specialty": payload.specialization},
                "date": payload.date,
                "time": payload.time,
                "fees": payload.fees,
            }
    except Exception as e:
        logger.warning("Failed to save appointment to DB: %s", e)
    return {
        "status": "scheduled",
        "doctor": doctor or {"name": payload.doctor_name, "specialty": payload.specialization},
        "date": payload.date,
        "time": payload.time,
        "fees": payload.fees,
    }


@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, user=Depends(get_current_user)):
    """Delete an appointment by ID. Only the patient can delete their own appointments."""
    try:
        # Verify the appointment belongs to the user
        check = supabase.table("appointments").select("id").eq("id", appointment_id).eq("patient_id", user.id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Appointment not found or you don't have permission to delete it")
        
        # Delete the appointment
        result = supabase.table("appointments").delete().eq("id", appointment_id).execute()
        
        return {"message": "Appointment deleted successfully", "deleted_id": appointment_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
