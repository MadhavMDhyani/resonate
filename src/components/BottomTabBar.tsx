import { NavLink } from 'react-router-dom'
import { FolderIcon, HomeIcon, MusicIcon, SearchIcon } from './icons'

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/search', label: 'Search', icon: SearchIcon },
  { to: '/library', label: 'Library', icon: MusicIcon },
  { to: '/local', label: 'Local', icon: FolderIcon },
]

export function BottomTabBar() {
  return (
    <nav
      aria-label="Bottom Navigation"
      className="glass z-30 flex h-14 shrink-0 items-center justify-around border-t border-hairline px-2 md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex min-w-[64px] flex-col items-center justify-center py-1 text-xs font-semibold transition-colors ${
              isActive ? 'text-accent font-bold' : 'text-ink-dim hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative flex h-6 items-center justify-center">
                <Icon size={20} className={isActive ? 'text-accent' : undefined} />
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-accent" />
                )}
              </div>
              <span className="mt-0.5 text-[11px] leading-tight">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

