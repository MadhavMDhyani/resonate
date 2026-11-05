let el: HTMLAudioElement | null = null

/** Single global <audio>-equivalent element driving all playback. */
export function getAudio(): HTMLAudioElement {
  if (!el) {
    el = new Audio()
    el.preload = 'auto'
    el.volume = 0.8
  }
  return el
}
