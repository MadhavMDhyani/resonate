import { Link } from 'react-router-dom'
import { HomeIcon, MusicIcon } from '../components/icons'

export function NotFound() {
  return (
    <div className="anim-rise flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="glass flex max-w-md flex-col items-center rounded-3xl p-8 shadow-2xl sm:p-10">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-panel-hi text-accent">
          <MusicIcon size={32} />
        </div>
        <span className="text-4xl font-black tracking-tight text-accent sm:text-5xl">404</span>
        <h1 className="mt-2 text-xl font-extrabold text-ink sm:text-2xl">Page not found</h1>
        <p className="mt-2 text-xs text-ink-dim sm:text-sm">
          We couldn't find the track, album, playlist, or page you were looking for.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-on-accent shadow-md transition-transform hover:scale-105 active:scale-95 sm:text-sm"
        >
          <HomeIcon size={16} /> Back to Home
        </Link>
      </div>
    </div>
  )
}

