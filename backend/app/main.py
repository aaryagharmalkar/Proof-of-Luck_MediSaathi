"""
Main FastAPI application for MediSaathi.
Database: Supabase only. No MongoDB.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, auth, health_records, reports, medicines, appointments, chat, members, doctors

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for FastAPI application."""
    logger.info("Starting MediSaathi API...")
    yield
    logger.info("Shutting down MediSaathi API...")


# Initialize FastAPI application
app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="AI-powered healthcare companion API",
    lifespan=lifespan
)

# Configure CORS from env (set CORS_ORIGINS in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix=settings.api_v1_prefix, tags=["Health"])
app.include_router(auth.router, prefix=settings.api_v1_prefix, tags=["Auth"])
app.include_router(health_records.router, prefix=settings.api_v1_prefix, tags=["Health Records"])
app.include_router(
    reports.router,
    prefix=settings.api_v1_prefix,
    tags=["Reports"]
)
app.include_router(medicines.router, prefix=settings.api_v1_prefix, tags=["Medicines"])
app.include_router(chat.router, prefix=settings.api_v1_prefix, tags=["Chat"])
app.include_router(appointments.router, prefix=settings.api_v1_prefix, tags=["Appointments"])
app.include_router(members.router, prefix=settings.api_v1_prefix, tags=["Members"])
app.include_router(doctors.router, prefix=settings.api_v1_prefix, tags=["Doctors"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to MediSaathi API",
        "version": "0.1.0",
        "docs": "/docs"
    }
