// Lazy-loaded Ogg Opus decoder using ogg-opus-decoder
// Exports a decode function returning PCM channels and sampleRate.
export async function decode(file: File): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const { OggOpusDecoder } = await import('ogg-opus-decoder');
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new OggOpusDecoder();
  const result = decoder.decode(new Uint8Array(arrayBuffer));
  return { channels: result.channelData, sampleRate: result.sampleRate };
}
