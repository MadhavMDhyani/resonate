import { create } from 'zustand'

interface UiState {
  queueOpen: boolean
  toggleQueue: () => void
  setQueueOpen: (open: boolean) => void
  nowPlayingOpen: boolean
  setNowPlayingOpen: (open: boolean) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  toggleMenu: () => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
  toggleShortcuts: () => void
}

export const useUi = create<UiState>((set) => ({
  queueOpen: false,
  toggleQueue: () => set((s) => ({ queueOpen: !s.queueOpen })),
  setQueueOpen: (open) => set({ queueOpen: open }),
  nowPlayingOpen: false,
  setNowPlayingOpen: (open) => set({ nowPlayingOpen: open }),
  menuOpen: false,
  setMenuOpen: (open) => set({ menuOpen: open }),
  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  shortcutsOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  toggleShortcuts: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
}))
