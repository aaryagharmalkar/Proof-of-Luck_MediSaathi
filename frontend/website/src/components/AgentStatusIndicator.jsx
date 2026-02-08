import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import api from "@/api/apiClient";
import { cn } from "@/lib/utils";

const pollIntervalMs = 2500;

const sumExtracted = (summary) =>
  Object.values(summary || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);

export default function AgentStatusIndicator({ enabled = true }) {
  const [agentStatus, setAgentStatus] = useState(null);
  const [clarifications, setClarifications] = useState([]);
  const [answers, setAnswers] = useState({});
  const [showSaved, setShowSaved] = useState(false);
  const [lastSavedToken, setLastSavedToken] = useState(null);

  const extractedCount = useMemo(
    () => sumExtracted(agentStatus?.extracted_data_summary),
    [agentStatus]
  );

  const fetchStatus = async () => {
    try {
      const { data } = await api.get("/chat/agent-status");
      setAgentStatus(data);

      const savedToken = data?.last_saved?.timestamp;
      if (data?.last_saved?.count > 0 && savedToken && savedToken !== lastSavedToken) {
        setShowSaved(true);
        setLastSavedToken(savedToken);
        setTimeout(() => setShowSaved(false), 5000);
      }

      if (!data?.agent_active) {
        const res = await api.get("/chat/pending-clarifications");
        setClarifications(res.data?.clarifications || []);
      }
    } catch {
      // Silent fail
    }
  };

  useEffect(() => {
    if (!enabled) return undefined;
    fetchStatus();
    const interval = setInterval(fetchStatus, pollIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, lastSavedToken]);

  const handleSubmit = async (id) => {
    const answer = answers[id]?.trim();
    if (!answer) return;
    await api.post(`/chat/answer-clarification/${id}`, { answer });
    setClarifications((prev) => prev.filter((c) => c.id !== id));
    setAnswers((prev) => ({ ...prev, [id]: "" }));
  };

  const handleDismiss = async (id) => {
    await api.post(`/chat/answer-clarification/${id}`, { answer: "", dismiss: true });
    setClarifications((prev) => prev.filter((c) => c.id !== id));
  };

  if (!enabled) return null;

  return (
    <div className="space-y-3 mb-4">
      <AnimatePresence>
        {agentStatus?.agent_active && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-800"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div>
                <div className="font-semibold">AI Agent Working</div>
                <div className="text-xs text-teal-700/80">
                  {agentStatus?.current_state} - Found {extractedCount} item(s)
                </div>
              </div>
            </div>
            <span className="text-xs font-medium text-teal-700">
              {agentStatus?.current_iteration}/{agentStatus?.max_iterations}
            </span>
          </motion.div>
        )}

        {showSaved && agentStatus?.last_saved?.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900"
          >
            <CheckCircle2 className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-semibold">Health data saved</div>
              <div className="text-xs text-emerald-700/80">
                Saved {agentStatus?.last_saved?.count} item(s) from this chat.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {clarifications.length > 0 && (
        <div className="space-y-2">
          {clarifications.map((c, index) => (
            <div
              key={c.id || index}
              className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900"
            >
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">Need clarification</div>
                  <p className="text-xs text-amber-700/80 mt-1">{c.question}</p>
                  {c.context && (
                    <p className="text-[11px] text-amber-600/70 mt-1">
                      Context: {c.context}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={answers[c.id] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="Your answer..."
                      className={cn(
                        "flex-1 min-w-[220px] rounded-full border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      )}
                    />
                    <button
                      onClick={() => handleSubmit(c.id)}
                      className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => handleDismiss(c.id)}
                      className="rounded-full border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
