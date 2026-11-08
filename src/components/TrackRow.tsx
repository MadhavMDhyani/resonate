import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { addToPlaylist, createPlaylist, toggleFavorite } from '../lib/libraryActions'
import { downloadTrack } from '../lib/download'
import { fmtTime } from '../lib/format'
import { showToast } from '../stores/toastStore'
import { usePlayer } from '../stores/playerStore'
import type { Track, UserPlaylist } from '../types'
import { Cover } from './MediaCard'
import {
  DownloadIcon,
  HeartFilledIcon,
  HeartIcon,
  MoreIcon,
  NextIcon,
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
  highlight?: string
}

export function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || query.trim().length < 2) return <>{text}</>
  const q = query.trim().toLowerCase()
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return <>{text}</>
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return (
    <>
      {before}
      <mark className="rounded-xs bg-accent/25 px-0.5 font-semibold text-accent">{match}</mark>
      <HighlightText text={after} query={query} />
    </>
  )
}

function formatLicense(license?: string, licenseUrl?: string, isLocal?: boolean): string {
  if (isLocal || license === 'Local file') return 'Local'
  if (!license && !licenseUrl) return 'CC'

  if (licenseUrl) {
    const match = licenseUrl.match(/licenses\/([a-z-]+)\//i)
    if (match) return `CC ${match[1].toUpperCase()}`
    if (licenseUrl.includes('/zero/')) return 'CC0'
    if (licenseUrl.includes('/publicdomain/')) return 'Public Domain'
  }

  if (license) {
    const clean = license.replace(/^https?:\/\/[^/]+/i, '').replace(/https?:\/\/.*$/i, '').trim()
    if (/^cc/i.test(clean)) return clean.toUpperCase()
    if (/^[a-z-]+$/i.test(clean)) return `CC ${clean.toUpperCase()}`
    return clean.toUpperCase()
  }
  return 'CC'
}

export function TrackRow({ track, tracks, index, context, showAlbum, extraActions, highlight }: TrackRowProps) {
  const navigate = useNavigate()
  const isCurrent = usePlayer((s) => s.queue[s.currentIndex]?.id === track.id)
  const isPlaying = usePlayer((s) => s.isPlaying)

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)

  const favRecord = useLiveQuery(() => db.favorites.get(track.id), [track.id])
  const isFav = Boolean(favRecord)
  const playlists = useLiveQuery(
    () => (menuPos ? db.playlists.toArray() : Promise.resolve<UserPlaylist[]>([])),
    [menuPos],
  )

  const closeMenu = () => {
    setMenuPos(null)
    setShowPlaylistSubmenu(false)
  }

  // Dismiss menu on click outside or Esc
  useEffect(() => {
    if (!menuPos) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuPos])

  const active = isCurrent && isPlaying

  const play = () => {
    if (isCurrent) {
      usePlayer.getState().togglePlay()
      return
    }
    const i = tracks.findIndex((t) => t.id === track.id)
    usePlayer.getState().playQueue(tracks, i >= 0 ? i : 0, context)
  }

  const handleToggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const added = await toggleFavorite(track)
    if (added) {
      showToast('Added to favorites', {
        label: 'Undo',
        onClick: () => void toggleFavorite(track),
      })
    } else {
      showToast('Removed from favorites', {
        label: 'Undo',
        onClick: () => void toggleFavorite(track),
      })
    }
  }

  const openMenuAt = (clientX: number, clientY: number) => {
    const x = Math.max(10, Math.min(clientX, window.innerWidth - 240))
    const y = Math.max(10, Math.min(clientY, window.innerHeight - 380))
    setMenuPos({ x, y })
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openMenuAt(e.clientX, e.clientY)
  }

  // Long-press handling for touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    longPressTimer.current = setTimeout(() => {
      openMenuAt(touch.clientX, touch.clientY)
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return
    const touch = e.touches[0]
    const dist = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y)
    if (dist > 10) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const isLocal = track.source === 'local' || track.license === 'Local file'
  const licenseText = formatLicense(track.license, track.licenseUrl, isLocal)

  return (
    <div
      className="group flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-panel-hi sm:gap-3 sm:px-3"
      onDoubleClick={play}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-track-id={track.id}
    >
      {index !== undefined && (
        <div className="w-5 shrink-0 text-center text-sm text-ink-dim">
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
              className="hidden text-ink group-hover:block"
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

      {/* Cover with single-tap to play */}
      <button
        type="button"
        aria-label={active ? `Pause ${track.title}` : `Play ${track.title}`}
        onClick={(e) => {
          e.stopPropagation()
          play()
        }}
        className="relative shrink-0 touch-manipulation cursor-pointer"
      >
        <Cover image={track.cover} title={track.title} className="h-10 w-10 rounded-md" />
        <span
          className={`absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white transition-opacity ${
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {active ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isCurrent ? 'text-accent-hover' : 'text-ink'}`}>
          <HighlightText text={track.title} query={highlight} />
        </p>
        <p className="truncate text-xs text-ink-dim">
          {track.source === 'jamendo' && track.artistId ? (
            <Link to={`/artist/${track.artistId}`} className="hover:text-ink hover:underline">
              <HighlightText text={track.artist} query={highlight} />
            </Link>
          ) : (
            <HighlightText text={track.artist} query={highlight} />
          )}
        </p>
      </div>

      {showAlbum && (
        <div className="hidden w-1/4 min-w-0 truncate text-xs text-ink-dim md:block">
          {track.source === 'jamendo' && track.albumId ? (
            <Link to={`/album/${track.albumId}`} className="hover:text-ink hover:underline">
              <HighlightText text={track.album ?? ''} query={highlight} />
            </Link>
          ) : (
            <HighlightText text={track.album ?? ''} query={highlight} />
          )}
        </div>
      )}

      {/* Heart button: min 40x40px touch target, visible on touch via touch-visible */}
      <button
        type="button"
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        onClick={handleToggleFav}
        className={`touch-visible flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity ${
          isFav
            ? 'text-accent-hover opacity-100'
            : 'text-ink-dim opacity-0 group-hover:opacity-100 hover:text-ink'
        }`}
      >
        {isFav ? <HeartFilledIcon size={18} /> : <HeartIcon size={18} />}
      </button>

      {/* More "⋯" button: min 40x40px touch target */}
      <div className="relative shrink-0">
        <button
          ref={moreButtonRef}
          type="button"
          aria-label="More options"
          onClick={(e) => {
            e.stopPropagation()
            if (menuPos) {
              closeMenu()
            } else {
              const rect = e.currentTarget.getBoundingClientRect()
              openMenuAt(rect.right - 220, rect.bottom + 6)
            }
          }}
          className="touch-visible flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
        >
          <MoreIcon size={18} />
        </button>
      </div>

      {extraActions}

      {/* Download button: desktop hover / touch visible */}
      {track.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
        <button
          type="button"
          aria-label={`Download ${track.title} (free, ${track.license ?? 'Creative Commons'})`}
          title={`Free download — ${track.license ?? 'Creative Commons'}`}
          onClick={() => {
            void downloadTrack(track)
            showToast(`Downloading: ${track.title}`)
          }}
          className="touch-visible flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-hover"
        >
          <DownloadIcon size={17} />
        </button>
      )}

      {/* Licence / Local badge: at least 11px font, readable contrast */}
      {isLocal ? (
        <span className="shrink-0 rounded border border-hairline bg-panel-hi px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-ink-dim">
          Local
        </span>
      ) : track.licenseUrl ? (
        <a
          href={track.licenseUrl}
          target="_blank"
          rel="noreferrer"
          title={`${track.license ?? 'Creative Commons'} — click for license details`}
          className="shrink-0 rounded border border-hairline bg-panel-hi px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-dim transition-colors hover:border-accent hover:text-ink"
          onClick={(e) => e.stopPropagation()}
        >
          {licenseText}
        </a>
      ) : track.license ? (
        <span className="shrink-0 rounded border border-hairline bg-panel-hi px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
          {licenseText}
        </span>
      ) : null}

      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-dim">
        {fmtTime(track.duration)}
      </span>

      {/* Expanded Context Menu */}
      {menuPos && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Track actions"
          className="glass-strong anim-scale-in fixed z-[65] w-56 rounded-2xl border border-hairline p-1.5 shadow-2xl"
          style={
            {
              left: `${menuPos.x}px`,
              top: `${menuPos.y}px`,
            } as CSSProperties
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 border-b border-hairline px-2.5 py-1.5">
            <p className="truncate text-xs font-semibold text-ink">{track.title}</p>
            <p className="truncate text-[11px] text-ink-dim">{track.artist}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              usePlayer.getState().playNextUp(track)
              showToast(`Playing next: ${track.title}`)
              closeMenu()
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-panel-hi transition-colors"
          >
            <NextIcon size={16} className="text-ink-dim" />
            <span>Play next</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              usePlayer.getState().addToQueue(track)
              showToast('Added to queue')
              closeMenu()
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-panel-hi transition-colors"
          >
            <PlusIcon size={16} className="text-ink-dim" />
            <span>Add to queue</span>
          </button>

          <div className="my-1 border-t border-hairline" />

          {/* Add to playlist section */}
          <div>
            <button
              type="button"
              onClick={() => setShowPlaylistSubmenu((s) => !s)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-panel-hi transition-colors"
            >
              <span>Add to playlist</span>
              <span className="text-xs text-ink-dim">{showPlaylistSubmenu ? '▲' : '▼'}</span>
            </button>

            {showPlaylistSubmenu && (
              <div className="mt-1 max-h-36 overflow-y-auto pl-2 pr-1">
                {(playlists ?? []).map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      void addToPlaylist(pl.id as number, track)
                      showToast(`Added to ${pl.name}`)
                      closeMenu()
                    }}
                    className="block w-full truncate rounded px-2 py-1.5 text-left text-xs text-ink hover:bg-panel-hi"
                  >
                    {pl.name}
                  </button>
                ))}
                {playlists && playlists.length === 0 && (
                  <p className="px-2 py-1 text-xs text-ink-dim">No playlists yet</p>
                )}
                <form
                  className="mt-1 flex items-center gap-1 border-t border-hairline px-1 pt-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
                    if (!input.value.trim()) return
                    const name = input.value.trim()
                    void createPlaylist(name).then((id) => {
                      void addToPlaylist(id, track)
                      showToast(`Added to ${name}`)
                    })
                    closeMenu()
                  }}
                >
                  <input
                    name="name"
                    placeholder="New playlist name"
                    className="min-w-0 flex-1 rounded bg-panel-hi px-2 py-1 text-xs text-ink outline-none placeholder:text-ink-dim"
                  />
                  <button
                    type="submit"
                    aria-label="Create playlist"
                    className="p-1 text-accent-hover hover:text-ink"
                  >
                    <PlusIcon size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>

          {track.source === 'jamendo' && track.artistId && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                navigate(`/artist/${track.artistId}`)
                closeMenu()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-panel-hi transition-colors"
            >
              <span>Go to artist</span>
            </button>
          )}

          {track.source === 'jamendo' && track.albumId && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                navigate(`/album/${track.albumId}`)
                closeMenu()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-panel-hi transition-colors"
            >
              <span>Go to album</span>
            </button>
          )}

          {track.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void downloadTrack(track)
                showToast(`Downloading: ${track.title}`)
                closeMenu()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-panel-hi transition-colors"
            >
              <DownloadIcon size={16} className="text-ink-dim" />
              <span>Download</span>
            </button>
          )}

          {track.licenseUrl && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                window.open(track.licenseUrl, '_blank', 'noopener,noreferrer')
                closeMenu()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-panel-hi transition-colors"
            >
              <span>Open licence ({licenseText})</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
