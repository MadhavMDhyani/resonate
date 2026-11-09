// Lazy-loaded FLAC decoder using @wasm-audio-decoders/flac
// Exports a decode function that returns PCM channels and sampleRate.
// The library provides a FLACDecoder class that works with ArrayBuffer.
export async function decode(file: File, onProgress?: (p: number) => void): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const { FLACDecoder } = await import('@wasm-audio-decoders/flac');
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new FLACDecoder();
  // The decoder works synchronously; we can wrap in a Promise for consistency.
  return new Promise((resolve, reject) => {
    decoder.decode(arrayBuffer, {
      onDecode: (pcm: Int16Array, sampleRate: number, channels: number) => {
        // Convert interleaved PCM (16-bit) to per-channel Float32Array.
        const floatChannels: Float32Array[] = [];
        for (let ch = 0; ch < channels; ch++) {
          const channelData = new Float32Array(pcm.length / channels);
          for (let i = 0; i < channelData.length; i++) {
            const sample = pcm[i * channels + ch];
            channelData[i] = sample / 32768; // normalize to -1..1
          }
          floatChannels.push(channelData);
        }
        resolve({ channels: floatChannels, sampleRate });
      },
      onProgress: (p: number) => {
        if (onProgress) onProgress(p);
      },
      onError: (e: any) => reject(e),
    });
  });
}

