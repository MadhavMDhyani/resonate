import { useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { hasClientId } from './api/jamendo'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useApplyTheme } from './theme/themeStore'

import { Suspense, lazy } from 'react'
const BackgroundScene = lazy(() => import('./components/background/BackgroundScene'))

import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { usePlayer } from './stores/playerStore'
import { useUi } from './ui/uiStore'
import { Sidebar } from './components/Sidebar'
import { PlayerBar } from './components/PlayerBar'
import { BottomTabBar } from './components/BottomTabBar'
import { QueuePanel } from './components/QueuePanel'
import { NowPlaying } from './components/NowPlaying'
import { MainMenu } from './components/MainMenu'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { Toaster } from './components/Toaster'
import { NotFound } from './pages/NotFound'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { MenuIcon, WifiOffIcon } from './components/icons'
import { Home } from './pages/Home'
import { Search } from './pages/Search'
import { AlbumPage } from './pages/Album'
import { ArtistPage } from './pages/Artist'
import { JamendoPlaylistPage } from './pages/JamendoPlaylist'
import { Library } from './pages/Library'
import { UserPlaylistPage } from './pages/UserPlaylist'
import { LocalFiles } from './pages/LocalFiles'
import { SetupScreen } from './pages/SetupScreen'
import { TopBar } from './components/TopBar'

function NowPlayingAnnouncer() {
  const track = usePlayer((s) => s.queue[s.currentIndex])
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (track) {
      setAnnouncement(`Now playing: ${track.title} by ${track.artist}`)
    }
  }, [track?.id, track?.title, track?.artist])

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  )
}

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-center text-xs font-semibold text-amber-200 backdrop-blur-xs"
    >
      <WifiOffIcon size={14} className="shrink-0 text-amber-300" />
      <span>You are offline. Streaming catalog tracks is unavailable; local files will still play.</span>
    </div>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useGlobalShortcuts()

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-base p-2 md:p-4 overflow-hidden">
      <OfflineBanner />
      {/* Skip to main content link for keyboard & screen reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-2xl"
      >
        Skip to content
      </a>

      <div className="flex w-full max-w-7xl flex-col gap-2 md:flex-row md:gap-4 p-2 bg-panel rounded-2xl overflow-hidden">
        <Sidebar />
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto rounded-2xl bg-panel outline-none"
        >
          <TopBar />
          {/* Compact main-menu trigger — hidden on desktop */}
          <div className="sticky top-0 z-30 h-0 md:hidden">
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <QueuePanel />
      </div>
      <PlayerBar />
      <BottomTabBar />
      <NowPlaying />
      <MainMenu />
      <ShortcutsDialog />
      <Toaster />
      <NowPlayingAnnouncer />
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
  return (<>
    <Suspense fallback={null}>
      <BackgroundScene />
    </Suspense>
    <Shell />
  </>)
}
