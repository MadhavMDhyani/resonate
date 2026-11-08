import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { createPlaylist, deletePlaylist } from '../lib/libraryActions'
import { TrackRow } from '../components/TrackRow'
import { TrackTableHeader, type SortKey, type SortDir } from '../components/TrackTableHeader'
import { MosaicCover } from '../components/MediaCard'
import {
  FolderIcon,
  HeartFilledIcon,
  PlayIcon,
  PlusIcon,
  QueueIcon,
  SearchIcon,
  ShuffleIcon,
  XIcon,
} from '../components/icons'
import { usePlayer } from '../stores/playerStore'
import { showToast } from '../stores/toastStore'
import { sortTracks, nextSort } from '../lib/sortTracks'
import type { UserPlaylist } from '../types'

type LibraryTab = 'playlists' | 'favorites' | 'local'
type FavSort = 'recent' | 'title' | 'artist'

export function Library() {
  const [params, setParams] = useSearchParams()
  const activeTab = (params.get('tab') ?? 'playlists') as LibraryTab

  const [playlistName, setPlaylistName] = useState('')
  const [playlistToDelete, setPlaylistToDelete] = useState<UserPlaylist | null>(null)

  const [favSearch, setFavSearch] = useState('')
  const [favSort, setFavSort] = useState<FavSort>('recent')

  // Sort state for the favorites track table
  const [favTableSortKey, setFavTableSortKey] = useState<SortKey>('index')
  const [favTableSortDir, setFavTableSortDir] = useState<SortDir>('asc')

  const handleFavSort = (key: SortKey) => {
    const next = nextSort(favTableSortKey, favTableSortDir, key)
    setFavTableSortKey(next.key)
    setFavTableSortDir(next.dir)
  }

  // Sort state for the local files track table
  const [localSortKey, setLocalSortKey] = useState<SortKey>('index')
  const [localSortDir, setLocalSortDir] = useState<SortDir>('asc')

  const handleLocalSort = (key: SortKey) => {
    const next = nextSort(localSortKey, localSortDir, key)
    setLocalSortKey(next.key)
    setLocalSortDir(next.dir)
  }

  const favorites = useLiveQuery(() => db.favorites.toArray(), [])
  const localTracks = useLiveQuery(() => db.localTracks.toArray(), [])

  // Efficient playlist query: loads playlists with native IndexedDB count & top 4 covers
  const playlistsWithMeta = useLiveQuery(
    async () => {
      const list = await db.playlists.toArray()
      const sorted = list.sort((a, b) => b.createdAt - a.createdAt)
      return Promise.all(
        sorted.map(async (pl) => {
          const count = await db.playlistTracks.where('playlistId').equals(pl.id).count()
          const top4 = await db.playlistTracks.where('playlistId').equals(pl.id).limit(4).toArray()
          const covers = top4.map((e) => e.track.cover).filter(Boolean) as string[]
          return {
            ...pl,
            count,
            covers,
          }
        }),
      )
    },
    [],
  )

  const favList = useMemo(() => {
    if (!favorites) return []
    let list = [...favorites]

    if (favSearch.trim()) {
      const needle = favSearch.trim().toLowerCase()
      list = list.filter((f) => {
        const t = f.track
        return (
          t.title.toLowerCase().includes(needle) ||
          t.artist.toLowerCase().includes(needle) ||
          (t.album?.toLowerCase().includes(needle) ?? false)
        )
      })
    }

    if (favSort === 'recent') {
      list.sort((a, b) => b.addedAt - a.addedAt)
    } else if (favSort === 'title') {
      list.sort((a, b) => a.track.title.localeCompare(b.track.title))
    } else if (favSort === 'artist') {
      list.sort((a, b) => a.track.artist.localeCompare(b.track.artist))
    }

    return list
  }, [favorites, favSearch, favSort])

  const favTracks = useMemo(() => favList.map((f) => f.track), [favList])
  const localList = useMemo(() => (localTracks ?? []).map((r) => r.track), [localTracks])

  const sortedFavTracks = useMemo(
    () => sortTracks(favTracks, favTableSortKey, favTableSortDir),
    [favTracks, favTableSortKey, favTableSortDir],
  )
  const sortedLocalList = useMemo(
    () => sortTracks(localList, localSortKey, localSortDir),
    [localList, localSortKey, localSortDir],
  )

  const setTab = (t: LibraryTab) => {
    setParams({ tab: t })
  }

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistName.trim()) return
    await createPlaylist(playlistName.trim())
    showToast(`Created playlist "${playlistName.trim()}"`)
    setPlaylistName('')
  }

  const handleConfirmDelete = async () => {
    if (!playlistToDelete) return
    const target = playlistToDelete
    setPlaylistToDelete(null)
    await deletePlaylist(target.id)
    showToast(`Deleted playlist "${target.name}"`)
  }

  const handlePlayFavorites = () => {
    if (!favTracks.length) return
    usePlayer.getState().playQueue(favTracks, 0, 'Favorites')
  }

  const handleShuffleFavorites = () => {
    if (!favTracks.length) return
    const rand = Math.floor(Math.random() * favTracks.length)
    usePlayer.getState().playQueue(favTracks, rand, 'Favorites')
    if (!usePlayer.getState().shuffle) {
      usePlayer.getState().toggleShuffle()
    }
  }

  const handleAddFavoritesToQueue = () => {
    if (!favTracks.length) return
    favTracks.forEach((t) => usePlayer.getState().addToQueue(t))
    showToast(`Added ${favTracks.length} track${favTracks.length === 1 ? '' : 's'} to queue`)
  }

  return (
    <div className="anim-rise p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Your Library
        </h1>
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-panel p-1">
          <button
            type="button"
            onClick={() => setTab('playlists')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'playlists'
                ? 'bg-accent text-on-accent shadow-sm'
                : 'text-ink-dim hover:text-ink'
            }`}
          >
            Playlists
          </button>
          <button
            type="button"
            onClick={() => setTab('favorites')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'favorites'
                ? 'bg-accent text-on-accent shadow-sm'
                : 'text-ink-dim hover:text-ink'
            }`}
          >
            Favorites {favorites ? `(${favorites.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setTab('local')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'local'
                ? 'bg-accent text-on-accent shadow-sm'
                : 'text-ink-dim hover:text-ink'
            }`}
          >
            Local {localTracks ? `(${localTracks.length})` : ''}
          </button>
        </div>
      </div>

      {/* Playlists Tab */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          <form onSubmit={handleCreatePlaylist} className="flex max-w-md items-center gap-2">
            <input
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="New playlist name…"
              className="flex-1 rounded-full border border-hairline bg-panel-hi px-4 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-dim focus:border-accent"
            />
            <button
              type="submit"
              disabled={!playlistName.trim()}
              aria-label="Create playlist"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <PlusIcon size={14} /> Create
            </button>
          </form>

          {(playlistsWithMeta ?? []).length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">No playlists yet</p>
              <p className="mt-1.5 text-sm text-ink-dim">
                Create one above or use the ⋯ menu on any track to start a playlist.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(playlistsWithMeta ?? []).map((pl) => (
                <div
                  key={pl.id}
                  className="anim-lift group relative flex flex-col rounded-2xl bg-panel p-3.5 transition-colors hover:bg-panel-hi"
                >
                  <Link to={`/library/playlist/${pl.id}`} className="block flex-1">
                    <MosaicCover
                      covers={pl.covers}
                      title={pl.name}
                      className="mb-3 aspect-square w-full rounded-xl"
                    />
                    <p className="truncate text-sm font-bold text-ink">{pl.name}</p>
                    <p className="mt-0.5 text-xs text-ink-dim">
                      {pl.count} track{pl.count === 1 ? '' : 's'}
                    </p>
                  </Link>

                  {/* Touch-visible safe delete button */}
                  <button
                    type="button"
                    aria-label={`Delete playlist ${pl.name}`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setPlaylistToDelete(pl)
                    }}
                    className="touch-visible absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-panel-hi/90 text-ink-dim opacity-0 shadow-md transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
                  >
                    <XIcon size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-panel p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Playback action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePlayFavorites}
                disabled={!favTracks.length}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
              >
                <PlayIcon size={14} /> Play favorites
              </button>
              <button
                type="button"
                onClick={handleShuffleFavorites}
                disabled={!favTracks.length}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
              >
                <ShuffleIcon size={14} /> Shuffle play
              </button>
              <button
                type="button"
                onClick={handleAddFavoritesToQueue}
                disabled={!favTracks.length}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
              >
                <QueueIcon size={14} /> Add all to queue
              </button>
            </div>

            {/* In-library filter & sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48 sm:flex-none">
                <SearchIcon
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim"
                />
                <input
                  value={favSearch}
                  onChange={(e) => setFavSearch(e.target.value)}
                  placeholder="Filter favorites…"
                  className="w-full rounded-full border border-hairline bg-panel-hi py-1.5 pl-8 pr-3 text-xs text-ink outline-none placeholder:text-ink-dim focus:border-accent"
                />
              </div>

              <select
                value={favSort}
                onChange={(e) => setFavSort(e.target.value as FavSort)}
                className="rounded-full border border-hairline bg-panel-hi px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
                aria-label="Sort favorites"
              >
                <option value="recent">Recently added</option>
                <option value="title">Title (A-Z)</option>
                <option value="artist">Artist</option>
              </select>
            </div>
          </div>

          {/* Favorites Track List */}
          {!favorites ? null : favorites.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">No favorite tracks yet</p>
              <p className="mt-1.5 text-sm text-ink-dim">
                Tap the ♥ on any track to collect your favorite music here.
              </p>
            </div>
          ) : favTracks.length === 0 ? (
            <p className="rounded-lg bg-panel p-6 text-center text-sm text-ink-dim">
              No favorites match &ldquo;{favSearch}&rdquo;.
            </p>
          ) : (
            <div>
              <TrackTableHeader sortKey={favTableSortKey} sortDir={favTableSortDir} onSort={handleFavSort} />
              {sortedFavTracks.map((t, i) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  tracks={sortedFavTracks}
                  index={i}
                  showAlbum
                  highlight={favSearch}
                  context="Favorites"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Local Tab */}
      {activeTab === 'local' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-panel p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  localList.length && usePlayer.getState().playQueue(localList, 0, 'Local files')
                }
                disabled={!localList.length}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
              >
                <PlayIcon size={14} /> Play all ({localList.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!localList.length) return
                  const rand = Math.floor(Math.random() * localList.length)
                  usePlayer.getState().playQueue(localList, rand, 'Local files')
                  if (!usePlayer.getState().shuffle) {
                    usePlayer.getState().toggleShuffle()
                  }
                }}
                disabled={!localList.length}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
              >
                <ShuffleIcon size={14} /> Shuffle play
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!localList.length) return
                  localList.forEach((t) => usePlayer.getState().addToQueue(t))
                  showToast(`Added ${localList.length} local tracks to queue`)
                }}
                disabled={!localList.length}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-panel-hi px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:text-sm"
              >
                <QueueIcon size={14} /> Add all to queue
              </button>
            </div>

            <Link
              to="/local"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <FolderIcon size={14} /> Manage local files & folders &rarr;
            </Link>
          </div>

          {localList.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-panel p-10 text-center">
              <p className="text-base font-semibold text-ink">No local files added</p>
              <p className="mt-1.5 text-sm text-ink-dim">
                Import folders or pick audio files to play your own collection.
              </p>
              <Link
                to="/local"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-sm"
              >
                <FolderIcon size={14} /> Open Local Files
              </Link>
            </div>
          ) : (
            <div>
              <TrackTableHeader sortKey={localSortKey} sortDir={localSortDir} onSort={handleLocalSort} />
              {sortedLocalList.map((t, i) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  tracks={sortedLocalList}
                  index={i}
                  showAlbum
                  context="Local files"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete playlist confirmation modal */}
      {playlistToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="glass max-w-sm rounded-2xl p-6 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-ink">
              Delete &ldquo;{playlistToDelete.name}&rdquo;?
            </h3>
            <p className="mt-2 text-xs text-ink-dim">
              This playlist and its track list will be removed from your library.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPlaylistToDelete(null)}
                className="rounded-full border border-hairline bg-panel-hi px-4 py-2 text-xs font-semibold text-ink hover:bg-panel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 flex items-center gap-2 text-xs text-ink-dim">
        <HeartFilledIcon size={12} className="text-accent" />
        Favorites and playlists live in your browser (IndexedDB) — nothing leaves your device.
      </p>
    </div>
  )
}
