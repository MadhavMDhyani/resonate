import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  getAlbumTracks,
  getArtistTopTracks,
  getTracksByTag,
  searchAlbums,
  searchArtists,
  searchTracks,
} from '../api/jamendo'
import { db } from '../db/db'
import { HighlightText, TrackRow } from '../components/TrackRow'
import { CardRow, Section } from '../components/Section'
import { MediaCard, hueOf } from '../components/MediaCard'
import { EmptyState, ErrorState, SkeletonCards, SkeletonRows } from '../components/States'
import {
  HistoryIcon,
  PlayIcon,
  SearchIcon,
  SpinnerIcon,
  XIcon,
} from '../components/icons'
import { GENRES } from './Home'
import { usePlayer } from '../stores/playerStore'
import type { Album, ArtistInfo, LocalTrackRecord, Track } from '../types'

const RECENT_KEY = 'resonate:recent_searches'

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function storeRecentSearch(item: string): string[] {
  const trimmed = item.trim()
  if (trimmed.length < 2) return loadRecentSearches()
  try {
    const prev = loadRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase())
    const next = [trimmed, ...prev].slice(0, 8)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    return next
  } catch {
    return loadRecentSearches()
  }
}

function deleteRecentSearch(item: string): string[] {
  try {
    const prev = loadRecentSearches().filter((s) => s.toLowerCase() !== item.toLowerCase())
    localStorage.setItem(RECENT_KEY, JSON.stringify(prev))
    return prev
  } catch {
    return []
  }
}

function clearAllRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_KEY)
  } catch {
    // ignore
  }
}

type FilterType = 'all' | 'tracks' | 'albums' | 'artists' | 'local'

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'local', label: 'Local files' },
]

