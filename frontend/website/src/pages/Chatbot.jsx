import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Send, Bot, Sparkles, User, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { getApiBaseUrl } from "@/api/baseUrl";
import { Switch } from "@/components/ui/switch";
import { useActiveMember } from "@/lib/ActiveMemberContext";
import AgentStatusIndicator from "@/components/AgentStatusIndicator";
import AgentLogViewer from "@/components/AgentLogViewer";

export default function Chatbot() {
  const location = useLocation();
  const initialQuery = location.state?.initialQuery;
  const { activeMember } = useActiveMember();

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I can help you understand your health records, medications, and symptoms. What's on your mind?",
    },
  ]);

  const [input, setInput] = useState(initialQuery || "");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const streamTextRef = useRef("");
  const [agentEnabled, setAgentEnabled] = useState(() => {
    const stored = localStorage.getItem("agent_enabled");
    return stored ? stored === "true" : true;
  });
  const [logRefreshKey, setLogRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem("agent_enabled", String(agentEnabled));
  }, [agentEnabled]);

  /* ---------- AUTO SCROLL ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ---------- AUTO SEND INITIAL QUERY ---------- */
  useEffect(() => {
    if (initialQuery) {
      sendMessage(initialQuery);
      window.history.replaceState({}, document.title);
    }
  }, []);

  /* ---------- SUGGESTIONS ---------- */
  const suggestions = [
    "Summarize my last visit",
    "Any side effects for my meds?",
    "Explain my blood test results",
  ];

  /* ---------- SEND MESSAGE ---------- */
  const sendMessage = async (textOverride = null) => {
    if (loading) return;
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const conversationHistory = [...messages, { role: "user", content: textToSend }].slice(-10);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: textToSend },
      { role: "assistant", content: "" }, // Placeholder
    ]);

    if (!textOverride) setInput("");
    setLoading(true);
    setLogRefreshKey((prev) => prev + 1);
    streamTextRef.current = "";

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      
      const response = await fetch(`${getApiBaseUrl()}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: textToSend,
          member_id: activeMember?.id || null,
          conversation_history: conversationHistory,
          enable_agent: agentEnabled,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value || new Uint8Array());

        if (chunk) {
          const prevText = streamTextRef.current;
          const nextText = chunk.startsWith(prevText) ? chunk : prevText + chunk;
          streamTextRef.current = nextText;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx].content = streamTextRef.current;
            return updated;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = "❌ I'm having trouble connecting to your health data. Please try again.";
        return updated;
      });
    } finally {
      setLoading(false);
      setLogRefreshKey((prev) => prev + 1);
      setTimeout(() => setLogRefreshKey((prev) => prev + 1), 2000);
      setTimeout(() => setLogRefreshKey((prev) => prev + 1), 5000);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100 flex flex-col items-center justify-start p-4 md:p-8">
       {/* Background Blobs */}
       <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
       </div>

       {/* Chat Card */}
       <div className="w-full max-w-5xl h-full bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl shadow-gray-200/50 rounded-[2.5rem] flex flex-col overflow-hidden relative rings-1 ring-black/5">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/50 bg-white/50 backdrop-blur-md sticky top-0 z-10">
             <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-teal-500 to-emerald-500 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                   <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                   <h2 className="text-lg font-bold text-gray-900">Health Assistant</h2>
                   <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-gray-500 font-medium">Online & Ready</span>
                   </div>
                </div>
             </div>
             
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                   <Switch checked={agentEnabled} onCheckedChange={setAgentEnabled} />
                   <span className="font-medium">Auto-save health data</span>
                </div>
                <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full font-semibold border border-blue-100 flex items-center gap-1.5">
                   <Info className="w-3.5 h-3.5" />
                   medical info only
                </div>
             </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-gray-50/30">
             <div className="space-y-6 max-w-3xl mx-auto">
                <AgentStatusIndicator enabled={agentEnabled} />
                <AnimatePresence initial={false}>
                   {messages.map((m, i) => (
                      <motion.div
                         key={i}
                         initial={{ opacity: 0, y: 15, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         transition={{ duration: 0.3 }}
                         className={cn(
                            "flex gap-4 group",
                            m.role === "user" ? "justify-end" : "justify-start"
                         )}
                      >
                         {m.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                               <Bot className="w-4 h-4 text-teal-700" />
                            </div>
                         )}

                         <div
                            className={cn(
                               "max-w-[85%] px-6 py-4 text-[15px] leading-relaxed shadow-sm transition-all relative",
                               m.role === "user"
                                  ? "bg-gray-900 text-white rounded-2xl rounded-tr-sm shadow-xl shadow-gray-200/30"
                                  : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm shadow-md shadow-gray-100/50"
                            )}
                         >
                            {m.role === "assistant" ? (
                               <div className="markdown-body">
                                  {m.content || (loading && i === messages.length - 1 ? (
                                    <div className="inline-flex items-center gap-1">
                                      <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                                      <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} />
                                      <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                                    </div>
                                  ) : null)}
                               </div>
                            ) : (
                               m.content
                            )}
                         </div>
                         
                         {m.role === "user" && (
                           <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <User className="w-4 h-4 text-gray-500" />
                           </div>
                         )}
                      </motion.div>
                   ))}
                </AnimatePresence>

                <div ref={messagesEndRef} className="h-4" />
             </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-100/50">
             <div className="max-w-3xl mx-auto space-y-3">
                 {/* Suggestions */}
                 {messages.length < 3 && !loading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap gap-2 justify-center mb-2"
                    >
                       {suggestions.map((s, idx) => (
                          <button 
                             key={idx}
                             onClick={() => sendMessage(s)}
                             className="text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 px-4 py-2 rounded-full transition-all duration-200 shadow-sm"
                          >
                             {s}
                          </button>
                       ))}
                    </motion.div>
                 )}

                 <div className="relative group">
                    <Input
                       value={input}
                       onChange={(e) => setInput(e.target.value)}
                       placeholder="Ask about your health..."
                       onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
                       className="rounded-full pl-6 pr-14 py-7 bg-white/50 border-gray-200 focus:bg-white focus:ring-4 focus:ring-teal-100 focus:border-teal-400 text-lg shadow-inner transition-all"
                       disabled={loading}
                    />
                    
                    <motion.button
                       whileHover={{ scale: 1.05 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={() => sendMessage()}
                       disabled={!input.trim() || loading}
                       className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                          !input.trim() || loading 
                             ? "bg-gray-100 text-gray-400" 
                             : "bg-teal-600 text-white hover:bg-teal-700 hover:shadow-teal-600/30"
                       )}
                    >
                       {loading ? <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </motion.button>
                 </div>
                 <p className="text-center text-[10px] text-gray-400 font-medium">
                    AI responses may vary. Check with a doctor for medical decisions.
                 </p>
                 <AgentLogViewer refreshKey={logRefreshKey} />
             </div>
          </div>
       </div>
    </div>
  );
}
