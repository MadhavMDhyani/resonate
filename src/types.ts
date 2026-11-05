export type TrackSource = 'jamendo' | 'local'

/** Unified track model — both Jamendo (CC catalog) and local files map to this. */
export interface Track {
  /** 'jamendo:<numeric id>' or 'local:<key>' */
  id: string
  source: TrackSource
  title: string
  artist: string
  artistId?: string
  album?: string
  albumId?: string
  /** seconds */
  duration: number
  /** artwork URL (Jamendo) or small data URL (local, when cover art exists) */
  cover?: string
  /** stream URL — Jamendo only; local files resolve at play time from the file handle */
  audioUrl?: string
  /** direct MP3 download URL — Jamendo only */
  audiodownload?: string
  /** Jamendo sometimes disallows downloads for a specific track; respect it */
  downloadAllowed?: boolean
  /** e.g. "CC BY-SA 3.0" */
  license?: string
  licenseUrl?: string
  // local-only
  fileName?: string
  /** key of the FileSystemFileHandle stored in IndexedDB */
  handleKey?: string
}

export interface Album {
  id: string
  jamendoId: number
  title: string
  artist: string
  artistId?: string
  cover?: string
  releaseDate?: string
  trackCount?: number
  /** Jamendo legal free-download ZIP for the whole album, when available */
  zip?: string
}

export interface ArtistInfo {
  id: string
  jamendoId: number
  name: string
  image?: string
}

export interface UserPlaylist {
  /** auto-increment primary key (assigned by Dexie) */
  id: number
  name: string
  createdAt: number
}

export interface PlaylistEntry {
  /** auto-increment primary key (assigned by Dexie) */
  id: number
  playlistId: number
  trackId: string
  position: number
  /** snapshot of the track at add time */
  track: Track
}

export interface FavoriteRecord {
  id: string
  track: Track
  addedAt: number
}

export interface LocalTrackRecord {
  key: string
  addedAt: number
  track: Track
}
