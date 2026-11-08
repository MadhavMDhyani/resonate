import { Link } from 'react-router-dom'
import { PlayIcon, MusicIcon } from './icons'

interface MediaCardProps {
  title: React.ReactNode
  altTitle?: string
  subtitle?: React.ReactNode
  image?: string
  to?: string
  onPlay?: () => void
  round?: boolean
}

/** Deterministic hue from title so placeholder covers look varied but stable. */
export function hueOf(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}

export function Cover({
  image,
  title,
  className,
  round,
}: {
  image?: string
  title: string
  className?: string
  round?: boolean
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={title}
        loading="lazy"
        className={`${className ?? ''} ${round ? 'rounded-full' : 'rounded-md'} object-cover`}
      />
    )
  }
  const h = hueOf(title)
  return (
    <div
      className={`${className ?? ''} ${round ? 'rounded-full' : 'rounded-md'} flex items-center justify-center text-white/30`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 30% 28%), hsl(${(h + 40) % 360} 35% 14%))` }}
    >
      <MusicIcon size={24} />
    </div>
  )
}

export function MediaCard({ title, altTitle, subtitle, image, to, onPlay, round }: MediaCardProps) {
  const alt = typeof title === 'string' ? title : altTitle ?? ''
  const body = (
    <div className="anim-lift group/card relative w-40 shrink-0 rounded-xl bg-panel p-3 transition-colors hover:bg-panel-hi cursor-pointer">
      <div className="relative mb-3">
        <Cover image={image} title={alt} className="w-36 h-36 shadow-lg" round={round} />
        {onPlay && (
          <button
            type="button"
            aria-label={`Play ${alt}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onPlay()
            }}
            className="touch-visible absolute right-2 bottom-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent opacity-0 shadow-xl transition-all translate-y-1 group-hover/card:translate-y-0 group-hover/card:opacity-100 hover:scale-105"
          >
            <PlayIcon size={18} />
          </button>
        )}
      </div>
      <p className="truncate text-sm font-semibold text-ink">{title}</p>
      {subtitle && <p className="mt-0.5 truncate text-xs text-ink-dim">{subtitle}</p>}
    </div>
  )
  return to ? (
    <Link to={to} className="block shrink-0">
      {body}
    </Link>
  ) : (
    body
  )
}
