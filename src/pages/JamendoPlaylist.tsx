import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPlaylist } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { Cover } from '../components/MediaCard'
import { PlayIcon } from '../components/icons'
import { EmptyState, ErrorState, PageSkeleton, SkeletonRows } from '../components/States'
import { usePlayer } from '../stores/playerStore'
import type { Track } from '../types'

export function JamendoPlaylistPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState<string | null>(null)
  const [creator, setCreator] = useState('')
  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const retry = useCallback(() => {
    setReloadCount((c) => c + 1)
  }, [])

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
  }, [id, reloadCount])

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          title="Couldn't load community playlist"
          message={error}
          onRetry={retry}
          onBack={() => navigate(-1)}
        />
      </div>
    )
  }

  if (!name && !tracks) {
    return <PageSkeleton type="mixed" />
  }

  return (
    <div className="anim-rise">
      <header className="flex flex-col items-start gap-6 bg-gradient-to-b from-white/10 to-transparent p-6 pt-10 sm:flex-row sm:items-end">
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
            {tracks?.length ? <span className="text-ink-dim"> · {tracks.length} tracks</span> : null}
          </p>
          <button
            type="button"
            onClick={() =>
              tracks?.length && usePlayer.getState().playQueue(tracks, 0, `Playlist — ${name ?? ''}`)
            }
            disabled={!tracks?.length}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-on-accent shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
          >
            <PlayIcon size={16} /> Play
          </button>
        </div>
      </header>

      <div className="p-4 pt-4 sm:p-6 sm:pt-4">
        {tracks === null ? (
          <SkeletonRows n={8} />
        ) : tracks.length === 0 ? (
          <EmptyState
            title="Empty playlist"
            description="This community playlist currently has no tracks."
          />
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
