import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { createPlaylist, deletePlaylist } from '../lib/libraryActions'
import type { PlaylistEntry } from '../types'
import { TrackRow } from '../components/TrackRow'
import { Section } from '../components/Section'
import { HeartFilledIcon, MusicIcon, PlayIcon, PlusIcon, XIcon } from '../components/icons'
import { usePlayer } from '../stores/playerStore'

export function Library() {
  const [name, setName] = useState('')
  const favorites = useLiveQuery(() => db.favorites.toArray(), [])
  const playlists = useLiveQuery(() => db.playlists.toArray(), [])

  const favTracks = (favorites ?? []).map((f) => f.track)
  const playlistCounts = useLiveQuery(
    () => (playlists ? db.playlistTracks.toArray() : Promise.resolve<PlaylistEntry[]>([])),
    [playlists],
  )

  return (
    <div className="anim-rise p-6">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-ink">Your Library</h1>

      <Section title="Favorites" subtitle={`${favTracks.length} liked track${favTracks.length === 1 ? '' : 's'}`}>
        {favorites === null ? null : favTracks.length === 0 ? (
          <p className="rounded-lg bg-panel p-6 text-sm text-ink-dim">
            Tap the ♥ on any track to collect it here.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => favTracks.length && usePlayer.getState().playQueue(favTracks, 0, 'Favorites')}
              className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-on-accent transition-transform hover:scale-105"
            >
              <PlayIcon size={16} /> Play favorites
            </button>
            <div>
              {favTracks.map((t, i) => (
                <TrackRow key={t.id} track={t} tracks={favTracks} index={i} showAlbum context="Favorites" />
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="Playlists">
        <form
          className="mb-4 flex max-w-md items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            void createPlaylist(name).then(() => setName(''))
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New playlist name"
            className="flex-1 rounded-full border border-hairline bg-panel-hi px-4 py-2 text-sm text-ink outline-none placeholder:text-ink-dim focus:border-accent"
          />
          <button
            type="submit"
            aria-label="Create playlist"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105"
            style={{ background: 'var(--x-text)', color: 'var(--x-base)' }}
          >
            <PlusIcon size={16} />
          </button>
        </form>

        {(playlists ?? []).length === 0 ? (
          <p className="rounded-lg bg-panel p-6 text-sm text-ink-dim">
            No playlists yet — create one above or from any track's ⋯ menu.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(playlists ?? []).map((pl) => {
              const count = (playlistCounts ?? []).filter((e) => e.playlistId === pl.id).length
              return (
                <div
                  key={pl.id}
                  className="anim-lift group relative rounded-xl bg-panel p-4 transition-colors hover:bg-panel-hi"
                >
                  <Link to={`/library/playlist/${pl.id}`} className="block">
                    <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-accent/30 to-panel-hi text-ink-dim/50">
                      <MusicIcon size={28} />
                    </div>
                    <p className="truncate text-sm font-semibold text-ink">{pl.name}</p>
                    <p className="text-xs text-ink-dim">{count} tracks</p>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete playlist ${pl.name}`}
                    onClick={(e) => {
                      e.preventDefault()
                      void deletePlaylist(pl.id)
                    }}
                    className="absolute right-2 top-2 text-ink-dim opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <p className="mt-8 flex items-center gap-2 text-xs text-ink-dim">
        <HeartFilledIcon size={12} className="text-accent" />
        Favorites and playlists live in your browser (IndexedDB) — nothing leaves your device.
      </p>
    </div>
  )
}
