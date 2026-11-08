import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAlbum, getAlbumTracks } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { TrackTableHeader, type SortKey, type SortDir } from '../components/TrackTableHeader'
import { Cover } from '../components/MediaCard'
import { DownloadIcon, PlayIcon, ShuffleIcon } from '../components/icons'
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
    <div className="anim-rise">
      <header className="flex flex-col items-start gap-6 bg-gradient-to-b from-white/10 to-transparent p-6 pt-10 md:flex-row md:items-end">
        <Cover
          image={album?.cover}
          title={album?.title ?? id}
          className="h-40 w-40 shadow-2xl md:h-48 md:w-48"
        />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-dim">Album</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            {album?.title ?? 'Loading…'}
          </h1>
          <p className="mt-2 text-sm text-ink-dim">
            {album && album.artistId ? (
              <Link to={`/artist/${album.artistId}`} className="font-semibold text-ink hover:underline">
                {album.artist}
              </Link>
            ) : (
              album?.artist
            )}
            {album?.releaseDate && (
              <span className="text-ink-dim">
                {' '}
                · {new Date(album.releaseDate).getFullYear() || ''}
              </span>
            )}
            {album?.trackCount ? (
              <span className="text-ink-dim"> · {album.trackCount} tracks</span>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                tracks?.length && usePlayer.getState().playQueue(tracks, 0, context)
              }
              disabled={!tracks?.length}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-on-accent transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <PlayIcon size={16} /> Play
            </button>
            <button
              type="button"
              aria-label="Shuffle play this album"
              onClick={() => {
                if (!tracks?.length) return
                const p = usePlayer.getState()
                if (!p.shuffle) p.toggleShuffle()
                p.playQueue(tracks, Math.floor(Math.random() * tracks.length), context)
              }}
              disabled={!tracks?.length}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-panel-hi text-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Shuffle"
            >
              <ShuffleIcon size={16} />
            </button>
            {album?.zip && (
              <button
                type="button"
                onClick={() => album.zip && window.open(album.zip, '_blank', 'noopener')}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-4 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95"
                title="Download the whole album as a ZIP — legally, via Jamendo"
              >
                <DownloadIcon size={14} /> Download album (ZIP)
              </button>
            )}
            {tracks?.length && tracks[0].license ? (
              <span className="text-xs text-ink-dim">{tracks[0].license}</span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="p-4 pt-4 sm:p-6 sm:pt-4">
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
