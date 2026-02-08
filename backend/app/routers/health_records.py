"""
Health records and metrics endpoints (Supabase).
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from supabase import create_client

from app.config import settings
from app.controllers.auth_controller import get_current_user
from app.supabase_client import supabase as global_supabase
from app.rag_store import store_patient_document

supabase = global_supabase

router = APIRouter()
logger = logging.getLogger(__name__)


class HealthRecordCreate(BaseModel):
    metric: str
    value: float
    unit: str
    date: str
    status: Optional[str] = None
    notes: Optional[str] = None
    member_id: Optional[str] = None  # If None, record is for the logged-in user


class HealthRecordResponse(BaseModel):
    id: str
    metric: str
    value: float
    unit: str
    date: str
    status: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


@router.post("/health/records")
async def create_health_record(
    record: HealthRecordCreate,
    current_user=Depends(get_current_user),
    authorization: str = Header(None)
):
    """Create a new health record for the current user or a family member."""
    try:
        # If member_id is provided, verify it belongs to the user
        if record.member_id:
            member_check = supabase.table("members").select("id").eq("id", record.member_id).eq("user_id", current_user.id).execute()
            if not member_check.data:
                raise HTTPException(status_code=404, detail="Member not found")
        
        # Create authenticated client locally to respect RLS
        token = authorization.split(" ")[1]
        client = create_client(settings.supabase_url, settings.supabase_key)
        client.postgrest.auth(token)

        row = {
            "user_id": current_user.id,
            "member_id": record.member_id,
            "metric": record.metric,
            "value": record.value,
            "unit": record.unit,
            "date": record.date,
            "status": record.status,
            "notes": record.notes,
            "created_at": datetime.utcnow().isoformat(),
        }
        result = client.table("health_records").insert(row).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create record")
        created = result.data[0]
        try:
            if record.notes and (record.unit == "summary" or record.metric.endswith("_summary")):
                store_patient_document(
                    user_id=current_user.id,
                    member_id=record.member_id,
                    content=record.notes,
                    metadata={
                        "source": "health_record_summary",
                        "metric": record.metric,
                        "record_id": created.get("id"),
                    },
                )
        except Exception:
            pass
        return {
            "success": True,
            "record_id": created.get("id"),
            "message": f"Health record for {record.metric} created successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Error creating health record: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/records")
async def get_health_records(
    metric: Optional[str] = None,
    member_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    authorization: str = Header(None)
):
    """Get health records for the current user or a specific family member, optionally filtered by metric."""
    try:
        # If member_id is provided, verify it belongs to the user
        if member_id:
            member_check = supabase.table("members").select("id").eq("id", member_id).eq("user_id", current_user.id).execute()
            if not member_check.data:
                raise HTTPException(status_code=404, detail="Member not found")
        
        token = authorization.split(" ")[1]
        client = create_client(settings.supabase_url, settings.supabase_key)
        client.postgrest.auth(token)

        query = client.table("health_records").select("*").eq("user_id", current_user.id)
        
        if member_id:
            query = query.eq("member_id", member_id)
        else:
            # Only records for the user themselves (member_id is NULL)
            query = query.is_("member_id", "null")
        
        if metric:
            query = query.eq("metric", metric)
        
        result = query.order("created_at", desc=True).limit(100).execute()
        records = result.data or []
        return {
            "success": True,
            "records": records,
            "count": len(records),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/records/{record_id}")
async def get_health_record(
    record_id: str,
    current_user=Depends(get_current_user),
    authorization: str = Header(None)
):
    """Get a specific health record by ID (must belong to current user)."""
    try:
        token = authorization.split(" ")[1]
        client = create_client(settings.supabase_url, settings.supabase_key)
        client.postgrest.auth(token)

        result = (
            client.table("health_records")
            .select("*")
            .eq("id", record_id)
            .eq("user_id", current_user.id)
            .maybe_single()
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Record not found")
        return {
            "success": True,
            "record": result.data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
