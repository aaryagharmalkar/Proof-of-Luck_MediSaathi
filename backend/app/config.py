"""
Configuration management for MediSaathi backend.
All secrets must come from environment; no default secrets.
"""
from pydantic_settings import BaseSettings


def _parse_cors_origins(v: str) -> list[str]:
    """Parse comma-separated CORS origins; strip whitespace; omit empty."""
    if not v or not v.strip():
        return []
    return [o.strip() for o in v.split(",") if o.strip()]


class Settings(BaseSettings):
    # Supabase (service_role key bypasses RLS for server-side operations)
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str | None = None
    jwt_secret: str

    # AI (no default API keys; set in .env)
    groq_api_key: str = ""
    gemini_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "mistral"
    ollama_embed_model: str = "nomic-embed-text"
    openrouter_api_key: str | None = None

    # Server
    host: str = "0.0.0.0"
    port: int = 5050
    debug: bool = False
    env_name: str = "development"  # development | production

    # CORS: comma-separated list of allowed origins (e.g. https://app.example.com,http://localhost:5173)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081"

    # Security (required; no defaults)
    secret_key: str
    report_encryption_key: str  # 32-byte key for report encryption (hex or base64)

    # API
    api_v1_prefix: str = "/api/v1"
    project_name: str = "MediSaathi API"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

    @property
    def cors_origins_list(self) -> list[str]:
        return _parse_cors_origins(self.cors_origins)

    @property
    def is_production(self) -> bool:
        return self.env_name.lower() == "production"


settings = Settings()
