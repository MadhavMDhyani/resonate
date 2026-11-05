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
    <div className="flex h-full items-center justify-center bg-base p-6">
      <div className="w-full max-w-md rounded-xl bg-panel p-8 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <MusicIcon size={26} className="text-accent" />
          <span className="text-xl font-extrabold tracking-tight">Resonate</span>
        </div>
        <h1 className="text-lg font-bold">One-time setup</h1>
        <p className="mt-2 text-sm leading-5 text-neutral-400">
          Resonate streams the free Creative Commons catalog of Jamendo. To use their API you need
          a free <span className="font-semibold text-neutral-200">client_id</span> — takes about a
          minute, no payment, no email confirmation.
        </p>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-neutral-300">
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
            Go to <span className="font-semibold">Apps</span> → create an app (any name).
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
            className="flex-1 rounded-md border border-white/10 bg-elevated px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-black hover:bg-accent-hover"
          >
            Save
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <p className="mt-4 text-[11px] leading-4 text-neutral-500">
          Alternatively, put <code className="text-neutral-300">VITE_JAMENDO_CLIENT_ID=…</code> in
          a <code className="text-neutral-300">.env</code> file. The key is stored only in your
          browser.
        </p>
      </div>
    </div>
  )
}
