"""Supabase client singleton for the app.
This keeps Supabase initialization separate to avoid circular imports.
Uses service_role key when set so backend can bypass RLS (anon key has auth.uid() = null).
"""
from supabase import create_client, Client
from app.config import settings

# Prefer service_role key so inserts/updates from the API are not blocked by RLS
_key = settings.supabase_service_role_key or settings.supabase_key
supabase: Client = create_client(settings.supabase_url, _key)


def get_supabase_client(*, use_service_role: bool = False) -> Client:
    """
    Create a Supabase client.
    - use_service_role=True will use SERVICE_ROLE_KEY when available.
    - Otherwise uses anon/public key.
    """
    if use_service_role and settings.supabase_service_role_key:
        key = settings.supabase_service_role_key
    else:
        key = settings.supabase_key
    return create_client(settings.supabase_url, key)
