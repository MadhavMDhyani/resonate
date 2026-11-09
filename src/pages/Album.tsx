import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAlbum, getAlbumTracks } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { TrackTableHeader, type SortKey, type SortDir } from '../components/TrackTableHeader'
import { HeroBanner } from '../components/HeroBanner'
import { DownloadIcon } from '../components/icons'
import { EmptyState, ErrorState, PageSkeleton } from '../components/States'
import { usePlayer } from '../stores/playerStore'
import { sortTracks, nextSort } from '../lib/sortTracks'
import type { Album, Track } from '../types'

export function AlbumPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState<Album | null>(null)
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
    setAlbum(null)
    setTracks(null)
    setError(null)
    void Promise.all([getAlbum(id), getAlbumTracks(id)])
      .then(([a, t]) => {
        if (cancelled) return
        setAlbum(a)
        setTracks(t)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load album')
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadCount])

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          title="Couldn't load album"
          message={error}
          onRetry={retry}
          onBack={() => navigate(-1)}
        />
      </div>
    )
  }

  if (!album && !tracks) {
    return <PageSkeleton type="mixed" />
  }

  const context = `Album — ${album?.title ?? ''}`

  return (
    <div className="anim-rise p-4 sm:p-6">
      <HeroBanner
        badge="Album"
        title={album?.title ?? 'Loading…'}
        subtitle={
          album && album.artistId ? (
            <Link to={`/artist/${album.artistId}`} className="font-semibold text-accent hover:underline">
              {album.artist}
            </Link>
          ) : (
            album?.artist
          )
        }
        metadata={
          <span>
            {album?.releaseDate && <span>{new Date(album.releaseDate).getFullYear()}</span>}
            {album?.trackCount ? <span> · {album.trackCount} tracks</span> : null}
            {tracks?.length && tracks[0].license ? <span> · {tracks[0].license}</span> : null}
          </span>
        }
        cover={album?.cover}
        onPlay={() => tracks?.length && usePlayer.getState().playQueue(tracks, 0, context)}
        playDisabled={!tracks?.length}
        onShuffle={() => {
          if (!tracks?.length) return
          const p = usePlayer.getState()
          if (!p.shuffle) p.toggleShuffle()
          p.playQueue(tracks, Math.floor(Math.random() * tracks.length), context)
        }}
        extraActions={
          album?.zip ? (
            <button
              type="button"
              onClick={() => album.zip && window.open(album.zip, '_blank', 'noopener')}
              className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-ink shadow transition-transform hover:scale-105 active:scale-95"
              title="Download the whole album as a ZIP — legally, via Jamendo"
            >
              <DownloadIcon size={14} /> Download ZIP
            </button>
          ) : null
        }
      />

      <div className="pt-2">
        {tracks === null ? (
          <PageSkeleton type="rows" />
        ) : tracks.length === 0 ? (
          <EmptyState
            title="No tracks found"
            description="This album does not currently have any tracks in the catalog."
          />
        ) : (
          <div>
            <TrackTableHeader sortKey={sortKey} sortDir={sortDir} onSort={handleSort} showAlbum={false} />
            {sortedTracks!.map((t, i) => (
              <TrackRow key={t.id} track={t} tracks={sortedTracks!} index={i} context={context} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
