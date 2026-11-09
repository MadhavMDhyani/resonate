// Lazy-loaded FLAC decoder using @wasm-audio-decoders/flac
// Exports a decode function that returns PCM channels and sampleRate.
// The library provides a FLACDecoder class that works with Uint8Array data.
export async function decode(file: File): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const { FLACDecoder } = await import('@wasm-audio-decoders/flac');
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new FLACDecoder();
  const result = await decoder.decode(new Uint8Array(arrayBuffer));
  return { channels: result.channelData, sampleRate: result.sampleRate };
}

