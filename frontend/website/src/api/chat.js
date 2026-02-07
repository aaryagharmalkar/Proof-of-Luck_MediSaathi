// src/api/chat.js

export async function sendMessageToChat(messages) {
  const response = await fetch("http://127.0.0.1:5050/api/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: messages,
    }),
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return await response.json();
}