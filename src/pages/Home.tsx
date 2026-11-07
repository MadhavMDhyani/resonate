import { useEffect, useState } from 'react'
import { getNewAlbums, getPopularTracks, getTracksByTag } from '../api/jamendo'
import { TrackRow } from '../components/TrackRow'
import { CardRow, Section } from '../components/Section'
import { MediaCard } from '../components/MediaCard'
import { PlayIcon } from '../components/icons'
import { usePlayer } from '../stores/playerStore'
import type { Album, Track } from '../types'

const GENRES = ['electronic', 'acoustic', 'rock', 'jazz', 'hip-hop', 'ambient']

export function Home() {
  const [popular, setPopular] = useState<Track[] | null>(null)
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [genreTracks, setGenreTracks] = useState<Record<string, Track[]>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    void Promise.all([getPopularTracks(18), getNewAlbums(16)])
      .then(([t, a]) => {
        if (cancelled) return
        setPopular(t)
        setAlbums(a)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const playGenre = async (tag: string) => {
    const existing = genreTracks[tag]
    if (existing?.length) {
      usePlayer.getState().playQueue(existing, 0, `${tag} radio`)
      return
    }
    const tracks = await getTracksByTag(tag, 20)
    setGenreTracks((g) => ({ ...g, [tag]: tracks }))
    usePlayer.getState().playQueue(tracks, 0, `${tag} radio`)
  }

  const playAlbum = async (albumId: string, albumTitle: string) => {
    const { getAlbumTracks } = await import('../api/jamendo')
    const tracks = await getAlbumTracks(albumId)
    if (tracks.length) usePlayer.getState().playQueue(tracks, 0, `Album — ${albumTitle}`)
  }

  return (
    <div className="anim-rise p-6">
      {/* Hero */}
      <div className="glass mb-8 rounded-3xl bg-gradient-to-br from-accent/25 via-panel to-panel p-8">
        <h1 className="max-w-xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Free music. No ads. Real downloads.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-dim">
          Hundreds of thousands of Creative Commons tracks, streamed and downloaded legally —
          plus your own local library, in one player.
        </p>
        <button
          type="button"
          onClick={() => popular?.length && usePlayer.getState().playQueue(popular, 0, 'Popular on Jamendo')}
          disabled={!popular?.length}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-on-accent transition-transform hover:scale-105 disabled:opacity-50"
        >
          <PlayIcon size={16} /> Start listening
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
          <p className="font-semibold text-ink">Could not reach Jamendo</p>
          <p className="mt-1 text-ink-dim">{error}</p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-2 rounded-md bg-panel-hi px-3 py-1.5 text-xs font-semibold text-ink hover:bg-elevated"
          >
            Retry
          </button>
        </div>
      )}

      {/* Genre chips */}
      <div className="row-scroll mb-8 flex gap-2 overflow-x-auto">
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => void playGenre(g)}
            className="shrink-0 rounded-full border border-hairline bg-panel px-4 py-2 text-sm font-semibold capitalize text-ink transition-colors hover:border-accent-hover hover:text-accent-hover"
          >
            {g} radio
          </button>
        ))}
      </div>

      <Section title="Popular right now" subtitle="Most played CC tracks this week">
        {popular === null ? (
          <SkeletonRows />
        ) : (
          <div>
            {popular.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                tracks={popular}
                index={i}
                showAlbum
                context="Popular on Jamendo"
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Fresh albums" subtitle="Recently released under Creative Commons">
        {albums === null ? (
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

export function SkeletonRows({ n = 6 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-1.5">
          <div className="h-10 w-10 animate-pulse rounded-md bg-panel-hi" />
          <div className="flex-1">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-panel-hi" />
            <div className="mt-2 h-3 w-1/5 animate-pulse rounded bg-panel" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ n = 6 }: { n?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="w-40 shrink-0 rounded-xl bg-panel p-3">
          <div className="h-36 w-36 animate-pulse rounded-md bg-panel-hi" />
          <div className="mt-3 h-3.5 w-3/4 animate-pulse rounded bg-panel-hi" />
        </div>
      ))}
    </div>
  )
}
