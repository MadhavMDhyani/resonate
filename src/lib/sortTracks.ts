import type { Track } from '../types'
import type { SortKey, SortDir } from '../components/TrackTableHeader'

/**
 * Sort a track array by the given column key and direction.
 * 'index' sort means original order (asc) or reversed (desc).
 */
export function sortTracks(
  tracks: Track[],
  sortKey: SortKey,
  sortDir: SortDir,
): Track[] {
  if (sortKey === 'index') {
    return sortDir === 'asc' ? [...tracks] : [...tracks].reverse()
  }
  return [...tracks].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
    else if (sortKey === 'album') cmp = (a.album ?? '').localeCompare(b.album ?? '')
    else if (sortKey === 'license') cmp = (a.license ?? '').localeCompare(b.license ?? '')
    else if (sortKey === 'duration') cmp = (a.duration ?? 0) - (b.duration ?? 0)
    return sortDir === 'asc' ? cmp : -cmp
  })
}

/** Toggle sort state: same key flips direction, new key resets to asc */
export function nextSort(
  currentKey: SortKey,
  currentDir: SortDir,
  clicked: SortKey,
): { key: SortKey; dir: SortDir } {
  if (clicked === currentKey) {
    return { key: currentKey, dir: currentDir === 'asc' ? 'desc' : 'asc' }
  }
  return { key: clicked, dir: 'asc' }
}
