from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.appointments_store import (
    get_availability,
    book_slot,
    get_doctor,
)

router = APIRouter()


class AppointmentCreate(BaseModel):
    doctor_id: str
    date: str
    time: str
    symptoms: str
    fees: int


@router.get("/doctors/{doctor_id}/availability")
def doctor_availability(doctor_id: str, date: str):
    doctor = get_doctor(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return {
        "doctor": doctor,
        "date": date,
        "slots": get_availability(doctor_id, date),
    }


@router.post("/appointments")
def create_appointment(payload: AppointmentCreate):
    doctor = get_doctor(payload.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    success = book_slot(
        payload.doctor_id,
        payload.date,
        payload.time,
    )

    if not success:
        raise HTTPException(
            status_code=409,
            detail="Slot already booked",
        )

    return {
        "status": "confirmed",
        "doctor": doctor,
        "date": payload.date,
        "time": payload.time,
        "fees": payload.fees,
    }
