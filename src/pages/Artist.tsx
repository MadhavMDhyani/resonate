import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getArtist, getArtistAlbums, getArtistTopTracks } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { CardRow, Section } from '../components/Section'
import { Cover, MediaCard } from '../components/MediaCard'
import { PlayIcon } from '../components/icons'
import { EmptyState, ErrorState, PageSkeleton, SkeletonCards, SkeletonRows } from '../components/States'
import { usePlayer } from '../stores/playerStore'
import type { Album, ArtistInfo, Track } from '../types'

export function ArtistPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [artist, setArtist] = useState<ArtistInfo | null>(null)
  const [topTracks, setTopTracks] = useState<Track[] | null>(null)
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const retry = useCallback(() => {
    setReloadCount((c) => c + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setArtist(null)
    setTopTracks(null)
    setAlbums(null)
    setError(null)
    void Promise.all([getArtist(id), getArtistTopTracks(id, 12), getArtistAlbums(id)])
      .then(([a, t, al]) => {
        if (cancelled) return
        setArtist(a)
        setTopTracks(t)
        setAlbums(al)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load artist')
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadCount])

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          title="Couldn't load artist"
          message={error}
          onRetry={retry}
          onBack={() => navigate(-1)}
        />
      </div>
    )
  }

  if (!artist && !topTracks) {
    return <PageSkeleton type="mixed" />
  }

  return (
    <div className="anim-rise">
      <header className="flex flex-col items-start gap-6 bg-gradient-to-b from-white/10 to-transparent p-6 pt-10 sm:flex-row sm:items-end">
        <Cover
          image={artist?.image}
          title={artist?.name ?? id}
          round
          className="h-36 w-36 shadow-2xl md:h-44 md:w-44"
        />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-dim">Artist</p>
          <h1 className="mt-1 truncate text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            {artist?.name ?? 'Loading…'}
          </h1>
          <button
            type="button"
            onClick={() =>
              topTracks?.length &&
              usePlayer.getState().playQueue(topTracks, 0, `Artist — ${artist?.name ?? ''}`)
            }
            disabled={!topTracks?.length}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-on-accent shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
          >
            <PlayIcon size={16} /> Play top tracks
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6">
        <Section title="Top tracks">
          {topTracks === null ? (
            <SkeletonRows n={5} />
          ) : topTracks.length === 0 ? (
            <EmptyState
              title="No top tracks"
              description="No popular tracks found for this artist."
            />
          ) : (
            <div>
              {topTracks.map((t, i) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  tracks={topTracks}
                  index={i}
                  showAlbum
                  context={`Artist — ${artist?.name ?? ''}`}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Albums">
          {albums === null ? (
            <SkeletonCards />
          ) : albums.length === 0 ? (
            <p className="text-sm text-ink-dim">No albums found for this artist.</p>
          ) : (
            <CardRow>
              {albums.map((a) => (
                <MediaCard
                  key={a.id}
                  title={a.title}
                  subtitle={a.releaseDate ? new Date(a.releaseDate).getFullYear().toString() : undefined}
                  image={a.cover}
                  to={`/album/${a.id}`}
                />
              ))}
            </CardRow>
          )}
        </Section>
      </div>
    </div>
  )
}
