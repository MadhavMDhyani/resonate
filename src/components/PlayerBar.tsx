import { useState, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { toggleFavorite } from '../lib/libraryActions'
import { downloadTrack } from '../lib/download'
import { fmtTime } from '../lib/format'
import { usePlayer } from '../stores/playerStore'
import { useUi } from '../ui/uiStore'
import { usePointerGlow } from '../hooks/usePointerGlow'
import { Cover } from './MediaCard'
import {
  DownloadIcon,
  HeartFilledIcon,
  HeartIcon,
  MoreIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  ShuffleIcon,
  SpinnerIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from './icons'

function pct(el: number, total: number): string {
  return `${Math.min(100, Math.max(0, total > 0 ? (el / total) * 100 : 0))}%`
}

export function PlayerBar() {
  const track = usePlayer((s) => s.queue[s.currentIndex])
  const isPlaying = usePlayer((s) => s.isPlaying)
  const isBuffering = usePlayer((s) => s.isBuffering)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const volume = usePlayer((s) => s.volume)
  const muted = usePlayer((s) => s.muted)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const queueOpen = useUi((s) => s.queueOpen)

  const [chipMenuOpen, setChipMenuOpen] = useState(false)
  const [seekTooltip, setSeekTooltip] = useState<{ x: number; time: number } | null>(null)
  const glowRef = usePointerGlow<HTMLDivElement>()

  const favRecord = useLiveQuery(
    () => (track ? db.favorites.get(track.id) : Promise.resolve(undefined)),
    [track?.id],
  )
  const isFav = Boolean(favRecord)

  const effDuration = duration || track?.duration || 0
  const progressPercent = pct(currentTime, effDuration)

  const handleSeekMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setSeekTooltip({ x: e.clientX - rect.left, time: ratio * effDuration })
  }
  const handleSeekLeave = () => setSeekTooltip(null)

  return (
    <footer className="shrink-0 px-2 pb-2 md:px-4 md:pb-3">
      {/* =========================================================================
          Desktop player bar (Image 2 style: long glass pill)
      ========================================================================= */}
      <div
        ref={glowRef}
        className="glass pointer-glow hidden h-[68px] max-w-4xl mx-auto items-center justify-between gap-4 rounded-full px-5 shadow-2xl md:flex"
      >
        {/* Left Cluster: Transport Controls */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => usePlayer.getState().prev()}
            disabled={!track}
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            title="Previous (J)"
          >
            <PrevIcon size={18} />
          </button>

          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={() => usePlayer.getState().togglePlay()}
            disabled={!track}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            title="Play / Pause (Space)"
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
            aria-label="Next"
            onClick={() => usePlayer.getState().next()}
            disabled={!track}
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            title="Next (K)"
          >
            <NextIcon size={18} />
          </button>
        </div>

        {/* Center: Dark Inset Chip with Track Info & Integrated Seekbar */}
        <div className="relative flex-1 max-w-md">
          <div
            className="relative flex h-12 w-full items-center gap-3 overflow-hidden rounded-2xl bg-black/45 border border-white/10 px-3 cursor-pointer group/chip"
            onClick={() => useUi.getState().setNowPlayingOpen(true)}
            onMouseMove={handleSeekMove}
            onMouseLeave={handleSeekLeave}
          >
            {track ? (
              <>
                <Cover
                  image={track.cover}
                  title={track.title}
                  className="h-8 w-8 rounded-lg shrink-0 shadow"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink group-hover/chip:text-accent transition-colors">
                    {track.title}
                  </p>
                  <p className="truncate text-[11px] text-ink-dim">
                    {track.artist}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-dim italic px-1">Nothing playing</p>
            )}

            {/* Time / ⋯ Menu toggle */}
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] tabular-nums text-ink-dim">
                {fmtTime(currentTime)} / {fmtTime(effDuration)}
              </span>
              {track && (
                <button
                  type="button"
                  aria-label="Track options"
                  onClick={(e) => {
                    e.stopPropagation()
                    setChipMenuOpen((o) => !o)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-dim hover:text-ink hover:bg-white/10"
                >
                  <MoreIcon size={14} />
                </button>
              )}
            </div>

            {/* Seek Tooltip */}
            {seekTooltip && (
              <div
                className="glass pointer-events-none absolute -top-7 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-mono text-ink shadow-lg"
                style={{ left: seekTooltip.x }}
              >
                {fmtTime(seekTooltip.time)}
              </div>
            )}

            {/* Thin Progress line along bottom of chip */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
              <div
                className="h-full bg-accent transition-all duration-100"
                style={{ width: progressPercent }}
              />
            </div>

            {/* Hidden draggable range covering the bottom edge for smooth seeking */}
            {track && (
              <input
                type="range"
                min={0}
                max={effDuration || 1}
                step={0.1}
                value={currentTime}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => usePlayer.getState().seek(Number(e.target.value))}
                className="absolute inset-x-0 bottom-0 h-3 w-full opacity-0 cursor-pointer z-10"
                aria-label="Seek track position"
              />
            )}
          </div>

          {/* Quick Menu Popover */}
          {chipMenuOpen && track && (
            <div
              className="glass absolute bottom-14 right-0 z-30 flex flex-col gap-1 rounded-2xl p-2 shadow-2xl min-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  void toggleFavorite(track)
                  setChipMenuOpen(false)
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-panel-hi"
              >
                {isFav ? <HeartFilledIcon size={14} className="text-accent" /> : <HeartIcon size={14} />}
                <span>{isFav ? 'Remove favorite' : 'Add to favorites'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  usePlayer.getState().toggleShuffle()
                  setChipMenuOpen(false)
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-panel-hi"
              >
                <ShuffleIcon size={14} />
                <span>Shuffle: {shuffle ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  usePlayer.getState().cycleRepeat()
                  setChipMenuOpen(false)
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-panel-hi"
              >
                <RepeatIcon size={14} />
                <span>Repeat: {repeat}</span>
              </button>
              {track.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
                <button
                  type="button"
                  onClick={() => {
                    void downloadTrack(track)
                    setChipMenuOpen(false)
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-panel-hi"
                >
                  <DownloadIcon size={14} />
                  <span>Download</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Cluster: Queue & Volume */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label="Queue"
            title="Queue (Q)"
            onClick={() => useUi.getState().toggleQueue()}
            className={`glass relative flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${
              queueOpen ? 'text-accent border-accent/40' : 'text-ink'
            }`}
          >
            <QueueIcon size={18} />
            {queueOpen && (
              <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent" />
            )}
          </button>

          {/* Volume cluster */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={muted ? 'Unmute' : 'Mute'}
              onClick={() => usePlayer.getState().toggleMute()}
              className="text-ink-dim hover:text-ink transition-colors"
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
              className="slider w-20"
              style={{ '--fill': `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          Mobile mini-player (docked above bottom tab bar)
      ========================================================================= */}
      <div
        className="glass relative flex h-14 items-center gap-3 rounded-2xl px-3 shadow-lg md:hidden"
        onClick={() => useUi.getState().setNowPlayingOpen(true)}
      >
        {/* Thin progress line along top edge */}
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl bg-white/10">
          <div
            className="h-full bg-accent transition-all duration-150"
            style={{ width: progressPercent }}
          />
        </div>

        {track ? (
          <>
            <Cover image={track.cover} title={track.title} className="h-10 w-10 rounded-lg shrink-0 shadow" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{track.title}</p>
              <p className="truncate text-[11px] text-ink-dim">{track.artist}</p>
            </div>
            <button
              type="button"
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              onClick={(e) => {
                e.stopPropagation()
                void toggleFavorite(track)
              }}
              className="touch-visible flex h-9 w-9 items-center justify-center text-ink-dim"
            >
              {isFav ? <HeartFilledIcon size={18} className="text-accent" /> : <HeartIcon size={18} />}
            </button>
            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={(e) => {
                e.stopPropagation()
                usePlayer.getState().togglePlay()
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow"
            >
              {isPlaying && isBuffering ? (
                <SpinnerIcon size={16} />
              ) : isPlaying ? (
                <PauseIcon size={16} />
              ) : (
                <PlayIcon size={16} />
              )}
            </button>
          </>
        ) : (
          <p className="text-xs text-ink-dim italic">Nothing playing</p>
        )}
      </div>
    </footer>
  )
}
