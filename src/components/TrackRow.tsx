import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { addToPlaylist, createPlaylist, toggleFavorite } from '../lib/libraryActions'
import { downloadTrack } from '../lib/download'
import { fmtTime } from '../lib/format'
import { usePlayer } from '../stores/playerStore'
import type { Track, UserPlaylist } from '../types'
import { Cover } from './MediaCard'
import {
  DownloadIcon,
  HeartFilledIcon,
  HeartIcon,
  MoreIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
} from './icons'

interface TrackRowProps {
  track: Track
  /** full list this row belongs to, for context playback */
  tracks: Track[]
  index?: number
  context?: string
  showAlbum?: boolean
  /** extra action buttons (e.g. playlist move/remove) */
  extraActions?: ReactNode
}

export function TrackRow({ track, tracks, index, context, showAlbum, extraActions }: TrackRowProps) {
  const isCurrent = usePlayer((s) => s.queue[s.currentIndex]?.id === track.id)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const favRecord = useLiveQuery(() => db.favorites.get(track.id), [track.id])
  const isFav = Boolean(favRecord)
  const playlists = useLiveQuery(
    () => (menuOpen ? db.playlists.toArray() : Promise.resolve<UserPlaylist[]>([])),
    [menuOpen],
  )

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const active = isCurrent && isPlaying

  const play = () => {
    if (isCurrent) {
      usePlayer.getState().togglePlay()
      return
    }
    const i = tracks.findIndex((t) => t.id === track.id)
    usePlayer.getState().playQueue(tracks, i >= 0 ? i : 0, context)
  }

  return (
    <div
      className="group flex items-center gap-3 rounded-md px-3 py-1.5 hover:bg-white/10"
      onDoubleClick={play}
      data-track-id={track.id}
    >
      {index !== undefined && (
        <div className="w-5 shrink-0 text-center text-sm text-neutral-400">
          {active ? (
            <span className="eq" aria-label="Playing">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <span className="group-hover:hidden">{index + 1}</span>
          )}
          {!active && (
            <button
              type="button"
              aria-label={`Play ${track.title}`}
              onClick={play}
              className="hidden text-white group-hover:block"
            >
              <PlayIcon size={14} />
            </button>
          )}
        </div>
      )}
      {active && index === undefined && (
        <span className="eq w-4 shrink-0" aria-label="Playing">
          <span />
          <span />
          <span />
        </span>
      )}

      <button
        type="button"
        aria-label={active ? `Pause ${track.title}` : `Play ${track.title}`}
        onClick={play}
        className="relative shrink-0"
      >
        <Cover image={track.cover} title={track.title} className="h-10 w-10" />
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {active ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isCurrent ? 'text-accent-hover' : ''}`}>
          {track.title}
        </p>
        <p className="truncate text-xs text-neutral-400">
          {track.source === 'jamendo' && track.artistId ? (
            <Link to={`/artist/${track.artistId}`} className="hover:text-white hover:underline">
              {track.artist}
            </Link>
          ) : (
            track.artist
          )}
        </p>
      </div>

      {showAlbum && (
        <div className="hidden w-1/4 min-w-0 truncate text-xs text-neutral-400 md:block">
          {track.source === 'jamendo' && track.albumId ? (
            <Link to={`/album/${track.albumId}`} className="hover:text-white hover:underline">
              {track.album}
            </Link>
          ) : (
            track.album
          )}
        </div>
      )}

      <button
        type="button"
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        onClick={() => void toggleFavorite(track)}
        className={`shrink-0 transition-opacity ${
          isFav ? 'text-accent-hover opacity-100' : 'text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-white'
        }`}
      >
        {isFav ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
      </button>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          aria-label="Add to playlist"
          onClick={() => setMenuOpen((o) => !o)}
          className="text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
        >
          <MoreIcon size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 z-30 w-56 rounded-md border border-white/10 bg-elevated p-1 shadow-2xl">
            <p className="px-2 py-1 text-xs font-semibold text-neutral-400">Add to playlist</p>
            <div className="max-h-44 overflow-y-auto">
              {(playlists ?? []).map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => {
                    void addToPlaylist(pl.id as number, track)
                    setMenuOpen(false)
                  }}
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white/10"
                >
                  {pl.name}
                </button>
              ))}
              {playlists && playlists.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-neutral-500">No playlists yet</p>
              )}
            </div>
            <form
              className="mt-1 flex items-center gap-1 border-t border-white/10 px-1 pt-1"
              onSubmit={(e) => {
                e.preventDefault()
                const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
                if (!input.value.trim()) return
                void createPlaylist(input.value).then((id) => addToPlaylist(id, track))
                setMenuOpen(false)
              }}
            >
              <input
                name="name"
                placeholder="New playlist name"
                className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-sm outline-none placeholder:text-neutral-500"
              />
              <button type="submit" aria-label="Create playlist" className="p-1 text-accent-hover hover:text-white">
                <PlusIcon size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {extraActions}

      {track.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
        <button
          type="button"
          aria-label={`Download ${track.title} (free, ${track.license ?? 'Creative Commons'})`}
          title={`Free download — ${track.license ?? 'Creative Commons'}`}
          onClick={() => void downloadTrack(track)}
          className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-hover"
        >
          <DownloadIcon size={16} />
        </button>
      )}

      {track.license && track.source === 'jamendo' && (
        <a
          href={track.licenseUrl}
          target="_blank"
          rel="noreferrer"
          title={`${track.license} — click for license details`}
          className="shrink-0 rounded border border-white/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400 opacity-60 transition-opacity hover:opacity-100 hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {track.license === 'Local file' ? 'local' : 'cc'}
        </a>
      )}

      <span className="w-10 shrink-0 text-right text-sm tabular-nums text-neutral-400">
        {fmtTime(track.duration)}
      </span>
    </div>
  )
}
