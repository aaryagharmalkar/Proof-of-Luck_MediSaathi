"""
Launcher for MediSaathi backend. The actual app lives in app.main.
Run: uvicorn app.main:app --reload --host 0.0.0.0 --port 5050
"""
import uvicorn

from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
