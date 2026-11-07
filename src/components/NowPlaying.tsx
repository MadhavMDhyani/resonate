import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { toggleFavorite } from '../lib/libraryActions'
import { downloadTrack } from '../lib/download'
import { fmtTime } from '../lib/format'
import { usePlayer } from '../stores/playerStore'
import { useUi } from '../ui/uiStore'
import type { Track } from '../types'
import {
  DownloadIcon,
  HeartFilledIcon,
  HeartIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon,
  VolumeMuteIcon,
  XIcon,
} from './icons'

/** Cover-flow placement per offset from the center card.
 *  2D transforms only: perspective/rotateY subtrees trigger a compositor
 *  paint-offset bug in some embedded Chromium surfaces, shifting the whole
 *  overlay's content. Scale+fade reads nearly identically and is robust. */
function cardStyle(offset: number, width: number): CSSProperties {
  const base: CSSProperties = {
    left: `calc(50% - ${width / 2}px)`,
    top: 0,
    width,
    height: width,
  }
  const shift = width < 260 ? { near: 0.75, far: 1.3 } : { near: 1.05, far: 1.8 }
  switch (offset) {
    case -2:
      return { ...base, transform: `translateX(${-shift.far * width}px) scale(0.5)`, opacity: 0.6, filter: 'brightness(0.5)', zIndex: 1 }
    case -1:
      return { ...base, transform: `translateX(${-shift.near * width}px) scale(0.72)`, opacity: 0.85, filter: 'brightness(0.68)', zIndex: 2 }
    case 0:
      return { ...base, transform: 'none', opacity: 1, zIndex: 3 }
    case 1:
      return { ...base, transform: `translateX(${shift.near * width}px) scale(0.72)`, opacity: 0.85, filter: 'brightness(0.68)', zIndex: 2 }
    case 2:
      return { ...base, transform: `translateX(${shift.far * width}px) scale(0.5)`, opacity: 0.6, filter: 'brightness(0.5)', zIndex: 1 }
    default:
      return base
  }
}

