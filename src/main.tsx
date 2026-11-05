import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { usePlayer } from './stores/playerStore'
import { useUi } from './ui/uiStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Dev/test hook: lets the E2E harness drive playback directly.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__player = usePlayer
  ;(window as unknown as Record<string, unknown>).__ui = useUi
}
