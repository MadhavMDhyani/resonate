import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useUi } from '../ui/uiStore'
import { ThemeControls } from './ThemePicker'
import { MusicIcon, XIcon } from './icons'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/search', label: 'Search', end: false },
  { to: '/library', label: 'Your Library', end: false },
  { to: '/local', label: 'Local Files', end: false },
]

/**
 * Fullscreen main menu: a compact popup covering the app with large navigation,
 * playlists and theme controls. Doubles as the mobile navigation (the sidebar
 * is hidden below md).
 */
export function MainMenu() {
  const open = useUi((s) => s.menuOpen)
  const playlists = useLiveQuery(
    () => db.playlists.toArray().then((list) => list.sort((a, b) => b.createdAt - a.createdAt).slice(0, 6)),
    [],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useUi.getState().setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="anim-fade fixed inset-0 z-[60]" role="dialog" aria-label="Main menu">
      <div className="absolute inset-0 bg-base/80 backdrop-blur-2xl" />

      <button
        type="button"
        aria-label="Close menu"
        onClick={() => useUi.getState().setMenuOpen(false)}
        className="glass absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full text-ink transition-transform hover:scale-105"
      >
        <XIcon size={18} />
      </button>

      <div className="relative z-10 flex h-full flex-col items-center gap-7 overflow-y-auto px-6 py-10">
        <div className="anim-rise flex items-center gap-2">
          <MusicIcon size={26} className="text-accent" />
          <span className="text-xl font-extrabold tracking-tight text-ink">Resonate</span>
        </div>

        <nav className="flex flex-col items-center gap-1.5">
          {NAV.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => useUi.getState().setMenuOpen(false)}
              className={({ isActive }) =>
                `anim-rise rounded-xl px-6 py-1.5 text-3xl font-extrabold tracking-tight transition-colors md:text-4xl ${
                  isActive ? 'text-accent' : 'text-ink hover:text-accent-hover'
                }`
              }
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {(playlists ?? []).length > 0 && (
          <div className="anim-rise flex max-w-lg flex-wrap justify-center gap-2" style={{ animationDelay: '380ms' }}>
            {(playlists ?? []).map((pl) => (
              <NavLink
                key={pl.id}
                to={`/library/playlist/${pl.id}`}
                onClick={() => useUi.getState().setMenuOpen(false)}
                className="rounded-full border border-hairline bg-panel px-4 py-1.5 text-sm font-semibold text-ink-dim transition-colors hover:border-accent-hover hover:text-accent-hover"
              >
                {pl.name}
              </NavLink>
            ))}
          </div>
        )}

        <div className="anim-rise glass w-full max-w-xs rounded-2xl p-4" style={{ animationDelay: '440ms' }}>
          <ThemeControls />
        </div>
      </div>
    </div>
  )
}
