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
    <div className="min-h-screen bg-gray-50">
      {/* ========== HEADER ========== */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Medical Summariser
                </h1>
                <p className="text-xs text-gray-500">
                  AI-powered analysis via Hydralite
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <span>{userProfile?.full_name?.split(" ")[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6"
          >
            <TabsList className="grid grid-cols-2 gap-2 w-full">
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Doctor Audio
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Medical Report
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* ========================================
               AUDIO TAB
          ======================================== */}
          <TabsContent value="audio" className="space-y-4">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>
                      <strong>Record:</strong> Capture audio directly from
                      microphone
                    </li>
                    <li>
                      <strong>Upload:</strong> Choose existing audio file
                      (MP3/WAV/M4A)
                    </li>
                    <li>
                      <strong>Process:</strong> Hydralite transcribes and
                      summarizes
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Audio Input Section */}
            {!audioSummary && !recordedAudioFile && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-8 text-center border card-hover"
              >
                <div className="flex flex-col items-center gap-4">
                  {/* Recording Button */}
                  {!isRecording ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRecordStart}
                      disabled={audioProcessing}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-full inline-flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                    >
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </motion.button>
                  ) : (
                    <div className="space-y-3">
                      <motion.button
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        onClick={handleRecordStop}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full inline-flex items-center gap-2 font-medium transition-colors shadow-md hover:shadow-lg"
                      >
                        <StopCircle className="w-5 h-5" />
                        Stop Recording
                      </motion.button>

                      {/* Recording Indicator */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-red-600">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium">
                            Recording in progress...
                          </span>
                        </div>
                        <div className="text-2xl font-mono font-semibold text-gray-700">
                          {formatTime(recordingDuration)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {!isRecording && (
                    <>
                      <div className="my-2 text-gray-400 text-sm">or</div>

                      {/* File Upload */}
                      <label className="cursor-pointer w-full max-w-md">
                        <input
                          hidden
                          type="file"
                          accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                          onChange={handleAudioUpload}
                          disabled={audioProcessing || isRecording}
                        />
                        <motion.div
                          whileHover={{
                            scale: audioProcessing ? 1 : 1.02,
                          }}
                          className="border-dashed border-2 rounded-xl p-8 bg-gray-50 border-gray-300 hover:border-teal-400 transition-colors card-hover"
                        >
                          {audioProcessing ? (
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                              <div className="text-sm text-gray-600 font-medium">
                                {processingStage === "uploading" &&
                                  "Uploading to Hydralite..."}
                                {processingStage === "processing" &&
                                  "Processing audio..."}
                                {processingStage === "polling" &&
                                  `Waiting for summary... (${retryAttempt}/${maxRetries})`}
                                {processingStage === "transcribing" &&
                                  "Transcribing..."}
                                {processingStage === "summarizing" &&
                                  "Generating summary..."}
                                {!processingStage && "Processing..."}
                              </div>
                              {processingProgress > 0 && (
                                <div className="w-full max-w-xs">
                                  <div className="bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${processingProgress}%`,
                                      }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 text-center">
                                    {Math.round(processingProgress)}%
                                  </p>
                                </div>
                              )}
                              {retryAttempt > 0 && (
                                <p className="text-xs text-gray-500">
                                  This may take up to 90 seconds for long recordings
                                </p>
                              )}
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                              <div className="text-sm text-gray-600 font-medium">
                                Upload audio file
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                MP3, WAV, M4A, WebM, or OGG (max 50MB)
                              </div>
                            </>
                          )}
                        </motion.div>
                      </label>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Recorded Audio Preview */}
            {recordedAudioFile && !audioSummary && !audioProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 border space-y-4 card-hover"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <Mic className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {recordedAudioFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(recordedAudioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDiscardRecording}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Audio Preview Player */}
                {audioPreviewUrl && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <audio
                      controls
                      src={audioPreviewUrl}
                      className="w-full"
                      controlsList="nodownload"
                    />
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  Processing will start automatically, or you can discard this
                  recording.
                </p>
              </motion.div>
            )}

            {/* Processing Error */}
            {processingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Processing Error:</p>
                    <p className="mt-1">{processingError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAudio}
                      className="mt-3"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Summary Result */}
            {audioSummary && (
              <>
                <SummaryCard
                  title="Doctor Conversation Summary"
                  data={audioSummary}
                />

                <div className="flex gap-3">
                  {audioName && (
                    <Button
                      variant="outline"
                      onClick={handleDownloadPdf}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF Report
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleResetAudio}
                    className="flex-1"
                  >
                    Analyze Another Audio
                  </Button>
                </div>
              </>
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

                {/* Chat Interface */}
                <div className="bg-white rounded-xl border overflow-hidden card-hover">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-teal-600" />
                      <span className="font-medium text-gray-900">
                        Ask about this report
                      </span>
                    </div>
                  </div>

                  <div className="p-4 h-64 overflow-y-auto space-y-3">
                    {chatMessages.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-8">
                        Ask a question about the medical report
                      </div>
                    )}

                    {chatMessages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          m.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span
                          className={`inline-block px-4 py-2 rounded-lg max-w-xs lg:max-w-md ${
                            m.role === "user"
                              ? "bg-teal-500 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {m.content}
                        </span>
                      </motion.div>
                    ))}

                    {isAssistantTyping && (
                      <div className="flex justify-start">
                        <span className="inline-block px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm">
                          Assistant is typing...
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleChatSend()
                        }
                        placeholder="Type your question..."
                        className="flex-1"
                        disabled={isAssistantTyping}
                      />
                      <Button
                        size="icon"
                        onClick={handleChatSend}
                        className="bg-teal-500 hover:bg-teal-600"
                        disabled={!chatInput.trim() || isAssistantTyping}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

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
        className="bg-white rounded-xl p-6 border space-y-4 card-hover"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-semibold text-lg">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadSummaryPdf}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
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
      className="bg-white rounded-xl p-6 border space-y-4 card-hover"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-600">
          <Check className="w-5 h-5" />
          <span className="font-semibold text-lg">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadSummaryPdf}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(data).map(([key, value], idx) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="border-l-2 border-teal-200 pl-4"
          >
            <p className="font-semibold capitalize text-sm text-gray-700 mb-1">
              {key.replace(/_/g, ' ')}
            </p>

            {Array.isArray(value) ? (
              <ul className="list-disc ml-4 text-gray-600 space-y-1">
                {value.map((v, i) => (
                  <li key={i} className="text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(v)}</ReactMarkdown>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-600 text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(value)}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export { SummaryCard };
