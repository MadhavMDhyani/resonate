import { useEffect } from 'react'
import { getAudio } from '../audio/audioSingleton'
import { getLocalObjectUrl } from '../local/localLibrary'
import { usePlayer } from '../stores/playerStore'
import type { Track } from '../types'

function updateMediaSession(track: Track | null): void {
  if (!('mediaSession' in navigator)) return
  if (!track) {
    navigator.mediaSession.metadata = null
    return
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album || 'Resonate',
    artwork: track.cover ? [{ src: track.cover, sizes: '600x600', type: 'image/jpeg' }] : [],
  })
}

/**
 * Mount once at the app root. Wires the singleton audio element to the player
 * store and the OS media session.
 */
export function useAudioEngine(): void {
  const currentTrack = usePlayer((s) => s.queue[s.currentIndex])
  const playToken = usePlayer((s) => s.playToken)
  const volume = usePlayer((s) => s.volume)
  const muted = usePlayer((s) => s.muted)

  // One-time wiring: element events + media session handlers.
  useEffect(() => {
    const a = getAudio()
    const onTime = () => usePlayer.setState({ currentTime: a.currentTime })
    const onLoaded = () => usePlayer.setState({ duration: a.duration || 0 })
    const onEnded = () => usePlayer.getState().handleEnded()
    const onPlay = () => usePlayer.setState({ isPlaying: true })
    const onPause = () => usePlayer.setState({ isPlaying: false })
    const onError = () => usePlayer.setState({ isPlaying: false })

    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('ended', onEnded)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('error', onError)

    let ms: MediaSession | null = null
    if ('mediaSession' in navigator) {
      ms = navigator.mediaSession
      try {
        ms.setActionHandler('play', () => usePlayer.getState().togglePlay())
        ms.setActionHandler('pause', () => usePlayer.getState().togglePlay())
        ms.setActionHandler('previoustrack', () => usePlayer.getState().prev())
        ms.setActionHandler('nexttrack', () => usePlayer.getState().next())
      } catch {
        // Some handlers are unsupported on certain platforms — non-fatal.
      }
    }

    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('error', onError)
      if (ms) {
        for (const action of ['play', 'pause', 'previoustrack', 'nexttrack'] as const) {
          try {
            ms.setActionHandler(action, null)
          } catch {
            // ignore
          }
        }
      }
    }
  }, [])

  // Load the current track whenever it changes (or is force-reloaded via playToken).
  useEffect(() => {
    let cancelled = false
    const a = getAudio()
    if (!currentTrack) {
      a.removeAttribute('src')
      updateMediaSession(null)
      return
    }
    usePlayer.setState({ currentTime: 0, duration: currentTrack.duration || 0 })
    void (async () => {
      const src =
        currentTrack.source === 'jamendo'
          ? currentTrack.audioUrl
          : await getLocalObjectUrl(currentTrack)
      if (cancelled) return
      if (!src) {
        usePlayer.setState({ isPlaying: false })
        updateMediaSession(currentTrack)
        return
      }
      // Capture intent BEFORE load(): setting src on a playing element fires a
      // spurious `pause` event, which would otherwise clear isPlaying and skip
      // the follow-up play() — silently breaking auto-advance between tracks.
      const shouldPlay = usePlayer.getState().isPlaying
      a.src = src
      a.load()
      updateMediaSession(currentTrack)
      if (shouldPlay) {
        try {
          await a.play()
        } catch {
          usePlayer.setState({ isPlaying: false })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentTrack, playToken])

  // Volume / mute.
  useEffect(() => {
    const a = getAudio()
    a.volume = volume
    a.muted = muted
  }, [volume, muted])
}
