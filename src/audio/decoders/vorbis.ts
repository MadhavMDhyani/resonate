// Lazy-loaded Ogg Vorbis decoder using @wasm-audio-decoders/ogg-vorbis
// Exports a decode function returning PCM channels and sampleRate.
export async function decode(file: File): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const { OggVorbisDecoder } = await import('@wasm-audio-decoders/ogg-vorbis');
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new OggVorbisDecoder();
  const result = await decoder.decode(new Uint8Array(arrayBuffer));
  return { channels: result.channelData, sampleRate: result.sampleRate };
}

