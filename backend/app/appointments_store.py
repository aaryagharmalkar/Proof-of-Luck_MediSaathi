"""In-memory doctors and appointment slots. Can be replaced with Supabase later."""
from typing import Dict, List

DOCTORS = {
    "1": {
        "id": "1",
        "name": "Dr. Priya Sharma",
        "specialty": "ENT Specialist",
        "fees": 500,
        "experience": "15 years",
        "location": "Mumbai",
    },
    "2": {
        "id": "2",
        "name": "Dr. Rajesh Kumar",
        "specialty": "ENT Surgeon",
        "fees": 700,
        "experience": "20 years",
        "location": "Mumbai",
    },
    "3": {
        "id": "3",
        "name": "Dr. Amit Patel",
        "specialty": "General Physician",
        "fees": 400,
        "experience": "10 years",
        "location": "Mumbai",
    },
    "4": {
        "id": "4",
        "name": "Dr. Sunita Reddy",
        "specialty": "General Physician",
        "fees": 350,
        "experience": "8 years",
        "location": "Mumbai",
    },
}

# Doctor working slots
BASE_SLOTS = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
]

# In-memory appointments
# key = "doctor_id|date"
_APPOINTMENTS: Dict[str, List[str]] = {}


# ----------------------------
# AVAILABILITY
# ----------------------------
def get_availability(doctor_id: str, date: str):
    key = f"{doctor_id}|{date}"
    booked = _APPOINTMENTS.get(key, [])

    return [
        {
            "time": slot,
            "available": slot not in booked,
        }
        for slot in BASE_SLOTS
    ]


# ----------------------------
# BOOKING
# ----------------------------
def book_slot(doctor_id: str, date: str, time: str):
    key = f"{doctor_id}|{date}"
    booked = _APPOINTMENTS.setdefault(key, [])

    if time in booked:
        return False

    booked.append(time)
    return True


# ----------------------------
# DOCTOR LOOKUP
# ----------------------------
def get_doctor(doctor_id: str):
    return DOCTORS.get(doctor_id)
