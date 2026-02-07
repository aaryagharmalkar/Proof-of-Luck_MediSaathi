"""Supabase client singleton for the app.
This keeps Supabase initialization separate to avoid circular imports.
"""
from supabase import create_client, Client
from app.config import settings


supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_key,
)
