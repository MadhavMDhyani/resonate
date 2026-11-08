import { useState } from 'react'
import { saveClientId } from '../api/jamendo'
import { MusicIcon } from '../components/icons'

/**
 * Shown until a Jamendo client_id exists (env or localStorage).
 * The key is a public identifier — Jamendo expects it in client-side apps.
 */
export function SetupScreen({ onReady }: { onReady: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const id = value.trim()
    if (!id) {
      setError('Paste your client_id first.')
      return
    }
    saveClientId(id)
    onReady()
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-base p-6">
      <div className="glass anim-rise w-full max-w-md rounded-3xl p-8">
        <div className="mb-4 flex items-center gap-2">
          <MusicIcon size={26} className="text-accent" />
          <span className="text-xl font-extrabold tracking-tight text-ink">Resonate</span>
        </div>
        <h1 className="text-lg font-bold text-ink">One-time setup</h1>
        <p className="mt-2 text-sm leading-5 text-ink-dim">
          Resonate streams the free Creative Commons catalog of Jamendo. To use their API you need
          a free <span className="font-semibold text-ink">client_id</span> — takes about a minute,
          no payment, no email confirmation.
        </p>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-dim">
          <li>
            Open{' '}
            <a
              href="https://devportal.jamendo.com/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent-hover hover:underline"
            >
              devportal.jamendo.com
            </a>{' '}
            and create a free account.
          </li>
          <li>
            Go to <span className="font-semibold text-ink">Apps</span> → create an app (any name).
          </li>
          <li>Copy the client_id it shows you.</li>
        </ol>
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            placeholder="Paste client_id here"
            className="flex-1 rounded-full border border-hairline bg-panel-hi px-4 py-2 text-sm text-ink outline-none placeholder:text-ink-dim focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-on-accent transition-transform hover:scale-105"
          >
            Save
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <p className="mt-4 text-xs leading-4 text-ink-dim">
          Alternatively, put <code className="text-ink-dim">VITE_JAMENDO_CLIENT_ID=…</code> in a{' '}
          <code className="text-ink-dim">.env</code> file. The key is stored only in your browser.
        </p>
      </div>
    </div>
  )
}