/** Keeps the previous cover so the ambient background crossfades instead of popping. */
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
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const volume = usePlayer((s) => s.volume)
  const muted = usePlayer((s) => s.muted)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const context = usePlayer((s) => s.context)

  const track = queue[currentIndex]
  const layers = useCoverLayers(track?.cover)

  const favRecord = useLiveQuery(
    () => (track ? db.favorites.get(track.id) : Promise.resolve(undefined)),
    [track?.id],
  )
  const isFav = Boolean(favRecord)

  // Neighbor cards in playback order (respects shuffle).
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

  // Esc closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useUi.getState().setNowPlayingOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  const effDuration = duration || track?.duration || 0

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none" role="dialog" aria-label="Now playing">
      {/* Ambient artwork backdrop with crossfade.
          The animation lives on an oversized wrapper (160px overscan) and the
          blur on the static img inside — animating a blurred layer directly
          trips compositor clipping on some embedded Chromium surfaces. */}
      <div className="absolute inset-0 overflow-hidden bg-base">
        {layers.map((src, i) => (
          <div
            key={src}
            className={`anim-ambient absolute -inset-40 ${i === layers.length - 1 ? 'anim-fade' : ''}`}
          >
            <img src={src} alt="" aria-hidden="true" className="h-full w-full object-cover blur-3xl" />
          </div>
        ))}
        {/* Fixed dark scrim in both modes — the ambient art is the backdrop, and the
            overlay text is always white, so a light-mode scrim would break contrast. */}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Close */}
      <button
        type="button"
        aria-label="Close now playing"
        onClick={() => useUi.getState().setNowPlayingOpen(false)}
        className="glass absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full text-ink hover:scale-105 transition-transform"
      >
        <XIcon size={18} />
      </button>

      {/* Center: cover-flow + titles */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-4 pb-44 pt-10">
        {track ? (
          <>
            <div className="cf-scene relative h-[300px] w-[300px] md:h-[340px] md:w-[340px]">
              {cards.map(({ offset, track: t, queueIndex }) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => offset !== 0 && usePlayer.getState().jumpTo(queueIndex)}
                  className="cf-card absolute overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15"
                  style={cardStyle(offset, 300)}
                  aria-label={offset === 0 ? undefined : `Play ${t.title}`}
                  tabIndex={offset === 0 ? 0 : -1}
                >
                  <img src={t.cover} alt={t.title} className="h-full w-full object-cover" />
                  {offset !== 0 && <span className="absolute inset-0 bg-black/25" />}
                </button>
              ))}
              {cards.length <= 1 && (
                <div
                  className="absolute overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15"
                  style={cardStyle(0, 300)}
                >
                  {track.cover ? (
                    <img src={track.cover} alt={track.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-accent/40 to-black/60" />
                  )}
                </div>
              )}
            </div>


            <div key={track.id} className="anim-rise max-w-xl text-center">
              <p className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                {track.title}
              </p>
              <p className="mt-2 text-lg text-white/70">{track.artist}</p>
              {context && <p className="mt-1 text-xs text-white/50">{context}</p>}
            </div>
          </>
        ) : (
          <p className="text-lg text-white/70">Nothing playing — start some music first.</p>
        )}
      </div>

      {/* Seek + glass transport pill */}
      {track && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 px-4 pb-6">
          <div className="flex w-full max-w-2xl items-center gap-3">
            <span className="w-10 text-right text-xs tabular-nums text-white/70">{fmtTime(currentTime)}</span>
            <input
              type="range"
              className="slider w-full"
              min={0}
              max={effDuration || 1}
              step={0.1}
              value={Math.min(currentTime, effDuration || 1)}
              onChange={(e) => usePlayer.getState().seek(Number(e.target.value))}
              aria-label="Seek"
              style={{ '--fill': `${Math.min(100, effDuration > 0 ? (currentTime / effDuration) * 100 : 0)}%`, '--fill-color': '#ffffff' } as CSSProperties}
            />
            <span className="w-10 text-xs tabular-nums text-white/70">{fmtTime(effDuration)}</span>
          </div>

          <div className="glass flex w-full max-w-3xl items-center gap-3 rounded-full px-5 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Shuffle"
                onClick={() => usePlayer.getState().toggleShuffle()}
                className={shuffle ? 'text-accent-hover' : 'text-white/70 hover:text-white'}
              >
                <ShuffleIcon size={18} />
              </button>
              <button
                type="button"
                aria-label="Previous"
                onClick={() => usePlayer.getState().prev()}
                className="text-white/85 hover:text-white"
              >
                <PrevIcon size={22} />
              </button>
              <button
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={() => usePlayer.getState().togglePlay()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
              >
                {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={() => usePlayer.getState().next()}
                className="text-white/85 hover:text-white"
              >
                <NextIcon size={22} />
              </button>
              <button
                type="button"
                aria-label={`Repeat: ${repeat}`}
                onClick={() => usePlayer.getState().cycleRepeat()}
                className={repeat === 'off' ? 'text-white/70 hover:text-white' : 'text-accent-hover'}
              >
                {repeat === 'one' ? <RepeatOneIcon size={18} /> : <RepeatIcon size={18} />}
              </button>
            </div>

            <div
              key={track.id}
              className="anim-rise ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4"
            >
              {track.cover && (
                <img src={track.cover} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                <p className="truncate text-xs text-white/60">{track.artist}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                onClick={() => track && void toggleFavorite(track)}
                className={isFav ? 'text-accent-hover' : 'text-white/70 hover:text-white'}
              >
                {isFav ? <HeartFilledIcon size={17} /> : <HeartIcon size={17} />}
              </button>
              {track.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
                <button
                  type="button"
                  aria-label="Download this track (free)"
                  onClick={() => void downloadTrack(track)}
                  className="text-white/70 hover:text-accent-hover"
                >
                  <DownloadIcon size={17} />
                </button>
              )}
              <button
                type="button"
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={() => usePlayer.getState().toggleMute()}
                className="text-white/70 hover:text-white"
              >
                {muted || volume === 0 ? <VolumeMuteIcon size={17} /> : <VolumeIcon size={17} />}
              </button>
              <input
                type="range"
                className="slider hidden w-20 sm:block"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => usePlayer.getState().setVolume(Number(e.target.value))}
                aria-label="Volume"
                style={{ '--fill': `${(muted ? 0 : volume) * 100}%`, '--fill-color': '#ffffff' } as CSSProperties}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
