import { useState } from 'react'
import { saveClientId } from '../api/jamendo'
import { MusicIcon, SpinnerIcon } from '../components/icons'

const DEMO_KEY = 'b6747d04'

/**
 * Shown until a Jamendo client_id exists (env or localStorage).
 * The key is a public identifier — Jamendo expects it in client-side apps.
 */
export function SetupScreen({ onReady }: { onReady: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const validateAndSave = async (idToSave: string) => {
    const id = idToSave.trim()
    if (!id) {
      setError('Please paste or enter your client_id first.')
      return
    }

    if (!/^[a-zA-Z0-9_-]{6,32}$/.test(id)) {
      setError('Invalid format: Jamendo client IDs are typically 8 alphanumeric characters.')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      // Validate key against Jamendo probe endpoint
      const res = await fetch(
        `https://api.jamendo.com/v3.0/tracks/?client_id=${id}&format=json&limit=1`,
      )
      const data = (await res.json()) as { headers?: { status?: string; error_message?: string } }
      if (data.headers?.status === 'failed') {
        throw new Error(data.headers.error_message || 'Invalid client_id')
      }
      saveClientId(id)
      onReady()
    } catch (err) {
      // If network fails (e.g. offline during setup), allow saving if format looks valid
      if (err instanceof TypeError && err.message.includes('fetch')) {
        saveClientId(id)
        onReady()
      } else {
        setError(
          err instanceof Error
            ? `Key verification failed: ${err.message}`
            : 'Could not verify client_id with Jamendo.',
        )
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleUseDemo = () => {
    setValue(DEMO_KEY)
    void validateAndSave(DEMO_KEY)
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-base p-6">
      <div className="glass anim-rise w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <MusicIcon size={26} className="text-accent" />
          <span className="text-xl font-extrabold tracking-tight text-ink">Resonate</span>
        </div>
        <h1 className="text-lg font-bold text-ink">Welcome to Resonate</h1>
        <p className="mt-2 text-sm leading-5 text-ink-dim">
          Resonate streams Creative Commons music directly from Jamendo. Jamendo requires a free{' '}
          <span className="font-semibold text-ink">client_id</span> to access their catalog API. It
          takes one minute, with no payment or credit card required.
        </p>

        <div className="mt-4 rounded-xl border border-hairline bg-panel p-3.5">
          <p className="text-xs font-semibold text-ink">Want to start listening right now?</p>
          <p className="mt-1 text-xs text-ink-dim">
            You can use the built-in demo key (works instantly, read-only rate limits).
          </p>
          <button
            type="button"
            onClick={handleUseDemo}
            disabled={verifying}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-panel-hi px-4 py-2 text-xs font-bold text-accent transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {verifying ? <SpinnerIcon size={14} /> : null}
            Use instant demo key &rarr;
          </button>
        </div>

        <div className="mt-4 border-t border-hairline pt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-dim">
            Or use your own API key:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-ink-dim">
            <li>
              Open{' '}
              <a
                href="https://devportal.jamendo.com/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent hover:underline"
              >
                devportal.jamendo.com
              </a>{' '}
              and sign up for free.
            </li>
            <li>
              Under <span className="font-semibold text-ink">Apps</span>, create an app (any name).
            </li>
            <li>Copy and paste the 8-character client_id below.</li>
          </ol>
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void validateAndSave(value)
          }}
        >
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            placeholder="e.g. b6747d04"
            disabled={verifying}
            className="flex-1 rounded-full border border-hairline bg-panel-hi px-4 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-dim focus:border-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={verifying}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-bold text-on-accent shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {verifying && <SpinnerIcon size={14} />} Save
          </button>
        </form>

        {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}

        <p className="mt-4 text-xs leading-4 text-ink-dim">
          Alternatively, define <code className="text-ink">VITE_JAMENDO_CLIENT_ID=…</code> in{' '}
          <code className="text-ink">.env</code>. The key is stored purely on your local device.
        </p>
      </div>
    </div>
  )
}
