from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import requests
import json

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

chat_history = [
    {
        "role": "system",
        "content": (
            "You are MediSaathi, a responsible medical AI assistant. "
            "Provide general medical information only. "
            "Do not diagnose or prescribe. "
            "Encourage consulting healthcare professionals."
        )
    }
]

@router.post("/chat")
def chat(req: ChatRequest):
    chat_history.append({
        "role": "user",
        "content": req.message
    })

    def stream():
        with requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "mistral",
                "prompt": req.message,
                "stream": True
            },
            stream=True,
            timeout=60
        ) as r:
            for line in r.iter_lines():
                if not line:
                    continue

                data = json.loads(line.decode("utf-8"))

                if "response" in data:
                    yield data["response"]

                if data.get("done"):
                    break

    return StreamingResponse(stream(), media_type="text/plain")
