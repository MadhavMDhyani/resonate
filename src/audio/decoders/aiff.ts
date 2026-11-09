// AIFF (uncompressed PCM) decoder – pure TypeScript.
// Supports AIFF and AIFF-C files with PCM data (8/16/24/32‑bit).
// Returns Float32Array per channel and sampleRate.

export async function decode(file: File): Promise<{ channels: Float32Array[]; sampleRate: number }> {
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  let offset = 0

  // Helper to read big‑endian strings
  const readString = (len: number) => {
    let str = ''
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(view.getUint8(offset + i))
    }
    offset += len
    return str
  }

  // Verify FORM header
  if (readString(4) !== 'FORM') {
    throw new Error('Not an AIFF file (missing FORM)')
  }

  offset += 4
  const formType = readString(4)
  if (formType !== 'AIFF' && formType !== 'AIFC') {
    throw new Error('Unsupported AIFF type: ' + formType)
  }

  let numChannels = 0
  let numFrames = 0
  let sampleSize = 0
  let sampleRate = 0
  let audioDataOffset = 0

  let compression = 'NONE'

  // Parse chunks until we find COMM and SSND
  while (offset < view.byteLength) {
    const chunkID = readString(4)
    const chunkSize = view.getUint32(offset, false)
    offset += 4
    const chunkStart = offset
    switch (chunkID) {
      case 'COMM': {
        numChannels = view.getUint16(offset, false)
        offset += 2
        numFrames = view.getUint32(offset, false)
        offset += 4
        sampleSize = view.getUint16(offset, false)
        offset += 2
        // Sample rate is 80‑bit IEEE extended; we convert via helper
        sampleRate = readExtended80(view, offset)
        offset += 10
        // For AIFC, next 4 bytes are compression type
        if (formType === 'AIFC') {
          compression = readString(4)
        }
        break
      }
      case 'SSND': {
        // Offset and blockSize (ignore) then audio data
        const dataOffset = view.getUint32(offset, false)
        offset += 4
        // blockSize ignored
        offset += 4
        audioDataOffset = offset + dataOffset

        break
      }
      default:
        // Skip unknown chunks
        break
    }
    offset = chunkStart + chunkSize
    // Pad to even byte boundary
    if (offset % 2 === 1) offset++
  }

  if (!numChannels || !sampleSize || !sampleRate) {
    throw new Error('Invalid AIFF header')
  }
  if (compression !== 'NONE') {
    // Compressed AIFF‑C – treat as unsupported (Tier 3)
    throw new Error('Compressed AIFF-C not supported')
  }
  if (audioDataOffset === 0) {
    throw new Error('Missing SSND chunk')
  }

  // Read PCM data
  const channels: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) {
    channels[ch] = new Float32Array(numFrames)
  }

  let pos = audioDataOffset
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample: number
      switch (sampleSize) {
        case 8: {
          const val = view.getUint8(pos)
          sample = (val - 128) / 128 // unsigned 8‑bit to [-1,1]
          pos += 1
          break
        }
        case 16: {
          sample = view.getInt16(pos, false) / 32768
          pos += 2
          break
        }
        case 24: {
          // 3‑byte signed integer (big endian)
          const b1 = view.getUint8(pos)
          const b2 = view.getUint8(pos + 1)
          const b3 = view.getUint8(pos + 2)
          let int = (b1 << 16) | (b2 << 8) | b3
          // Sign‑extend to 32 bits
          if (int & 0x800000) int |= 0xff000000
          sample = int / 8388608 // 2^23
          pos += 3
          break
        }
        case 32: {
          sample = view.getInt32(pos, false) / 2147483648 // 2^31
          pos += 4
          break
        }
        default:
          throw new Error('Unsupported AIFF bit depth: ' + sampleSize)
      }
      channels[ch][i] = sample
    }
  }

  return { channels, sampleRate }
}

// Convert the 80‑bit IEEE extended float to a JavaScript Number.
function readExtended80(view: DataView, offset: number): number {
  const expon = view.getUint16(offset, false)
  const hiMant = view.getUint32(offset + 2, false)
  const loMant = view.getUint32(offset + 6, false)
  if (expon === 0 && hiMant === 0 && loMant === 0) return 0
  const sign = (expon & 0x8000) ? -1 : 1
  const exponent = (expon & 0x7fff) - 16383
  // Combine mantissa as a 64‑bit integer (approximate)
  const mantissa = hiMant * 0x100000000 + loMant
  const fraction = mantissa / Math.pow(2, 63)
  return sign * Math.pow(2, exponent) * (1 + fraction)
}

