interface IconProps {
  size?: number
  className?: string
}

function Stroke({
  size = 20,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function Fill({ size = 20, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const PlayIcon = (p: IconProps) => (
  <Fill {...p}>
    <path d="M8 5.14v13.72L19 12 8 5.14z" />
  </Fill>
)

export const PauseIcon = (p: IconProps) => (
  <Fill {...p}>
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </Fill>
)

export const NextIcon = (p: IconProps) => (
  <Fill {...p}>
    <path d="M6 5l9 7-9 7V5zM17 5h2v14h-2z" />
  </Fill>
)

export const PrevIcon = (p: IconProps) => (
  <Fill {...p}>
    <path d="M18 5l-9 7 9 7V5zM5 5h2v14H5z" />
  </Fill>
)

export const ShuffleIcon = (p: IconProps) => (
  <Stroke {...p}>
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </Stroke>
)

export const RepeatIcon = (p: IconProps) => (
  <Stroke {...p}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Stroke>
)

export const RepeatOneIcon = (p: IconProps) => (
  <Stroke {...p}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    <line x1="12" y1="10" x2="12" y2="15" />
    <line x1="12" y1="7" x2="12.01" y2="7" strokeWidth="3" />
  </Stroke>
)

export const HeartIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Stroke>
)

export const HeartFilledIcon = (p: IconProps) => (
  <Fill {...p}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Fill>
)

export const DownloadIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Stroke>
)

export const QueueIcon = (p: IconProps) => (
  <Stroke {...p}>
    <line x1="3" y1="6" x2="14" y2="6" />
    <line x1="3" y1="12" x2="14" y2="12" />
    <line x1="3" y1="18" x2="10" y2="18" />
    <path d="M17 12l5 3.5-5 3.5z" fill="currentColor" stroke="none" />
  </Stroke>
)

export const VolumeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </Stroke>
)

export const VolumeMuteIcon = (p: IconProps) => (
  <Stroke {...p}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </Stroke>
)

export const SearchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Stroke>
)

export const HomeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Stroke>
)

export const MusicIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Stroke>
)

export const PaletteIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 22a10 10 0 1 1 10-10c0 3.5-2.5 5-5 5h-2a2 2 0 0 0-2 2c0 .8.4 1.3.4 2 0 1-.7 1-1.4 1z" />
    <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="11" cy="7" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
  </Stroke>
)

export const MenuIcon = (p: IconProps) => (
  <Stroke {...p}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </Stroke>
)

export const FolderIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </Stroke>
)

export const PlusIcon = (p: IconProps) => (
  <Stroke {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Stroke>
)

export const XIcon = (p: IconProps) => (
  <Stroke {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Stroke>
)

export const MoreIcon = (p: IconProps) => (
  <Fill {...p}>
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </Fill>
)

export const ChevronUpIcon = (p: IconProps) => (
  <Stroke {...p}>
    <polyline points="18 15 12 9 6 15" />
  </Stroke>
)

export const ChevronDownIcon = (p: IconProps) => (
  <Stroke {...p}>
    <polyline points="6 9 12 15 18 9" />
  </Stroke>
)

export const ArrowUpIcon = (p: IconProps) => (
  <Stroke {...p}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </Stroke>
)

export const ArrowDownIcon = (p: IconProps) => (
  <Stroke {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </Stroke>
)
