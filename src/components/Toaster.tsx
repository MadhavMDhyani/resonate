import { useToast } from '../stores/toastStore'

export function Toaster() {
  const toasts = useToast((s) => s.toasts)
  const removeToast = useToast((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-20"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="glass-strong anim-rise pointer-events-auto flex items-center gap-3 rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ink shadow-2xl sm:text-sm"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick()
                removeToast(toast.id)
              }}
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-on-accent transition-transform hover:scale-105 active:scale-95"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
