import { db } from '../db/db'
import type { Track } from '../types'

export async function toggleFavorite(track: Track): Promise<boolean> {
  const existing = await db.favorites.get(track.id)
  if (existing) {
    await db.favorites.delete(track.id)
    return false
  }
  await db.favorites.put({ id: track.id, track, addedAt: Date.now() })
  return true
}

export async function createPlaylist(name: string): Promise<number> {
  return db.playlists.add({ name: name.trim() || 'New playlist', createdAt: Date.now() })
}

export async function renamePlaylist(playlistId: number, name: string): Promise<void> {
  await db.playlists.update(playlistId, { name: name.trim() || 'New playlist' })
}

export async function deletePlaylist(playlistId: number): Promise<void> {
  await db.transaction('rw', db.playlists, db.playlistTracks, async () => {
    await db.playlists.delete(playlistId)
    await db.playlistTracks.where('playlistId').equals(playlistId).delete()
  })
}

export async function addToPlaylist(playlistId: number, track: Track): Promise<void> {
  const count = await db.playlistTracks.where('playlistId').equals(playlistId).count()
  await db.playlistTracks.add({ playlistId, trackId: track.id, position: count, track })
}

export async function removeFromPlaylist(entryId: number): Promise<void> {
  await db.playlistTracks.delete(entryId)
}

export async function movePlaylistEntry(entryId: number, dir: -1 | 1): Promise<void> {
  const entry = await db.playlistTracks.get(entryId)
  if (!entry) return
  const all = await db.playlistTracks.where('playlistId').equals(entry.playlistId).sortBy('position')
  const idx = all.findIndex((e) => e.id === entryId)
  const neighbor = all[idx + dir]
  if (!neighbor) return
  await db.transaction('rw', db.playlistTracks, async () => {
    await db.playlistTracks.update(entry.id, { position: neighbor.position })
    await db.playlistTracks.update(neighbor.id, { position: entry.position })
  })
}

export async function reorderPlaylistEntries(
  playlistId: number,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  if (fromIndex === toIndex) return
  const all = await db.playlistTracks.where('playlistId').equals(playlistId).sortBy('position')
  if (fromIndex < 0 || fromIndex >= all.length || toIndex < 0 || toIndex >= all.length) return
  const [moved] = all.splice(fromIndex, 1)
  all.splice(toIndex, 0, moved)
  await db.transaction('rw', db.playlistTracks, async () => {
    for (let i = 0; i < all.length; i++) {
      if (all[i].position !== i) {
        await db.playlistTracks.update(all[i].id, { position: i })
      }
    }
  })
}
