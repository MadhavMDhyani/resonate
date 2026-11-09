import { parseBlob } from 'music-metadata'
import { db } from '../db/db'
import type { Track } from '../types'
import { detectFormat } from '../audio/formats'

const AUDIO_EXT = /\.(mp3|m4a|aac|flac|ogg|oga|opus|wav|webm|aif|aiff|aifc|wma|ape|wv|tta|dsf|dff|m4p|mka)$/i
const MAX_COVER_BYTES = 150_000

/** Object URLs for local files, created lazily at play time, revoked on removal. */
const objectUrls = new Map<string, string>()

export async function getLocalObjectUrl(track: Track): Promise<string | undefined> {
  if (!track.id.startsWith('local:')) return undefined
  const cached = objectUrls.get(track.id)
  if (cached) return cached
  if (!track.handleKey) return undefined
  const rec = await db.handles.get(track.handleKey)
  if (!rec) return undefined
  try {
    const file = await rec.handle.getFile()
    const url = URL.createObjectURL(file)
    objectUrls.set(track.id, url)
    return url
  } catch {
    // Permission lost or file deleted — the Local Files page offers re-granting.
    return undefined
  }
}

export function revokeLocalObjectUrl(trackId: string): void {
  const url = objectUrls.get(trackId)
  if (url) {
    URL.revokeObjectURL(url)
    objectUrls.delete(trackId)
  }
}

// ---------------------------------------------------------------------------
// Tag parsing
// ---------------------------------------------------------------------------

function probeDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const a = new Audio()
    const done = (d: number) => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) ? d : 0)
    }
    const timer = setTimeout(() => done(0), 5000)
    a.addEventListener('loadedmetadata', () => done(a.duration))
    a.addEventListener('error', () => done(0))
    a.src = url
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

async function parseTrackFile(file: File, handleKey?: string): Promise<Track | null> {
  if (!AUDIO_EXT.test(file.name)) return null
  const key = crypto.randomUUID()
  const fallbackTitle = file.name.replace(/\.[^.]+$/, '')
  let title = fallbackTitle
  let artist = 'Unknown artist'
  let album: string | undefined
  let duration = 0
  let cover: string | undefined

  try {
    const md = await parseBlob(file)
    if (md.common.title) title = md.common.title
    if (md.common.artist) artist = md.common.artist
    if (md.common.album) album = md.common.album
    if (md.format.duration && Number.isFinite(md.format.duration)) duration = md.format.duration
    const pic = md.common.picture?.[0]
    if (pic) {
      const blob = new Blob([pic.data as unknown as BlobPart], { type: pic.format || 'image/jpeg' })
      if (blob.size <= MAX_COVER_BYTES) cover = await blobToDataUrl(blob)
    }
  } catch {
    // Unreadable tags — fall back to file name.
  }
  if (!duration) duration = await probeDuration(file)

  const format = await detectFormat(file);
  return {
    id: `local:${key}`,
    source: 'local',
    title,
    artist,
    album,
    duration,
    cover,
    fileName: file.name,
    handleKey,
    downloadAllowed: true,
    license: 'Local file',
    format,
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/** Concurrency-limited map to avoid blowing up memory on huge folders. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

/** Import picked File objects (non-Chromium fallback). These have no persistent handle. */
export async function importFiles(files: File[]): Promise<number> {
  const tracks = await mapLimit(files, 4, (f) => parseTrackFile(f))
  const valid = tracks.filter((t): t is Track => t !== null)
  if (valid.length === 0) return 0
  await db.transaction('rw', db.localTracks, async () => {
    await db.localTracks.bulkPut(valid.map((t) => ({ key: t.id.slice(6), addedAt: Date.now(), track: t })))
  })
  return valid.length
}

async function walkDirectory(dir: FileSystemDirectoryHandle, out: FileSystemFileHandle[]): Promise<void> {
  for await (const entry of dir.values()) {
    if (entry.kind === 'file' && AUDIO_EXT.test(entry.name)) {
      out.push(entry as FileSystemFileHandle)
    } else if (entry.kind === 'directory') {
      await walkDirectory(entry as FileSystemDirectoryHandle, out)
    }
  }
}

export function supportsDirectoryImport(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
}

/** Import a whole folder recursively (Chromium). Persists file handles in IndexedDB. */
export async function importDirectory(): Promise<number> {
  const picker = (window as PickerWindow).showDirectoryPicker
  if (!picker) throw new Error('Directory import requires a Chromium-based browser')
  const dir = await picker({ mode: 'read' })
  const fileHandles: FileSystemFileHandle[] = []
  await walkDirectory(dir, fileHandles)

  let imported = 0
  const BATCH = 20
  for (let i = 0; i < fileHandles.length; i += BATCH) {
    const batch = fileHandles.slice(i, i + BATCH)
    const parsed = await mapLimit(batch, 4, async (h) => {
      try {
        const file = await h.getFile()
        return { handle: h, track: await parseTrackFile(file, crypto.randomUUID()) }
      } catch {
        return { handle: h, track: null }
      }
    })
    const ok = parsed.filter((p): p is { handle: FileSystemFileHandle; track: Track } => p.track !== null)
    await db.transaction('rw', db.localTracks, db.handles, async () => {
      for (const p of ok) {
        const key = p.track.handleKey as string
        await db.handles.put({ key, handle: p.handle })
        await db.localTracks.put({ key, addedAt: Date.now(), track: p.track })
      }
    })
    imported += ok.length
  }
  return imported
}

/** Count local files whose handle permission was lost (needs a user gesture to re-grant). */
export async function countStaleHandles(): Promise<number> {
  const records = await db.handles.toArray()
  let stale = 0
  for (const r of records) {
    try {
      const perm = await r.handle.queryPermission({ mode: 'read' })
      if (perm !== 'granted') stale++
    } catch {
      stale++
    }
  }
  return stale
}

/** Re-grant read permission for all stored handles (must be called from a user gesture). */
export async function reconnectHandles(): Promise<number> {
  const records = await db.handles.toArray()
  let granted = 0
  for (const r of records) {
    try {
      if ((await r.handle.queryPermission({ mode: 'read' })) !== 'granted') {
        if ((await r.handle.requestPermission({ mode: 'read' })) !== 'granted') continue
      }
      granted++
    } catch {
      // handle may point at a deleted file
    }
  }
  return granted
}

export async function removeLocalTrack(key: string): Promise<void> {
  const rec = await db.localTracks.get(key)
  if (rec) revokeLocalObjectUrl(rec.track.id)
  await db.transaction('rw', db.localTracks, db.handles, async () => {
    await db.localTracks.delete(key)
    if (rec?.track.handleKey) await db.handles.delete(rec.track.handleKey)
  })
}

/** Re-check permission state for one track (used to mark unplayable rows). */
export async function isTrackPlayable(track: Track): Promise<boolean> {
  if (track.source === 'jamendo') return Boolean(track.audioUrl)
  if (!track.handleKey) return false // imported via file input, session-only
  const rec = await db.handles.get(track.handleKey)
  if (!rec) return false
  try {
    return (await rec.handle.queryPermission({ mode: 'read' })) === 'granted'
  } catch {
    return false
  }
}
