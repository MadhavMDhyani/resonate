import Dexie, { type EntityTable } from 'dexie'
import type {
  FavoriteRecord,
  HistoryRecord,
  LocalTrackRecord,
  PlaylistEntry,
  UserPlaylist,
} from '../types'

export interface HandleRecord {
  key: string
  handle: FileSystemFileHandle
}

export const db = new Dexie('resonate') as Dexie & {
  favorites: EntityTable<FavoriteRecord, 'id'>
  playlists: EntityTable<UserPlaylist, 'id'>
  playlistTracks: EntityTable<PlaylistEntry, 'id'>
  localTracks: EntityTable<LocalTrackRecord, 'key'>
  handles: EntityTable<HandleRecord, 'key'>
  history: EntityTable<HistoryRecord, 'id'>
}

db.version(1).stores({
  favorites: 'id, addedAt',
  playlists: '++id, name',
  playlistTracks: '++id, playlistId, [playlistId+position]',
  localTracks: 'key, addedAt',
  handles: 'key',
})

db.version(2).stores({
  history: 'id, playedAt',
})
