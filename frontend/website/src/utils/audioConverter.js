/**
 * Audio Converter Utility
 * Converts WebM audio to WAV format for backend compatibility
 */

/**
 * Convert audio blob to WAV format
 * @param {Blob} blob - Audio blob (typically WebM from MediaRecorder)
 * @param {string} fileName - Original filename
 * @returns {Promise<File>} WAV audio file
 */
export async function convertToWav(blob, fileName = 'audio.webm') {
  console.log('🔄 Converting audio to WAV format...');
  console.log('Input:', { size: blob.size, type: blob.type });

  try {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Read the blob as array buffer
    const arrayBuffer = await blob.arrayBuffer();

    // Decode audio data
    console.log('📊 Decoding audio data...');
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get audio properties
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    console.log('Audio properties:', {
      channels: numberOfChannels,
      sampleRate: `${sampleRate} Hz`,
      duration: `${(length / sampleRate).toFixed(2)} seconds`,
    });

    // Create WAV file
    const wavBlob = audioBufferToWav(audioBuffer);

    // Convert to File object
    const wavFileName = fileName.replace(/\.(webm|ogg|mp4|m4a)$/i, '.wav');
    const wavFile = new File([wavBlob], wavFileName, { type: 'audio/wav' });

    console.log('✅ Conversion complete:', {
      name: wavFile.name,
      size: `${(wavFile.size / 1024 / 1024).toFixed(2)} MB`,
      type: wavFile.type,
    });

    // Close audio context to free resources
    audioContext.close();

    return wavFile;
  } catch (error) {
    console.error('❌ Audio conversion failed:', error);
    throw new Error(`Failed to convert audio to WAV: ${error.message}`);
  }
}

/**
 * Convert AudioBuffer to WAV blob
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob} WAV audio blob
 */
function audioBufferToWav(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Get audio data from all channels
  const channelData = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  // Interleave channels
  const length = channelData[0].length;
  const interleaved = new Float32Array(length * numberOfChannels);

  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      interleaved[i * numberOfChannels + channel] = channelData[channel][i];
    }
  }

  // Create WAV file buffer
  const wavBuffer = new ArrayBuffer(44 + interleaved.length * 2);
  const view = new DataView(wavBuffer);

  // Write WAV header
  writeString(view, 0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + interleaved.length * 2, true); // ChunkSize
  writeString(view, 8, 'WAVE'); // Format
  writeString(view, 12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numberOfChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numberOfChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numberOfChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample
  writeString(view, 36, 'data'); // Subchunk2ID
  view.setUint32(40, interleaved.length * 2, true); // Subchunk2Size

  // Write PCM samples
  const offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Write string to DataView
 * @param {DataView} view
 * @param {number} offset
 * @param {string} string
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Check if audio conversion is supported
 * @returns {boolean}
 */
export function isConversionSupported() {
  return !!(window.AudioContext || window.webkitAudioContext);
}