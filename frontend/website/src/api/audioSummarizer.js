import axios from "axios";

/**
 * Axios instance for Hydralite backend
 * Deployed on Render
 */
const hydralite = axios.create({
  baseURL: "https://hydralite-backend.onrender.com",
  timeout: 120000, // 120 seconds for audio processing
  headers: {
    'Accept': 'application/json',
  },
});

// Add response interceptor for better error logging
hydralite.interceptors.response.use(
  (response) => {
    console.log(`✅ Hydralite ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error(`❌ Hydralite ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

/**
 * Upload audio file to Hydralite
 * @param {File} file - Audio file to upload
 * @returns {Promise<{status: string, audio_name: string}>}
 */
export const uploadAudio = async (file) => {
  try {
    console.log("📤 Uploading audio file:", {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
    });

    const formData = new FormData();
    formData.append("file", file);

    const { data } = await hydralite.post("/upload-audio", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`📊 Upload progress: ${percentCompleted}%`);
      },
    });

    console.log("✅ Upload response:", data);

    if (!data.audio_name) {
      throw new Error("Server did not return audio_name");
    }

    return data; // { status: "processing", audio_name }
  } catch (error) {
    console.error("❌ Upload failed:", error);
    
    if (error.response) {
      // Server responded with error
      const serverError = new Error(
        error.response.data?.detail || 
        error.response.data?.message || 
        `Server error: ${error.response.status}`
      );
      serverError.response = error.response;
      throw serverError;
    } else if (error.request) {
      // No response from server
      throw new Error("No response from Hydralite server. Is it running?");
    } else {
      // Request setup error
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};

/**
 * Get global processing status
 * Used for polling progress
 * @returns {Promise<{stage: string, progress: number, message?: string}>}
 */
export const getStatus = async () => {
  try {
    const { data } = await hydralite.get("/status");
    
    // Validate response structure
    if (!data.stage) {
      console.warn("⚠️ Status response missing 'stage' field:", data);
    }
    
    return data;
  } catch (error) {
    console.error("❌ Status check failed:", error);
    
    if (error.response) {
      const serverError = new Error(
        error.response.data?.detail || 
        `Status check failed: ${error.response.status}`
      );
      serverError.response = error.response;
      throw serverError;
    } else if (error.request) {
      throw new Error("Cannot reach Hydralite server for status check");
    } else {
      throw new Error(`Status check error: ${error.message}`);
    }
  }
};

/**
 * Fetch final summary JSON once processing is completed
 * WITH AUTOMATIC RETRY LOGIC
 * @param {string} audioName - The audio file name from upload response
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 15)
 * @param {number} options.initialDelay - Initial delay in ms (default: 3000)
 * @param {Function} options.onProgress - Callback for progress updates
 * @returns {Promise<Object>} - Summary object with medical information
 */
export const fetchSummary = async (audioName, options = {}) => {
  const {
    maxRetries = 15,
    initialDelay = 3000,
    onProgress = null,
  } = options;

  if (!audioName) {
    throw new Error("Audio name is required to fetch summary");
  }

  let attempt = 0;

  const attemptFetch = async () => {
    attempt++;
    
    try {
      console.log(`🔍 Fetching summary (attempt ${attempt}/${maxRetries}):`, audioName);
      
      if (onProgress) {
        onProgress({
          attempt,
          maxRetries,
          message: `Checking if processing is complete... (${attempt}/${maxRetries})`,
        });
      }

      const { data } = await hydralite.get(`/summary/${audioName}`);
      
      console.log("✅ Summary received:", data);
      
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid summary format received from server");
      }
      
      return data;

    } catch (error) {
      // If it's a 404 and we haven't exceeded max retries, wait and try again
      if (error.response?.status === 404 && attempt < maxRetries) {
        // Exponential backoff: 3s, 4.5s, 6.75s, etc. (capped at 10s)
        const delay = Math.min(initialDelay * Math.pow(1.5, attempt - 1), 10000);
        
        console.log(`⏳ Summary not ready yet. Retrying in ${(delay / 1000).toFixed(1)}s...`);
        
        if (onProgress) {
          onProgress({
            attempt,
            maxRetries,
            message: `Processing audio... Retrying in ${(delay / 1000).toFixed(1)}s`,
          });
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptFetch(); // Recursive retry

      } else if (error.response?.status === 404) {
        // Exceeded max retries
        throw new Error(
          `Summary not ready after ${maxRetries} attempts (${(maxRetries * initialDelay / 1000).toFixed(0)}s). ` +
          "The audio may be too long or the server may be overloaded. Please try again later."
        );
      } else if (error.response) {
        // Other server error
        const serverError = new Error(
          error.response.data?.detail || 
          `Summary fetch failed: ${error.response.status}`
        );
        serverError.response = error.response;
        throw serverError;
      } else if (error.request) {
        throw new Error("Cannot reach Hydralite server to fetch summary");
      } else {
        throw new Error(`Summary fetch error: ${error.message}`);
      }
    }
  };

  return attemptFetch();
};

/**
 * Download generated PDF report
 * Opens PDF in new tab
 * @param {string} audioName - The audio file name from upload response
 */
export const downloadPdf = (audioName) => {
  try {
    if (!audioName) {
      throw new Error("Audio name is required to download PDF");
    }

    const url = `https://hydralite-backend.onrender.com/download-pdf/${audioName}`;
    console.log("📥 Opening PDF:", url);
    
    window.open(url, "_blank");
  } catch (error) {
    console.error("❌ PDF download failed:", error);
    alert(`Failed to download PDF: ${error.message}`);
  }
};

/**
 * Test if Hydralite backend is reachable
 * @returns {Promise<boolean>}
 */
export const testConnection = async () => {
  try {
    const response = await fetch("https://hydralite-backend.onrender.com", {
      method: "GET",
      mode: "cors",
    });
    console.log("✅ Hydralite backend is reachable:", response.status);
    return true;
  } catch (error) {
    console.error("❌ Hydralite backend is not reachable:", error);
    return false;
  }
};

/**
 * Complete workflow: Upload audio and wait for summary
 * @param {File} file - Audio file to process
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Final summary data
 */
export const processAudioComplete = async (file, onProgress = null) => {
  try {
    // Step 1: Upload
    if (onProgress) onProgress({ stage: 'uploading', message: 'Uploading audio...' });
    const uploadResponse = await uploadAudio(file);
    const audioName = uploadResponse.audio_name;

    console.log(`✅ Uploaded successfully. Audio name: ${audioName}`);

    // Step 2: Wait initial period for processing to start
    if (onProgress) onProgress({ stage: 'waiting', message: 'Processing started...' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Poll for summary with retry logic
    if (onProgress) onProgress({ stage: 'polling', message: 'Waiting for results...' });
    const summary = await fetchSummary(audioName, {
      maxRetries: 15,
      initialDelay: 3000,
      onProgress: (progress) => {
        if (onProgress) {
          onProgress({
            stage: 'polling',
            message: progress.message,
            attempt: progress.attempt,
            maxRetries: progress.maxRetries,
          });
        }
      },
    });

    console.log("✅ Complete! Summary received.");
    return summary;

  } catch (error) {
    console.error("❌ Audio processing failed:", error);
    throw error;
  }
};

export default hydralite;