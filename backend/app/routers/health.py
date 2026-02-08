"""
Health and readiness endpoints for MediSaathi API.
"""
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.supabase_client import supabase

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """Liveness: service is up."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.project_name,
        "version": "0.1.0",
    }


@router.get("/health/db")
async def database_health_check():
    """Readiness: Supabase connectivity (lightweight query)."""
    try:
        supabase.table("user_profiles").select("user_id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "supabase",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.exception("Supabase health check failed")
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )
