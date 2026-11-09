import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { toggleFavorite } from '../lib/libraryActions'
import { downloadTrack } from '../lib/download'
import { fmtTime } from '../lib/format'
import { usePlayer } from '../stores/playerStore'
import { useUi } from '../ui/uiStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { usePointerGlow } from '../hooks/usePointerGlow'
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
  const shiftNear = isNarrow
    ? Math.min(maxShift, width * 0.42)
    : width < 260
      ? width * 0.75
      : width * 1.05
  const shiftFar = isNarrow
    ? Math.min(maxShift + 25, width * 0.7)
    : width < 260
      ? width * 1.3
      : width * 1.8

  switch (offset) {
    case -2:
      return {
        ...base,
        transform: `translateX(${-shiftFar}px) scale(0.55)`,
        opacity: isNarrow ? 0 : 0.5,
        pointerEvents: isNarrow ? 'none' : undefined,
        filter: 'brightness(0.4)',
        zIndex: 1,
      }
    case -1:
      return {
        ...base,
        transform: `translateX(${-shiftNear}px) scale(0.75)`,
        opacity: 0.85,
        filter: 'brightness(0.65)',
        zIndex: 2,
      }
    case 0:
      return { ...base, transform: 'none', opacity: 1, zIndex: 3 }
    case 1:
      return {
        ...base,
        transform: `translateX(${shiftNear}px) scale(0.75)`,
        opacity: 0.85,
        filter: 'brightness(0.65)',
        zIndex: 2,
      }
    case 2:
      return {
        ...base,
        transform: `translateX(${shiftFar}px) scale(0.55)`,
        opacity: isNarrow ? 0 : 0.5,
        pointerEvents: isNarrow ? 'none' : undefined,
        filter: 'brightness(0.4)',
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

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 768,
  )
  const [seekTooltip, setSeekTooltip] = useState<{ x: number; time: number } | null>(null)
  const captionGlowRef = usePointerGlow<HTMLDivElement>()

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
    if (isLandscape) return Math.min(220, viewportHeight - 140)
    if (viewportWidth < 380) return Math.min(240, Math.floor(viewportWidth * 0.65))
    if (viewportWidth < 640) return 260
    if (viewportWidth < 768) return 300
    return 340
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

  const effDuration = duration || track?.duration || 0
  const progressPercent = effDuration > 0 ? (currentTime / effDuration) * 100 : 0

  if (!open) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing"
      className="fixed inset-0 z-50 overflow-hidden bg-black text-white"
    >
      {/* Blurred Album Artwork Ambient Backdrop */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {layers.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="anim-fade absolute inset-0 bg-cover bg-center filter blur-3xl saturate-200 brightness-60 scale-125"
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        {/* Grain overlay */}
        <div className="grain absolute inset-0 pointer-events-none" />
        {/* Darkening vignette overlay */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/85" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5">
        <button
          type="button"
          aria-label="Close now playing"
          onClick={close}
          className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
          title="Close (Esc)"
        >
          <ChevronDownIcon size={20} />
        </button>

        <span className="label-micro text-white/70">
          NOW PLAYING
        </span>

        <div className="flex items-center gap-2">
          {track && (
            <button
              type="button"
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              onClick={() => void toggleFavorite(track)}
              className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
            >
              {isFav ? <HeartFilledIcon size={18} className="text-accent" /> : <HeartIcon size={18} />}
            </button>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex h-[calc(100dvh-60px)] flex-col justify-between px-4 pb-6 pt-4 sm:px-6">
        {track ? (
          <>
            {/* Center: Cover-Flow + Attached Frosted Caption Plate (Image 2 style) */}
            <div
              className="flex flex-1 flex-col items-center justify-center py-2"
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
                    className="cf-card absolute overflow-hidden rounded-[24px] shadow-2xl ring-1 ring-white/15 transition-all"
                    style={cardStyle(offset, cardWidth, viewportWidth)}
                    aria-label={offset === 0 ? undefined : `Play ${t.title}`}
                    tabIndex={offset === 0 ? 0 : -1}
                  >
                    <img src={t.cover} alt={t.title} className="h-full w-full object-cover" />
                    {offset !== 0 && <span className="absolute inset-0 bg-black/40" />}
                  </button>
                ))}
                {cards.length <= 1 && (
                  <div
                    className="absolute overflow-hidden rounded-[24px] shadow-2xl ring-1 ring-white/15"
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

              {/* Frosted Glass Caption Plate attached under center cover */}
              <div
                ref={captionGlowRef}
                className="glass-strong pointer-glow mt-6 w-full max-w-sm sm:max-w-md rounded-2xl px-6 py-3.5 text-center shadow-2xl border border-white/15 backdrop-blur-xl"
              >
                <h2 className="font-display text-xl sm:text-2xl font-black text-white truncate">
                  {track.title}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-white/75 truncate">
                  {track.source === 'jamendo' && track.artistId ? (
                    <Link
                      to={`/artist/${track.artistId}`}
                      onClick={close}
                      className="hover:underline hover:text-white"
                    >
                      {track.artist}
                    </Link>
                  ) : (
                    track.artist
                  )}
                  {track.album && (
                    <span>
                      {' '}· {track.album}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Bottom: Floating Long Glass Transport Pill (Image 2 style) */}
            <div className="mx-auto w-full max-w-2xl">
              {/* Integrated Seekbar line above pill */}
              <div
                className="relative mb-3 flex items-center px-4"
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
                  className="slider w-full h-4 cursor-pointer"
                  min={0}
                  max={effDuration || 1}
                  step={0.1}
                  value={Math.min(currentTime, effDuration || 1)}
                  onChange={(e) => usePlayer.getState().seek(Number(e.target.value))}
                  aria-label="Seek playback position"
                  style={
                    {
                      '--fill': `${progressPercent}%`,
                      '--fill-color': 'var(--color-accent, #d6fb00)',
                    } as CSSProperties
                  }
                />
              </div>

              <div className="flex justify-between px-4 pb-2 text-[11px] tabular-nums text-white/60">
                <span>{fmtTime(currentTime)}</span>
                <span>{fmtTime(effDuration)}</span>
              </div>

              {/* Long Glass Transport Pill */}
              <div className="glass flex items-center justify-between gap-3 rounded-full px-6 py-3 shadow-2xl">
                {/* Left controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Shuffle"
                    onClick={() => usePlayer.getState().toggleShuffle()}
                    className={`p-2 transition-colors ${shuffle ? 'text-accent' : 'text-white/70 hover:text-white'}`}
                    title="Shuffle"
                  >
                    <ShuffleIcon size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Previous track"
                    onClick={() => usePlayer.getState().prev()}
                    className="p-2 text-white/85 transition-colors hover:text-white hover:scale-105 active:scale-95"
                  >
                    <PrevIcon size={20} />
                  </button>
                  <button
                    type="button"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    onClick={() => usePlayer.getState().togglePlay()}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    {isPlaying && isBuffering ? (
                      <SpinnerIcon size={20} />
                    ) : isPlaying ? (
                      <PauseIcon size={20} />
                    ) : (
                      <PlayIcon size={20} />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Next track"
                    onClick={() => usePlayer.getState().next()}
                    className="p-2 text-white/85 transition-colors hover:text-white hover:scale-105 active:scale-95"
                  >
                    <NextIcon size={20} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Repeat: ${repeat}`}
                    onClick={() => usePlayer.getState().cycleRepeat()}
                    className={`p-2 transition-colors ${repeat === 'off' ? 'text-white/70 hover:text-white' : 'text-accent'}`}
                    title={`Repeat: ${repeat}`}
                  >
                    {repeat === 'one' ? <RepeatOneIcon size={18} /> : <RepeatIcon size={18} />}
                  </button>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3">
                  {track.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
                    <button
                      type="button"
                      aria-label="Download track"
                      onClick={() => {
                        void downloadTrack(track)
                        showToast(`Downloading: ${track.title}`)
                      }}
                      className="p-2 text-white/70 transition-colors hover:text-white"
                      title="Download"
                    >
                      <DownloadIcon size={18} />
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label="Queue"
                    onClick={() => useUi.getState().toggleQueue()}
                    className="p-2 text-white/70 transition-colors hover:text-white"
                    title="Queue"
                  >
                    <QueueIcon size={18} />
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={muted ? 'Unmute' : 'Mute'}
                      onClick={() => usePlayer.getState().toggleMute()}
                      className="text-white/70 hover:text-white"
                    >
                      {muted || volume === 0 ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={muted ? 0 : volume}
                      onChange={(e) => usePlayer.getState().setVolume(Number(e.target.value))}
                      aria-label="Volume slider"
                      className="slider w-16"
                      style={{ '--fill': `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-white/60">Nothing currently playing</p>
          </div>
        )}
      </div>
    </div>
  )
}
