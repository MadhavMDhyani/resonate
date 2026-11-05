import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAlbum, getAlbumTracks } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { Cover } from '../components/MediaCard'
import { DownloadIcon, PlayIcon, ShuffleIcon } from '../components/icons'
import { SkeletonRows } from './Home'
import { usePlayer } from '../stores/playerStore'
import type { Album, Track } from '../types'

export function AlbumPage() {
  const { id = '' } = useParams()
  const [album, setAlbum] = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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
  }, [id])

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">{error}</div>
      </div>
    )
  }

  const context = `Album — ${album?.title ?? ''}`

  return (
    <div>
      <header className="flex flex-col items-start gap-6 bg-gradient-to-b from-white/10 to-transparent p-6 pt-10 md:flex-row md:items-end">
        <Cover
          image={album?.cover}
          title={album?.title ?? id}
          className="h-40 w-40 shadow-2xl md:h-48 md:w-48"
        />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">Album</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
            {album?.title ?? 'Loading…'}
          </h1>
          <p className="mt-2 text-sm text-neutral-300">
            {album && album.artistId ? (
              <Link to={`/artist/${album.artistId}`} className="font-semibold text-white hover:underline">
                {album.artist}
              </Link>
            ) : (
              album?.artist
            )}
            {album?.releaseDate && (
              <span className="text-neutral-400">
                {' '}
                · {new Date(album.releaseDate).getFullYear() || ''}
              </span>
            )}
            {album?.trackCount ? (
              <span className="text-neutral-400"> · {album.trackCount} tracks</span>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                tracks?.length && usePlayer.getState().playQueue(tracks, 0, context)
              }
              disabled={!tracks?.length}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-50"
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-neutral-200 hover:border-accent-hover hover:text-accent-hover disabled:opacity-50"
              title="Shuffle"
            >
              <ShuffleIcon size={16} />
            </button>
            {album?.zip && (
              <button
                type="button"
                onClick={() => album.zip && window.open(album.zip, '_blank', 'noopener')}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-accent-hover hover:text-accent-hover"
                title="Download the whole album as a ZIP — legally, via Jamendo"
              >
                <DownloadIcon size={14} /> Download album (ZIP)
              </button>
            )}
            {tracks?.length && tracks[0].license ? (
              <span className="text-[11px] text-neutral-500">{tracks[0].license}</span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="p-6 pt-4">
        {tracks === null ? (
          <SkeletonRows n={8} />
        ) : tracks.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">This album has no tracks.</p>
        ) : (
          tracks.map((t, i) => <TrackRow key={t.id} track={t} tracks={tracks} index={i} context={context} />)
        )}
      </div>
    </div>
  )
}
