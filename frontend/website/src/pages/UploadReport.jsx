import { useState, useCallback } from "react";
import { ArrowLeft, Upload, FileText, X, CheckCircle, Loader2, Image, File, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";



// 🔧 CONFIG
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api/v1";
const DEMO_PATIENT_ID = "507f1f77bcf86cd799439011";

const Button = ({ children, variant = "default", size = "default", className = "", onClick, disabled }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors";
  const variants = {
    default: "bg-gray-200 hover:bg-gray-300 text-gray-900",
    ghost: "hover:bg-gray-100",
    hero: "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/30",
  };
  const sizes = {
    default: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
    icon: "p-2",
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const Progress = ({ value }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all"
      style={{ width: `${value}%` }}
    />
  </div>
);

const UploadMedicalReport = ({ onSummaryReady }) => {

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");


  /* ---------------------------------- ⚡ OPTIMIZED PDF EXTRACTION -----------------------------------*/
  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const extractTextFromPDF = async (file) => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const batchSize = 5;
  const totalPages = pdf.numPages;
  let allText = [];

  for (let i = 1; i <= totalPages; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, totalPages + 1); j++) {
      batch.push(
        pdf.getPage(j).then(page =>
          page.getTextContent().then(content =>
            content.items.map(item => item.str).join(" ")
          )
        )
      );
    }
    const batchResults = await Promise.all(batch);
    allText.push(...batchResults);
    setProgress(Math.floor((i / totalPages) * 30));
  }

  // ✅ CLEANING STEP
  const cleanedText = allText
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\b(\d+\s*)+/g, "")
    .trim();

  console.log("TEXT PREVIEW:", cleanedText.slice(0, 300));

  return cleanedText; // 👈 IMPORTANT
};


  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleFile = (selectedFile) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/heic"];
    if (!validTypes.includes(selectedFile.type)) {
      alert("Please upload a PDF or image file");
      return;
    }
    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
  };

  /* ---------------------------------- ⚡ OPTIMIZED UPLOAD PIPELINE -----------------------------------*/
  const handleUpload = async () => {
  if (!file) return;

  try {
    setUploadState("uploading");
    setProgress(5);

    if (file.type !== "application/pdf") {
      alert("Image OCR coming soon. Please upload a PDF for now.");
      setUploadState("idle");
      return;
    }

    // 1️⃣ Extract text
    const extractedText = await extractTextFromPDF(file);
    
    if (!extractedText.trim()) {
      throw new Error("No readable text found in PDF");
    }

    setProgress(30);

    // 2️⃣ Upload the document
    const uploadRes = await fetch(`${API_BASE}/reports/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: DEMO_PATIENT_ID,
        fullText: extractedText,
        fileName: file.name,
      }),
    });

    setProgress(50);
    const uploadData = await uploadRes.json();
    
    if (!uploadData.success) {
      throw new Error(uploadData.error || "Upload failed");
    }

    const reportId = uploadData.reportId;
    setProgress(60);
    setUploadState("processing");

    // 3️⃣ Generate summary with retry logic
    const MAX_RETRIES = 5;
    let retryCount = 0;
    let summarySuccess = false;
    let summaryText = null;

    while (retryCount < MAX_RETRIES && !summarySuccess) {
      try {
        console.log(`Attempting to generate summary... (${retryCount + 1}/${MAX_RETRIES})`);
        
        const summaryRes = await fetch(
          `${API_BASE}/reports/${reportId}/summarize`,
          { 
            method: "POST",
            headers: {
              "Content-Type": "application/json",            }
          }
        );
        
        const summaryData = await summaryRes.json();
        
        if (summaryData.success && summaryData.summary) {
          summarySuccess = true;
          summaryText = summaryData.summary;
          setProgress(90);
          console.log("✅ Summary generated successfully");
          
          // ✅ Store summary in sessionStorage so ReportView can use it immediately
          sessionStorage.setItem(`summary_${reportId}`, summaryText);
          sessionStorage.setItem(`summarized_${reportId}`, 'true');
          
        } else {
          // Handle different error types
          const is429 = summaryRes.status === 429 || 
                        summaryData.error?.includes("429") || 
                        summaryData.error?.includes("busy") ||
                        summaryData.error?.includes("rate limit");
          
          const isProcessing = summaryData.error?.includes("not ready") || 
                               summaryData.error?.includes("processing");
          
          if (is429 || isProcessing) {
            retryCount++;
            
            if (retryCount >= MAX_RETRIES) {
              throw new Error("Summary generation is taking longer than expected. Please view the report to try again.");
            }
            
            // Exponential backoff with longer delays
            const delay = is429 
              ? 3000 + (retryCount * 2000)  // 3s, 5s, 7s, 9s, 11s for rate limits
              : 2000 + (retryCount * 1000); // 2s, 3s, 4s, 5s, 6s for processing
            
            console.log(`${is429 ? 'Rate limited' : 'Document not ready'}, waiting ${delay}ms... (${retryCount}/${MAX_RETRIES})`);
            setProgress(60 + (retryCount * 5));
            
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Different error, throw it
            throw new Error(summaryData.error || "Failed to generate summary");
          }
        }
      } catch (err) {
        if (retryCount >= MAX_RETRIES - 1) {
          // Last retry failed
          throw new Error(err.message || "Summary generation failed after multiple attempts");
        }
        
        retryCount++;
        const delay = 3000;
        console.log(`Error: ${err.message}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!summarySuccess) {
      throw new Error("Could not generate summary. Please try again.");
    }

    setProgress(100);
    setUploadState("complete");

    if (onSummaryReady) {
  onSummaryReady(summaryText);
}
console.log("TEXT PREVIEW:", cleanedText.slice(0, 300));


   
    
  } catch (err) {
    console.error("Upload error:", err);
    
    let errorMsg = "Upload failed. Please try again.";
    
    if (err.message?.includes("busy") || err.message?.includes("429")) {
      errorMsg = "Service is temporarily busy. Please wait 30 seconds and try again.";
    } else if (err.message?.includes("longer than expected")) {
      errorMsg = err.message; // Use the custom message
    } else if (err.message?.includes("No readable text")) {
      errorMsg = "Could not extract text from PDF. Please ensure it's not a scanned image.";
    } else if (err.message) {
      errorMsg = err.message;
    }
    
    setErrorMessage(errorMsg);
    setUploadState("idle");
    setProgress(0);
  }
};

  const getFileIcon = (type) =>
    type?.startsWith("image/") ? <Image className="w-6 h-6 text-teal-500" /> : <File className="w-6 h-6 text-teal-500" />;

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-center">
            {errorMessage}
          </div>
        )}
        <AnimatePresence mode="wait">
          {/* Upload State */}
          {uploadState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Upload Medical Report</h1>
                <p className="text-gray-600">Upload your report to analyze and get detailed insights</p>
              </div>

              <div
                className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
                  dragActive ? "border-teal-500 bg-teal-50" : "border-gray-300 bg-white"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileInput}
                  accept=".pdf,.jpg,.jpeg,.png,.heic"
                />

                <div className="text-center pointer-events-none">
                  <Upload className="mx-auto mb-4 text-teal-500" size={48} />
                  <p className="text-xl font-medium mb-2">Drag & drop or click to upload</p>
                  <p className="text-gray-500">PDF, JPEG, PNG, HEIC supported</p>
                </div>
              </div>

              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-center gap-4 p-4 border rounded-xl bg-white"
                >
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={removeFile}>
                    <X className="w-5 h-5" />
                  </Button>
                </motion.div>
              )}

              {file && (
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full mt-6"
                  onClick={handleUpload}
                >
                  <FileText className="mr-2 w-5 h-5" />
                  Analyze Report
                </Button>
              )}
            </motion.div>
          )}

          {/* Uploading/Processing State */}
          {(uploadState === "uploading" || uploadState === "processing") && (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-12 text-center border rounded-2xl bg-white"
            >
              <Loader2 className="mx-auto animate-spin mb-4 text-teal-500" size={48} />
              <p className="text-xl font-medium mb-4">
                {uploadState === "uploading"
                  ? "Extracting text..."
                  : "Analyzing report..."}
              </p>
              <Progress value={progress} />
              <p className="mt-2 text-gray-600">{progress}%</p>
            </motion.div>
          )}

          {/* Complete State */}
          {uploadState === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center border rounded-2xl bg-green-50"
            >
              <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
              <p className="text-xl font-medium">Analysis complete!</p>
              <p className="text-sm text-gray-600 mt-2">Redirecting...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default UploadMedicalReport;
