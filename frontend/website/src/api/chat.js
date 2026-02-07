// src/api/chat.js

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api/v1`
  : "http://localhost:5050/api/v1";

export async function sendMessageToChat(messages) {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return await response.json();
}