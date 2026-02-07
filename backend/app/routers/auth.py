from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

from app.supabase_client import supabase
from app.controllers.auth_controller import signup_user, signin_user, get_current_user

router = APIRouter()


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

@router.post("/auth/logout")
async def logout_user(user=Depends(get_current_user)):
    supabase.auth.sign_out()
    return {"message": "Logged out successfully"}

@router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return {"user": current_user}


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
