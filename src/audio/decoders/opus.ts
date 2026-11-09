// Lazy-loaded Ogg Opus decoder using ogg-opus-decoder
// Exports a decode function returning PCM channels and sampleRate.
export async function decode(file: File, onProgress?: (p: number) => void): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const { OggOpusDecoder } = await import('ogg-opus-decoder');
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new OggOpusDecoder();
  return new Promise((resolve, reject) => {
    decoder.decode(arrayBuffer, {
      onDecode: (pcm: Int16Array, sampleRate: number, channels: number) => {
        const floatChannels: Float32Array[] = [];
        for (let ch = 0; ch < channels; ch++) {
          const channelData = new Float32Array(pcm.length / channels);
          for (let i = 0; i < channelData.length; i++) {
            const sample = pcm[i * channels + ch];
            channelData[i] = sample / 32768;
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
