import type { ReactNode } from 'react'
import { usePointerGlow } from '../hooks/usePointerGlow'
import {
  HeartFilledIcon,
  HeartIcon,
  MoreIcon,
  PlayIcon,
  RadioIcon,
  ShuffleIcon,
} from './icons'

export interface HeroBannerProps {
  badge?: string
  title: string
  subtitle?: ReactNode
  metadata?: ReactNode
  cover?: string
  onPlay?: () => void
  playLabel?: string
  playDisabled?: boolean
  onShuffle?: () => void
  onFavorite?: () => void
  isFavorite?: boolean
  onRadio?: () => void
  onMore?: (e: React.MouseEvent<HTMLButtonElement>) => void
  extraActions?: ReactNode
  className?: string
}

export function HeroBanner({
  badge,
  title,
  subtitle,
  metadata,
  cover,
  onPlay,
  playLabel = 'Play',
  playDisabled = false,
  onShuffle,
  onFavorite,
  isFavorite = false,
  onRadio,
  onMore,
  extraActions,
  className = '',
}: HeroBannerProps) {
  const btnGlowRef = usePointerGlow<HTMLButtonElement>()

  return (
    <div
      className={`grain relative mb-6 overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br from-[#00545f] via-[#06262b] to-[#021a1e] p-6 shadow-2xl sm:p-10 ${className}`}
    >
      {/* Blurred blown-up cover art backdrop on right */}
      {cover && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-2/3 overflow-hidden opacity-35 [mask-image:linear-gradient(to_left,black_25%,transparent_90%)]"
          aria-hidden="true"
        >
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover object-center filter blur-xl scale-125 transform"
          />
        </div>
      )}

      {/* Floating crisp cover thumbnail for mobile right-top corner / desktop subtle accent */}
      {cover && (
        <div className="pointer-events-none absolute right-4 top-4 sm:right-8 sm:top-8 z-10">
          <img
            src={cover}
            alt=""
            className="h-20 w-20 rounded-2xl object-cover shadow-2xl border border-white/20 sm:h-36 sm:w-36 md:h-44 md:w-44"
          />
        </div>
      )}

      {/* Content area */}
      <div className="relative z-10 flex max-w-2xl flex-col items-start justify-end pr-24 sm:pr-48">
        {badge && (
          <span className="glass mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">
            {badge}
          </span>
        )}

        <h1 className="font-display text-3xl font-black tracking-tight text-[#eef7d4] sm:text-5xl lg:text-6xl line-clamp-2">
          {title}
        </h1>

        {subtitle && (
          <div className="mt-2 text-sm font-medium text-[#9fbf9b] sm:text-base">
            {subtitle}
          </div>
        )}

        {metadata && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#9fbf9b]">
            {metadata}
          </div>
        )}

        {/* Action cluster */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {onPlay && (
            <button
              ref={btnGlowRef}
              type="button"
              onClick={onPlay}
              disabled={playDisabled}
              className="pointer-glow inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-on-accent shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <PlayIcon size={16} />
              <span>{playLabel}</span>
            </button>
          )}

          {onShuffle && (
            <button
              type="button"
              aria-label="Shuffle"
              title="Shuffle"
              onClick={onShuffle}
              disabled={playDisabled}
              className="glass flex h-10 w-10 items-center justify-center rounded-full text-ink shadow transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <ShuffleIcon size={16} />
            </button>
          )}

          {onFavorite && (
            <button
              type="button"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={onFavorite}
              className="glass flex h-10 w-10 items-center justify-center rounded-full text-ink shadow transition-transform hover:scale-105 active:scale-95"
            >
              {isFavorite ? (
                <HeartFilledIcon size={17} className="text-accent" />
              ) : (
                <HeartIcon size={17} />
              )}
            </button>
          )}

          {onRadio && (
            <button
              type="button"
              aria-label="Radio"
              title="Start radio"
              onClick={onRadio}
              className="glass flex h-10 w-10 items-center justify-center rounded-full text-ink shadow transition-transform hover:scale-105 active:scale-95"
            >
              <RadioIcon size={16} />
            </button>
          )}

          {onMore && (
            <button
              type="button"
              aria-label="More options"
              title="More options"
              onClick={onMore}
              className="glass flex h-10 w-10 items-center justify-center rounded-full text-ink shadow transition-transform hover:scale-105 active:scale-95"
            >
              <MoreIcon size={16} />
            </button>
          )}

          {extraActions}
        </div>
      </div>
    </div>
  )
}
