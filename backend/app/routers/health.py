"""
Health check and Supabase connectivity endpoints.
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.supabase_client import supabase

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "MediSaathi API",
    }


@router.get("/health/db")
async def database_health_check():
    """Check Supabase connectivity (lightweight query)."""
    try:
        # Minimal query to verify Supabase is reachable
        supabase.table("user_profiles").select("user_id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "supabase",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Supabase connection failed: {str(e)}",
        )
