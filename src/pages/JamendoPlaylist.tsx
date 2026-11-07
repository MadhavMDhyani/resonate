import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPlaylist } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { Cover } from '../components/MediaCard'
import { PlayIcon } from '../components/icons'
import { SkeletonRows } from './Home'
import { usePlayer } from '../stores/playerStore'
import type { Track } from '../types'

export function JamendoPlaylistPage() {
  const { id = '' } = useParams()
  const [name, setName] = useState<string | null>(null)
  const [creator, setCreator] = useState('')
  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setName(null)
    setTracks(null)
    setError(null)
    void getPlaylist(id)
      .then((pl) => {
        if (cancelled) return
        setName(pl.name)
        setCreator(pl.creator)
        setTracks(pl.tracks)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load playlist')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-ink">{error}</div>
      </div>
    )
  }

  return (
    <div className="anim-rise">
      <header className="flex items-end gap-6 bg-gradient-to-b from-white/10 to-transparent p-6 pt-10">
        <Cover title={name ?? id} className="h-40 w-40 shadow-2xl" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-dim">
            Community playlist
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            {name ?? 'Loading…'}
          </h1>
          <p className="mt-2 text-sm text-ink-dim">
            {creator && <span>by {creator}</span>}
            {tracks?.length ? <span className="text-ink-dim/70"> · {tracks.length} tracks</span> : null}
          </p>
          <button
            type="button"
            onClick={() =>
              tracks?.length && usePlayer.getState().playQueue(tracks, 0, `Playlist — ${name ?? ''}`)
            }
            disabled={!tracks?.length}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-on-accent transition-transform hover:scale-105 disabled:opacity-50"
          >
            <PlayIcon size={16} /> Play
          </button>
        </div>
      </header>

      <div className="p-6 pt-4">
        {tracks === null ? (
          <SkeletonRows n={8} />
        ) : tracks.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-dim/70">This playlist is empty.</p>
        ) : (
          tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              tracks={tracks}
              index={i}
              showAlbum
              context={`Playlist — ${name ?? ''}`}
            />
          ))
        )}
      </div>
    </div>
  )
}
