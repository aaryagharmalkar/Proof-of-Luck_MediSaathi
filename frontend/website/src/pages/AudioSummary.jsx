import React, { useState, useRef } from "react";
import { uploadAudio, getStatus, fetchSummary } from "@/api/audioSummarizer";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Square, UploadCloud, FileAudio, CheckCircle2, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AudioSummary() {
  const [audio, setAudio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [processingStage, setProcessingStage] = useState("");
  const [progress, setProgress] = useState(0);

  // 🎙️ Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /* ============================
     🎙️ RECORD AUDIO
  ============================ */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // 🔥 Wrap Blob as File (critical for FastAPI)
        const audioFile = new File(
          [audioBlob],
          `recording-${Date.now()}.webm`,
          { type: "audio/webm" }
        );

        setAudio(audioFile);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  /* ============================
     ⬆️ UPLOAD + PROCESS
  ============================ */
  const handleUpload = async () => {
    if (!audio) return alert("Please upload or record audio");

    try {
      setLoading(true);
      setProcessingStage("uploading");
      setProgress(0);
      setSummary(null);

      // 1️⃣ Upload audio
      const uploadResponse = await uploadAudio(audio);
      const audioName = uploadResponse.audio_name;

      setProcessingStage("processing");
      setProgress(30);

      // 2️⃣ Poll status
      let completed = false;
      let pollCount = 0;
      const maxPolls = 120;

      while (!completed && pollCount < maxPolls) {
        await delay(1500);
        pollCount++;

        const statusResponse = await getStatus();

        setProcessingStage(statusResponse.stage || "processing");
        setProgress(statusResponse.progress || 50);

        if (statusResponse.stage === "completed") {
          completed = true;
          setProgress(100);

          const finalSummary = await fetchSummary(audioName);
          setSummary(finalSummary);
        }

        if (statusResponse.stage === "error") {
          throw new Error(statusResponse.message || "Processing failed");
        }
      }

      if (!completed) {
        throw new Error("Processing timeout");
      }
    } catch (err) {
      console.error("Audio processing error:", err);
      alert(`Failed to summarize audio: ${err.message}`);
    } finally {
      setLoading(false);
      setProcessingStage("");
      setProgress(0);
    }
  };

  /* ============================
     🧠 UI
  ============================ */
  return (
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100 flex flex-col items-center py-12 px-4">
      
      {/* Background Blobs */}
       <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
       </div>

      <div className="max-w-3xl w-full space-y-8 z-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
           <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Audio Summariser</h1>
           <p className="text-lg text-gray-500">Record usage or upload an audio file to get an instant medical summary.</p>
        </div>

        {/* Main Card */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl shadow-gray-200/50 rounded-[2.5rem] p-8 md:p-10"
        >
          {/* Input Section */}
          <div className="space-y-8">
            
            {/* 1. File Upload Box */}
            <div className="relative group">
               <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm"
                  onChange={(e) => setAudio(e.target.files[0])}
                  disabled={loading || isRecording}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
               />
               <div className={`
                  border-3 border-dashed rounded-[2rem] p-8 text-center transition-all duration-300
                  ${audio 
                     ? "border-teal-500 bg-teal-50/50" 
                     : "border-gray-200 bg-white/50 hover:border-teal-300 hover:bg-teal-50/20 group-hover:scale-[1.01]"
                  }
               `}>
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                     <UploadCloud className={`w-8 h-8 ${audio ? "text-teal-600" : "text-gray-400"}`} />
                  </div>
                  {audio ? (
                     <div>
                        <p className="font-bold text-teal-800 text-lg">{audio.name}</p>
                        <p className="text-teal-600/70 text-sm mt-1">Ready to process</p>
                     </div>
                  ) : (
                     <div>
                        <p className="font-bold text-gray-700 text-lg">Click to Upload Audio</p>
                        <p className="text-gray-400 text-sm mt-1">MP3, WAV, M4A, WEBM</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white/50 px-2 rounded-lg backdrop-blur-sm">Or Record Now</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* 2. Recording & Action Buttons */}
            <div className="grid md:grid-cols-2 gap-4">
               <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  className={`
                     flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-gray-200/50
                     ${isRecording 
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/30" 
                        : "bg-white border text-gray-700 hover:bg-gray-50 border-gray-200"
                     }
                  `}
               >
                  {isRecording ? (
                     <>
                        <Square className="w-5 h-5 fill-current" />
                        Stop Recording
                     </>
                  ) : (
                     <>
                        <Mic className="w-5 h-5" />
                        Record Voice
                     </>
                  )}
               </button>

               <button
                  onClick={handleUpload}
                  disabled={loading || !audio}
                  className={`
                     flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white transition-all shadow-lg
                     ${loading || !audio
                        ? "bg-gray-300 cursor-not-allowed text-gray-500"
                        : "bg-gray-900 hover:bg-black shadow-gray-400/50 hover:scale-[1.02]"
                     }
                  `}
               >
                  {loading ? (
                     <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processingStage === "uploading" && "Uploading..."}
                        {processingStage === "processing" && "Processing..."}
                        {processingStage === "transcribing" && "Transcribing..."}
                        {processingStage === "summarizing" && "Summarizing..."}
                     </>
                  ) : (
                     <>
                        <Lightbulb className="w-5 h-5" />
                        Generate Summary
                     </>
                  )}
               </button>
            </div>

            {/* Progress Bar */}
            {loading && progress > 0 && (
               <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                     initial={{ width: 0 }}
                     animate={{ width: `${progress}%` }}
                     className="bg-gradient-to-r from-teal-500 to-blue-500 h-full rounded-full"
                  />
               </div>
            )}
          </div>
        </motion.div>

        {/* Summary Result */}
        <AnimatePresence>
         {summary && (
           <motion.div 
             initial={{ opacity: 0, y: 40 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl shadow-teal-900/10 rounded-[2.5rem] overflow-hidden"
           >
             <div className="bg-gray-900 px-8 py-6 flex items-center gap-4">
                 <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <FileAudio className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-white">Analysis Result</h2>
                    <p className="text-teal-400 text-sm">AI Generated Summary</p>
                 </div>
             </div>

             <div className="p-8 space-y-8">
               {Object.entries(summary).map(([key, value], idx) => (
                 <div key={key} className="relative pl-6 border-l-2 border-teal-100">
                   <h3 className="font-bold text-gray-900 capitalize text-lg mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500 absolute -left-[5px]" />
                      {key.replace(/_/g, " ")}
                   </h3>
                   {Array.isArray(value) ? (
                     <ul className="space-y-2">
                       {value.map((item, i) => (
                         <li key={i} className="flex items-start gap-2 text-gray-600 leading-relaxed bg-gray-50/50 p-3 rounded-xl">
                            <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0 mt-1" />
                            {item}
                         </li>
                       ))}
                     </ul>
                   ) : (
                     <p className="text-gray-600 leading-relaxed bg-gray-50/80 p-4 rounded-2xl">
                        {value}
                     </p>
                   )}
                 </div>
               ))}
             </div>
             
             <div className="bg-gray-50 border-t border-gray-100 p-6 flex justify-center">
                 <button 
                  onClick={() => window.print()} 
                  className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors"
                 >
                    <UploadCloud className="w-4 h-4" /> Save Report
                 </button>
             </div>
           </motion.div>
         )}
         </AnimatePresence>
      </div>
    </div>
  );
}
