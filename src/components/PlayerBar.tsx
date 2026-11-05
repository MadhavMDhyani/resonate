import type { CSSProperties } from 'react'
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
  VolumeIcon,
  VolumeMuteIcon,
} from './icons'

function pct(el: number, total: number): string {
  return `${Math.min(100, Math.max(0, total > 0 ? (el / total) * 100 : 0))}%`
}

export function PlayerBar() {
  const track = usePlayer((s) => s.queue[s.currentIndex])
  const isPlaying = usePlayer((s) => s.isPlaying)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const volume = usePlayer((s) => s.volume)
  const muted = usePlayer((s) => s.muted)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const queueOpen = useUi((s) => s.queueOpen)

  const favRecord = useLiveQuery(() => (track ? db.favorites.get(track.id) : Promise.resolve(undefined)), [track?.id])
  const isFav = Boolean(favRecord)

  const effDuration = duration || track?.duration || 0

  return (
    <footer className="flex h-20 shrink-0 items-center gap-4 border-t border-white/5 bg-panel px-4">
      {/* Left: track info */}
      <div className="flex w-[30%] min-w-0 items-center gap-3">
        {track ? (
          <>
            <Cover image={track.cover} title={track.title} className="h-12 w-12 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {track.source === 'jamendo' && track.albumId ? (
                  <Link to={`/album/${track.albumId}`} className="hover:underline">
                    {track.title}
                  </Link>
                ) : (
                  track.title
                )}
              </p>
              <p className="truncate text-xs text-neutral-400">{track.artist}</p>
            </div>
            <button
              type="button"
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              onClick={() => track && void toggleFavorite(track)}
              className={`shrink-0 ${isFav ? 'text-accent-hover' : 'text-neutral-400 hover:text-white'}`}
            >
              {isFav ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
            </button>
          </>
        ) : (
          <p className="text-sm text-neutral-500">Nothing playing</p>
        )}
      </div>

      {/* Center: transport + seek */}
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Shuffle"
            onClick={() => usePlayer.getState().toggleShuffle()}
            className={shuffle ? 'text-accent-hover' : 'text-neutral-400 hover:text-white'}
            title="Shuffle"
          >
            <ShuffleIcon size={16} />
          </button>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => usePlayer.getState().prev()}
            className="text-neutral-300 hover:text-white"
          >
            <PrevIcon size={18} />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={() => usePlayer.getState().togglePlay()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 disabled:opacity-40"
            disabled={!track}
          >
            {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => usePlayer.getState().next()}
            className="text-neutral-300 hover:text-white"
          >
            <NextIcon size={18} />
          </button>
          <button
            type="button"
            aria-label={`Repeat: ${repeat}`}
            onClick={() => usePlayer.getState().cycleRepeat()}
            className={
              repeat === 'off' ? 'text-neutral-400 hover:text-white' : 'text-accent-hover'
            }
            title={`Repeat: ${repeat}`}
          >
            {repeat === 'one' ? <RepeatOneIcon size={16} /> : <RepeatIcon size={16} />}
          </button>
        </div>
        <div className="flex w-full max-w-xl items-center gap-2">
          <span className="w-10 text-right text-xs tabular-nums text-neutral-400">
            {fmtTime(currentTime)}
          </span>
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
          <span className="w-10 text-xs tabular-nums text-neutral-400">{fmtTime(effDuration)}</span>
        </div>
      </div>

      {/* Right: download, queue, volume */}
      <div className="flex w-[30%] items-center justify-end gap-3">
        {track?.source === 'jamendo' && track.audiodownload && track.downloadAllowed !== false && (
          <button
            type="button"
            aria-label="Download this track (free)"
            title={`Free download — ${track.license ?? 'Creative Commons'}`}
            onClick={() => void downloadTrack(track)}
            className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-accent-hover hover:text-accent-hover"
          >
            <DownloadIcon size={14} /> Download
          </button>
        )}
        <button
          type="button"
          aria-label="Queue"
          onClick={() => useUi.getState().toggleQueue()}
          className={queueOpen ? 'text-accent-hover' : 'text-neutral-400 hover:text-white'}
          title="Queue"
        >
          <QueueIcon size={18} />
        </button>
        <button
          type="button"
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={() => usePlayer.getState().toggleMute()}
          className="text-neutral-400 hover:text-white"
        >
          {muted || volume === 0 ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
        </button>
        <input
          type="range"
          className="slider w-24"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => usePlayer.getState().setVolume(Number(e.target.value))}
          aria-label="Volume"
          style={{ '--fill': pct(muted ? 0 : volume, 1) } as CSSProperties}
        />
      </div>
    </footer>
  )
}
