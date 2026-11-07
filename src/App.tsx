import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { hasClientId } from './api/jamendo'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useApplyTheme } from './theme/themeStore'
import { useUi } from './ui/uiStore'
import { Sidebar } from './components/Sidebar'
import { PlayerBar } from './components/PlayerBar'
import { QueuePanel } from './components/QueuePanel'
import { NowPlaying } from './components/NowPlaying'
import { MainMenu } from './components/MainMenu'
import { MenuIcon } from './components/icons'
import { Home } from './pages/Home'
import { Search } from './pages/Search'
import { AlbumPage } from './pages/Album'
import { ArtistPage } from './pages/Artist'
import { JamendoPlaylistPage } from './pages/JamendoPlaylist'
import { Library } from './pages/Library'
import { UserPlaylistPage } from './pages/UserPlaylist'
import { LocalFiles } from './pages/LocalFiles'
import { SetupScreen } from './pages/SetupScreen'

function Shell() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 gap-2 px-2 pt-2">
        <Sidebar />
        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto rounded-2xl bg-panel">
          {/* Compact main-menu trigger — pinned top-right while the page scrolls. */}
          <div className="sticky top-0 z-30 h-0">
            <button
              type="button"
              aria-label="Open main menu"
              title="Menu"
              onClick={() => useUi.getState().toggleMenu()}
              className="glass absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-ink transition-transform hover:scale-105"
            >
              <MenuIcon size={17} />
            </button>
          </div>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/album/:id" element={<AlbumPage />} />
            <Route path="/artist/:id" element={<ArtistPage />} />
            <Route path="/playlist/:id" element={<JamendoPlaylistPage />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/playlist/:id" element={<UserPlaylistPage />} />
            <Route path="/local" element={<LocalFiles />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <QueuePanel />
      </div>
      <PlayerBar />
      <NowPlaying />
      <MainMenu />
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(() => hasClientId())

  // Mount exactly once at the root: owns the <audio> element wiring and the
  // theme variables (dark/light + Material You accent).
  useAudioEngine()
  useApplyTheme()

  if (!ready) return <SetupScreen onReady={() => setReady(true)} />
  return <Shell />
}
