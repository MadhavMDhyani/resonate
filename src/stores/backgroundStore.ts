import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BackgroundMode = 'off' | 'subtle' | 'full'

interface BackgroundState {
  mode: BackgroundMode
  setMode: (mode: BackgroundMode) => void
}

export const useBackground = create<BackgroundState>()(
  persist(
    (set) => ({
      mode: 'subtle',
      setMode: (mode) => set({ mode })
    }),
    { name: 'resonate-bg-settings' }
  )
)

