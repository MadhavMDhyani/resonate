import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  countStaleHandles,
  importDirectory,
  importFiles,
  reconnectHandles,
  removeLocalTrack,
  supportsDirectoryImport,
} from '../local/localLibrary'
import { TrackRow } from '../components/TrackRow'
import { TrackTableHeader, type SortKey, type SortDir } from '../components/TrackTableHeader'
import { Section } from '../components/Section'
import { FolderIcon, PlayIcon, QueueIcon, ShuffleIcon, XIcon } from '../components/icons'
import { usePlayer } from '../stores/playerStore'
import { showToast } from '../stores/toastStore'
import { sortTracks, nextSort } from '../lib/sortTracks'

export function LocalFiles() {
  const tracks = useLiveQuery(() => db.localTracks.toArray(), [])
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [stale, setStale] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const dirImport = supportsDirectoryImport()

  const [sortKey, setSortKey] = useState<SortKey>('index')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    const next = nextSort(sortKey, sortDir, key)
    setSortKey(next.key)
    setSortDir(next.dir)
  }

  const list = (tracks ?? []).map((r) => r.track)
  const sortedList = useMemo(
    () => sortTracks(list, sortKey, sortDir),
    [list, sortKey, sortDir],
  )

  const refreshStale = () => {
    void countStaleHandles()
      .then(setStale)
      .catch(() => setStale(0))
  }
  useEffect(refreshStale, [tracks])

  const onImportFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setImporting(true)
    setMessage(null)
    try {
      const n = await importFiles(Array.from(files))
      setMessage(`Imported ${n} file${n === 1 ? '' : 's'} for this session.`)
    } catch {
      setMessage('Import failed.')
    } finally {
      setImporting(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const onImportFolder = async () => {
    setImporting(true)
    setMessage(null)
    try {
      const n = await importDirectory()
      setMessage(`Imported ${n} track${n === 1 ? '' : 's'} (available permanently).`)
      refreshStale()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setMessage('Folder import failed. Try the file picker instead.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="anim-rise p-6">
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-ink">Local Files</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-dim">
        Your own music, same player, same queue. Files never leave your device — they are read
        directly from disk by your browser.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {dirImport && (
          <button
            type="button"
            onClick={() => void onImportFolder()}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-on-accent transition-transform hover:scale-105 disabled:opacity-50"
          >
            <FolderIcon size={16} /> Import folder…
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent-hover hover:text-accent-hover disabled:opacity-50"
        >
          Pick files…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav"
          multiple
          className="hidden"
          onChange={(e) => void onImportFiles(e.target.files)}
        />
        {importing && <span className="text-sm text-ink-dim">Reading tags…</span>}
        {list.length > 0 && !importing && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={() =>
                list.length && usePlayer.getState().playQueue(list, 0, 'Local files')
              }
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              <PlayIcon size={13} /> Play all ({list.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (!list.length) return
                const rand = Math.floor(Math.random() * list.length)
                usePlayer.getState().playQueue(list, rand, 'Local files')
                if (!usePlayer.getState().shuffle) {
                  usePlayer.getState().toggleShuffle()
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              <ShuffleIcon size={13} /> Shuffle
            </button>
            <button
              type="button"
              onClick={() => {
                if (!list.length) return
                list.forEach((t) => usePlayer.getState().addToQueue(t))
                showToast(`Added ${list.length} local track${list.length === 1 ? '' : 's'} to queue`)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              <QueueIcon size={13} /> Add to queue
            </button>
          </div>
        )}
      </div>

      {stale > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="text-ink">
            {stale} local file{stale === 1 ? '' : 's'} need re-authorization from your browser.
          </p>
          <button
            type="button"
            onClick={() =>
              void reconnectHandles().then((n) => {
                refreshStale()
                setMessage(`Reconnected ${n} folder${n === 1 ? '' : 's'}.`)
              })
            }
            className="rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-amber-500/30"
          >
            Reconnect
          </button>
        </div>
      )}

      {message && (
        <p className="mb-4 rounded-lg bg-panel px-4 py-2 text-sm text-ink-dim">{message}</p>
      )}

      {!dirImport && (
        <p className="mb-4 rounded-lg bg-panel px-4 py-2 text-xs text-ink-dim">
          Tip: open Resonate in Chrome or Edge to import whole folders permanently. The file picker
          works everywhere, but files picked that way only last for this session.
        </p>
      )}

      <Section title={`Library (${list.length})`}>
        {tracks === null ? null : list.length === 0 ? (
          <p className="rounded-lg bg-panel p-6 text-sm text-ink-dim">
            No local files yet. Import a folder or pick some files to get started.
          </p>
        ) : (
          <div>
            <TrackTableHeader sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            {sortedList.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                tracks={sortedList}
                index={i}
                showAlbum
                context="Local files"
                extraActions={
                  <button
                    type="button"
                    aria-label={`Remove ${t.title} from library`}
                    onClick={() => void removeLocalTrack(t.id.slice(6))}
                    className="shrink-0 text-ink-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                  >
                    <XIcon size={14} />
                  </button>
                }
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
