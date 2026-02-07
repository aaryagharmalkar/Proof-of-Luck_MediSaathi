from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
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
