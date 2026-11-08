import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { toggleFavorite } from '../lib/libraryActions'
import { downloadTrack } from '../lib/download'
import { fmtTime } from '../lib/format'
import { usePlayer } from '../stores/playerStore'
import { useUi } from '../ui/uiStore'
import { Cover } from './MediaCard'
import {
  ChevronUpIcon,
  DownloadIcon,
  HeartFilledIcon,
  HeartIcon,
  MaximizeIcon,
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
  const context = usePlayer((s) => s.context)
  const queueOpen = useUi((s) => s.queueOpen)

  const [seekTooltip, setSeekTooltip] = useState<{ x: number; time: number } | null>(null)

  const favRecord = useLiveQuery(() => (track ? db.favorites.get(track.id) : Promise.resolve(undefined)), [track?.id])
  const isFav = Boolean(favRecord)

  const effDuration = duration || track?.duration || 0

  const handleSeekMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setSeekTooltip({ x: e.clientX - rect.left, time: ratio * effDuration })
  }
  const handleSeekLeave = () => setSeekTooltip(null)

  return (
    <footer className="shrink-0 px-2 pb-1.5 md:pb-2">
      {/* Desktop player bar (hidden below md) */}
      <div className="glass hidden h-[68px] items-center gap-3 rounded-full px-4 md:flex">
        {/* Left: track info — clicking opens the full Now Playing view */}
        <div className="flex min-w-0 flex-1 max-w-[32%] items-center gap-2">
          {track ? (
            <>
              <button
                type="button"
                aria-label="Open now playing view"
                title="Open now playing"
                onClick={() => useUi.getState().setNowPlayingOpen(true)}
                className="group relative shrink-0"
              >
                <Cover image={track.cover} title={track.title} className="h-11 w-11" />
                <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronUpIcon size={16} />
                </span>
              </button>
              <div key={track.id} className="anim-rise min-w-0 flex-1">
                {context && (
                  <p className="truncate text-[10px] font-semibold text-accent leading-none mb-0.5">
                    Playing from {context}
                  </p>
                )}
                <p className="truncate text-sm font-medium text-ink">
                  {track.source === 'jamendo' && track.artistId ? (
                    <Link to={`/artist/${track.artistId}`} className="hover:underline">
                      {track.title}
                    </Link>
                  ) : track.source === 'jamendo' && track.albumId ? (
                    <Link to={`/album/${track.albumId}`} className="hover:underline">
                      {track.title}
                    </Link>
                  ) : (
                    track.title
                  )}
                </p>
                <p className="truncate text-xs text-ink-dim">
                  {track.source === 'jamendo' && track.artistId ? (
                    <Link to={`/artist/${track.artistId}`} className="hover:underline hover:text-ink">
                      {track.artist}
                    </Link>
                  ) : (
                    track.artist
                  )}
                </p>
              </div>
              <button
                type="button"
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                onClick={() => track && void toggleFavorite(track)}
                className={`shrink-0 ${isFav ? 'text-accent-hover' : 'text-ink-dim hover:text-ink'}`}
              >
                {isFav ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-dim pl-2">Nothing playing</p>
          )}
        </div>

        {/* Center: transport + seek */}
        <div className="flex flex-1 min-w-0 max-w-xl flex-col items-center justify-center gap-0.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Shuffle"
              onClick={() => usePlayer.getState().toggleShuffle()}
              className={shuffle ? 'text-accent-hover' : 'text-ink-dim hover:text-ink'}
              title="Shuffle"
            >
              <ShuffleIcon size={16} />
            </button>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => usePlayer.getState().prev()}
              className="text-ink-dim hover:text-ink"
            >
              <PrevIcon size={18} />
            </button>
            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={() => usePlayer.getState().togglePlay()}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-40"
              style={{ background: 'var(--x-text)', color: 'var(--x-base)' }}
              disabled={!track}
            >
              {isPlaying && isBuffering ? (
                <SpinnerIcon size={18} />
              ) : isPlaying ? (
                <PauseIcon size={18} />
              ) : (
                <PlayIcon size={18} />
              )}
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => usePlayer.getState().next()}
              className="text-ink-dim hover:text-ink"
            >
              <NextIcon size={18} />
            </button>
            <button
              type="button"
              aria-label={`Repeat: ${repeat}`}
              onClick={() => usePlayer.getState().cycleRepeat()}
              className={repeat === 'off' ? 'text-ink-dim hover:text-ink' : 'text-accent-hover'}
              title={`Repeat: ${repeat}`}
            >
              {repeat === 'one' ? <RepeatOneIcon size={16} /> : <RepeatIcon size={16} />}
            </button>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="w-10 text-right text-[11px] tabular-nums text-ink-dim">
              {fmtTime(currentTime)}
            </span>
            <div
              className="relative flex-1"
              onMouseMove={handleSeekMove}
              onMouseLeave={handleSeekLeave}
            >
              {seekTooltip && (
                <div
                  className="glass pointer-events-none absolute -top-7 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-mono text-ink shadow-lg"
                  style={{ left: seekTooltip.x }}
                >
                  {fmtTime(seekTooltip.time)}
                </div>
              )}
              <input
                type="range"
                className="slider w-full"
                min={0}
                max={effDuration || 1}
                step={0.1}
                value={Math.min(currentTime, effDuration || 1)}
                onChange={(e) => usePlayer.getState().seek(Number(e.target.value))}
                aria-label="Seek"
                style={{ '--fill': pct(currentTime, effDuration) } as CSSProperties}
                disabled={!track}
              />
            </div>
            <span className="w-10 text-[11px] tabular-nums text-ink-dim">{fmtTime(effDuration)}</span>
          </div>
        </div>

        {/* Right: fullscreen, download, queue, volume */}
        <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-3">
          {track?.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
            <button
              type="button"
              aria-label="Download this track (free)"
              title={`Free download — ${track.license ?? 'Creative Commons'}`}
              onClick={() => void downloadTrack(track)}
              className="flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1.5 text-xs font-semibold text-ink-dim transition-colors hover:border-accent-hover hover:text-accent-hover lg:px-3"
            >
              <DownloadIcon size={14} />
              <span className="hidden xl:inline">Download</span>
            </button>
          )}
          {track && (
            <button
              type="button"
              aria-label="Open fullscreen player"
              title="Fullscreen player"
              onClick={() => useUi.getState().setNowPlayingOpen(true)}
              className="text-ink-dim hover:text-ink"
            >
              <MaximizeIcon size={17} />
            </button>
          )}
          <button
            type="button"
            aria-label="Queue"
            onClick={() => useUi.getState().toggleQueue()}
            className={queueOpen ? 'text-accent-hover' : 'text-ink-dim hover:text-ink'}
            title="Queue"
          >
            <QueueIcon size={18} />
          </button>
          <button
            type="button"
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={() => usePlayer.getState().toggleMute()}
            className="text-ink-dim hover:text-ink"
          >
            {muted || volume === 0 ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
          </button>
          <input
            type="range"
            className="slider w-16 lg:w-24"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => usePlayer.getState().setVolume(Number(e.target.value))}
            aria-label="Volume"
            style={{ '--fill': pct(muted ? 0 : volume, 1) } as CSSProperties}
          />
        </div>
      </div>

      {/* Mobile mini-player (flex below md, hidden on md+) */}
      <div
        role="button"
        tabIndex={0}
        aria-label={track ? `Now playing: ${track.title} by ${track.artist}. Tap to expand.` : 'No track playing'}
        onClick={() => track && useUi.getState().setNowPlayingOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (track) useUi.getState().setNowPlayingOpen(true)
          }
        }}
        className="glass relative flex h-14 w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl px-2.5 shadow-lg md:hidden"
      >
        {/* Thin progress line along top edge */}
        <div className="absolute inset-x-0 top-0 h-[2.5px] bg-white/15">
          <div
            className="h-full bg-accent transition-[width] duration-150"
            style={{ width: pct(currentTime, effDuration) }}
          />
        </div>

        {track ? (
          <>
            <div className="relative shrink-0">
              <Cover image={track.cover} title={track.title} className="h-10 w-10 rounded-lg object-cover" />
            </div>
            <div className="min-w-0 flex-1 pr-1">
              {context && (
                <p className="truncate text-[10px] font-semibold text-accent leading-none mb-0.5">
                  Playing from {context}
                </p>
              )}
              <p className="truncate text-sm font-semibold text-ink leading-tight">{track.title}</p>
              <p className="truncate text-xs text-ink-dim leading-tight">{track.artist}</p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                onClick={() => void toggleFavorite(track)}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  isFav ? 'text-accent-hover' : 'text-ink-dim hover:text-ink'
                }`}
              >
                {isFav ? <HeartFilledIcon size={18} /> : <HeartIcon size={18} />}
              </button>
              <button
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={() => usePlayer.getState().togglePlay()}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
                style={{ background: 'var(--x-text)', color: 'var(--x-base)' }}
              >
                {isPlaying && isBuffering ? (
                  <SpinnerIcon size={18} />
                ) : isPlaying ? (
                  <PauseIcon size={18} />
                ) : (
                  <PlayIcon size={18} />
                )}
              </button>
              <button
                type="button"
                aria-label="Queue"
                onClick={() => useUi.getState().toggleQueue()}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  queueOpen ? 'text-accent-hover' : 'text-ink-dim hover:text-ink'
                }`}
              >
                <QueueIcon size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-between px-2 text-xs text-ink-dim">
            <span>Nothing playing</span>
          </div>
        )}
      </div>
    </footer>
  )
}
