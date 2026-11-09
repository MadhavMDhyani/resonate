import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPlaylist } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { TrackTableHeader, type SortKey, type SortDir } from '../components/TrackTableHeader'
import { HeroBanner } from '../components/HeroBanner'
import { EmptyState, ErrorState, PageSkeleton, SkeletonRows } from '../components/States'
import { usePlayer } from '../stores/playerStore'
import { sortTracks, nextSort } from '../lib/sortTracks'
import type { Track } from '../types'

export function JamendoPlaylistPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState<string | null>(null)
  const [creator, setCreator] = useState('')
  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const [sortKey, setSortKey] = useState<SortKey>('index')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    const next = nextSort(sortKey, sortDir, key)
    setSortKey(next.key)
    setSortDir(next.dir)
  }

  const sortedTracks = useMemo(
    () => (tracks ? sortTracks(tracks, sortKey, sortDir) : tracks),
    [tracks, sortKey, sortDir],
  )

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
    <div className="anim-rise p-4 sm:p-6">
      <HeroBanner
        badge="Community playlist"
        title={name ?? 'Loading…'}
        subtitle={creator ? `by ${creator}` : undefined}
        metadata={tracks?.length ? <span>{tracks.length} tracks</span> : null}
        cover={tracks?.[0]?.cover}
        onPlay={() =>
          tracks?.length && usePlayer.getState().playQueue(tracks, 0, `Playlist — ${name ?? ''}`)
        }
        playDisabled={!tracks?.length}
        onShuffle={() => {
          if (!tracks?.length) return
          const p = usePlayer.getState()
          if (!p.shuffle) p.toggleShuffle()
          p.playQueue(tracks, Math.floor(Math.random() * tracks.length), `Playlist — ${name ?? ''}`)
        }}
      />

      <div className="pt-2">
        {tracks === null ? (
          <SkeletonRows n={8} />
        ) : tracks.length === 0 ? (
          <EmptyState
            title="Empty playlist"
            description="This community playlist currently has no tracks."
          />
        ) : (
          <div>
            <TrackTableHeader sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            {sortedTracks!.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                tracks={sortedTracks!}
                index={i}
                showAlbum
                context={`Playlist — ${name ?? ''}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
