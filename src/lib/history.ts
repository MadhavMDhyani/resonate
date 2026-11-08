import { db } from '../db/db'
import type { Track } from '../types'

export async function recordHistory(track: Track): Promise<void> {
  try {
    // Check most recently played track to de-duplicate consecutive repeats
    const latest = await db.history.orderBy('playedAt').last()
    if (latest && latest.id === track.id) {
      await db.history.update(track.id, { playedAt: Date.now() })
      return
    }

    await db.history.put({
      id: track.id,
      track,
      playedAt: Date.now(),
    })

    // Keep last ~50 tracks
    const count = await db.history.count()
    if (count > 55) {
      const oldest = await db.history.orderBy('playedAt').limit(count - 50).toArray()
      await db.history.bulkDelete(oldest.map((h) => h.id))
    }
  } catch {
    // IndexedDB non-fatal
  }
}
