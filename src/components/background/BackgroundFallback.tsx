import { useEffect, useRef } from 'react';
import { useBackground } from '../../stores/backgroundStore';

/**
 * Pure‑CSS fallback for devices that cannot run the WebGL background.
 * Renders a set of blurred gradient blobs that animate with CSS `animate-pulse`.
 * The component respects the background mode store (off | subtle | full).
 */
export default function BackgroundFallback() {
  const mode = useBackground((s) => s.mode);
  if (mode === 'off') return null;

  // Detect weak device once – the same logic as used in App.tsx.
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) < 4;
  if (!weak) return null; // fallback should only render on weak devices.

  // Keep a ref for possible future animation control (e.g., pause on hidden).
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        containerRef.current?.classList.add('opacity-0');
      } else {
        containerRef.current?.classList.remove('opacity-0');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Generate 7 blobs with alternating colors based on theme CSS variables.
  const blobs = Array.from({ length: 7 }).map((_, i) => {
    const size = i % 2 === 0 ? 'w-96 h-96' : 'w-72 h-72';
    const posClasses = i % 3 === 0 ? 'top-10 left-10' : i % 3 === 1 ? 'bottom-10 right-20' : 'top-1/2 left-1/3';
    const color = i % 2 === 0 ? 'from-teal-400 to-lime-200' : 'from-lime-200 to-teal-400';
    return (
      <div
        key={i}
        className={
          `absolute ${size} rounded-full bg-gradient-to-r ${color} opacity-30 blur-xl animate-pulse ${posClasses}`
        }
      />
    );
  });

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      {blobs}
    </div>
  );
}

