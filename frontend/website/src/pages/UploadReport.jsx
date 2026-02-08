import { useState } from "react";
import { Upload, FileText, X, Loader2, File, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const UploadMedicalReport = ({ onSummaryReady }) => {

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    if (file.type !== "application/pdf") {
      setErrorMessage("Only PDF files are supported");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setErrorMessage("");
  };

  const handleUpload = async () => {
    if (!file) return;

    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!token) {
      setErrorMessage("Please log in to upload reports.");
      return;
    }

    let progressInterval;
    try {
      setUploadState("uploading");
      setErrorMessage("");
      setProgress(10); // Start progress

      const formData = new FormData();
      formData.append("file", file);

      // Simulate a bit of progress for the upload phase
      progressInterval = setInterval(() => {
        setProgress(old => Math.min(old + 5, 90));
      }, 200);

      const { data } = await api.post("/reports/upload", formData);

      clearInterval(progressInterval);
      setProgress(90);

      let summary = data.summary;
      if (!summary && data.report_id && onSummaryReady) {
        try {
          const viewRes = await api.get(`/reports/${data.report_id}/view`);
          summary = viewRes.data?.summary ?? null;
        } catch (e) {
          console.warn("On-demand summary fetch failed:", e);
        }
      }

      setProgress(100);
      setUploadState("complete");

      if (onSummaryReady && summary) {
        onSummaryReady(summary);
      }
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      const detail = err.response?.data?.detail;
      const message = detail != null
        ? (Array.isArray(detail) ? detail.join(", ") : String(detail))
        : (err.message || "Upload failed");
      setErrorMessage(message);
      setUploadState("idle");
      setProgress(0);
    }
  };

  const getFileIcon = () => <File className="w-6 h-6 text-teal-600" />;

  return (
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100 flex items-center justify-center py-12 px-4">
       {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
      </div>

      <main className="w-full max-w-2xl relative z-10">
        
        <AnimatePresence mode="wait">
          {/* Upload State */}
          {uploadState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2.5rem] p-8 md:p-12 overflow-hidden"
            >
               <div className="text-center mb-10">
                <div className="bg-teal-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <FileText className="w-8 h-8 text-teal-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Upload Report</h1>
                <p className="text-gray-500 font-medium">Upload your medical PDF to get instant AI-powered insights</p>
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-medium text-sm text-center"
                >
                  {errorMessage}
                </motion.div>
              )}

              <div
                className={`relative group border-2 border-dashed rounded-[2rem] p-12 transition-all duration-300 ease-in-out cursor-pointer ${
                  dragActive 
                    ? "border-teal-500 bg-teal-50/50 scale-[1.02]" 
                    : "border-gray-200 hover:border-teal-400 hover:bg-gray-50/50"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                  accept=".pdf"
                />

                <div className="text-center pointer-events-none">
                  <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-colors duration-300 ${dragActive ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400 group-hover:bg-teal-50 group-hover:text-teal-500'}`}>
                    <Upload size={32} />
                  </div>
                  <p className="text-xl font-bold text-gray-900 mb-2">Drag & drop report here</p>
                  <p className="text-gray-400 font-medium text-sm">or click to browse (PDF only)</p>
                </div>
              </div>

              {file && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8"
                >
                  <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl bg-white/60 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                       {getFileIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(); }} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <Button
                    size="lg"
                    className="w-full mt-6 bg-gray-900 hover:bg-black text-white font-bold h-14 rounded-xl shadow-lg shadow-gray-900/20 transform transition-all hover:scale-[1.02]"
                    onClick={handleUpload}
                  >
                    <FileText className="mr-2 w-5 h-5" />
                    Analyze Report Now
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Uploading/Processing State */}
          {(uploadState === "uploading" || uploadState === "processing") && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2.5rem] p-12 text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-lg font-bold text-teal-600">{progress}%</span>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Analyzing Report...</h2>
              <p className="text-gray-500 font-medium mb-8">
                Reading your medical data and generating insights
              </p>
              
              <div className="w-full max-w-xs mx-auto">
                 <Progress value={progress} className="h-2" indicatorClassName="bg-teal-500" />
              </div>
            </motion.div>
          )}

          {/* Complete State */}
          {uploadState === "complete" && (
             <motion.div
             key="complete"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[2.5rem] p-12 text-center"
           >
             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-pulse">
               <CheckCircle2 className="w-10 h-10 text-green-600" />
             </div>
             <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Analysis Complete!</h2>
             <p className="text-gray-600 font-medium mb-8">
               Your report has been successfully processed. Redirecting to insights...
             </p>
           </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default UploadMedicalReport;
