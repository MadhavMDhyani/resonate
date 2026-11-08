import { NavLink, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ThemePicker } from './ThemePicker'
import { FolderIcon, HomeIcon, MusicIcon, SearchIcon } from './icons'
import { MosaicCover } from './MediaCard'

const navItem =
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-ink-dim transition-colors hover:text-ink hover:bg-panel-hi'
const navItemActive = 'bg-accent text-on-accent'

export function Sidebar() {
  const playlists = useLiveQuery(
    async () => {
      const list = await db.playlists.toArray()
      const sorted = list.sort((a, b) => b.createdAt - a.createdAt)
      return Promise.all(
        sorted.map(async (pl) => {
          const top4 = await db.playlistTracks.where('playlistId').equals(pl.id).limit(4).toArray()
          const covers = top4.map((e) => e.track.cover).filter(Boolean) as string[]
          return {
            ...pl,
            covers,
          }
        }),
      )
    },
    [],
  )

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-2 md:flex">
      <div className="surface flex flex-1 min-h-0 flex-col gap-2 rounded-2xl p-3">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <MusicIcon size={22} className="text-accent" />
          <span className="text-lg font-extrabold tracking-tight text-ink">Resonate</span>
        </Link>

        {/* Main section */}
        <p className="label-micro px-3 pt-2">MAIN</p>
        <nav className="flex flex-col gap-0.5">
          <NavLink to="/" end className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}>
            <HomeIcon size={18} /> Home
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}>
            <SearchIcon size={18} /> Search
          </NavLink>
        </nav>

        {/* Library section */}
        <p className="label-micro px-3 pt-4">LIBRARY</p>
        <nav className="flex flex-col gap-0.5">
          <NavLink to="/library" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}>
            <MusicIcon size={18} /> Your Library
          </NavLink>
          <NavLink to="/local" className={({ isActive }) => `${navItem} ${isActive ? navItemActive : ''}`}>
            <FolderIcon size={18} /> Local Files
          </NavLink>
        </nav>

        {/* Playlists section */}
        <p className="label-micro px-3 pt-4">PLAYLISTS</p>
        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {(playlists ?? []).map((pl) => (
            <Link
              key={pl.id}
              to={`/library/playlist/${pl.id}`}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-ink-dim hover:bg-panel-hi hover:text-ink transition-colors"
            >
              <MosaicCover covers={pl.covers} title={pl.name} className="h-6 w-6 shrink-0 rounded" />
              <span className="truncate">{pl.name}</span>
            </Link>
          ))}
          {playlists && playlists.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-ink-dim">Create one from any track’s ⋯ menu</p>
          )}
        </div>

        <div className="border-t border-hairline px-1 pt-1 mt-auto">
          <ThemePicker />
        </div>
        <p className="px-2 pb-1 text-xs leading-4 text-ink-dim">
          Free and Creative Commons. <a href="https://www.jamendo.com" className="underline" target="_blank" rel="noreferrer">Browse Jamendo</a>
        </p>
      </div>
    </aside>
  )
}
