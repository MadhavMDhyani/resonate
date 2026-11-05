import type { Album, ArtistInfo, Track } from '../types'

const BASE = 'https://api.jamendo.com/v3.0'
const LS_KEY = 'resonate:jamendo_client_id'

/**
 * The client_id is public by design (Jamendo expects it in client-side apps).
 * It can come from .env (VITE_JAMENDO_CLIENT_ID) or be pasted in the setup
 * screen and stored in localStorage.
 */
export function getClientId(): string {
  const ls = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null
  if (ls && ls.trim()) return ls.trim()
  const env = import.meta.env.VITE_JAMENDO_CLIENT_ID
  return typeof env === 'string' ? env.trim() : ''
}

export function saveClientId(id: string): void {
  localStorage.setItem(LS_KEY, id.trim())
}

export function hasClientId(): boolean {
  return getClientId().length > 0
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// ---------------------------------------------------------------------------
// Raw Jamendo payloads (numeric fields arrive as strings)
// ---------------------------------------------------------------------------

interface JamendoTrack {
  id: string
  name: string
  duration: string
  artist_id: string
  artist_name: string
  album_id?: string
  album_name?: string
  album_image?: string
  image?: string
  audio?: string
  audiodownload?: string
  audiodownload_allowed?: boolean | string | number
  license_ccurl?: string
  position?: string
}

interface JamendoAlbum {
  id: string
  name: string
  artist_id?: string
  artist_name?: string
  image?: string
  releasedate?: string
  trackscount?: string
  zip?: string
}

interface JamendoArtist {
  id: string
  name: string
  image?: string
  joindate?: string
  website?: string
}

interface JamendoPlaylist {
  id: string
  name: string
  user_name: string
  creationdate?: string
  tracks?: JamendoTrack[]
}

interface JamendoHeaders {
  status: string
  code?: number
  message?: string
  error_message?: string
  error?: string
  results_count?: number
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function downloadAllowed(t: JamendoTrack): boolean {
  const v = t.audiodownload_allowed
  if (v === undefined) return true
  return v !== false && v !== 0 && v !== '0' && v !== 'false'
}

function parseLicense(ccurl?: string): { name?: string; url?: string } {
  if (!ccurl) return {}
  try {
    const u = new URL(ccurl)
    const m = u.pathname.match(/\/licenses\/([\w-]+)\/([\d.]+)\//)
    if (m) return { name: `CC ${m[1].toUpperCase().replace(/-/g, '-')} ${m[2]}`, url: ccurl }
    const pd = u.pathname.match(/\/publicdomain\/(zero|mark)\/([\d.]+)\//)
    if (pd) return { name: pd[1] === 'zero' ? `CC0 ${pd[2]}` : 'Public Domain Mark', url: ccurl }
  } catch {
    // fall through
  }
  return { name: 'Creative Commons', url: ccurl }
}

export function mapTrack(t: JamendoTrack): Track {
  const lic = parseLicense(t.license_ccurl)
  return {
    id: `jamendo:${t.id}`,
    source: 'jamendo',
    title: t.name,
    artist: t.artist_name,
    artistId: t.artist_id ? `jamendo:${t.artist_id}` : undefined,
    album: t.album_name || undefined,
    albumId: t.album_id ? `jamendo:${t.album_id}` : undefined,
    duration: Number(t.duration) || 0,
    cover: t.album_image || t.image || undefined,
    audioUrl: t.audio || undefined,
    audiodownload: t.audiodownload || undefined,
    downloadAllowed: downloadAllowed(t),
    license: lic.name,
    licenseUrl: lic.url,
  }
}

function mapAlbum(a: JamendoAlbum): Album {
  return {
    id: `jamendo:${a.id}`,
    jamendoId: Number(a.id),
    title: a.name,
    artist: a.artist_name ?? 'Unknown artist',
    artistId: a.artist_id ? `jamendo:${a.artist_id}` : undefined,
    cover: a.image || undefined,
    releaseDate: a.releasedate || undefined,
    trackCount: a.trackscount ? Number(a.trackscount) : undefined,
    zip: a.zip || undefined,
  }
}

function mapArtist(a: JamendoArtist): ArtistInfo {
  return {
    id: `jamendo:${a.id}`,
    jamendoId: Number(a.id),
    name: a.name,
    image: a.image || undefined,
  }
}

// ---------------------------------------------------------------------------
// Request plumbing: URL building, caching, error handling
// ---------------------------------------------------------------------------

type Params = Record<string, string | number | undefined>

const cache = new Map<string, Promise<unknown[]>>()
const CACHE_MAX = 300

function cachedGet<T>(url: string, fetcher: () => Promise<T[]>): Promise<T[]> {
  const hit = cache.get(url)
  if (hit) return hit as Promise<T[]>
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  const p = fetcher()
  cache.set(url, p)
  p.catch(() => cache.delete(url)) // don't cache failures
  return p
}

async function get<T>(path: string, params: Params = {}): Promise<T[]> {
  if (!hasClientId()) throw new ApiError('No Jamendo client_id configured')
  const sp = new URLSearchParams({
    client_id: getClientId(),
    format: 'json',
    ...Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  })
  const url = `${BASE}/${path}/?${sp}`
  return cachedGet(url, async () => {
    const res = await fetch(url)
    if (!res.ok) throw new ApiError(`Jamendo API HTTP ${res.status}`)
    const data = (await res.json()) as { headers: JamendoHeaders; results: T[] }
    if (data.headers.status !== 'success') {
      throw new ApiError(
        data.headers.error_message ||
          data.headers.message ||
          data.headers.error ||
          'Jamendo API request failed',
      )
    }
    return data.results
  })
}

// ---------------------------------------------------------------------------
// Public API — all results are mapped to app types
// ---------------------------------------------------------------------------

const trackParams: Params = {
  imagesize: 600,
}

export async function getPopularTracks(limit = 24, offset = 0): Promise<Track[]> {
  const r = await get<JamendoTrack>('tracks', {
    ...trackParams,
    order_by: 'popularity_week',
    limit,
    offset,
  })
  return r.map(mapTrack)
}

export async function getTracksByTag(tag: string, limit = 12): Promise<Track[]> {
  const r = await get<JamendoTrack>('tracks', { ...trackParams, tag, order_by: 'popularity_total', limit })
  return r.map(mapTrack)
}

export async function getAlbumTracks(albumId: string): Promise<Track[]> {
  const numeric = albumId.replace(/^jamendo:/, '')
  const r = await get<JamendoTrack>('tracks', { ...trackParams, album_id: numeric, limit: 200 })
  const tracks = r.map(mapTrack)
  // Keep original album order when the API provides a position field
  return tracks.some((t) => (t as Track & { position?: string }).position)
    ? tracks.sort(
        (a, b) =>
          Number((a as Track & { position?: string }).position ?? 0) -
          Number((b as Track & { position?: string }).position ?? 0),
      )
    : tracks
}

export async function getAlbum(id: string): Promise<Album> {
  const numeric = id.replace(/^jamendo:/, '')
  const r = await get<JamendoAlbum>('albums', { ...trackParams, id: numeric })
  if (!r[0]) throw new ApiError('Album not found')
  return mapAlbum(r[0])
}

export async function getNewAlbums(limit = 18): Promise<Album[]> {
  const r = await get<JamendoAlbum>('albums', {
    imagesize: 400,
    order_by: 'releasedate_desc',
    limit,
  })
  return r.map(mapAlbum)
}

export async function getArtist(id: string): Promise<ArtistInfo> {
  const numeric = id.replace(/^jamendo:/, '')
  const r = await get<JamendoArtist>('artists', { id: numeric, imagesize: 600 })
  if (!r[0]) throw new ApiError('Artist not found')
  return mapArtist(r[0])
}

export async function getArtistTopTracks(artistId: string, limit = 10): Promise<Track[]> {
  const numeric = artistId.replace(/^jamendo:/, '')
  const r = await get<JamendoTrack>('tracks', {
    ...trackParams,
    artist_id: numeric,
    order_by: 'popularity_total',
    limit,
  })
  return r.map(mapTrack)
}

export async function getArtistAlbums(artistId: string, limit = 24): Promise<Album[]> {
  const numeric = artistId.replace(/^jamendo:/, '')
  const r = await get<JamendoAlbum>('albums', { imagesize: 400, artist_id: numeric, limit })
  return r.map(mapAlbum)
}

export async function getPlaylist(
  id: string,
): Promise<{ name: string; creator: string; tracks: Track[] }> {
  const numeric = id.replace(/^jamendo:/, '')
  const r = await get<JamendoPlaylist>('playlists', { id: numeric })
  const pl = r[0]
  if (!pl) throw new ApiError('Playlist not found')
  let raw = pl.tracks ?? []
  // Some playlist payloads omit stream URLs; refetch those tracks individually.
  const missing = raw.filter((t) => !t.audio)
  if (missing.length > 0) {
    const refetched = await Promise.all(
      missing.map((t) =>
        get<JamendoTrack>('tracks', { ...trackParams, id: t.id, limit: 1 })
          .then((x) => x[0])
          .catch(() => undefined),
      ),
    )
    const byId = new Map(refetched.filter((x): x is JamendoTrack => !!x).map((x) => [x.id, x]))
    raw = raw.map((t) => byId.get(t.id) ?? t)
  }
  return { name: pl.name, creator: pl.user_name, tracks: raw.map(mapTrack) }
}

export async function searchTracks(q: string, limit = 24): Promise<Track[]> {
  const r = await get<JamendoTrack>('tracks', { ...trackParams, namesearch: q, limit })
  return r.map(mapTrack)
}

export async function searchAlbums(q: string, limit = 12): Promise<Album[]> {
  const r = await get<JamendoAlbum>('albums', { imagesize: 400, namesearch: q, limit })
  return r.map(mapAlbum)
}

export async function searchArtists(q: string, limit = 12): Promise<ArtistInfo[]> {
  const r = await get<JamendoArtist>('artists', { imagesize: 400, namesearch: q, limit })
  return r.map(mapArtist)
}

export function clearApiCache(): void {
  cache.clear()
}
