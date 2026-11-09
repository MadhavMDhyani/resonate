import { useEffect, useRef } from 'react'

/**
 * Attaches a pointermove listener that writes --mx and --my CSS custom properties
 * to the target element (in px relative to the element).
 * Disabled on touch screens (coarse pointer) and when prefers-reduced-motion is active.
 */
export function usePointerGlow<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Guard: ignore touch devices and reduced motion
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hasFinePointer || reducedMotion) return

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      el.style.setProperty('--mx', `${x}px`)
      el.style.setProperty('--my', `${y}px`)
    }

    el.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      el.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  return ref
}
