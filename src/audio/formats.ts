import { parseBlob } from 'music-metadata'

export interface AudioFormatInfo {
  container?: string
  codec?: string
  ext: string
  tier: 1 | 2 | 3
  supportedNatively: boolean
  label: string
}

function getExt(fileName: string): string {
  const m = fileName.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : ''
}

/** Check if browser natively supports MIME type */
export function canPlayMime(mime: string): boolean {
  if (typeof document === 'undefined') return false
  const audio = document.createElement('audio')
  const res = audio.canPlayType(mime)
  return res === 'probably' || res === 'maybe'
}

/**
 * Builds standard MIME + codec strings to test native browser playback support
 */
function getMimeForFormat(ext: string, container?: string, codec?: string): string[] {
  const normCodec = (codec || '').toLowerCase()
  const normContainer = (container || '').toLowerCase()

  if (normCodec.includes('alac')) {
    return ['audio/mp4; codecs="alac"', 'audio/m4a; codecs="alac"']
  }
  if (normCodec.includes('flac') || normContainer.includes('flac') || ext === 'flac') {
    return ['audio/flac', 'audio/x-flac']
  }
  if (normCodec.includes('opus') || ext === 'opus') {
    return ['audio/ogg; codecs="opus"', 'audio/opus', 'audio/webm; codecs="opus"']
  }
  if (normCodec.includes('vorbis') || ext === 'ogg' || ext === 'oga') {
    return ['audio/ogg; codecs="vorbis"', 'audio/ogg']
  }
  if (normCodec.includes('aac') || ext === 'm4a' || ext === 'aac') {
    return ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac', 'audio/x-m4a']
  }
  if (normCodec.includes('mpeg') || normCodec.includes('mp3') || ext === 'mp3') {
    return ['audio/mpeg', 'audio/mp3']
  }
  if (normCodec.includes('pcm') || normContainer.includes('wav') || ext === 'wav') {
    return ['audio/wav', 'audio/wave', 'audio/x-wav']
  }
  if (normContainer.includes('aiff') || ext === 'aif' || ext === 'aiff' || ext === 'aifc') {
    return ['audio/aiff', 'audio/x-aiff']
  }
  if (normContainer.includes('webm') || ext === 'webm') {
    return ['audio/webm; codecs="opus"', 'audio/webm']
  }
  return []
}

/**
 * Detect real container & codec using music-metadata, check native playback capability,
 * and assign Tier 1 (native), Tier 2 (browser decoded), or Tier 3 (unsupported in browser).
 */
export async function detectFormat(file: File): Promise<AudioFormatInfo> {
  const ext = getExt(file.name)
  let container: string | undefined
  let codec: string | undefined

  try {
    const md = await parseBlob(file)
    container = md.format.container
    codec = md.format.codec
  } catch {
    // Metadata parse error — continue with extension heuristic
  }

  const normCodec = (codec || '').toLowerCase()
  const normContainer = (container || '').toLowerCase()

  // 1. Known Tier 3 formats that cannot play natively and have no browser decoder
  const isTier3Ext = [
    'wma',
    'ape',
    'wv',
    'tta',
    'dsf',
    'dff',
    'm4p',
    'mka',
    'mod',
    'xm',
    's3m',
    'it',
    'mid',
    'midi',
  ].includes(ext)
  const isTier3Codec =
    normCodec.includes('wma') ||
    normCodec.includes('ape') ||
    normCodec.includes('wavpack') ||
    normCodec.includes('dsd') ||
    normCodec.includes('monkey')

  // Special case: ALAC (playable natively on Safari, otherwise Tier 3)
  const isAlac = normCodec.includes('alac') || (ext === 'm4a' && normCodec.includes('alac'))

  // AIFC compressed codecs (ima4, alaw, ulaw, etc.) are Tier 3
  const isAifcCompressed =
    (ext === 'aifc' || normContainer.includes('aiff')) &&
    Boolean(codec && !normCodec.includes('pcm') && !normCodec.includes('linear') && !normCodec.includes('none'))

  // Test native playback capability
  const mimes = getMimeForFormat(ext, container, codec)
  const supportedNatively = mimes.some((m) => canPlayMime(m))

  // Determine short badge label
  let label = ext.toUpperCase()
  if (normCodec.includes('flac')) label = 'FLAC'
  else if (isAlac) label = 'ALAC'
  else if (normCodec.includes('opus')) label = 'OPUS'
  else if (normCodec.includes('vorbis')) label = 'VORBIS'
  else if (normCodec.includes('aac')) label = 'AAC'
  else if (normCodec.includes('mp3') || normCodec.includes('mpeg')) label = 'MP3'
  else if (normContainer.includes('aiff')) label = 'AIFF'
  else if (normContainer.includes('wav')) label = 'WAV'

  // If identified as Tier 3 or unplayable ALAC
  if (isTier3Ext || isTier3Codec || isAifcCompressed || (isAlac && !supportedNatively)) {
    return {
      container,
      codec,
      ext,
      tier: 3,
      supportedNatively: false,
      label,
    }
  }

  // Tier 1: supported natively by <audio>
  if (supportedNatively) {
    return {
      container,
      codec,
      ext,
      tier: 1,
      supportedNatively: true,
      label,
    }
  }

  // Tier 2: formats decoded in browser (FLAC, Ogg Vorbis, Ogg Opus, AIFF PCM)
  const canDecodeInBrowser =
    normCodec.includes('flac') ||
    ext === 'flac' ||
    normCodec.includes('vorbis') ||
    ext === 'ogg' ||
    ext === 'oga' ||
    normCodec.includes('opus') ||
    ext === 'opus' ||
    normContainer.includes('aiff') ||
    ext === 'aiff' ||
    ext === 'aif'

  if (canDecodeInBrowser) {
    return {
      container,
      codec,
      ext,
      tier: 2,
      supportedNatively: false,
      label,
    }
  }

  // Fallback: unsupported format
  return {
    container,
    codec,
    ext,
    tier: 3,
    supportedNatively: false,
    label,
  }
}