export function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const activeType = (params.get('type') ?? 'all') as FilterType

  const [input, setInput] = useState(q)
  const inputRef = useRef<HTMLInputElement>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches)
  const [loadingTag, setLoadingTag] = useState<string | null>(null)

  // Keep input in sync with back/forward nav
  useEffect(() => setInput(q), [q])

  // Debounced URL update while typing
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = input.trim()
      if (trimmed !== q) {
        const next: Record<string, string> = {}
        if (trimmed) next.q = trimmed
        if (activeType !== 'all') next.type = activeType
        setParams(next, { replace: true })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [input, q, activeType, setParams])

  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [artists, setArtists] = useState<ArtistInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const localTracks = useLiveQuery(
    () => {
      if (q.length < 2) return Promise.resolve<LocalTrackRecord[]>([])
      const needle = q.toLowerCase()
      return db.localTracks
        .filter((r) => {
          const t = r.track
          return (
            t.title.toLowerCase().includes(needle) ||
            t.artist.toLowerCase().includes(needle) ||
            (t.album?.toLowerCase().includes(needle) ?? false)
          )
        })
        .toArray()
    },
    [q],
  )

  useEffect(() => {
    if (q.trim().length < 2) {
      setTracks(null)
      setAlbums(null)
      setArtists(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setError(null)
    setIsLoading(true)

    // Save recent search
    const updated = storeRecentSearch(q)
    setRecentSearches(updated)

    void Promise.allSettled([searchTracks(q), searchAlbums(q), searchArtists(q)]).then(
      ([t, a, ar]) => {
        if (cancelled) return
        setTracks(t.status === 'fulfilled' ? t.value : [])
        setAlbums(a.status === 'fulfilled' ? a.value : [])
        setArtists(ar.status === 'fulfilled' ? ar.value : [])
        if (t.status === 'rejected') {
          setError(t.reason instanceof Error ? t.reason.message : 'Search failed')
        }
        setIsLoading(false)
      },
    )

    return () => {
      cancelled = true
    }
  }, [q])

  const localMatches = (localTracks ?? []).map((r) => r.track)
  const hasQuery = q.trim().length >= 2

  const handleSelectFilter = (filter: FilterType) => {
    const next: Record<string, string> = {}
    if (q.trim()) next.q = q.trim()
    if (filter !== 'all') next.type = filter
    setParams(next)
  }

  const handleClear = () => {
    setInput('')
    const next: Record<string, string> = {}
    if (activeType !== 'all') next.type = activeType
    setParams(next)
    inputRef.current?.focus()
  }

  const handleSelectRecent = (val: string) => {
    setInput(val)
    const next: Record<string, string> = { q: val }
    if (activeType !== 'all') next.type = activeType
    setParams(next)
  }

  const handleRemoveRecent = (e: React.MouseEvent, val: string) => {
    e.stopPropagation()
    const next = deleteRecentSearch(val)
    setRecentSearches(next)
  }

  const handleClearAllRecent = () => {
    clearAllRecentSearches()
    setRecentSearches([])
  }

  const playArtist = async (artist: ArtistInfo) => {
    try {
      const top = await getArtistTopTracks(artist.id, 20)
      if (top.length > 0) {
        usePlayer.getState().playQueue(top, 0, `${artist.name} — Top Tracks`)
      }
    } catch (err) {
      console.error('Failed to play artist tracks', err)
    }
  }

  const playAlbum = async (album: Album) => {
    try {
      const albumTracks = await getAlbumTracks(album.id)
      if (albumTracks.length > 0) {
        usePlayer.getState().playQueue(albumTracks, 0, album.title)
      }
    } catch (err) {
      console.error('Failed to play album tracks', err)
    }
  }

  const playGenreRadio = async (genre: string) => {
    setLoadingTag(genre)
    try {
      const tagTracks = await getTracksByTag(genre, 24)
      if (tagTracks.length > 0) {
        usePlayer.getState().playQueue(tagTracks, 0, `${genre} radio`)
      }
    } catch (err) {
      console.error('Failed to play genre radio', err)
    } finally {
      setLoadingTag(null)
    }
  }

  // Determine result counts & empty state visibility
  const isTracksLoading = tracks === null
  const isAlbumsLoading = albums === null
  const isArtistsLoading = artists === null
  const isLocalLoading = localTracks === undefined

  const tracksCount = tracks?.length ?? 0
  const albumsCount = albums?.length ?? 0
  const artistsCount = artists?.length ?? 0
  const localCount = localMatches.length

  const hasResults =
    activeType === 'tracks'
      ? tracksCount > 0
      : activeType === 'albums'
        ? albumsCount > 0
        : activeType === 'artists'
          ? artistsCount > 0
          : activeType === 'local'
            ? localCount > 0
            : tracksCount + albumsCount + artistsCount + localCount > 0

  const allLoaded =
    activeType === 'tracks'
      ? !isTracksLoading
      : activeType === 'albums'
        ? !isAlbumsLoading
        : activeType === 'artists'
          ? !isArtistsLoading
          : activeType === 'local'
            ? !isLocalLoading
            : !isTracksLoading && !isAlbumsLoading && !isArtistsLoading && !isLocalLoading

  const showLocal = (activeType === 'all' || activeType === 'local') && localMatches.length > 0
  const showTracks = activeType === 'all' || activeType === 'tracks'
  const showAlbums = activeType === 'all' || activeType === 'albums'
  const showArtists = activeType === 'all' || activeType === 'artists'

  return (
    <div className="anim-rise p-4 sm:p-6">
      {/* Sticky search bar + filter chips */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 bg-base/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="relative max-w-xl">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim"
          />
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tracks, albums, artists, or your local files…"
            className="w-full rounded-full border border-hairline bg-panel-hi py-2.5 pl-10 pr-16 text-sm text-ink outline-none transition-colors placeholder:text-ink-dim focus:border-accent"
            aria-label="Search"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {isLoading && <SpinnerIcon size={16} className="text-accent" />}
            {input && (
              <button
                type="button"
                onClick={handleClear}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-panel hover:text-ink"
                aria-label="Clear search text"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {FILTERS.map((f) => {
            const active = activeType === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectFilter(f.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 font-semibold transition-all ${
                  active
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'border border-hairline bg-panel-hi text-ink-dim hover:text-ink hover:border-accent/40'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <ErrorState title="Search failed" message={error} className="mb-6" />
      )}

      {/* Query empty browse view: Recent searches + Moods & Genres browse grid */}
      {!hasQuery && (
        <div className="space-y-8">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-dim">
                  <HistoryIcon size={16} /> Recent searches
                </h2>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="text-xs font-semibold text-ink-dim transition-colors hover:text-ink hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectRecent(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelectRecent(item)
                      }
                    }}
                    className="group flex cursor-pointer items-center gap-2 rounded-full border border-hairline bg-panel px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent/50 hover:bg-panel-hi"
                  >
                    <SearchIcon size={13} className="text-ink-dim group-hover:text-accent" />
                    <span>{item}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${item} from recent searches`}
                      onClick={(e) => handleRemoveRecent(e, item)}
                      className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-ink-dim opacity-70 transition-opacity hover:bg-panel-hi hover:text-ink hover:opacity-100"
                    >
                      <XIcon size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Browse by genre & mood */}
          <div>
            <h2 className="mb-3 text-lg font-bold text-ink">Browse by genre & mood</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {GENRES.map((g) => {
                const h = hueOf(g)
                const isTagLoading = loadingTag === g
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleSelectRecent(g)}
                    style={{
                      background: `linear-gradient(135deg, hsl(${h} 55% 32%), hsl(${(h + 40) % 360} 70% 16%))`,
                    }}
                    className="group relative flex h-24 flex-col justify-between overflow-hidden rounded-2xl p-3 text-left shadow-md transition-transform hover:scale-105 active:scale-95"
                  >
                    <span className="text-sm font-extrabold capitalize tracking-wide text-white">
                      {g}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/70">
                        Explore
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Play ${g} radio`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void playGenreRadio(g)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            void playGenreRadio(g)
                          }
                        }}
                        className="touch-visible flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white/90 opacity-0 transition-opacity group-hover:opacity-100 hover:scale-110"
                      >
                        {isTagLoading ? (
                          <SpinnerIcon size={14} className="text-white" />
                        ) : (
                          <PlayIcon size={12} />
                        )}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Query active results view */}
      {hasQuery && (
        <>
          {allLoaded && !hasResults && !error ? (
            <EmptyState
              icon={<SearchIcon size={24} />}
              title={`No results found for "${q}"`}
              description="Try fewer words, check the spelling, or switch the filter tab above."
              action={{ label: 'Clear search', onClick: handleClear }}
              className="my-10"
            />
          ) : (
            <div className="space-y-6">
              {showLocal && (
                <Section title="In your local files">
                  <div>
                    {localMatches.map((t, i) => (
                      <TrackRow
                        key={t.id}
                        track={t}
                        tracks={localMatches}
                        index={i}
                        highlight={q}
                        context="Local search"
                      />
                    ))}
                  </div>
                </Section>
              )}

              {showTracks && (
                <Section title="Tracks">
                  {tracks === null ? (
                    <SkeletonRows n={5} />
                  ) : tracks.length === 0 ? (
                    activeType === 'tracks' ? (
                      <Empty>No matching tracks for &ldquo;{q}&rdquo;</Empty>
                    ) : null
                  ) : (
                    <div>
                      {tracks.map((t, i) => (
                        <TrackRow
                          key={t.id}
                          track={t}
                          tracks={tracks}
                          index={i}
                          showAlbum
                          highlight={q}
                          context={`Search — ${q}`}
                        />
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {showAlbums && (
                <Section title="Albums">
                  {albums === null ? (
                    <SkeletonCards n={5} />
                  ) : albums.length === 0 ? (
                    activeType === 'albums' ? (
                      <Empty>No matching albums for &ldquo;{q}&rdquo;</Empty>
                    ) : null
                  ) : (
                    <CardRow>
                      {albums.map((a) => (
                        <MediaCard
                          key={a.id}
                          title={<HighlightText text={a.title} query={q} />}
                          altTitle={a.title}
                          subtitle={<HighlightText text={a.artist} query={q} />}
                          image={a.cover}
                          to={`/album/${a.id}`}
                          onPlay={() => void playAlbum(a)}
                        />
                      ))}
                    </CardRow>
                  )}
                </Section>
              )}

              {showArtists && (
                <Section title="Artists">
                  {artists === null ? (
                    <SkeletonCards n={5} />
                  ) : artists.length === 0 ? (
                    activeType === 'artists' ? (
                      <Empty>No matching artists for &ldquo;{q}&rdquo;</Empty>
                    ) : null
                  ) : (
                    <CardRow>
                      {artists.map((a) => (
                        <div key={a.id} className="w-40 shrink-0">
                          <MediaCard
                            title={<HighlightText text={a.name} query={q} />}
                            altTitle={a.name}
                            image={a.image}
                            to={`/artist/${a.id}`}
                            onPlay={() => void playArtist(a)}
                            round
                          />
                        </div>
                      ))}
                    </CardRow>
                  )}
                </Section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-panel p-6 text-center text-sm text-ink-dim">{children}</p>
  )
}
