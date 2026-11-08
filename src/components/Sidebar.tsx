import { NavLink, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ThemePicker } from './ThemePicker'
import { FolderIcon, HomeIcon, MusicIcon, SearchIcon } from './icons'

const navItem =
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-ink-dim transition-colors hover:text-ink'
const navItemActive = 'text-ink bg-panel-hi'

export function Sidebar() {
  const playlists = useLiveQuery(
    () =>
      db.playlists.toArray().then((list) => list.sort((a, b) => b.createdAt - a.createdAt)),
    [],
  )

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-2 md:flex">
      <div className="glass flex flex-1 min-h-0 flex-col gap-2 rounded-2xl p-3">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <MusicIcon size={22} className="text-accent" />
          <span className="text-lg font-extrabold tracking-tight text-ink">Resonate</span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          <NavLink to="/" end className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}>
            <HomeIcon size={18} /> Home
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}>
            <SearchIcon size={18} /> Search
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}>
            <MusicIcon size={18} /> Your Library
          </NavLink>
          <NavLink to="/local" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}>
            <FolderIcon size={18} /> Local Files
          </NavLink>
        </nav>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-dim">
            Playlists
          </p>
          <div className="flex flex-col">
            {(playlists ?? []).map((pl) => (
              <Link
                key={pl.id}
                to={`/library/playlist/${pl.id}`}
                className="truncate rounded-md px-3 py-1.5 text-sm text-ink-dim hover:bg-panel-hi hover:text-ink"
              >
                {pl.name}
              </Link>
            ))}
            {playlists && playlists.length === 0 && (
              <p className="px-3 py-1.5 text-xs text-ink-dim">
                Create one from any track's ⋯ menu
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-hairline px-1 pt-1">
          <ThemePicker />
        </div>
        <p className="px-2 pb-1 text-xs leading-4 text-ink-dim">
          All catalog music is Creative Commons via Jamendo. Free to play, free to download.
        </p>
      </div>
    </aside>
  )
}
