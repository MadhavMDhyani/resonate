import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { searchAlbums, searchArtists, searchTracks } from '../api/jamendo'
import { db } from '../db/db'
import { TrackRow } from '../components/TrackRow'
import { CardRow, Section } from '../components/Section'
import { MediaCard } from '../components/MediaCard'
import { SearchIcon } from '../components/icons'
import { SkeletonCards, SkeletonRows } from './Home'
import type { Album, ArtistInfo, LocalTrackRecord, Track } from '../types'

export function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [input, setInput] = useState(q)

  // Keep the input in sync with back/forward navigation.
  useEffect(() => setInput(q), [q])

  // Debounced URL update while typing.
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = input.trim()
      if (trimmed !== q) setParams(trimmed ? { q: trimmed } : {})
    }, 350)
    return () => clearTimeout(t)
  }, [input, q, setParams])

  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [artists, setArtists] = useState<ArtistInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      return
    }
    let cancelled = false
    setError(null)
    void Promise.allSettled([searchTracks(q), searchAlbums(q), searchArtists(q)]).then(
      ([t, a, ar]) => {
        if (cancelled) return
        setTracks(t.status === 'fulfilled' ? t.value : [])
        setAlbums(a.status === 'fulfilled' ? a.value : [])
        setArtists(ar.status === 'fulfilled' ? ar.value : [])
        if (t.status === 'rejected') setError(t.reason instanceof Error ? t.reason.message : 'Search failed')
      },
    )
    return () => {
      cancelled = true
    }
  }, [q])

  const localMatches = (localTracks ?? []).map((r) => r.track)
  const hasQuery = q.trim().length >= 2

  return (
    <div className="anim-rise p-6">
      <div className="sticky top-0 z-10 -mx-6 mb-6 bg-base/80 px-6 py-3 backdrop-blur">
        <div className="relative max-w-xl">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim"
          />
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tracks, albums, artists, or your local files…"
            className="w-full rounded-full border border-hairline bg-panel-hi py-2.5 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-ink-dim/60 focus:border-accent"
            aria-label="Search"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
          <p className="font-semibold text-ink">Search failed</p>
          <p className="mt-1 text-ink-dim">{error}</p>
        </div>
      )}

      {!hasQuery && (
        <p className="py-16 text-center text-sm text-ink-dim/70">
          Type at least 2 characters to search the Creative Commons catalog and your library.
        </p>
      )}

      {hasQuery && (
        <>
          {localMatches.length > 0 && (
            <Section title="In your local files">
              <div>
                {localMatches.map((t, i) => (
                  <TrackRow key={t.id} track={t} tracks={localMatches} index={i} context="Local search" />
                ))}
              </div>
            </Section>
          )}

          <Section title="Tracks">
            {tracks === null ? (
              <SkeletonRows n={5} />
            ) : tracks.length === 0 ? (
              <Empty>No matching tracks</Empty>
            ) : (
              <div>
                {tracks.map((t, i) => (
                  <TrackRow key={t.id} track={t} tracks={tracks} index={i} showAlbum context={`Search — ${q}`} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Albums">
            {albums === null ? (
              <SkeletonCards n={5} />
            ) : albums.length === 0 ? null : (
              <CardRow>
                {albums.map((a) => (
                  <MediaCard
                    key={a.id}
                    title={a.title}
                    subtitle={a.artist}
                    image={a.cover}
                    to={`/album/${a.id}`}
                  />
                ))}
              </CardRow>
            )}
          </Section>

          <Section title="Artists">
            {artists === null ? (
              <SkeletonCards n={5} />
            ) : artists.length === 0 ? null : (
              <CardRow>
                {artists.map((a) => (
                  <div key={a.id} className="w-40 shrink-0">
                    <MediaCard title={a.name} image={a.image} to={`/artist/${a.id}`} round />
                  </div>
                ))}
              </CardRow>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-panel p-6 text-center text-sm text-ink-dim/70">{children}</p>
  )
}
