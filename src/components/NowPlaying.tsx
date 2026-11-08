import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { toggleFavorite } from '../lib/libraryActions'
import { downloadTrack } from '../lib/download'
import { fmtTime } from '../lib/format'
import { usePlayer } from '../stores/playerStore'
import { useUi } from '../ui/uiStore'
import { useTheme } from '../theme/themeStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { showToast } from '../stores/toastStore'
import type { Track } from '../types'
import {
  ChevronDownIcon,
  DownloadIcon,
  HeartFilledIcon,
  HeartIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  SpinnerIcon,
  VolumeIcon,
  VolumeMuteIcon,
  XIcon,
} from './icons'

/** Cover-flow placement per offset from the center card. */
function cardStyle(offset: number, width: number, viewportWidth: number): CSSProperties {
  const base: CSSProperties = {
    left: `calc(50% - ${width / 2}px)`,
    top: 0,
    width,
    height: width,
  }
  const isNarrow = viewportWidth < 640
  // Prevent side cards from crossing viewport edges on small devices
  const scaledHalf = (width * 0.72) / 2
  const maxShift = Math.max(16, viewportWidth / 2 - scaledHalf - 12)
  const shiftNear = isNarrow ? Math.min(maxShift, width * 0.42) : (width < 260 ? width * 0.75 : width * 1.05)
  const shiftFar = isNarrow ? Math.min(maxShift + 25, width * 0.7) : (width < 260 ? width * 1.3 : width * 1.8)

  switch (offset) {
    case -2:
      return {
        ...base,
        transform: `translateX(${-shiftFar}px) scale(0.5)`,
        opacity: isNarrow ? 0 : 0.6,
        pointerEvents: isNarrow ? 'none' : undefined,
        filter: 'brightness(0.5)',
        zIndex: 1,
      }
    case -1:
      return {
        ...base,
        transform: `translateX(${-shiftNear}px) scale(0.72)`,
        opacity: 0.85,
        filter: 'brightness(0.68)',
        zIndex: 2,
      }
    case 0:
      return { ...base, transform: 'none', opacity: 1, zIndex: 3 }
    case 1:
      return {
        ...base,
        transform: `translateX(${shiftNear}px) scale(0.72)`,
        opacity: 0.85,
        filter: 'brightness(0.68)',
        zIndex: 2,
      }
    case 2:
      return {
        ...base,
        transform: `translateX(${shiftFar}px) scale(0.5)`,
        opacity: isNarrow ? 0 : 0.6,
        pointerEvents: isNarrow ? 'none' : undefined,
        filter: 'brightness(0.5)',
        zIndex: 1,
      }
    default:
      return base
  }
}

/** Keeps previous cover so ambient background crossfades smoothly */
function useCoverLayers(cover: string | undefined): string[] {
  const [layers, setLayers] = useState<string[]>([])
  useEffect(() => {
    setLayers((ls) => {
      if (!cover) return ls.length ? [] : ls
      if (ls[ls.length - 1] === cover) return ls
      return [...ls.slice(-1), cover]
    })
  }, [cover])
  return layers
}

