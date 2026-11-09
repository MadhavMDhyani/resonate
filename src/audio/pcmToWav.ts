/**
 * Convert decoded PCM Float32Array channels to a 16‑bit PCM WAV Blob.
 * The decoder returns Float32 samples in the range [-1, 1].
 * This function interleaves the channels, writes a RIFF/WAVE header
 * and returns a Blob that can be used as an object URL for <audio>.
 */
export function pcmToWav(channels: Float32Array[], sampleRate: number): Blob {
  const numChannels = channels.length;
  const numSamples = channels[0].length;
  const blockAlign = numChannels * 2; // 16‑bit = 2 bytes per sample per channel
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // file size - 8
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM 16‑bit samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      // Clamp to [-1,1] then scale to signed 16‑bit integer
      let sample = channels[ch][i];
      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;
      const intSample = Math.round(sample * 32767);
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

