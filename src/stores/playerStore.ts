import { create } from 'zustand'
import { getAudio } from '../audio/audioSingleton'
import type { Track } from '../types'

export type RepeatMode = 'off' | 'all' | 'one'

interface PlayerState {
  queue: Track[]
  currentIndex: number
  /** playback order as queue indices; identity when shuffle is off */
  order: number[]
  orderPos: number
  /** bumped on every explicit (re)load so the engine re-fires even for the same track */
  playToken: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  /** "Playing from ..." label */
  context: string | null

  playQueue: (tracks: Track[], startIndex?: number, context?: string) => void
  playTrackNow: (track: Track, context?: string) => void
  addToQueue: (track: Track) => void
  playNextUp: (track: Track) => void
  jumpTo: (queueIndex: number) => void
  removeAt: (queueIndex: number) => void
  clearQueue: () => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (sec: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  handleEnded: () => void
}

function buildOrder(n: number, startIndex: number, shuffle: boolean): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  if (!shuffle) return idx
  const rest = idx.filter((i) => i !== startIndex)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [startIndex, ...rest]
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  order: [],
  orderPos: 0,
  playToken: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  context: null,

  playQueue: (tracks, startIndex = 0, context) => {
    if (!tracks.length) return
    const i = Math.min(Math.max(0, startIndex), tracks.length - 1)
    set((s) => {
      const order = buildOrder(tracks.length, i, s.shuffle)
      return {
        queue: [...tracks],
        currentIndex: i,
        order,
        // orderPos must point at the start track inside the built order —
        // with shuffle off the order is the identity, so this is not always 0.
        orderPos: Math.max(0, order.indexOf(i)),
        playToken: s.playToken + 1,
        isPlaying: true,
        currentTime: 0,
        duration: tracks[i].duration || 0,
        context: context ?? s.context,
      }
    })
  },

  playTrackNow: (track, context) => {
    get().playQueue([track], 0, context)
  },

  addToQueue: (track) => {
    const { queue } = get()
    if (!queue.length) {
      get().playQueue([track], 0)
      return
    }
    set((s) => ({
      queue: [...s.queue, track],
      order: [...s.order, s.order.length],
    }))
  },

  playNextUp: (track) => {
    const { queue, currentIndex, order } = get()
    if (!queue.length) {
      get().playQueue([track], 0)
      return
    }
    const insertAt = currentIndex + 1
    const q = [...queue.slice(0, insertAt), track, ...queue.slice(insertAt)]
    const posInOrder = order.indexOf(currentIndex)
    const o = order.map((ix) => (ix >= insertAt ? ix + 1 : ix))
    o.splice(posInOrder + 1, 0, insertAt)
    set({ queue: q, order: o, orderPos: posInOrder })
  },

  jumpTo: (queueIndex) => {
    const { order, queue } = get()
    const pos = order.indexOf(queueIndex)
    if (pos === -1 || !queue[queueIndex]) return
    set((s) => ({
      currentIndex: queueIndex,
      orderPos: pos,
      playToken: s.playToken + 1,
      isPlaying: true,
      currentTime: 0,
      duration: queue[queueIndex].duration || 0,
    }))
  },

  removeAt: (queueIndex) => {
    const { queue, currentIndex } = get()
    if (queueIndex < 0 || queueIndex >= queue.length) return
    const removingCurrent = queueIndex === currentIndex
    const q = queue.filter((_, i) => i !== queueIndex)
    if (!q.length) {
      get().clearQueue()
      return
    }
    let newCur = currentIndex
    if (queueIndex < currentIndex) newCur = currentIndex - 1
    else if (removingCurrent) newCur = Math.min(currentIndex, q.length - 1)
    // Rebuild the order on every removal — reshuffles the shuffled tail, fine for an MVP.
    set((s) => {
      const order = buildOrder(q.length, newCur, s.shuffle)
      return {
        queue: q,
        currentIndex: newCur,
        order,
        orderPos: Math.max(0, order.indexOf(newCur)),
        playToken: removingCurrent ? s.playToken + 1 : s.playToken,
      }
    })
  },

  clearQueue: () => {
    const a = getAudio()
    a.pause()
    a.removeAttribute('src')
    set({
      queue: [],
      currentIndex: 0,
      order: [],
      orderPos: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      context: null,
    })
  },

  togglePlay: () => {
    const { queue, isPlaying } = get()
    if (!queue.length) return
    const a = getAudio()
    if (isPlaying) {
      a.pause()
      set({ isPlaying: false })
    } else {
      if (!a.currentSrc) {
        // Nothing loaded yet — nudge the engine into loading the current track.
        set((s) => ({ playToken: s.playToken + 1, isPlaying: true }))
        return
      }
      void a
        .play()
        .then(() => set({ isPlaying: true }))
        .catch(() => set({ isPlaying: false }))
    }
  },

  next: () => {
    const { order, orderPos, queue, repeat } = get()
    if (!queue.length) return
    const advance = (pos: number) => {
      const idx = order[pos]
      set((s) => ({
        currentIndex: idx,
        orderPos: pos,
        playToken: s.playToken + 1,
        isPlaying: true,
        currentTime: 0,
        duration: queue[idx]?.duration || 0,
      }))
    }
    const nextPos = orderPos + 1
    if (nextPos < order.length) advance(nextPos)
    else if (repeat === 'all') advance(0)
    else {
      getAudio().pause()
      set({ isPlaying: false, currentTime: 0 })
    }
  },

  prev: () => {
    const { order, orderPos, queue } = get()
    if (!queue.length) return
    if (getAudio().currentTime > 3 || orderPos <= 0) {
      get().seek(0)
      return
    }
    const idx = order[orderPos - 1]
    set((s) => ({
      currentIndex: idx,
      orderPos: orderPos - 1,
      playToken: s.playToken + 1,
      isPlaying: true,
      currentTime: 0,
      duration: queue[idx]?.duration || 0,
    }))
  },

  seek: (sec) => {
    const a = getAudio()
    const target = Math.max(0, sec)
    if (Number.isFinite(a.duration) && a.duration > 0) {
      a.currentTime = Math.min(target, a.duration)
    }
    set({ currentTime: target })
  },

  setVolume: (v) => {
    const vol = Math.max(0, Math.min(1, v))
    getAudio().volume = vol
    if (vol > 0) getAudio().muted = false
    set({ volume: vol, muted: vol > 0 ? false : get().muted })
  },

  toggleMute: () => {
    set((s) => {
      const muted = !s.muted
      getAudio().muted = muted
      return { muted }
    })
  },

  toggleShuffle: () => {
    set((s) => {
      const shuffle = !s.shuffle
      const order = s.queue.length ? buildOrder(s.queue.length, s.currentIndex, shuffle) : []
      return {
        shuffle,
        order,
        orderPos: Math.max(0, order.indexOf(s.currentIndex)),
      }
    })
  },

  cycleRepeat: () => {
    set((s) => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    }))
  },

  handleEnded: () => {
    if (get().repeat === 'one') {
      const a = getAudio()
      a.currentTime = 0
      set({ currentTime: 0 })
      void a.play().catch(() => set({ isPlaying: false }))
    } else {
      get().next()
    }
  },
}))
