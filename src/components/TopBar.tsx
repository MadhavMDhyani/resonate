import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { SearchIcon, MenuIcon } from './icons'
import { useUi } from '../ui/uiStore'
import { ThemePicker } from './ThemePicker'

export function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const isSearchPage = location.pathname === '/search'
  const currentQuery = isSearchPage ? (params.get('q') ?? '') : ''
  const [searchVal, setSearchVal] = useState(currentQuery)

  useEffect(() => {
    if (isSearchPage) {
      setSearchVal(params.get('q') ?? '')
    }
  }, [isSearchPage, params])

  // Global '/' shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced search navigation when typing in the top bar
  useEffect(() => {
    if (!searchVal.trim()) return
    const t = setTimeout(() => {
      if (isSearchPage) {
        if (searchVal.trim() !== (params.get('q') ?? '')) {
          navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`, { replace: true })
        }
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchVal, isSearchPage, navigate, params])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`)
    } else {
      navigate('/search')
    }
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-hairline bg-panel/90 px-4 py-3 backdrop-blur-md sm:px-6">
      <form onSubmit={handleSubmit} className="relative flex-1 max-w-md">
        <SearchIcon
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim"
        />
        <input
          ref={inputRef}
          type="search"
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value)
            if (!isSearchPage && e.target.value.trim().length >= 2) {
              navigate(`/search?q=${encodeURIComponent(e.target.value.trim())}`)
            }
          }}
          placeholder="What do you want to listen to? (Press /)"
          className="h-10 w-full rounded-full border border-hairline bg-panel-hi pl-10 pr-4 text-xs font-medium text-ink placeholder:text-ink-dim outline-none transition-colors focus:border-accent"
        />
      </form>

      <div className="flex items-center gap-2">
        <ThemePicker />
        <button
          type="button"
          aria-label="Open main menu"
          onClick={() => useUi.getState().toggleMenu()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-panel-hi text-ink transition-transform hover:scale-105 active:scale-95"
          title="Menu"
        >
          <MenuIcon size={16} />
        </button>
      </div>
    </header>
  )
}
