import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../stores/playerStore'
import { useUi } from '../ui/uiStore'
import { toggleFavorite } from '../lib/libraryActions'
import { showToast } from '../stores/toastStore'

export function useGlobalShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Ignore keystrokes when typing in inputs, textareas, or contenteditables
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]')
      ) {
        return
      }

      // Ignore when Ctrl/Alt/Meta is held (allow browser & OS shortcuts)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return
      }

      const player = usePlayer.getState()
      const ui = useUi.getState()
      const currentTrack = player.queue[player.currentIndex]

      // Space: play/pause
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        player.togglePlay()
        return
      }

      // Shift + ArrowLeft: previous track
      if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault()
        player.prev()
        return
      }

      // Shift + ArrowRight: next track
      if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault()
        player.next()
        return
      }

      // ArrowLeft: seek -5s
      if (e.key === 'ArrowLeft' && !e.shiftKey) {
        e.preventDefault()
        player.seek(Math.max(0, player.currentTime - 5))
        return
      }

      // ArrowRight: seek +5s
      if (e.key === 'ArrowRight' && !e.shiftKey) {
        e.preventDefault()
        player.seek(player.currentTime + 5)
        return
      }

      // ArrowUp: volume +5%
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        player.setVolume(Math.min(1, Number((player.volume + 0.05).toFixed(2))))
        return
      }

      // ArrowDown: volume -5%
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        player.setVolume(Math.max(0, Number((player.volume - 0.05).toFixed(2))))
        return
      }

      // M: toggle mute
      if ((e.key === 'm' || e.key === 'M') && !e.shiftKey) {
        e.preventDefault()
        player.toggleMute()
        return
      }

      // S: toggle shuffle
      if ((e.key === 's' || e.key === 'S') && !e.shiftKey) {
        e.preventDefault()
        player.toggleShuffle()
        showToast(player.shuffle ? 'Shuffle off' : 'Shuffle on')
        return
      }

      // R: cycle repeat
      if ((e.key === 'r' || e.key === 'R') && !e.shiftKey) {
        e.preventDefault()
        player.cycleRepeat()
        return
      }

      // L: like/favorite current track
      if ((e.key === 'l' || e.key === 'L') && !e.shiftKey) {
        e.preventDefault()
        if (currentTrack) {
          void toggleFavorite(currentTrack).then((added) => {
            showToast(added ? 'Added to favorites' : 'Removed from favorites', {
              label: 'Undo',
              onClick: () => void toggleFavorite(currentTrack),
            })
          })
        }
        return
      }

      // Q: toggle queue
      if ((e.key === 'q' || e.key === 'Q') && !e.shiftKey) {
        e.preventDefault()
        ui.toggleQueue()
        return
      }

      // N: open Now Playing
      if ((e.key === 'n' || e.key === 'N') && !e.shiftKey) {
        e.preventDefault()
        ui.setNowPlayingOpen(true)
        return
      }

      // /: focus search (navigate to /search if needed)
      if (e.key === '/' && !e.shiftKey) {
        e.preventDefault()
        navigate('/search')
        // Give route change a microtick to mount search input if navigating
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[type="search"], input[name="search"], input[placeholder*="Search"]',
          )
          searchInput?.focus()
          searchInput?.select()
        }, 50)
        return
      }

      // ?: open shortcuts cheat-sheet dialog
      if (e.key === '?') {
        e.preventDefault()
        ui.setShortcutsOpen(true)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])
}
