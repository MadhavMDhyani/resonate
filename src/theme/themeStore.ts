import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usePlayer } from '../stores/playerStore'
import { ACCENT_PRESETS, DEFAULT_SEED, extractSeedFromArt, paletteFromSeed } from './color'

export type ThemeMode = 'system' | 'dark' | 'light'

interface ThemeState {
  mode: ThemeMode
  /** preset id from ACCENT_PRESETS, or 'auto' (follow the album art) */
  accentId: string
  setMode: (mode: ThemeMode) => void
  setAccentId: (id: string) => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      accentId: 'lime',
      setMode: (mode) => set({ mode }),
      setAccentId: (accentId) => set({ accentId }),
    }),
    { name: 'resonate:theme' },
  ),
)

const DARK_META = '#021a1e'
const LIGHT_META = '#f5ffd9'

/**
 * Mount once at the app root: resolves the effective dark/light mode and the
 * Material You accent palette, then writes them to CSS variables on <html>.
 */
export function useApplyTheme(): void {
  const mode = useTheme((s) => s.mode)
  const accentId = useTheme((s) => s.accentId)
  const cover = usePlayer((s) => s.queue[s.currentIndex]?.cover)

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const dark = mode === 'dark' || (mode === 'system' && systemDark)

  // In 'auto' accent mode, derive a seed from the current album art.
  const [artSeed, setArtSeed] = useState<string | null>(null)
  useEffect(() => {
    if (accentId !== 'auto') return
    let cancelled = false
    if (!cover) {
      setArtSeed(null)
      return
    }
    const t = setTimeout(() => {
      void extractSeedFromArt(cover).then((hex) => {
        if (!cancelled) setArtSeed(hex)
      })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [cover, accentId])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    const preset = accentId === 'auto' ? undefined : ACCENT_PRESETS.find((p) => p.id === accentId)
    const seed = preset?.hex ?? artSeed ?? DEFAULT_SEED
    const colors = paletteFromSeed(seed, dark)
    root.style.setProperty('--x-accent', colors.accent)
    root.style.setProperty('--x-accent-hover', colors.hover)
    root.style.setProperty('--x-on-accent', colors.onAccent)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? DARK_META : LIGHT_META)
  }, [dark, accentId, artSeed])
}
