import { downloadFilename } from './format'
import type { Track } from '../types'

/**
 * Download a Jamendo track via its legal free-download URL. Jamendo serves
 * these with CORS headers, so we fetch to a blob for a proper "Save as" flow;
 * if that fails for any reason we fall back to opening the URL in a new tab.
 */
export async function downloadTrack(track: Track): Promise<void> {
  if (track.source !== 'jamendo' || !track.audiodownload || track.downloadAllowed === false) return
  const url = track.audiodownload
  const name = downloadFilename(track)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}
