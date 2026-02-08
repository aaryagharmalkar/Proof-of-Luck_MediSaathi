import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

from app.supabase_client import supabase
from app.config import settings
from supabase import create_client
from app.controllers.auth_controller import signup_user, signin_user, get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class AuthRequest(BaseModel):
    email: str
    password: str
    name: str | None = None


# -------------------------
# Routes
# -------------------------

@router.post("/auth/signup")
async def signup(data: AuthRequest):
    return await signup_user(
        data.email,
        data.password,
        data.name
    )


@router.post("/auth/signin")
async def signin(data: AuthRequest):
    return await signin_user(data.email, data.password)

@router.post("/auth/register-doctor")
async def register_doctor(current_user=Depends(get_current_user)):
    """Mark current user as doctor and ensure a doctors row exists (for onboarding)."""
    try:
        name = (current_user.user_metadata or {}).get("name") or (current_user.email or "").split("@")[0] or "Doctor"
        try:
            prof = supabase.table("profiles").select("full_name").eq("user_id", current_user.id).maybe_single().execute()
            if prof.data and prof.data.get("full_name"):
                name = prof.data["full_name"]
        except Exception:
            pass
        existing = supabase.table("doctors").select("id").eq("user_id", current_user.id).maybe_single().execute()
        if not existing.data:
            supabase.table("doctors").insert({
                "user_id": current_user.id,
                "full_name": name,
                "email": current_user.email or "",
                "onboarding_completed": False,
            }).execute()
        return {"success": True, "message": "Registered as doctor. Complete onboarding."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/logout")
async def logout_user(user=Depends(get_current_user)):
    supabase.auth.sign_out()
    return {"message": "Logged out successfully"}

@router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return {"user": current_user}


@router.get("/auth/profile")
async def get_profile(current_user=Depends(get_current_user), authorization: str = Header(None)):
    """Get the current user's profile from profiles table."""
    try:
        result = supabase.table("profiles").select("*").eq("user_id", current_user.id).maybe_single().execute()
        
        # If profile doesn't exist, create a default one to prevent 500 errors
        if not result.data:
            new_profile = {
                "user_id": current_user.id,
                "full_name": (current_user.user_metadata or {}).get("name") or "",
                "setup_completed": False
            }
            create_res = supabase.table("profiles").insert(new_profile).execute()
            return create_res.data[0] if create_res.data else {}

        return result.data
    except Exception as e:
        logger.warning("Error fetching profile: %s", e)
        return {
            "user_id": current_user.id,
            "full_name": (current_user.user_metadata or {}).get("name") or "",
            "setup_completed": False
        }


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    avatar: Optional[str] = None
    health_profile: Optional[Dict] = None
    questionnaire_responses: Optional[Dict] = None
    primary_doctor: Optional[Dict] = None
    emergency_contact: Optional[Dict] = None
    setup_completed: Optional[bool] = None


@router.patch("/auth/profile")
async def update_profile(data: ProfileUpdateRequest, current_user=Depends(get_current_user), authorization: str = Header(None)):
    """Partially update the current user's profile."""
    try:
        token = authorization.split(" ")[1]
        client = create_client(settings.supabase_url, settings.supabase_key)
        client.postgrest.auth(token)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        update_data["updated_at"] = datetime.utcnow().isoformat()
        result = client.table("profiles").update(update_data).eq("user_id", current_user.id).execute()
        if not result.data:
            # No row yet: upsert with user_id
            update_data["user_id"] = current_user.id
            client.table("profiles").upsert(update_data, on_conflict="user_id").execute()
            result = client.table("profiles").select("*").eq("user_id", current_user.id).maybe_single().execute()
        return result.data[0] if result.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class HealthProfile(BaseModel):
    hemoglobin: Optional[float] = None
    blood_pressure: Optional[str] = None
    blood_sugar: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None


class PrimaryDoctor(BaseModel):
    name: str = ""
    hospital: str = ""
    phone: str = ""


class EmergencyContact(BaseModel):
    name: str = ""
    phone: str = ""
    email: str = ""
    relationship: str = ""


class ProfileSetupRequest(BaseModel):
    full_name: str
    age: int
    gender: str
    location: str
    avatar: str
    health_profile: HealthProfile
    questionnaire_responses: Dict[str, str]
    primary_doctor: PrimaryDoctor
    emergency_contact: EmergencyContact
    setup_completed: bool = True


@router.post("/auth/profile/setup")
async def setup_profile(data: ProfileSetupRequest, current_user=Depends(get_current_user)):
    """
    Setup user profile during account creation (Supabase profiles table).
    """
    try:
        result = supabase.table("profiles").upsert(
            {
                "user_id": current_user.id,
                "full_name": data.full_name,
                "age": data.age,
                "gender": data.gender,
                "location": data.location,
                "avatar": data.avatar,
                "health_profile": data.health_profile.model_dump(),
                "questionnaire_responses": data.questionnaire_responses,
                "primary_doctor": data.primary_doctor.model_dump(),
                "emergency_contact": data.emergency_contact.model_dump(),
                "setup_completed": data.setup_completed,
                "updated_at": datetime.utcnow().isoformat(),
            },
            on_conflict="user_id",
        ).execute()

        return {
            "success": True,
            "user_id": current_user.id,
            "message": "Profile setup completed successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/complete-onboarding")
async def complete_onboarding(current_user=Depends(get_current_user)):
    """
    Mark onboarding as complete for the current user
    """
    try:
        # Update or insert user profile
        result = supabase.table("user_profiles").upsert({
            "user_id": current_user.id,
            "email": current_user.email,
            "onboarding_completed": True,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        
        return {
            "success": True,
            "message": "Onboarding completed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class OnboardingStepRequest(BaseModel):
    step: int
    data: Dict


@router.post("/auth/onboarding-step")
async def save_onboarding_step(
    request: OnboardingStepRequest,
    current_user=Depends(get_current_user)
):
    """
    Save onboarding progress for a specific step to the profiles table
    """
    try:
        # Prepare data to update in profiles table
        update_data = {
            "updated_at": datetime.utcnow().isoformat()
        }

        # Map step data to profile columns
        if request.step == 1:
            # Personal details
            update_data["full_name"] = request.data.get("name")
            update_data["age"] = request.data.get("age")
            update_data["location"] = request.data.get("location")
        elif request.step == 2:
            # Avatar
            update_data["avatar"] = request.data.get("avatar_id")
        elif request.step == 3:
            # Health profile from extracted data
            if request.data.get("extracted_data"):
                update_data["health_profile"] = request.data.get("extracted_data")
        elif request.step == 4:
            # Questionnaire
            update_data["gender"] = request.data.get("gender")
            update_data["questionnaire_responses"] = request.data.get("health_questionnaire")
        elif request.step == 5:
            # Primary doctor
            update_data["primary_doctor"] = {
                "name": request.data.get("primary_doctor", ""),
                "hospital": request.data.get("hospital", "")
            }
        elif request.step == 6:
            # Emergency contact
            update_data["emergency_contact"] = {
                "name": request.data.get("emergency_contact"),
                "phone": request.data.get("phone")
            }

        # Update profiles table where user_id matches
        supabase.table("profiles").update(update_data).eq("user_id", current_user.id).execute()
        return {
            "success": True,
            "step": request.step,
            "message": f"Step {request.step} saved to profiles table successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
