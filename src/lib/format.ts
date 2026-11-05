export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function downloadFilename(track: { artist: string; title: string }): string {
  return `${track.artist} - ${track.title}.mp3`.replace(/[\\/:*?"<>|]/g, '_')
}
