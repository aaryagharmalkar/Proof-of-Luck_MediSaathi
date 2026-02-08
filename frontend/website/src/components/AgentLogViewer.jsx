import React, { useEffect, useState } from "react";
import api from "@/api/apiClient";

export default function AgentLogViewer({ refreshKey = 0 }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const { data } = await api.get("/chat/agent-log", { params: { limit: 5 } });
        const entries = data?.log_entries || [];
        // Only keep logs that came from Supabase (exclude in-memory fallback ids)
        const filtered = entries.filter((entry) => !String(entry.id || "").startsWith("inmem-"));
        setLogs(filtered);
      } catch {
        setLogs([]);
      }
    };
    loadLogs();
  }, [refreshKey]);

  return (
    <div className="mt-4">
      <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-white/80">
        <div className="max-h-60 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Time</th>
                <th className="px-3 py-2 text-left font-semibold">Iter</th>
                <th className="px-3 py-2 text-left font-semibold">State</th>
                <th className="px-3 py-2 text-left font-semibold">Action</th>
                <th className="px-3 py-2 text-left font-semibold">Observation</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-gray-400" colSpan={5}>
                    No logs yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-500">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "--"}
                  </td>
                  <td className="px-3 py-2">{log.iteration ?? "-"}</td>
                  <td className="px-3 py-2">{log.agent_state}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2 text-gray-500 truncate max-w-[240px]">
                    {log.observation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
