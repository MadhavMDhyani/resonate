import { useNavigate } from 'react-router-dom'
import { AlertCircleIcon, ArrowLeftIcon, MusicIcon, RefreshIcon } from './icons'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  } | React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-hairline bg-panel p-8 text-center sm:p-12 ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-panel-hi text-ink-dim">
        {icon ?? <MusicIcon size={24} />}
      </div>
      <h3 className="text-base font-bold text-ink sm:text-lg">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-xs text-ink-dim sm:text-sm">{description}</p>}
      {action && (
        <div className="mt-5 flex justify-center">
          {typeof action === 'object' && action !== null && 'label' in action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-sm transition-transform hover:scale-105 active:scale-95 sm:text-sm"
            >
              {action.label}
            </button>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  onBack?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  onBack,
  className = '',
}: ErrorStateProps) {
  const navigate = useNavigate()

  return (
    <div
      className={`rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center sm:p-12 ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400">
        <AlertCircleIcon size={26} />
      </div>
      <h3 className="text-base font-bold text-ink sm:text-lg">{title}</h3>
      {message && <p className="mx-auto mt-2 max-w-md text-xs text-ink-dim sm:text-sm">{message}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-sm transition-transform hover:scale-105 active:scale-95 sm:text-sm"
          >
            <RefreshIcon size={14} /> Try again
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (onBack) onBack()
            else navigate(-1)
          }}
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-4 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95 sm:text-sm"
        >
          <ArrowLeftIcon size={14} /> Go back
        </button>
      </div>
    </div>
  )
}

export function SkeletonRows({ n = 6 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-1.5">
          <div className="h-10 w-10 animate-pulse rounded-md bg-panel-hi" />
          <div className="flex-1">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-panel-hi" />
            <div className="mt-2 h-3 w-1/5 animate-pulse rounded bg-panel" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ n = 6 }: { n?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="w-40 shrink-0 rounded-xl bg-panel p-3">
          <div className="h-36 w-36 animate-pulse rounded-md bg-panel-hi" />
          <div className="mt-3 h-3.5 w-3/4 animate-pulse rounded bg-panel-hi" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton({
  type = 'mixed',
}: {
  type?: 'header' | 'rows' | 'cards' | 'mixed'
}) {
  return (
    <div className="anim-rise p-4 sm:p-6">
      {(type === 'header' || type === 'mixed') && (
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="h-36 w-36 animate-pulse rounded-2xl bg-panel-hi sm:h-44 sm:w-44" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded bg-panel-hi" />
            <div className="h-8 w-1/2 animate-pulse rounded-md bg-panel-hi" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-panel" />
            <div className="flex gap-2 pt-2">
              <div className="h-9 w-24 animate-pulse rounded-full bg-panel-hi" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-panel-hi" />
            </div>
          </div>
        </div>
      )}

      {(type === 'rows' || type === 'mixed') && (
        <div className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-panel-hi" />
          <SkeletonRows n={6} />
        </div>
      )}

      {type === 'cards' && (
        <div className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-panel-hi" />
          <SkeletonCards n={6} />
        </div>
      )}
    </div>
  )
}