export function NowPlaying() {
  const open = useUi((s) => s.nowPlayingOpen)
  const queue = usePlayer((s) => s.queue)
  const order = usePlayer((s) => s.order)
  const orderPos = usePlayer((s) => s.orderPos)
  const currentIndex = usePlayer((s) => s.currentIndex)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const isBuffering = usePlayer((s) => s.isBuffering)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const volume = usePlayer((s) => s.volume)
  const muted = usePlayer((s) => s.muted)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const context = usePlayer((s) => s.context)
  const accentId = useTheme((s) => s.accentId)

  const [seekTooltip, setSeekTooltip] = useState<{ x: number; time: number } | null>(null)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 800,
  )
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 600,
  )

  const dialogRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const close = () => useUi.getState().setNowPlayingOpen(false)
  useFocusTrap(open, dialogRef, close)

  useEffect(() => {
    const onResize = () => {
      setViewportWidth(window.innerWidth)
      setViewportHeight(window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isLandscape = viewportWidth > viewportHeight && viewportHeight < 560

  // Responsive cover dimension derived from viewport
  const cardWidth = useMemo(() => {
    if (isLandscape) return Math.min(220, viewportHeight - 120)
    if (viewportWidth < 380) return Math.min(220, Math.floor(viewportWidth * 0.6))
    if (viewportWidth < 640) return 240
    if (viewportWidth < 768) return 270
    return 320
  }, [viewportWidth, viewportHeight, isLandscape])

  const track = queue[currentIndex]
  const layers = useCoverLayers(track?.cover)

  const favRecord = useLiveQuery(
    () => (track ? db.favorites.get(track.id) : Promise.resolve(undefined)),
    [track?.id],
  )
  const isFav = Boolean(favRecord)

  // Neighbor cards in playback order (respects shuffle)
  const cards = useMemo(() => {
    const out: { offset: number; track: Track; queueIndex: number }[] = []
    if (!queue.length) return out
    for (let off = -2; off <= 2; off++) {
      const pos = orderPos + off
      const qIndex = order[pos]
      if (qIndex === undefined || !queue[qIndex]) continue
      out.push({ offset: off, track: queue[qIndex], queueIndex: qIndex })
    }
    return out
  }, [queue, order, orderPos])

  // Next 2-3 tracks for Up next peek
  const nextTracks = useMemo(() => {
    return order
      .slice(orderPos + 1, orderPos + 4)
      .map((ix) => ({ ix, track: queue[ix] }))
      .filter((item) => Boolean(item.track))
  }, [order, orderPos, queue])

  // Touch swipe gestures on the cover
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.time

    if (dt < 600) {
      // Horizontal swipe (next / prev)
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
        if (dx < 0) {
          usePlayer.getState().next()
        } else {
          usePlayer.getState().prev()
        }
      } else if (dy > 60 && Math.abs(dy) > Math.abs(dx)) {
        // Swipe down to close
        close()
      }
    }
    touchStartRef.current = null
  }

  const handleToggleFav = async () => {
    if (!track) return
    const added = await toggleFavorite(track)
    showToast(added ? 'Added to favorites' : 'Removed from favorites', {
      label: 'Undo',
      onClick: () => void toggleFavorite(track),
    })
  }

  if (!open) return null
  const effDuration = duration || track?.duration || 0

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 h-dvh overflow-hidden select-none bg-base"
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
    >
      {/* Ambient artwork backdrop with crossfade */}
      <div className="absolute inset-0 overflow-hidden bg-base">
        {layers.map((src, i) => (
          <div
            key={src}
            className={`anim-ambient absolute -inset-40 ${i === layers.length - 1 ? 'anim-fade' : ''}`}
          >
            <img src={src} alt="" aria-hidden="true" className="h-full w-full object-cover blur-3xl" />
          </div>
        ))}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      </div>

      {/* Top Bar: swipe down hint, queue toggle, close */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-4 sm:px-6">
        <button
          type="button"
          aria-label="Close now playing"
          onClick={close}
          className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
        >
          <ChevronDownIcon size={20} />
        </button>

        <span className="text-xs font-semibold tracking-wider uppercase text-white/60">
          Now Playing
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Queue"
            onClick={() => useUi.getState().toggleQueue()}
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
            title="Queue"
          >
            <QueueIcon size={18} />
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex h-dvh flex-col overflow-y-auto px-4 pb-6 pt-16 sm:px-6 landscape:flex-row landscape:items-center landscape:justify-center landscape:gap-10 landscape:pt-6">
        {track ? (
          <>
            {/* Left Column / Cover Area with Swipe Gestures */}
            <div
              className="flex shrink-0 flex-col items-center justify-center py-2 landscape:py-0"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="cf-scene relative cursor-grab active:cursor-grabbing"
                style={{ width: cardWidth, height: cardWidth }}
              >
                {cards.map(({ offset, track: t, queueIndex }) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => offset !== 0 && usePlayer.getState().jumpTo(queueIndex)}
                    className="cf-card absolute overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15"
                    style={cardStyle(offset, cardWidth, viewportWidth)}
                    aria-label={offset === 0 ? undefined : `Play ${t.title}`}
                    tabIndex={offset === 0 ? 0 : -1}
                  >
                    <img src={t.cover} alt={t.title} className="h-full w-full object-cover" />
                    {offset !== 0 && <span className="absolute inset-0 bg-black/35" />}
                  </button>
                ))}
                {cards.length <= 1 && (
                  <div
                    className="absolute overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15"
                    style={cardStyle(0, cardWidth, viewportWidth)}
                  >
                    {track.cover ? (
                      <img src={track.cover} alt={track.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-accent/40 to-black/60" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column / Controls Area: Single source of truth info, Seek bar, Transport pill, Secondary row */}
            <div className="flex flex-1 flex-col justify-center max-w-xl mx-auto w-full gap-4 sm:gap-5 landscape:mx-0">
              {/* Single Source of Truth Track Info */}
              <div key={track.id} className="anim-rise px-1 text-center landscape:text-left">
                {context && (
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                    Playing from {context}
                  </p>
                )}
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {track.title}
                </h1>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-sm text-white/70 landscape:justify-start">
                  {track.source === 'jamendo' && track.artistId ? (
                    <Link
                      to={`/artist/${track.artistId}`}
                      onClick={close}
                      className="font-medium text-white hover:underline"
                    >
                      {track.artist}
                    </Link>
                  ) : (
                    <span className="font-medium text-white">{track.artist}</span>
                  )}
                  {track.album && (
                    <>
                      <span>·</span>
                      {track.source === 'jamendo' && track.albumId ? (
                        <Link
                          to={`/album/${track.albumId}`}
                          onClick={close}
                          className="hover:underline hover:text-white"
                        >
                          {track.album}
                        </Link>
                      ) : (
                        <span>{track.album}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Larger Seek Bar */}
              <div className="flex flex-col gap-1.5 px-1">
                <div
                  className="relative flex items-center"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                    setSeekTooltip({ x: e.clientX - rect.left, time: ratio * effDuration })
                  }}
                  onMouseLeave={() => setSeekTooltip(null)}
                >
                  {seekTooltip && (
                    <div
                      className="glass-strong pointer-events-none absolute -top-8 -translate-x-1/2 rounded px-2 py-0.5 text-xs font-mono text-white shadow-xl"
                      style={{ left: seekTooltip.x }}
                    >
                      {fmtTime(seekTooltip.time)}
                    </div>
                  )}
                  <input
                    type="range"
                    className="slider w-full h-5 cursor-pointer"
                    min={0}
                    max={effDuration || 1}
                    step={0.1}
                    value={Math.min(currentTime, effDuration || 1)}
                    onChange={(e) => usePlayer.getState().seek(Number(e.target.value))}
                    aria-label="Seek playback position"
                    style={
                      {
                        '--fill': `${Math.min(100, effDuration > 0 ? (currentTime / effDuration) * 100 : 0)}%`,
                        '--fill-color': 'var(--color-accent, #ffffff)',
                      } as CSSProperties
                    }
                  />
                </div>
                <div className="flex justify-between text-xs tabular-nums text-white/60">
                  <span>{fmtTime(currentTime)}</span>
                  <span>{fmtTime(effDuration)}</span>
                </div>
              </div>

              {/* Clean Transport Pill: ONLY Transport Controls */}
              <div
                className={`glass flex w-full items-center justify-around rounded-full px-4 py-2.5 shadow-xl transition-colors ${
                  accentId === 'auto' ? 'border-accent/40 shadow-[0_0_20px_var(--color-accent)]/20' : ''
                }`}
              >
                <button
                  type="button"
                  aria-label="Shuffle"
                  onClick={() => usePlayer.getState().toggleShuffle()}
                  className={`p-2 transition-colors ${shuffle ? 'text-accent' : 'text-white/70 hover:text-white'}`}
                  title="Shuffle"
                >
                  <ShuffleIcon size={20} />
                </button>

                <button
                  type="button"
                  aria-label="Previous track"
                  onClick={() => usePlayer.getState().prev()}
                  className="p-2 text-white/85 transition-colors hover:text-white"
                >
                  <PrevIcon size={24} />
                </button>

                <button
                  type="button"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  onClick={() => usePlayer.getState().togglePlay()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95 shadow-lg"
                  style={
                    accentId === 'auto'
                      ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                      : undefined
                  }
                >
                  {isPlaying && isBuffering ? (
                    <SpinnerIcon size={22} className="text-current" />
                  ) : isPlaying ? (
                    <PauseIcon size={22} />
                  ) : (
                    <PlayIcon size={22} />
                  )}
                </button>

                <button
                  type="button"
                  aria-label="Next track"
                  onClick={() => usePlayer.getState().next()}
                  className="p-2 text-white/85 transition-colors hover:text-white"
                >
                  <NextIcon size={24} />
                </button>

                <button
                  type="button"
                  aria-label={`Repeat: ${repeat}`}
                  onClick={() => usePlayer.getState().cycleRepeat()}
                  className={`p-2 transition-colors ${repeat === 'off' ? 'text-white/70 hover:text-white' : 'text-accent'}`}
                  title={`Repeat: ${repeat}`}
                >
                  {repeat === 'one' ? <RepeatOneIcon size={20} /> : <RepeatIcon size={20} />}
                </button>
              </div>

              {/* Secondary Row: Heart, Volume, Download, Queue */}
              <div className="flex items-center justify-between px-3 text-white/70">
                <button
                  type="button"
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  onClick={handleToggleFav}
                  className={`p-2 transition-colors ${isFav ? 'text-accent' : 'hover:text-white'}`}
                >
                  {isFav ? <HeartFilledIcon size={20} /> : <HeartIcon size={20} />}
                </button>

                {/* Volume Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={muted ? 'Unmute' : 'Mute'}
                    onClick={() => usePlayer.getState().toggleMute()}
                    className="p-2 hover:text-white"
                  >
                    {muted || volume === 0 ? <VolumeMuteIcon size={19} /> : <VolumeIcon size={19} />}
                  </button>
                  <input
                    type="range"
                    className="slider w-20 sm:w-28"
                    min={0}
                    max={1}
                    step={0.01}
                    value={muted ? 0 : volume}
                    onChange={(e) => usePlayer.getState().setVolume(Number(e.target.value))}
                    aria-label="Volume"
                    style={
                      {
                        '--fill': `${(muted ? 0 : volume) * 100}%`,
                        '--fill-color': 'var(--color-accent, #ffffff)',
                      } as CSSProperties
                    }
                  />
                </div>

                {track.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
                  <button
                    type="button"
                    aria-label="Download track (free)"
                    title="Free download"
                    onClick={() => {
                      void downloadTrack(track)
                      showToast(`Downloading: ${track.title}`)
                    }}
                    className="p-2 hover:text-accent transition-colors"
                  >
                    <DownloadIcon size={19} />
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Open queue sheet"
                  onClick={() => useUi.getState().setQueueOpen(true)}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <QueueIcon size={18} />
                  <span className="hidden sm:inline">Queue</span>
                </button>
              </div>

              {/* Up Next Peek (next 2-3 tracks) */}
              {nextTracks.length > 0 && !isLandscape && (
                <div className="mt-1 rounded-2xl bg-white/5 p-3 backdrop-blur-xs">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                      Up next
                    </span>
                    <button
                      type="button"
                      onClick={() => useUi.getState().setQueueOpen(true)}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      View queue ({order.length - orderPos - 1})
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {nextTracks.map(({ ix, track: nt }) => (
                      <button
                        key={`${nt.id}-${ix}`}
                        type="button"
                        onClick={() => usePlayer.getState().jumpTo(ix)}
                        className="group flex items-center gap-2.5 rounded-lg p-1 text-left hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={nt.cover}
                          alt=""
                          className="h-8 w-8 rounded object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white group-hover:text-accent">
                            {nt.title}
                          </p>
                          <p className="truncate text-[11px] text-white/60">{nt.artist}</p>
                        </div>
                        <span className="text-[11px] tabular-nums text-white/50 pr-1">
                          {fmtTime(nt.duration)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-lg text-white/70">Nothing playing — start some music first.</p>
        )}
      </div>
    </div>
  )
}
