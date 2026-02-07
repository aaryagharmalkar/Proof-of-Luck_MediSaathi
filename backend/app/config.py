"""
Configuration management for MediSaathi backend
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB (legacy; not used in current code paths)
    mongodb_url: str | None = None
    mongodb_db_name: str = "medisaathi"

    # Supabase
    supabase_url: str
    supabase_key: str
    jwt_secret: str


    # AI
    groq_api_key: str
    gemini_api_key: str = "AIzaSyD9V1z0sX1Y2b3C4d5E6f7G8h9I0jK1L2M"

    # Server
    host: str = "0.0.0.0"
    port: int = 5050
    debug: bool = True

    # Security
    secret_key: str

    # API
    api_v1_prefix: str = "/api/v1"
    project_name: str = "MediSaathi API"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
