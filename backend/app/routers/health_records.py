"""
Health records and metrics endpoints (Supabase).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.controllers.auth_controller import get_current_user
from app.supabase_client import supabase

router = APIRouter()


class HealthRecordCreate(BaseModel):
    metric: str
    value: float
    unit: str
    date: str
    status: Optional[str] = None
    notes: Optional[str] = None


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
):
    """Create a new health record for the current user."""
    try:
        row = {
            "user_id": current_user.id,
            "metric": record.metric,
            "value": record.value,
            "unit": record.unit,
            "date": record.date,
            "status": record.status,
            "notes": record.notes,
            "created_at": datetime.utcnow().isoformat(),
        }
        result = supabase.table("health_records").insert(row).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create record")
        created = result.data[0]
        return {
            "success": True,
            "record_id": created.get("id"),
            "message": f"Health record for {record.metric} created successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/records")
async def get_health_records(
    metric: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """Get health records for the current user, optionally filtered by metric."""
    try:
        query = supabase.table("health_records").select("*").eq("user_id", current_user.id)
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
):
    """Get a specific health record by ID (must belong to current user)."""
    try:
        result = (
            supabase.table("health_records")
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
