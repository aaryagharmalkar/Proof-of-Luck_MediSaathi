import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Send, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your MediSaathi AI assistant. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  /* ---------- AUTO SCROLL ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ---------- SEND MESSAGE (STREAMING) ---------- */
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();

    // Add user + empty assistant placeholder
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5050/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        const chunk = decoder.decode(value || new Uint8Array());

        if (chunk) {
          // Merge streamed chunk with existing assistant content by removing
          // any overlap between the end of prevContent and start of chunk.
          // This handles both cumulative and delta-style streams and avoids
          // duplicated words like "How How".
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            const prevContent = updated[lastIdx]?.content || "";

            if (!prevContent) {
              updated[lastIdx].content = chunk;
              return updated;
            }

            // Find the longest overlap where a suffix of prevContent equals a prefix of chunk
            const maxOverlap = Math.min(prevContent.length, chunk.length);
            let overlap = 0;
            for (let k = maxOverlap; k > 0; k--) {
              if (prevContent.slice(-k) === chunk.slice(0, k)) {
                overlap = k;
                break;
              }
            }

            // Append only the non-overlapping part
            updated[lastIdx].content = prevContent + chunk.slice(overlap);
            return updated;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "❌ Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-8">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-2xl p-6 shadow-sm border"
          >
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={cn(
                      "flex gap-3 items-start",
                      m.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    )}
                  >
                    {m.role === "assistant" && (
                      <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                        <Bot className="w-4 h-4 text-teal-600" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[65%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-teal-500 text-white shadow"
                          : "bg-white border shadow-sm"
                      )}
                    >
                      {m.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 items-center"
                >
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                    <Bot className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-sm text-gray-400">Typing…</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex gap-2 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a health question…"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="rounded-full px-4 py-2"
          />

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={sendMessage}
            disabled={!input.trim()}
            className={cn(
              "rounded-full px-3 py-2 text-white",
              !input.trim() ? "bg-gray-300" : "bg-teal-500"
            )}
          >
            <Send />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
