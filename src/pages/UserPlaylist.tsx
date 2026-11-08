import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  deletePlaylist,
  movePlaylistEntry,
  removeFromPlaylist,
  renamePlaylist,
  reorderPlaylistEntries,
} from '../lib/libraryActions'
import { TrackRow } from '../components/TrackRow'
import { MosaicCover } from '../components/MediaCard'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlayIcon,
  QueueIcon,
  ShuffleIcon,
  XIcon,
} from '../components/icons'
import { usePlayer } from '../stores/playerStore'
import { showToast } from '../stores/toastStore'

export function UserPlaylistPage() {
  const { id = '' } = useParams()
  const playlistId = Number(id)
  const navigate = useNavigate()

  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const playlist = useLiveQuery(() => db.playlists.get(playlistId), [playlistId])
  const entries = useLiveQuery(
    () => db.playlistTracks.where('playlistId').equals(playlistId).sortBy('position'),
    [playlistId],
  )

  if (!playlist || !entries) {
    return (
      <div className="p-6">
        <div className="h-40 w-full animate-pulse rounded-lg bg-panel" />
      </div>
    )
  }

  const tracks = entries.map((e) => e.track)
  const covers = tracks.slice(0, 4).map((t) => t.cover)

  const handleShuffle = () => {
    if (!tracks.length) return
    const rand = Math.floor(Math.random() * tracks.length)
    usePlayer.getState().playQueue(tracks, rand, `Playlist — ${playlist.name}`)
    if (!usePlayer.getState().shuffle) {
      usePlayer.getState().toggleShuffle()
    }
  }

  const handleAddAllToQueue = () => {
    if (!tracks.length) return
    tracks.forEach((t) => usePlayer.getState().addToQueue(t))
    showToast(`Added ${tracks.length} tracks to queue`)
  }

  return (
    <div className="anim-rise">
      <header className="flex flex-col gap-6 bg-gradient-to-b from-white/10 to-transparent p-6 pt-10 sm:flex-row sm:items-end">
        <MosaicCover
          covers={covers}
          title={playlist.name}
          className="h-36 w-36 shadow-2xl sm:h-44 sm:w-44"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-dim">Playlist</p>
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
                className="w-full rounded bg-panel-hi px-2 py-1 text-2xl font-extrabold text-ink outline-none"
              />
            </form>
          ) : (
            <h1
              className="mt-1 cursor-text truncate text-3xl font-extrabold tracking-tight text-ink hover:opacity-80 md:text-4xl"
              title="Click to rename"
              onClick={() => {
                setNameDraft(playlist.name)
                setRenaming(true)
              }}
            >
              {playlist.name}
            </h1>
          )}
          <p className="mt-2 text-sm text-ink-dim">
            {entries.length} track{entries.length === 1 ? '' : 's'} · stored locally
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                tracks.length &&
                usePlayer.getState().playQueue(tracks, 0, `Playlist — ${playlist.name}`)
              }
              disabled={!tracks.length}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-on-accent shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
            >
              <PlayIcon size={16} /> Play
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              disabled={!tracks.length}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-4 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
            >
              <ShuffleIcon size={15} /> Shuffle play
            </button>
            <button
              type="button"
              onClick={handleAddAllToQueue}
              disabled={!tracks.length}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-4 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
            >
              <QueueIcon size={15} /> Add all to queue
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="touch-visible inline-flex items-center gap-1.5 rounded-full border border-hairline bg-panel-hi px-3.5 py-2 text-xs font-semibold text-ink-dim shadow-sm transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              <XIcon size={14} /> Delete
            </button>
          </div>
        </div>
      </header>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="glass max-w-sm rounded-2xl p-6 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-ink">Delete &ldquo;{playlist.name}&rdquo;?</h3>
            <p className="mt-2 text-xs text-ink-dim">
              This playlist and its track list will be removed from your library.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full border border-hairline bg-panel-hi px-4 py-2 text-xs font-semibold text-ink hover:bg-panel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deletePlaylist(playlistId)
                  showToast(`Deleted playlist "${playlist.name}"`)
                  navigate('/library')
                }}
                className="rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 pt-4 sm:p-6 sm:pt-4">
        {entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-dim">
            Add tracks from anywhere using the ⋯ menu on any track row.
          </p>
        ) : (
          entries.map((e, i) => (
            <div
              key={e.id}
              draggable
              onDragStart={(ev) => {
                ev.dataTransfer.effectAllowed = 'move'
                ev.dataTransfer.setData('text/plain', String(i))
                setDraggedIndex(i)
              }}
              onDragOver={(ev) => {
                ev.preventDefault()
                ev.dataTransfer.dropEffect = 'move'
                if (dragOverIndex !== i) setDragOverIndex(i)
              }}
              onDragEnd={() => {
                setDraggedIndex(null)
                setDragOverIndex(null)
              }}
              onDrop={async (ev) => {
                ev.preventDefault()
                const from = draggedIndex ?? Number(ev.dataTransfer.getData('text/plain'))
                const to = i
                setDraggedIndex(null)
                setDragOverIndex(null)
                if (from !== to && !isNaN(from)) {
                  await reorderPlaylistEntries(playlistId, from, to)
                }
              }}
              className={`rounded-lg transition-all ${
                draggedIndex === i ? 'opacity-35' : ''
              } ${dragOverIndex === i ? 'border-t-2 border-accent' : ''}`}
            >
              <TrackRow
                track={e.track}
                tracks={tracks}
                index={i}
                showAlbum
                context={`Playlist — ${playlist.name}`}
                extraActions={
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={i === 0}
                        onClick={() => void movePlaylistEntry(e.id, -1)}
                        className="touch-visible flex h-6 w-6 items-center justify-center text-ink-dim hover:text-ink disabled:opacity-20"
                      >
                        <ArrowUpIcon size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={i === entries.length - 1}
                        onClick={() => void movePlaylistEntry(e.id, 1)}
                        className="touch-visible flex h-6 w-6 items-center justify-center text-ink-dim hover:text-ink disabled:opacity-20"
                      >
                        <ArrowDownIcon size={12} />
                      </button>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${e.track.title} from playlist`}
                      onClick={() => void removeFromPlaylist(e.id)}
                      className="touch-visible flex h-7 w-7 items-center justify-center rounded-md text-ink-dim hover:text-red-400"
                    >
                      <XIcon size={14} />
                    </button>
                  </span>
                }
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
