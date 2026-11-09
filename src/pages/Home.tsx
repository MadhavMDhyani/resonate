import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getNewAlbums, getPopularTracks, getTracksByTag } from '../api/jamendo'
import { db } from '../db/db'
import { TrackRow } from '../components/TrackRow'
import { TrackTableHeader, type SortKey, type SortDir } from '../components/TrackTableHeader'
import { HeroBanner } from '../components/HeroBanner'
import { CardRow, Section } from '../components/Section'
import { Cover, MediaCard, hueOf } from '../components/MediaCard'
import { PlayIcon, SpinnerIcon } from '../components/icons'
import { ErrorState, SkeletonCards, SkeletonRows } from '../components/States'
import { usePlayer } from '../stores/playerStore'
import { sortTracks, nextSort } from '../lib/sortTracks'
import type { Album, Track } from '../types'

export const GENRES = [
  'electronic',
  'chill',
  'acoustic',
  'rock',
  'focus',
  'jazz',
  'lo-fi',
  'hip-hop',
  'workout',
  'ambient',
  'classical',
  'world',
]

export function Home() {
  const [popular, setPopular] = useState<Track[] | null>(null)
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [genreTracks, setGenreTracks] = useState<Record<string, Track[]>>({})
  const [loadingGenre, setLoadingGenre] = useState<string | null>(null)
  const [popularError, setPopularError] = useState<string | null>(null)
  const [albumsError, setAlbumsError] = useState<string | null>(null)

  // Sort state for the Popular track list
  const [popularSortKey, setPopularSortKey] = useState<SortKey>('index')
  const [popularSortDir, setPopularSortDir] = useState<SortDir>('asc')

  const handlePopularSort = (key: SortKey) => {
    const next = nextSort(popularSortKey, popularSortDir, key)
    setPopularSortKey(next.key)
    setPopularSortDir(next.dir)
  }

  // Query recently played from Dexie version(2)
  const recentHistory = useLiveQuery(
    () => db.history.orderBy('playedAt').reverse().limit(12).toArray(),
    [],
  )

  const loadPopular = useCallback(() => {
    setPopularError(null)
    setPopular(null)
    getPopularTracks(18)
      .then((t) => setPopular(t))
      .catch((e: unknown) => {
        setPopularError(e instanceof Error ? e.message : 'Failed to load popular tracks')
      })
  }, [])

  const loadAlbums = useCallback(() => {
    setAlbumsError(null)
    setAlbums(null)
    getNewAlbums(16)
      .then((a) => setAlbums(a))
      .catch((e: unknown) => {
        setAlbumsError(e instanceof Error ? e.message : 'Failed to load albums')
      })
  }, [])

  useEffect(() => {
    loadPopular()
    loadAlbums()
  }, [loadPopular, loadAlbums])

  const playGenre = async (tag: string) => {
    try {
      setLoadingGenre(tag)
      const existing = genreTracks[tag]
      if (existing?.length) {
        usePlayer.getState().playQueue(existing, 0, `${tag} radio`)
        return
      }
      const tracks = await getTracksByTag(tag, 20)
      setGenreTracks((g) => ({ ...g, [tag]: tracks }))
      usePlayer.getState().playQueue(tracks, 0, `${tag} radio`)
    } finally {
      setLoadingGenre(null)
    }
  }

  const playAlbum = async (albumId: string, albumTitle: string) => {
    const { getAlbumTracks } = await import('../api/jamendo')
    const tracks = await getAlbumTracks(albumId)
    if (tracks.length) usePlayer.getState().playQueue(tracks, 0, `Album — ${albumTitle}`)
  }

  // Quick picks: take up to 6 tracks from history or fallback to popular tracks
  const quickPicks = useMemo(() => {
    const tracks: Track[] = []
    if (recentHistory?.length) {
      for (const h of recentHistory) {
        if (!tracks.some((t) => t.id === h.track.id)) {
          tracks.push(h.track)
        }
        if (tracks.length === 6) break
      }
    }
    if (tracks.length < 6 && popular?.length) {
      for (const p of popular) {
        if (!tracks.some((t) => t.id === p.id)) {
          tracks.push(p)
        }
        if (tracks.length === 6) break
      }
    }
    return tracks.slice(0, 6)
  }, [recentHistory, popular])

  // Sorted popular tracks
  const sortedPopular = useMemo(
    () => (popular ? sortTracks(popular, popularSortKey, popularSortDir) : popular),
    [popular, popularSortKey, popularSortDir],
  )

  // Featured hero item (trending album or top popular track)
  const featured = albums?.[0] ?? popular?.[0]

  return (
    <div className="anim-rise p-4 sm:p-6">
      {/* Featured Hero Banner */}
      {featured && (
        <HeroBanner
          badge="Featured today"
          title={featured.title}
          subtitle={`by ${featured.artist}`}
          metadata={
            <span>Free, Creative Commons music · High quality streaming & downloads</span>
          }
          cover={featured.cover}
          onPlay={() => {
            if ('releaseDate' in featured) {
              void playAlbum(featured.id, featured.title)
            } else if (popular) {
              usePlayer.getState().playQueue(popular, 0, 'Popular on Jamendo')
            }
          }}
          onShuffle={() => {
            if (popular?.length) {
              const p = usePlayer.getState()
              if (!p.shuffle) p.toggleShuffle()
              p.playQueue(popular, Math.floor(Math.random() * popular.length), 'Popular on Jamendo')
            }
          }}
        />
      )}

      {/* Jump back in (recently played) */}
      {recentHistory && recentHistory.length > 0 && (
        <Section title="Jump back in" subtitle="Pick up where you left off">
          <CardRow>
            {recentHistory.map(({ id, track: t }) => (
              <MediaCard
                key={id}
                title={t.title}
                subtitle={t.artist}
                image={t.cover}
                to={t.source === 'jamendo' && t.albumId ? `/album/${t.albumId}` : undefined}
                onPlay={() => usePlayer.getState().playTrackNow(t, 'Jump back in')}
              />
            ))}
          </CardRow>
        </Section>
      )}

      {/* Quick Picks row: 6 compact track tiles for 1-tap play */}
      {quickPicks.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-ink">Quick picks</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {quickPicks.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => usePlayer.getState().playTrackNow(t, 'Quick picks')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    usePlayer.getState().playTrackNow(t, 'Quick picks')
                  }
                }}
                className="group flex h-14 cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl bg-panel p-1.5 transition-colors hover:bg-panel-hi sm:gap-3"
              >
                <Cover image={t.cover} title={t.title} className="h-11 w-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 pr-1">
                  <p className="truncate text-xs font-semibold leading-tight text-ink sm:text-sm">
                    {t.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] leading-tight text-ink-dim">
                    {t.artist}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Play ${t.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    usePlayer.getState().playTrackNow(t, 'Quick picks')
                  }}
                  className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent opacity-0 shadow-md transition-all group-hover:opacity-100 group-hover:scale-105 active:scale-95 sm:mr-2"
                >
                  <PlayIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moods & Genres as Coloured Deterministic Gradient Tiles */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-ink">Moods & Genres</h2>
        <div className="row-scroll flex gap-2.5 overflow-x-auto pb-1">
          {GENRES.map((g) => {
            const h = hueOf(g)
            const isLoading = loadingGenre === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => void playGenre(g)}
                disabled={isLoading}
                style={{
                  background: `linear-gradient(135deg, hsl(${h} 55% 32%), hsl(${(h + 40) % 360} 70% 16%))`,
                }}
                className="group relative flex h-20 w-32 shrink-0 flex-col justify-between overflow-hidden rounded-2xl p-3 text-left shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-75 sm:h-22 sm:w-36"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold capitalize tracking-wide text-white">
                    {g}
                  </span>
                  {isLoading ? (
                    <SpinnerIcon size={16} className="text-white" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                      <PlayIcon size={12} />
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">
                  Radio
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Popular Right Now */}
      <Section title="Popular right now" subtitle="Most played CC tracks this week">
        {popularError ? (
          <ErrorState
            title="Could not load popular tracks"
            message={popularError}
            onRetry={loadPopular}
            className="mb-4"
          />
        ) : popular === null ? (
          <SkeletonRows />
        ) : (
          <div>
            <TrackTableHeader
              sortKey={popularSortKey}
              sortDir={popularSortDir}
              onSort={handlePopularSort}
            />
            {sortedPopular!.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                tracks={sortedPopular!}
                index={i}
                showAlbum
                context="Popular on Jamendo"
              />
            ))}
          </div>
        )}
      </Section>

      {/* Fresh Albums */}
      <Section title="Fresh albums" subtitle="Recently released under Creative Commons">
        {albumsError ? (
          <ErrorState
            title="Could not load albums"
            message={albumsError}
            onRetry={loadAlbums}
            className="mb-4"
          />
        ) : albums === null ? (
          <SkeletonCards />
        ) : (
          <CardRow>
            {albums.map((a) => (
              <MediaCard
                key={a.id}
                title={a.title}
                subtitle={a.artist}
                image={a.cover}
                to={`/album/${a.id}`}
                onPlay={() => void playAlbum(a.id, a.title)}
              />
            ))}
          </CardRow>
        )}
      </Section>
    </div>
  )
}

export { SkeletonCards, SkeletonRows } from '../components/States'
