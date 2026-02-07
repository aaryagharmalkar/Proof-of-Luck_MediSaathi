import React, { useState } from "react";
import { testConnection, uploadAudio, getStatus, fetchSummary } from "@/api/audioSummarizer";
import { Button } from "@/components/ui/button";

/**
 * TEMPORARY DEBUG COMPONENT
 * Add this to your MedicalSummariser page to diagnose the issue
 * Remove once everything works
 */
export function HydraliteDebugPanel() {
  const [logs, setLogs] = useState([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const testBackend = async () => {
    setTesting(true);
    setLogs([]);
    
    addLog("🔍 Starting Hydralite backend diagnostics...", "info");

    // Test 1: Connection
    try {
      addLog("1️⃣ Testing connection...", "info");
      const isReachable = await testConnection();
      if (isReachable) {
        addLog("✅ Backend is reachable", "success");
      } else {
        addLog("❌ Backend is not reachable", "error");
        setTesting(false);
        return;
      }
    } catch (err) {
      addLog(`❌ Connection test failed: ${err.message}`, "error");
      setTesting(false);
      return;
    }

    // Test 2: Status endpoint
    try {
      addLog("2️⃣ Testing /status endpoint...", "info");
      const status = await getStatus();
      addLog(`✅ Status: ${JSON.stringify(status)}`, "success");
    } catch (err) {
      addLog(`❌ Status endpoint failed: ${err.message}`, "error");
    }

    // Test 3: Create test audio blob
    try {
      addLog("3️⃣ Creating test audio file...", "info");
      
      // Create a simple audio context with beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const dest = audioContext.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.start();
      
      // Record 2 seconds
      const mediaRecorder = new MediaRecorder(dest.stream);
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const testFile = new File([blob], 'test-audio.webm', { type: 'audio/webm' });
        
        addLog(`✅ Test file created: ${(testFile.size / 1024).toFixed(2)} KB`, "success");
        
        // Test 4: Upload
        try {
          addLog("4️⃣ Testing upload...", "info");
          const uploadResponse = await uploadAudio(testFile);
          addLog(`✅ Upload successful: ${JSON.stringify(uploadResponse)}`, "success");
          
          const audioName = uploadResponse.audio_name;
          
          // Test 5: Poll status
          addLog("5️⃣ Polling status (3 attempts)...", "info");
          for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const status = await getStatus();
            addLog(`📊 Poll ${i + 1}: ${JSON.stringify(status)}`, "info");
          }
          
          // Test 6: Fetch summary (might fail if not ready)
          try {
            addLog("6️⃣ Attempting to fetch summary...", "info");
            const summary = await fetchSummary(audioName);
            addLog(`✅ Summary fetched: ${JSON.stringify(summary)}`, "success");
          } catch (err) {
            addLog(`⚠️ Summary not ready yet: ${err.message}`, "warning");
          }
          
        } catch (err) {
          addLog(`❌ Upload failed: ${err.message}`, "error");
        }
        
        oscillator.stop();
        audioContext.close();
      };
      
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 2000);
      
    } catch (err) {
      addLog(`❌ Test audio creation failed: ${err.message}`, "error");
    }

    addLog("✅ Diagnostics complete", "info");
    setTesting(false);
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border-2 border-red-500 rounded-lg shadow-xl p-4 max-h-96 overflow-hidden flex flex-col z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-red-600">🔧 Hydralite Debug Panel</h3>
        <Button
          size="sm"
          onClick={testBackend}
          disabled={testing}
          className="bg-red-500 hover:bg-red-600"
        >
          {testing ? "Testing..." : "Run Tests"}
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-1 text-xs font-mono">
        {logs.length === 0 && (
          <p className="text-gray-400">Click "Run Tests" to diagnose issues</p>
        )}
        {logs.map((log, i) => (
          <div
            key={i}
            className={`p-1 rounded ${
              log.type === "error" ? "bg-red-50 text-red-800" :
              log.type === "success" ? "bg-green-50 text-green-800" :
              log.type === "warning" ? "bg-yellow-50 text-yellow-800" :
              "bg-gray-50 text-gray-800"
            }`}
          >
            <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
          </div>
        ))}
      </div>
      
      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
        Remove this component once debugging is complete
      </div>
    </div>
  );
}