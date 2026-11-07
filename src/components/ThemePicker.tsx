import { useEffect, useRef, useState } from 'react'
import { ACCENT_PRESETS } from '../theme/color'
import { useTheme, type ThemeMode } from '../theme/themeStore'
import { PaletteIcon } from './icons'

const MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
]

/** Theme controls without any chrome — shared by the sidebar popover and the fullscreen menu. */
export function ThemeControls() {
  const mode = useTheme((s) => s.mode)
  const accentId = useTheme((s) => s.accentId)

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-dim">Appearance</p>
      <div className="mb-4 flex rounded-full bg-panel-hi p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => useTheme.getState().setMode(m.id)}
            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors ${
              mode === m.id ? 'bg-elevated text-ink shadow' : 'text-ink-dim hover:text-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-dim">Theme colour</p>
      <div className="mb-3 flex flex-wrap gap-2.5">
        {ACCENT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-label={`${p.name} theme`}
            title={p.name}
            onClick={() => useTheme.getState().setAccentId(p.id)}
            style={{ background: p.hex }}
            className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
              accentId === p.id
                ? 'ring-2 ring-ink ring-offset-2 ring-offset-[var(--x-elevated)]'
                : ''
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => useTheme.getState().setAccentId('auto')}
        className={`w-full rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
          accentId === 'auto'
            ? 'border-accent bg-accent/15 text-ink'
            : 'border-hairline text-ink-dim hover:text-ink'
        }`}
      >
        Auto — theme follows the album art
      </button>
    </div>
  )
}

export function ThemePicker() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Theme settings"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink-dim transition-colors hover:text-ink"
        title="Theme settings"
      >
        <PaletteIcon size={18} /> Theme
      </button>

      {open && (
        <div className="glass anim-scale-in absolute bottom-11 left-0 z-40 w-72 rounded-2xl p-4">
          <ThemeControls />
        </div>
      )}
    </div>
  )
}
