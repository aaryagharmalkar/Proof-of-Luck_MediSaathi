from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List
import uuid
import chromadb
import requests

from app.config import settings

router = APIRouter(prefix="/reports", tags=["Reports"])


# ============================
# ChromaDB
# ============================

chroma = chromadb.Client(
    settings=chromadb.Settings(
        persist_directory="./chroma_reports"
    )
)


# ============================
# Schemas
# ============================

class UploadReportRequest(BaseModel):
    patientId: str
    fullText: str
    fileName: str


class QueryRequest(BaseModel):
    query: str
    topK: int = 5


# ============================
# Utils
# ============================

def chunk_text(text, size=500, overlap=100):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i + size]
        chunks.append(" ".join(chunk))
        i += size - overlap
    return chunks


# ============================
# ROUTES
# ============================

@router.post("/upload")
async def upload_report(payload: UploadReportRequest):
    report_id = str(uuid.uuid4())
    collection_name = f"report_{report_id}"

    collection = chroma.get_or_create_collection(collection_name)

    chunks = chunk_text(payload.fullText)

    for i, chunk in enumerate(chunks):
        collection.add(
            ids=[f"{report_id}_{i}"],
            documents=[chunk]
        )

    return {
        "success": True,
        "reportId": report_id
    }


@router.post("/{report_id}/summarize")
async def summarize_report(report_id: str, request: Request):
    lang = request.headers.get("accept-language", "en")[:2]

    collection = chroma.get_or_create_collection(f"report_{report_id}")

    results = collection.query(
        query_texts=["medical diagnosis findings treatment"],
        n_results=10
    )

    context = "\n\n".join(results["documents"][0])

    prompt = f"""
Respond in {lang}.

Summarize this medical report clearly and safely:

{context}
"""

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 600
        },
        timeout=30
    )

    data = response.json()

    if "choices" not in data:
        raise RuntimeError(f"Groq error: {data}")

    summary = data["choices"][0]["message"]["content"]

    return {
        "success": True,
        "summary": summary
    }


@router.post("/{report_id}/query")
async def query_report(report_id: str, payload: QueryRequest):
    collection = chroma.get_or_create_collection(f"report_{report_id}")

    results = collection.query(
        query_texts=[payload.query],
        n_results=payload.topK
    )

    context = "\n\n".join(results["documents"][0])

    prompt = f"""
Answer the question using ONLY the context.

Context:
{context}

Question:
{payload.query}
"""

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 600
        },
        timeout=30
    )

    data = response.json()

    if "choices" not in data:
        raise RuntimeError(f"Groq error: {data}")

    return {
        "success": True,
        "answer": data["choices"][0]["message"]["content"]
    }
