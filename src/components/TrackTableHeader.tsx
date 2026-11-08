import type { ReactNode } from 'react'

export type SortKey = 'index' | 'title' | 'album' | 'license' | 'duration'
export type SortDir = 'asc' | 'desc'

interface ColDef {
  key: SortKey
  label: string
  className: string
  sortable?: boolean
}

const COLS: ColDef[] = [
  { key: 'index', label: '#', className: 'w-8 text-center', sortable: false },
  { key: 'title', label: 'Name', className: 'flex-1 min-w-0', sortable: true },
  { key: 'album', label: 'Album', className: 'hidden w-1/4 min-w-0 md:block', sortable: true },
  { key: 'license', label: 'Licence', className: 'hidden w-20 text-center md:block', sortable: true },
  { key: 'duration', label: 'Time', className: 'hidden w-14 text-right tabular-nums md:block', sortable: true },
]

interface TrackTableHeaderProps {
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  /** extra space on the right for the action buttons column */
  actionsWidth?: string
}

function SortIcon({ dir }: { dir: SortDir }): ReactNode {
  return (
    <span className="ml-1 inline-block text-accent" aria-hidden="true">
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  )
}

export function TrackTableHeader({
  sortKey,
  sortDir,
  onSort,
  actionsWidth = 'w-20',
}: TrackTableHeaderProps) {
  return (
    // Hidden on mobile, flex grid on md+
    <div
      className="hidden md:flex items-center gap-2 border-b border-hairline px-3 pb-2 pt-1 label-micro select-none"
      role="row"
      aria-label="Track list column headers"
    >
      {/* cover thumbnail placeholder */}
      <div className="w-10 shrink-0" />

      {COLS.map((col) => {
        const active = sortKey === col.key
        return (
          <div key={col.key} className={col.className}>
            {col.sortable ? (
              <button
                type="button"
                onClick={() => onSort(col.key)}
                className={`inline-flex items-center gap-0.5 hover:text-ink transition-colors ${
                  active ? 'text-accent' : 'text-ink-dim'
                }`}
                aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {col.label}
                {active && <SortIcon dir={sortDir} />}
              </button>
            ) : (
              <span className="text-ink-dim">{col.label}</span>
            )}
          </div>
        )
      })}

      {/* space for heart + more buttons */}
      <div className={`${actionsWidth} shrink-0`} />
    </div>
  )
}
