import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { movePlaylistEntry, removeFromPlaylist, renamePlaylist } from '../lib/libraryActions'
import { TrackRow } from '../components/TrackRow'
import { Cover } from '../components/MediaCard'
import { ArrowDownIcon, ArrowUpIcon, PlayIcon, XIcon } from '../components/icons'
import { usePlayer } from '../stores/playerStore'

export function UserPlaylistPage() {
  const { id = '' } = useParams()
  const playlistId = Number(id)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const playlist = useLiveQuery(() => db.playlists.get(playlistId), [playlistId])
  const entries = useLiveQuery(
    () => db.playlistTracks.where('playlistId').equals(playlistId).sortBy('position'),
    [playlistId],
  )

  if (!playlist || !entries) {
    return (
      <div className="p-6">
        <div className="h-40 w-full animate-pulse rounded-lg bg-white/5" />
      </div>
    )
  }

  const tracks = entries.map((e) => e.track)

  return (
    <div>
      <header className="flex items-end gap-6 bg-gradient-to-b from-white/10 to-transparent p-6 pt-10">
        <Cover title={playlist.name} className="h-40 w-40 shadow-2xl" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">Playlist</p>
          {renaming ? (
            <form
              className="mt-1"
              onSubmit={(e) => {
                e.preventDefault()
                void renamePlaylist(playlistId, nameDraft)
                setRenaming(false)
              }}
            >
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => setRenaming(false)}
                className="rounded bg-elevated px-2 py-1 text-2xl font-extrabold outline-none"
              />
            </form>
          ) : (
            <h1
              className="mt-1 cursor-text text-3xl font-extrabold tracking-tight hover:opacity-80 md:text-4xl"
              title="Click to rename"
              onClick={() => {
                setNameDraft(playlist.name)
                setRenaming(true)
              }}
            >
              {playlist.name}
            </h1>
          )}
          <p className="mt-2 text-sm text-neutral-400">{entries.length} tracks · stored locally</p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                tracks.length && usePlayer.getState().playQueue(tracks, 0, `Playlist — ${playlist.name}`)
              }
              disabled={!tracks.length}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-50"
            >
              <PlayIcon size={16} /> Play
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 pt-4">
        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">
            Add tracks from anywhere using the ⋯ menu on a track row.
          </p>
        ) : (
          entries.map((e, i) => (
            <TrackRow
              key={e.id}
              track={e.track}
              tracks={tracks}
              index={i}
              showAlbum
              context={`Playlist — ${playlist.name}`}
              extraActions={
                <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => void movePlaylistEntry(e.id, -1)}
                      className="text-neutral-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUpIcon size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={i === entries.length - 1}
                      onClick={() => void movePlaylistEntry(e.id, 1)}
                      className="text-neutral-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDownIcon size={12} />
                    </button>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${e.track.title} from playlist`}
                    onClick={() => void removeFromPlaylist(e.id)}
                    className="text-neutral-400 hover:text-red-400"
                  >
                    <XIcon size={14} />
                  </button>
                </span>
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
