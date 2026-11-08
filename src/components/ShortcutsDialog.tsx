import { useRef } from 'react'
import { useUi } from '../ui/uiStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { XIcon } from './icons'

const shortcutGroups = [
  {
    category: 'Playback',
    items: [
      { key: 'Space', desc: 'Play / Pause' },
      { key: '← / →', desc: 'Seek back / forward 5s' },
      { key: 'Shift + ← / →', desc: 'Previous / Next track' },
      { key: '↑ / ↓', desc: 'Volume up / down 5%' },
      { key: 'M', desc: 'Mute / Unmute' },
      { key: 'S', desc: 'Toggle shuffle' },
      { key: 'R', desc: 'Cycle repeat mode' },
    ],
  },
  {
    category: 'Navigation & Controls',
    items: [
      { key: 'L', desc: 'Favorite / unfavorite current track' },
      { key: 'Q', desc: 'Toggle queue sheet / panel' },
      { key: 'N', desc: 'Open Now Playing' },
      { key: '/', desc: 'Search (navigate & focus)' },
      { key: '?', desc: 'Keyboard shortcuts cheat-sheet' },
      { key: 'Esc', desc: 'Close dialogs, menus, and sheets' },
    ],
  },
]

export function ShortcutsDialog() {
  const open = useUi((s) => s.shortcutsOpen)
  const close = () => useUi.getState().setShortcutsOpen(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, dialogRef, close)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="anim-fade fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={close}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        ref={dialogRef}
        className="glass-strong anim-scale-in relative z-10 w-full max-w-lg rounded-3xl border border-hairline p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between border-b border-hairline pb-3">
          <h2 id="shortcuts-dialog-title" className="text-lg font-bold text-ink">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            aria-label="Close shortcuts dialog"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-dim hover:bg-panel-hi hover:text-ink transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="space-y-5 max-h-[70dvh] overflow-y-auto pr-1">
          {shortcutGroups.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg bg-panel px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <span className="text-ink">{item.desc}</span>
                    <kbd className="rounded border border-hairline bg-panel-hi px-2 py-0.5 font-mono text-xs font-semibold text-accent-hover shadow-xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-hairline pt-3 text-center">
          <p className="text-xs text-ink-dim">
            Press <kbd className="font-mono text-ink">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  )
}
