import { create } from 'zustand'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  message: string
  action?: ToastAction
}

interface ToastState {
  toasts: ToastItem[]
  showToast: (message: string, action?: ToastAction) => void
  removeToast: (id: string) => void
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, action) => {
    const id = Math.random().toString(36).slice(2, 9)
    set((s) => ({
      toasts: [...s.toasts.slice(-2), { id, message, action }],
    }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2500)
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function showToast(message: string, action?: ToastAction) {
  useToast.getState().showToast(message, action)
}

