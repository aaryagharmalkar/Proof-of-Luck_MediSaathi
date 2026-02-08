import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/api/apiClient";
import UploadMedicalReport from "./UploadReport";
import {
  uploadAudio,
  getStatus,
  fetchSummary,
  downloadPdf,
} from "@/api/audioSummarizer";
import { convertToWav } from "@/utils/audioConverter";
import { useActiveMember } from "@/lib/ActiveMemberContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import EmergencyButton from "@/components/ui/EmergencyButton";

import {
  Mic,
  Upload,
  FileText,
  Loader2,
  Check,
  MessageCircle,
  Send,
  StopCircle,
  ArrowLeft,
  Download,
  AlertCircle,
  Play,
  Trash2,
} from "lucide-react";

import { motion } from "framer-motion";

// Markdown rendering and PDF generation
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/* ========================================
   HELPERS
======================================== */

const fetchJSON = async (url) => {
  const { data } = await api.get(url);
  return data;
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/* ========================================
   MOCK DATA (for report demo only)
======================================== */

const HARDCODED_CHAT_RESPONSES = {
  "what is the history of the patient":
    "The patient has a history of hypertension, hyperlipidemia, and strokes.",
  "what medications are recommended":
    "The patient should continue with prescribed antihypertensive and anticoagulant medications.",
  "what are the next steps":
    "Regular follow-up appointments every 3 months, maintain blood pressure monitoring, and lifestyle modifications.",
  default:
    "You can ask about diagnosis, prognosis, medications, or treatment recommendations.",
};

/* ========================================
   MAIN COMPONENT
======================================== */

export default function MedicalSummariser() {
  const { activeMember } = useActiveMember();
  const navigate = useNavigate();
  
  // User state
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("audio");

  /* ========================================
     AUDIO RECORDING REFS & STATE
  ======================================== */
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioFile, setRecordedAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  /* ========================================
     AUDIO PROCESSING STATE
  ======================================== */
  
  const [audioProcessing, setAudioProcessing] = useState(false);
  const [audioSummary, setAudioSummary] = useState(null);
  const [audioName, setAudioName] = useState(null);
  const [processingStage, setProcessingStage] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [maxRetries, setMaxRetries] = useState(20);

  /* ========================================
     REPORT STATE
  ======================================== */
  
  const [reportSummary, setReportSummary] = useState(null);

  /* ========================================
     CHAT STATE
  ======================================== */
  
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  /* ========================================
     LOAD USER ON MOUNT
  ======================================== */

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      localStorage.setItem("token", "mock-dev-token");
    }

    try {
      setIsLoadingUser(true);
      const me = await fetchJSON("/auth/me");
      setUserProfile(me?.user ?? me);
    } catch (err) {
      console.warn("Failed to load user from API:", err.message);

      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      console.log("Using mock user data for development");
      setUserProfile({
        id: 1,
        full_name: "John Doe",
        email: "john@example.com",
      });
    } finally {
      setIsLoadingUser(false);
    }
  };

  /* ========================================
     RECORDING TIMER
  ======================================== */

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  /* ========================================
     AUTO-PROCESS RECORDED AUDIO
  ======================================== */

  useEffect(() => {
    if (recordedAudioFile && !isRecording && !audioProcessing) {
      console.log("📼 Recorded audio ready, starting processing...");
      processAudioWithHydralite(recordedAudioFile);
    }
  }, [recordedAudioFile, isRecording]);

  /* ========================================
     AUDIO RECORDING HANDLERS
  ======================================== */

  const handleRecordStart = async () => {
    try {
      console.log("🎙️ Requesting microphone access...");
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });

      // Determine best available audio format
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      console.log("🎵 Using audio format:", mimeType);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps
      });

      audioChunksRef.current = [];

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        console.log("⏸️ Recording stopped, processing chunks...");
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        try {
          // Convert WebM to WAV for backend compatibility
          console.log("🔄 Converting to WAV format...");
          const timestamp = Date.now();
          const wavFile = await convertToWav(audioBlob, `recording-${timestamp}.webm`);
          
          console.log("✅ Audio file created:", {
            name: wavFile.name,
            size: `${(wavFile.size / 1024 / 1024).toFixed(2)} MB`,
            type: wavFile.type,
          });

          // Create preview URL from original WebM (for playback)
          const previewUrl = URL.createObjectURL(audioBlob);
          setAudioPreviewUrl(previewUrl);
          
          // Set the WAV file for upload
          setRecordedAudioFile(wavFile);
        } catch (error) {
          console.error("❌ Audio conversion failed:", error);
          alert(`Failed to convert audio: ${error.message}`);
        }

        // Stop all media tracks to release microphone
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log("🔇 Stopped media track:", track.kind);
        });
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error("❌ MediaRecorder error:", event.error);
        alert("Recording error: " + event.error.name);
        handleRecordStop();
      };

      // Start recording
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      console.log("🔴 Recording started");

    } catch (err) {
      console.error("❌ Failed to start recording:", err);
      
      let errorMessage = "Failed to access microphone. ";
      
      if (err.name === "NotAllowedError") {
        errorMessage += "Please grant microphone permission in your browser settings.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "No microphone found. Please connect a microphone.";
      } else if (err.name === "NotReadableError") {
        errorMessage += "Microphone is already in use by another application.";
      } else {
        errorMessage += err.message;
      }
      
      alert(errorMessage);
    }
  };

  const handleRecordStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      console.log("⏹️ Stopping recording...");
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDiscardRecording = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setRecordedAudioFile(null);
    setAudioPreviewUrl(null);
    setProcessingError(null);
    console.log("🗑️ Recording discarded");
  };

  /* ========================================
     AUDIO UPLOAD HANDLER
  ======================================== */

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'audio/mpeg', 
      'audio/wav', 
      'audio/mp3', 
      'audio/m4a', 
      'audio/mp4', 
      'audio/webm',
      'audio/ogg'
    ];
    const validExtensions = /\.(mp3|wav|m4a|webm|ogg)$/i;

    if (!validTypes.includes(file.type) && !file.name.match(validExtensions)) {
      alert("Please upload a valid audio file (MP3, WAV, M4A, WebM, or OGG)");
      e.target.value = ""; // Reset file input
      return;
    }

    // Check file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`File too large. Maximum size is 50MB.\nYour file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      e.target.value = ""; // Reset file input
      return;
    }

    console.log("📁 File selected for upload:", {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
    });

    // Convert WebM/OGG to WAV if needed
    let fileToUpload = file;
    if (file.type.includes('webm') || file.type.includes('ogg')) {
      try {
        console.log("🔄 Converting uploaded file to WAV...");
        fileToUpload = await convertToWav(file, file.name);
        console.log("✅ File converted successfully");
      } catch (error) {
        console.error("❌ Conversion failed:", error);
        alert(`Failed to convert audio file: ${error.message}\n\nPlease try uploading a WAV, MP3, or M4A file instead.`);
        e.target.value = "";
        return;
      }
    }

    await processAudioWithHydralite(fileToUpload);
    
    // Reset file input
    e.target.value = "";
  };

  /* ========================================
     AUDIO PROCESSING WITH HYDRALITE (UPDATED WITH RETRY LOGIC)
  ======================================== */


  /* ========================================
     MOCK SAVE / PROCESS
     (Simulate saving summary to dashboard)
  ======================================== */
  const saveSummaryToDashboard = (summary) => {
     try {
       // Mock integration: prompt told us not to change backend logic,
       // so we save to local storage to simulate "latest consultation" on dashboard
       const summaryObj = {
          title: "Consultation Summary",
          date: new Date().toLocaleDateString(),
          doctor: "AI Assistant",
          advice: summary?.match(/\*\*Actionable Steps\*\*:(.*?)(?=\*\*|$)/s)?.[1]?.split('- ').filter(x=>x.trim()) || ["Review findings"],
          warnings: ["Monitor symptoms", "Emergency if chest pain"], // Mock extraction
          medications: summary?.match(/\*\*Prescribed Medications\*\*:(.*?)(?=\*\*|$)/s)?.[1]?.split('- ').filter(x=>x.trim()) || ["As prescribed"],
       };
       // Cleanup strings
       if(Array.isArray(summaryObj.advice)) summaryObj.advice = summaryObj.advice.map(s => s.trim()).filter(s => s);
       if(Array.isArray(summaryObj.medications)) summaryObj.medications = summaryObj.medications.map(s => s.trim()).filter(s => s);
       
       localStorage.setItem('activeSummary', JSON.stringify(summaryObj));
     } catch (e) {
       console.error("Failed to save summary alias", e);
     }
  };

  const processAudioWithHydralite = async (file) => {
    try {
      setAudioProcessing(true);
      setProcessingStage("uploading");
      setProcessingProgress(10);
      setProcessingError(null);
      setRetryAttempt(0);

      console.log("🚀 Starting Hydralite audio processing...");
      console.log("📦 File details:", {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type,
      });

      // 1️⃣ Upload audio to Hydralite
      setProcessingStage("uploading");
      console.log("📤 Uploading to Hydralite...");
      const uploadResponse = await uploadAudio(file);
      console.log("✅ Upload successful:", uploadResponse);
      
      if (!uploadResponse || !uploadResponse.audio_name) {
        throw new Error("Upload response missing audio_name");
      }

      const uploadedAudioName = uploadResponse.audio_name;
      setAudioName(uploadedAudioName);

      setProcessingStage("processing");
      setProcessingProgress(30);

      // 2️⃣ Wait initial period for processing to start
      console.log("⏳ Waiting for processing to start...");
      await delay(3000);

      // 3️⃣ Poll for summary with exponential backoff retry logic
      console.log("🔄 Starting summary polling with retry logic...");
      
      const summary = await fetchSummary(uploadedAudioName, {
        maxRetries: 20,
        initialDelay: 3000,
        onProgress: (progress) => {
          setRetryAttempt(progress.attempt);
          setMaxRetries(progress.maxRetries);
          setProcessingStage("polling");
          
          // Update progress bar based on attempts
          const progressPercent = 30 + Math.min((progress.attempt / progress.maxRetries) * 60, 60);
          setProcessingProgress(progressPercent);
          
          console.log(`📊 ${progress.message} (${progress.attempt}/${progress.maxRetries})`);
        },
      });

      console.log("✅ Summary received:", summary);
      setProcessingProgress(100);
      setAudioSummary(summary);
      
      saveSummaryToDashboard(summary);

      // Save to health records
      await saveHealthRecord("audio_summary", summary);

      console.log("✅ Audio processing complete!");

    } catch (error) {
      console.error("❌ Hydralite processing error:", error);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        response: error.response?.data,
      });
      
      setProcessingError(error.message);

      // User-friendly error message
      let errorMsg = `Audio processing failed:\n\n${error.message}\n\n`;
      
      // Add specific troubleshooting based on error type
      if (error.message.includes("not ready after")) {
        errorMsg += "The audio file is taking longer than expected to process.\n\n";
        errorMsg += "This could mean:\n";
        errorMsg += "• The audio file is very long\n";
        errorMsg += "• The Hydralite server is busy\n";
        errorMsg += "• Network connectivity issues\n\n";
        errorMsg += "Try:\n";
        errorMsg += "1. Using a shorter audio file\n";
        errorMsg += "2. Trying again in a few minutes\n";
        errorMsg += "3. Checking your internet connection";
      } else if (error.response) {
        errorMsg += `Server error: ${error.response.status}\n`;
        if (error.response.data) {
          errorMsg += `Details: ${JSON.stringify(error.response.data)}\n`;
        }
      } else if (error.request) {
        errorMsg += "Cannot reach Hydralite server.\n\n";
        errorMsg += "Check:\n";
        errorMsg += "1. Your internet connection\n";
        errorMsg += "2. Hydralite backend status\n";
        errorMsg += "3. Firewall/proxy settings";
      }

      alert(errorMsg);

    } finally {
      setAudioProcessing(false);
      setProcessingStage("");
      setProcessingProgress(0);
      setRetryAttempt(0);
    }
  };

  /* ========================================
     PDF DOWNLOAD
  ======================================== */

  const handleDownloadPdf = () => {
    if (audioName) {
      console.log("📥 Downloading PDF for:", audioName);
      downloadPdf(audioName);
    } else {
      console.warn("⚠️ No audio name available for PDF download");
      alert("PDF not available. Please process audio first.");
    }
  };

  /* ========================================
     RESET AUDIO STATE
  ======================================== */

  const handleResetAudio = () => {
    // Cleanup preview URL
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    // Reset all audio states
    setAudioSummary(null);
    setAudioName(null);
    setProcessingError(null);
    setRecordedAudioFile(null);
    setAudioPreviewUrl(null);
    setRecordingDuration(0);
    setRetryAttempt(0);

    console.log("🔄 Audio state reset");
  };

  /* ========================================
     CHAT HANDLERS
  ======================================== */

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const question = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setIsAssistantTyping(true);

    await delay(800);

    const reply =
      HARDCODED_CHAT_RESPONSES[question.toLowerCase()] ||
      HARDCODED_CHAT_RESPONSES.default;

    setChatMessages((prev) => [
      ...prev,
      { role: "assistant", content: reply },
    ]);
    setIsAssistantTyping(false);
  };

  /* ========================================
     SAVE HEALTH RECORD
  ======================================== */

  const saveHealthRecord = async (type, summary) => {
    try {
      await api.post("/health/records", {
        metric: type,
        value: 0,
        unit: "summary",
        date: new Date().toISOString().split("T")[0],
        notes: summary,
        member_id: activeMember?.id || null,
      });
      console.log("💾 Health record saved successfully");
    } catch (err) {
      console.log(
        "⚠️ Health record save failed (expected in dev mode):",
        err.message
      );
    }
  };

  /* ========================================
     LOADING STATES
  ======================================== */

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ========================================
     MAIN UI RENDER
  ======================================== */

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ========== HEADER ========== */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 bg-opacity-90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Medical Summariser
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 text-xs font-bold border border-teal-100">AI Powered</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name}</p>
                  <p className="text-xs text-gray-500">Member</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold">
                  {userProfile?.full_name?.charAt(0) || "U"}
               </div>
            </div>
          </div>
        </div>
      </header>


      {/* ========== MAIN CONTENT ========== */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-8"
          >
            <TabsList className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-full max-w-md">
              <TabsTrigger 
                value="audio" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:font-bold transition-all px-6"
              >
                <Mic className="w-4 h-4" />
                Doctor Audio
              </TabsTrigger>
              <TabsTrigger 
                value="report" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold transition-all px-6"
              >
                <FileText className="w-4 h-4" />
                Medical Report
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* ========================================
               AUDIO TAB
          ======================================== */}
          <TabsContent value="audio" className="flex flex-col items-center">
            
            {/* Header / Intro */}
            {!isRecording && !audioProcessing && !audioSummary && !recordedAudioFile && (
              <div className="relative group bg-white rounded-[2rem] p-8 md:p-12 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 w-full max-w-4xl text-center">
                {/* Background Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-70 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -ml-20 -mb-20 opacity-50 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-teal-100 text-teal-600">
                      <Mic className="w-10 h-10" />
                  </div>
                  
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Turn consultation audio into insights</h2>
                  <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                     Record your doctor's visit or upload a recording. We'll generate a clear medical summary, medication list, and action plan so you never miss a detail.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-5 items-center w-full justify-center">
                     <Button 
                        onClick={handleRecordStart} 
                        size="lg" 
                        className="bg-gray-900 hover:bg-black text-white rounded-2xl px-8 h-14 text-base font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all w-full sm:w-auto min-w-[200px]"
                     >
                        <Mic className="mr-2 h-5 w-5" />
                        Record Now
                     </Button>
                     
                     <div className="relative w-full sm:w-auto min-w-[200px]">
                        <input 
                           type="file" 
                           accept="audio/*" 
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                           onChange={handleAudioUpload}
                        />
                        <Button 
                          variant="outline" 
                          size="lg" 
                          className="w-full rounded-2xl h-14 text-base font-semibold border-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-700"
                        >
                           <Upload className="mr-2 h-5 w-5" />
                           Upload Recording
                        </Button>
                     </div>
                  </div>
                  
                  <p className="mt-6 text-xs text-gray-400 font-medium">Supported formats: MP3, WAV, M4A, WebM (Max 50MB)</p>
                </div>
              </div>
            )}

            {/* Recording UI */}
            {isRecording && (
                <div className="relative group bg-white rounded-[2rem] p-12 border border-white shadow-xl overflow-hidden text-center w-full max-w-2xl mx-auto">
                   {/* Background Decorative Elements */}
                   <div className="absolute top-0 left-0 w-full h-full bg-red-50/50 z-0" />
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <div className="w-96 h-96 bg-red-200 rounded-full blur-3xl animate-pulse-slow" />
                   </div>

                   <div className="relative z-10 flex flex-col items-center">
                     <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-md border border-red-100 relative">
                        <motion.div 
                           className="absolute inset-0 rounded-full border-4 border-red-100"
                           animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                           transition={{ repeat: Infinity, duration: 2 }}
                        />
                        <Mic className="w-12 h-12 text-red-500" />
                        <div className="absolute -bottom-2 bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider animate-pulse">Live</div>
                     </div>
                     
                     <h3 className="text-4xl font-bold text-gray-900 mb-3 tabular-nums tracking-tight">{formatTime(recordingDuration)}</h3>
                     <p className="text-gray-500 font-medium mb-10 max-w-sm">Listening to your consultation... Please keep the device close to the speaker.</p>
                     
                     <Button 
                        onClick={handleRecordStop}
                        size="lg" 
                        className="bg-red-500 hover:bg-red-600 text-white rounded-2xl px-10 h-14 shadow-lg hover:shadow-red-200 text-lg transition-all hover:scale-105"
                     >
                        <StopCircle className="mr-2 w-5 h-5 fill-current" /> Stop & Process
                     </Button>
                   </div>
                </div>
            )}

            {/* Processing UI */}
            {audioProcessing && (
               <div className="relative group bg-white rounded-[2rem] p-12 border border-white shadow-xl overflow-hidden text-center w-full max-w-2xl mx-auto">
                  {/* Background Decorative Elements */}
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-teal-50/50 to-blue-50/50 z-0" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-teal-100">
                       <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Audio</h3>
                    <p className="text-teal-600 font-medium mb-8 bg-teal-50 px-4 py-1.5 rounded-full text-sm">
                       {processingStage === "polling" ? "Extracting medical insights..." : "Processing audio data..."}
                    </p>
                    
                    <div className="w-full max-w-md mx-auto h-3 bg-gray-100 rounded-full overflow-hidden p-[2px]">
                       <motion.div 
                          className="h-full bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${processingProgress}%` }}
                          transition={{ duration: 0.5 }}
                       />
                    </div>
                    <p className="text-xs text-gray-400 mt-4 font-medium uppercase tracking-wide">Do not close this window</p>
                  </div>
               </div>
            )}

            {/* SUMMARY RESULT */}
            {audioSummary && (
               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[2rem] border border-white shadow-xl overflow-hidden w-full font-sans"
               >
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                     <div>
                        <div className="flex items-center gap-2 text-teal-400 mb-2">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Analysis Complete</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Consultation Summary</h2>
                        <p className="text-gray-400 text-sm mt-1">Generated by MediSaathi AI • {new Date().toLocaleDateString()}</p>
                     </div>
                     <div className="flex gap-3">
                        <Button size="sm" variant="outline" className="bg-white/10 border-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-xl h-10 px-4" onClick={() => window.print()}>
                           <Download className="w-4 h-4 mr-2" />
                           Download PDF
                        </Button>
                     </div>
                  </div>

                  <div className="p-8 md:p-10 grid md:grid-cols-3 gap-10">
                     <div className="md:col-span-2 space-y-8">
                        <div className="prose prose-lg prose-headings:font-bold prose-h3:text-teal-700 prose-p:text-gray-600 max-w-none">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {audioSummary}
                           </ReactMarkdown>
                        </div>
                     </div>
                     
                     <div className="space-y-6">
                        <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-2xl -mr-16 -mt-16 opacity-50 transition-transform group-hover:scale-110" />
                            
                           <div className="relative z-10">
                             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm text-blue-600">
                                <MessageCircle className="w-6 h-6"/>
                             </div>
                             <h4 className="font-bold text-gray-900 text-lg mb-2">
                                Have questions?
                             </h4>
                             <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                Not sure about a medical term? Chat with our AI assistant to clarify doubts.
                             </p>
                             <Button onClick={() => {
                                navigate('/chatbot', { state: { initialQuery: "Based on my consultation summary, what are the next steps?" } });
                             }} className="w-full bg-gray-900 hover:bg-black text-white rounded-xl h-12 shadow-lg">
                                Chat with Summary
                             </Button>
                           </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          onClick={() => {
                             setAudioSummary(null);
                             setRecordedAudioFile(null);
                          }}
                          className="w-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 h-12 rounded-xl"
                        >
                          Analyze Another Audio
                        </Button>
                     </div>
                  </div>
               </motion.div>
            )}
          </TabsContent>

          {/* ========================================
               REPORT TAB
          ======================================== */}
          <TabsContent value="report" className="space-y-4">
            {!reportSummary && (
              <UploadMedicalReport
                onSummaryReady={(summary) => {
                  setReportSummary(summary);
                  saveHealthRecord("report_summary", summary);
                }}
              />
            )}

            {reportSummary && (
              <>
                <SummaryCard
                  title="Medical Report Summary"
                  data={reportSummary}
                />


                <Button
                  variant="outline"
                  onClick={() => {
                    setReportSummary(null);
                    setChatMessages([]);
                  }}
                  className="w-full"
                >
                  Analyze Another Report
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Emergency Button */}
      <EmergencyButton profile={userProfile} />
    </div>
  );
}

/* ========================================
   SUMMARY CARD COMPONENT
======================================== */

function SummaryCard({ title, data }) {
  const cardRef = useRef(null);

  const handleDownloadSummaryPdf = async () => {
    try {
      if (!cardRef.current) return;
      const node = cardRef.current;

      // Use html2canvas to capture the node
      const canvas = await html2canvas(node, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `${title.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // If the data is a string (markdown), render it using ReactMarkdown
  if (typeof data === 'string') {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group bg-white rounded-[2rem] p-8 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 font-sans"
      >
        {/* Background Decorative Elements */}
        {title.includes("Summary") ? (
           <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />
        ) : (
           <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />
        )}
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${title.includes("Summary") ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-900'}`}>
                <FileText className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">{title}</span>
          </div>

          <Button variant="outline" size="sm" onClick={handleDownloadSummaryPdf} className="rounded-xl border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>

        <div className="relative z-10 prose prose-lg prose-headings:font-bold prose-p:text-gray-600 max-w-none">
          <div className="whitespace-pre-wrap leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
          </div>
        </div>
      </motion.div>
    );
  }

  // Handle object (structured) summaries
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group bg-white rounded-[2rem] p-8 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 font-sans"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center shadow-sm text-teal-600">
             <Check className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">{title}</span>
        </div>

        <Button variant="outline" size="sm" onClick={handleDownloadSummaryPdf} className="rounded-xl border-gray-200 hover:bg-gray-50">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <div className="relative z-10 space-y-6">
        {Object.entries(data).map(([key, value], idx) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group/item"
          >
            <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 group-hover/item:scale-125 transition-transform" />
                <p className="font-bold capitalize text-sm text-gray-900 tracking-wide">
                {key.replace(/_/g, ' ')}
                </p>
            </div>

            <div className="pl-3.5 border-l-2 border-gray-100 group-hover/item:border-teal-100 transition-colors">
                {Array.isArray(value) ? (
                <ul className="list-none space-y-2">
                    {value.map((v, i) => (
                    <li key={i} className="text-gray-600 text-base leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(v)}</ReactMarkdown>
                    </li>
                    ))}
                </ul>
                ) : (
                <div className="text-gray-600 text-base leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(value)}</ReactMarkdown>
                </div>
                )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export { SummaryCard };
