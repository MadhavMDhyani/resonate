import { create } from 'zustand'

interface UiState {
  queueOpen: boolean
  toggleQueue: () => void
  setQueueOpen: (open: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  queueOpen: false,
  toggleQueue: () => set((s) => ({ queueOpen: !s.queueOpen })),
  setQueueOpen: (open) => set({ queueOpen: open }),
}))
