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
  const radius = round ? 'rounded-full' : 'rounded-[14px]'
  if (image) {
    return (
      <img
        src={image}
        alt={title}
        loading="lazy"
        className={`${className ?? ''} ${radius} object-cover`}
      />
    )
  }
  const h = hueOf(title)
  return (
    <div
      className={`${className ?? ''} ${radius} flex items-center justify-center text-white/30`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 30% 28%), hsl(${(h + 40) % 360} 35% 14%))` }}
    >
      <MusicIcon size={24} />
    </div>
  )
}

export function MosaicCover({
  covers,
  title,
  className = 'w-12 h-12',
  round = false,
}: {
  covers?: (string | undefined)[]
  title: string
  className?: string
  round?: boolean
}) {
  const valid = covers?.filter((c): c is string => Boolean(c)) ?? []
  const radius = round ? 'rounded-full' : 'rounded-[14px]'

  if (valid.length >= 4) {
    return (
      <div
        className={`grid grid-cols-2 grid-rows-2 overflow-hidden shadow-md ${className} ${radius}`}
      >
        {valid.slice(0, 4).map((c, i) => (
          <img
            key={i}
            src={c}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ))}
      </div>
    )
  }

  if (valid.length > 0) {
    return <Cover image={valid[0]} title={title} className={className} round={round} />
  }

  return <Cover title={title} className={className} round={round} />
}

export function MediaCard({ title, altTitle, subtitle, image, to, onPlay, round }: MediaCardProps) {
  const alt = typeof title === 'string' ? title : altTitle ?? ''
  const body = (
    <div className="group/card relative w-36 sm:w-40 shrink-0 cursor-pointer transition-transform hover:-translate-y-1">
      <div className="relative mb-2.5 overflow-hidden rounded-[14px]">
        <Cover image={image} title={alt} className="w-full aspect-square shadow-md transition-transform duration-300 group-hover/card:scale-105" round={round} />
        {onPlay && (
          <button
            type="button"
            aria-label={`Play ${alt}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onPlay()
            }}
            className="touch-visible absolute right-2.5 bottom-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent opacity-0 shadow-xl transition-all translate-y-2 group-hover/card:translate-y-0 group-hover/card:opacity-100 focus:opacity-100 group-focus-within/card:opacity-100 hover:scale-110 active:scale-95"
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
    <Link to={to} className="block shrink-0 focus:outline-none">
      {body}
    </Link>
  ) : (
    body
  )
}
