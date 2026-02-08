from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
from app.supabase_client import supabase
from app.controllers.auth_controller import get_current_user

router = APIRouter()


class MemberCreate(BaseModel):
    name: str
    relation: Optional[str] = None
    avatar: Optional[str] = None


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    relation: Optional[str] = None
    avatar: Optional[str] = None


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


class MemberProfileSetup(BaseModel):
    age: int
    gender: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    health_profile: Optional[HealthProfile] = None
    questionnaire_responses: Optional[Dict[str, str]] = None
    primary_doctor: Optional[PrimaryDoctor] = None
    emergency_contact: Optional[EmergencyContact] = None
    profile_completed: bool = True


class MemberProfileUpdate(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    health_profile: Optional[Dict] = None
    questionnaire_responses: Optional[Dict] = None
    primary_doctor: Optional[Dict] = None
    emergency_contact: Optional[Dict] = None
    profile_completed: Optional[bool] = None


@router.get("/members")
async def list_members(current_user=Depends(get_current_user)):
    try:
        res = supabase.table("members") \
            .select("*") \
            .eq("user_id", current_user.id) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/members")
async def create_member(payload: MemberCreate, current_user=Depends(get_current_user)):
    try:
        data = {
            "user_id": current_user.id,
            "name": payload.name,
            "relationship": payload.relation,
            "avatar": payload.avatar,
        }
        res = supabase.table("members").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create member")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/members/{member_id}")
async def delete_member(member_id: str, current_user=Depends(get_current_user)):
    try:
        res = supabase.table("members") \
            .delete() \
            .eq("id", member_id) \
            .eq("user_id", current_user.id) \
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Member not found")
        return {"success": True, "deleted": res.data[0]}
    except Exception as e:
        # If invalid ObjectId, return 404
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/members/{member_id}")
async def update_member(member_id: str, payload: MemberUpdate, current_user=Depends(get_current_user)):
    try:
        update_data = {}
        if payload.name is not None:
            update_data["name"] = payload.name
        if payload.relation is not None:
            update_data["relationship"] = payload.relation
        if payload.avatar is not None:
            update_data["avatar"] = payload.avatar

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        update_data["updated_at"] = datetime.utcnow().isoformat()
        res = supabase.table("members") \
            .update(update_data) \
            .eq("id", member_id) \
            .eq("user_id", current_user.id) \
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Member not found")
        return res.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/members/{member_id}/profile")
async def get_member_profile(member_id: str, current_user=Depends(get_current_user)):
    """Get the full profile of a family member."""
    try:
        res = supabase.table("members") \
            .select("*") \
            .eq("id", member_id) \
            .eq("user_id", current_user.id) \
            .maybe_single() \
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Member not found")
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/members/{member_id}/profile/setup")
async def setup_member_profile(member_id: str, data: MemberProfileSetup, current_user=Depends(get_current_user)):
    """Complete onboarding setup for a family member."""
    try:
        # Verify member belongs to user
        member = supabase.table("members") \
            .select("*") \
            .eq("id", member_id) \
            .eq("user_id", current_user.id) \
            .maybe_single() \
            .execute()
        
        if not member.data:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Update with profile data
        update_data = {
            "age": data.age,
            "gender": data.gender,
            "location": data.location,
            "latitude": data.latitude,
            "longitude": data.longitude,
            "health_profile": data.health_profile.model_dump() if data.health_profile else {},
            "questionnaire_responses": data.questionnaire_responses or {},
            "primary_doctor": data.primary_doctor.model_dump() if data.primary_doctor else {},
            "emergency_contact": data.emergency_contact.model_dump() if data.emergency_contact else {},
            "profile_completed": data.profile_completed,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        res = supabase.table("members") \
            .update(update_data) \
            .eq("id", member_id) \
            .eq("user_id", current_user.id) \
            .execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to update member profile")
        
        return {
            "success": True,
            "member_id": member_id,
            "message": "Member profile setup completed successfully",
            "data": res.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/members/{member_id}/profile")
async def update_member_profile(member_id: str, data: MemberProfileUpdate, current_user=Depends(get_current_user)):
    """Partially update a member's profile."""
    try:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        res = supabase.table("members") \
            .update(update_data) \
            .eq("id", member_id) \
            .eq("user_id", current_user.id) \
            .execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Member not found")
        
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
