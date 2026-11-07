import { usePlayer } from '../stores/playerStore'
import { useUi } from '../ui/uiStore'
import { Cover } from './MediaCard'
import { PlayIcon, XIcon } from './icons'
import { fmtTime } from '../lib/format'

export function QueuePanel() {
  const open = useUi((s) => s.queueOpen)
  const queue = usePlayer((s) => s.queue)
  const order = usePlayer((s) => s.order)
  const orderPos = usePlayer((s) => s.orderPos)
  const currentIndex = usePlayer((s) => s.currentIndex)
  const context = usePlayer((s) => s.context)

  if (!open) return null

  const current = queue[currentIndex]
  const upcoming = order.slice(orderPos + 1).map((ix) => ({ ix, track: queue[ix] }))

  return (
    <aside className="glass sticky top-0 hidden h-full w-80 shrink-0 flex-col rounded-2xl p-3 lg:flex">
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-ink">Queue</h2>
          {context && <p className="text-xs text-ink-dim">{context}</p>}
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              type="button"
              onClick={() => usePlayer.getState().clearQueue()}
              className="text-xs text-ink-dim hover:text-ink"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            aria-label="Close queue"
            onClick={() => useUi.getState().setQueueOpen(false)}
            className="text-ink-dim hover:text-ink"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm text-ink-dim/70">
          Queue is empty. Play something!
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {current && (
            <>
              <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-dim/70">
                Now playing
              </p>
              <div className="anim-rise mb-3 flex items-center gap-2 rounded-md bg-panel-hi p-2">
                <Cover image={current.cover} title={current.title} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-accent-hover">{current.title}</p>
                  <p className="truncate text-xs text-ink-dim">{current.artist}</p>
                </div>
              </div>
            </>
          )}

          {upcoming.length > 0 && (
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-dim/70">
              Next up
            </p>
          )}
          <div className="flex flex-col">
            {upcoming.map(({ ix, track }) => (
              <div
                key={`${track.id}-${ix}`}
                className="group flex items-center gap-2 rounded-md p-1.5 hover:bg-panel-hi"
              >
                <button
                  type="button"
                  aria-label={`Play ${track.title}`}
                  onClick={() => usePlayer.getState().jumpTo(ix)}
                  className="relative shrink-0"
                >
                  <Cover image={track.cover} title={track.title} className="h-9 w-9" />
                  <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100">
                    <PlayIcon size={14} />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => usePlayer.getState().jumpTo(ix)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm text-ink">{track.title}</p>
                  <p className="truncate text-xs text-ink-dim">{track.artist}</p>
                </button>
                <span className="shrink-0 text-xs tabular-nums text-ink-dim/70">
                  {fmtTime(track.duration)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${track.title} from queue`}
                  onClick={() => usePlayer.getState().removeAt(ix)}
                  className="shrink-0 text-ink-dim/70 opacity-0 group-hover:opacity-100 hover:text-ink"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
