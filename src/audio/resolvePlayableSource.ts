import type { Track } from '../types'
import { db } from '../db/db'
import { pcmToWav } from './pcmToWav'
import { decode as flacDecode } from './decoders/flac'
import { decode as vorbisDecode } from './decoders/vorbis'
import { decode as opusDecode } from './decoders/opus'
import { decode as aiffDecode } from './decoders/aiff'

/** Resolve a track to a playable URL.
 * Returns the URL and a revoke callback to free the object URL.
 * For Jamendo tracks returns the streaming URL.
 * For native‑supported local files returns a direct object URL.
 * For Tier 2 files decodes to PCM, converts to WAV, and returns a Blob URL.
 */
export async function resolvePlayableSource(
  track: Track
): Promise<{ url: string; revoke: () => void }> {
  if (track.source === 'jamendo') {
    return { url: track.audioUrl ?? '', revoke: () => { } }
  }

  if (!track.handleKey) throw new Error('Missing handleKey for local track')
  const rec = await db.handles.get(track.handleKey)
  if (!rec) throw new Error('File handle not found')
  const file = await rec.handle.getFile()

  const fmt = track.format
  if (!fmt) throw new Error('Format information missing')

  // Tier 1 native playback
  if (fmt.tier === 1 && fmt.supportedNatively) {
    const url = URL.createObjectURL(file)
    return { url, revoke: () => URL.revokeObjectURL(url) }
  }

  // Tier 2 decoding
  if (fmt.tier === 2) {
    let decoded: { channels: Float32Array[]; sampleRate: number }
    switch (fmt.label) {
      case 'FLAC':
        decoded = await flacDecode(file)
        break
      case 'VORBIS':
      case 'OGG':
        decoded = await vorbisDecode(file)
        break
      case 'OPUS':
        decoded = await opusDecode(file)
        break
      case 'AIFF':
        decoded = await aiffDecode(file)
        break
      default:
        throw new Error('Unsupported Tier 2 format: ' + fmt.label)
    }
    const wavBlob = pcmToWav(decoded.channels, decoded.sampleRate)
    const url = URL.createObjectURL(wavBlob)
    return { url, revoke: () => URL.revokeObjectURL(url) }
  }

  // Tier 3 – not playable
  throw new Error('Unsupported format')
}

