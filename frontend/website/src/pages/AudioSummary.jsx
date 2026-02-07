import { useState, useRef } from "react";
import { uploadAudio, getStatus, fetchSummary } from "@/api/audioSummarizer";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Square } from "lucide-react";

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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audio Summariser</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload or record doctor conversation audio
        </p>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-4">
        {/* Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Audio
          </label>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.webm"
            onChange={(e) => setAudio(e.target.files[0])}
            disabled={loading || isRecording}
            className="block w-full text-sm text-gray-500"
          />
        </div>

        {/* OR */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Record */}
        <Button
          variant="outline"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className={`w-full ${
            isRecording ? "border-red-500 text-red-600" : ""
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Record Audio
            </>
          )}
        </Button>

        {audio && (
          <p className="text-sm text-gray-600">
            Selected: <strong>{audio.name}</strong>
          </p>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={loading || !audio}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {processingStage === "uploading" && "Uploading..."}
              {processingStage === "processing" && "Processing..."}
              {processingStage === "transcribing" && "Transcribing..."}
              {processingStage === "summarizing" && "Summarizing..."}
            </>
          ) : (
            "Summarize Audio"
          )}
        </Button>

        {loading && progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Summary</h2>

          {Object.entries(summary).map(([key, value]) => (
            <div key={key}>
              <h3 className="font-medium capitalize">
                {key.replace(/_/g, " ")}
              </h3>
              {Array.isArray(value) ? (
                <ul className="list-disc ml-5">
                  {value.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>{value}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
