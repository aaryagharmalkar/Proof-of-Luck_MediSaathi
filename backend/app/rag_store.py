from typing import Optional, Dict, Any, List
import requests

from app.config import settings
from app.supabase_client import supabase


def _ollama_embed(text: str) -> Optional[List[float]]:
    try:
        r = requests.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.ollama_embed_model, "prompt": text},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("embedding")
    except Exception:
        return None


def store_patient_document(
    *,
    user_id: str,
    member_id: Optional[str],
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Best-effort insert into patient_documents for RAG. Never raises."""
    try:
        if not content or not str(content).strip():
            return
        clean_member_id = member_id
        if clean_member_id in ("", "me", "null"):
            clean_member_id = None
        embedding = _ollama_embed(content)
        if not embedding:
            return
        row = {
            "user_id": user_id,
            "member_id": clean_member_id,
            "content": str(content).strip()[:50000],
            "metadata": metadata or {},
            "embedding": embedding,
        }
        supabase.table("patient_documents").insert(row).execute()
    except Exception:
        # Never block core flows if RAG insert fails.
        return
