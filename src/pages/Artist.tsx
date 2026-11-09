import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getArtist, getArtistAlbums, getArtistTopTracks } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { TrackTableHeader, type SortKey, type SortDir } from '../components/TrackTableHeader'
import { HeroBanner } from '../components/HeroBanner'
import { CardRow, Section } from '../components/Section'
import { MediaCard } from '../components/MediaCard'
import { EmptyState, ErrorState, PageSkeleton, SkeletonCards, SkeletonRows } from '../components/States'
import { usePlayer } from '../stores/playerStore'
import { sortTracks, nextSort } from '../lib/sortTracks'
import type { Album, ArtistInfo, Track } from '../types'

export function ArtistPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [artist, setArtist] = useState<ArtistInfo | null>(null)
  const [topTracks, setTopTracks] = useState<Track[] | null>(null)
  const [albums, setAlbums] = useState<Album[] | null>(null)
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
    () => (topTracks ? sortTracks(topTracks, sortKey, sortDir) : topTracks),
    [topTracks, sortKey, sortDir],
  )

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

  const [discoFilter, setDiscoFilter] = useState<'all' | 'albums'>('all')
  const [showAllAlbums, setShowAllAlbums] = useState(false)

  const displayedAlbums = useMemo(() => {
    if (!albums) return []
    return showAllAlbums ? albums : albums.slice(0, 10)
  }, [albums, showAllAlbums])

  return (
    <div className="anim-rise p-4 sm:p-6">
      <HeroBanner
        badge="Verified artist"
        title={artist?.name ?? 'Loading…'}
        subtitle="Creative Commons Artist"
        metadata={
          <span>
            {albums?.length ? <span>{albums.length} releases</span> : null}
            {topTracks?.length ? <span> · {topTracks.length} popular tracks</span> : null}
          </span>
        }
        cover={artist?.image}
        onPlay={() =>
          topTracks?.length &&
          usePlayer.getState().playQueue(topTracks, 0, `Artist — ${artist?.name ?? ''}`)
        }
        playDisabled={!topTracks?.length}
        onShuffle={() => {
          if (!topTracks?.length) return
          const p = usePlayer.getState()
          if (!p.shuffle) p.toggleShuffle()
          p.playQueue(topTracks, Math.floor(Math.random() * topTracks.length), `Artist — ${artist?.name ?? ''}`)
        }}
        onRadio={() => {
          if (!topTracks?.length) return
          usePlayer.getState().playQueue(topTracks, 0, `${artist?.name} Radio`)
        }}
      />

      <div className="space-y-8 pt-2">
        <Section title="Popular">
          {topTracks === null ? (
            <SkeletonRows n={5} />
          ) : topTracks.length === 0 ? (
            <EmptyState
              title="No top tracks"
              description="No popular tracks found for this artist."
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
                  context={`Artist — ${artist?.name ?? ''}`}
                />
              ))}
            </div>
          )}
        </Section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-ink">Discography</h2>
              {/* Filter chips as in Image 1 */}
              <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-panel p-1">
                <button
                  type="button"
                  onClick={() => setDiscoFilter('all')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    discoFilter === 'all'
                      ? 'bg-accent text-on-accent'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  Popular releases
                </button>
                <button
                  type="button"
                  onClick={() => setDiscoFilter('albums')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    discoFilter === 'albums'
                      ? 'bg-accent text-on-accent'
                      : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  Albums
                </button>
              </div>
            </div>
            {albums && albums.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllAlbums((s) => !s)}
                className="text-xs font-bold uppercase tracking-wider text-accent hover:underline"
              >
                {showAllAlbums ? 'Show less' : 'See all'}
              </button>
            )}
          </div>

          {albums === null ? (
            <SkeletonCards />
          ) : albums.length === 0 ? (
            <p className="text-sm text-ink-dim">No albums found for this artist.</p>
          ) : (
            <CardRow>
              {displayedAlbums.map((a) => (
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
        </section>
      </div>
    </div>
  )
}
