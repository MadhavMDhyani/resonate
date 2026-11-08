import { useRef, useState } from 'react'
import { usePlayer } from '../stores/playerStore'
import { useUi } from '../ui/uiStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { Cover } from './MediaCard'
import { ArrowDownIcon, ArrowUpIcon, PlayIcon, XIcon } from './icons'
import { fmtTime } from '../lib/format'

function QueueContent({ onClose }: { onClose: () => void }) {
  const queue = usePlayer((s) => s.queue)
  const order = usePlayer((s) => s.order)
  const orderPos = usePlayer((s) => s.orderPos)
  const currentIndex = usePlayer((s) => s.currentIndex)
  const context = usePlayer((s) => s.context)

  const [draggedIx, setDraggedIx] = useState<number | null>(null)
  const [dragOverIx, setDragOverIx] = useState<number | null>(null)

  const current = queue[currentIndex]
  const upcoming = order.slice(orderPos + 1).map((ix) => ({ ix, track: queue[ix] }))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-ink">Queue</h2>
          {context && <p className="text-xs text-ink-dim">{context}</p>}
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              type="button"
              onClick={() => usePlayer.getState().clearQueue()}
              className="rounded px-2 py-1 text-xs text-ink-dim hover:bg-panel-hi hover:text-ink"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            aria-label="Close queue"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-dim hover:bg-panel-hi hover:text-ink"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm text-ink-dim">
          Queue is empty. Play something!
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {current && (
            <>
              <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-dim">
                Now playing
              </p>
              <div className="anim-rise mb-3 flex items-center gap-2.5 rounded-lg bg-panel-hi p-2">
                <Cover image={current.cover} title={current.title} className="h-10 w-10 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-accent-hover">{current.title}</p>
                  <p className="truncate text-xs text-ink-dim">{current.artist}</p>
                </div>
              </div>
            </>
          )}

          {upcoming.length > 0 && (
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Next up ({upcoming.length})
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {upcoming.map(({ ix, track }, i) => (
              <div
                key={`${track.id}-${ix}`}
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.effectAllowed = 'move'
                  ev.dataTransfer.setData('text/plain', String(ix))
                  setDraggedIx(ix)
                }}
                onDragOver={(ev) => {
                  ev.preventDefault()
                  ev.dataTransfer.dropEffect = 'move'
                  if (dragOverIx !== ix) setDragOverIx(ix)
                }}
                onDragEnd={() => {
                  setDraggedIx(null)
                  setDragOverIx(null)
                }}
                onDrop={(ev) => {
                  ev.preventDefault()
                  const fromIx = draggedIx ?? Number(ev.dataTransfer.getData('text/plain'))
                  const toIx = ix
                  setDraggedIx(null)
                  setDragOverIx(null)
                  if (fromIx !== toIx && !isNaN(fromIx)) {
                    usePlayer.getState().moveInQueue(fromIx, toIx)
                  }
                }}
                className={`group flex min-h-[44px] items-center gap-2 rounded-lg p-1.5 transition-all hover:bg-panel-hi ${
                  draggedIx === ix ? 'opacity-35' : ''
                } ${dragOverIx === ix ? 'border-t-2 border-accent' : ''}`}
              >
                <button
                  type="button"
                  aria-label={`Play ${track.title}`}
                  onClick={() => usePlayer.getState().jumpTo(ix)}
                  className="relative shrink-0"
                >
                  <Cover image={track.cover} title={track.title} className="h-9 w-9 rounded-md" />
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
                <span className="shrink-0 text-xs tabular-nums text-ink-dim">
                  {fmtTime(track.duration)}
                </span>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    aria-label="Move up in queue"
                    disabled={i === 0}
                    onClick={() => {
                      const prevIx = upcoming[i - 1].ix
                      usePlayer.getState().moveInQueue(ix, prevIx)
                    }}
                    className="touch-visible flex h-6 w-6 items-center justify-center text-ink-dim hover:text-ink disabled:opacity-20 opacity-0 group-hover:opacity-100"
                  >
                    <ArrowUpIcon size={11} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down in queue"
                    disabled={i === upcoming.length - 1}
                    onClick={() => {
                      const nextIx = upcoming[i + 1].ix
                      usePlayer.getState().moveInQueue(ix, nextIx)
                    }}
                    className="touch-visible flex h-6 w-6 items-center justify-center text-ink-dim hover:text-ink disabled:opacity-20 opacity-0 group-hover:opacity-100"
                  >
                    <ArrowDownIcon size={11} />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${track.title} from queue`}
                  onClick={() => usePlayer.getState().removeAt(ix)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-dim hover:bg-panel hover:text-ink lg:opacity-0 lg:group-hover:opacity-100"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function QueuePanel() {
  const open = useUi((s) => s.queueOpen)
  const nowPlayingOpen = useUi((s) => s.nowPlayingOpen)
  const sheetRef = useRef<HTMLDivElement>(null)
  const close = () => useUi.getState().setQueueOpen(false)

  useFocusTrap(open, sheetRef, close)

  if (!open) return null

  return (
    <>
      {/* Desktop aside panel (lg+ only when Now Playing is not covering the screen) */}
      {!nowPlayingOpen && (
        <aside className="glass sticky top-0 hidden h-full w-80 shrink-0 flex-col rounded-2xl p-3 lg:flex">
          <QueueContent onClose={close} />
        </aside>
      )}

      {/* Bottom sheet: rendered on <lg when browsing, and at ALL widths when Now Playing is open */}
      <div className={nowPlayingOpen ? '' : 'lg:hidden'}>
        {/* Backdrop */}
        <div
          className="anim-fade fixed inset-0 z-[54] bg-black/60 backdrop-blur-xs"
          onClick={close}
          aria-hidden="true"
        />

        {/* Bottom sheet */}
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label="Current queue"
          className="anim-rise glass-strong fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-h-[82dvh] max-w-2xl flex-col rounded-t-3xl border-t border-hairline p-4 shadow-2xl"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {/* Drag handle */}
          <div
            className="mx-auto mb-2.5 h-1.5 w-12 shrink-0 cursor-grab rounded-full bg-ink-dim/40 active:cursor-grabbing"
            onTouchStart={(e) => {
              const startY = e.touches[0].clientY
              const onMove = (me: TouchEvent) => {
                if (me.touches[0].clientY - startY > 60) {
                  close()
                  window.removeEventListener('touchmove', onMove)
                }
              }
              const onEnd = () => {
                window.removeEventListener('touchmove', onMove)
                window.removeEventListener('touchend', onEnd)
              }
              window.addEventListener('touchmove', onMove)
              window.addEventListener('touchend', onEnd)
            }}
          />
          <QueueContent onClose={close} />
        </div>
      </div>
    </>
  )
}
