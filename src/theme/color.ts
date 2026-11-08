import { argbFromHex, hexFromArgb, TonalPalette } from '@material/material-color-utilities'

export interface AccentColors {
  accent: string
  hover: string
  onAccent: string
  seedHex: string
}

export const DEFAULT_SEED = '#1a73e8'

/** Google-style preset seeds (Material You palette row). */
export const ACCENT_PRESETS = [
  { id: 'blue', name: 'Blue', hex: '#1a73e8' },
  { id: 'green', name: 'Green', hex: '#188038' },
  { id: 'amber', name: 'Amber', hex: '#f9ab00' },
  { id: 'red', name: 'Red', hex: '#ea4335' },
  { id: 'purple', name: 'Purple', hex: '#a142f4' },
  { id: 'teal', name: 'Teal', hex: '#12b5cb' },
  { id: 'orange', name: 'Orange', hex: '#fa7b17' },
  { id: 'pink', name: 'Pink', hex: '#f5426e' },
] as const

function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const toLinear = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return lum > 0.35 ? '#0b0b10' : '#ffffff'
}

/**
 * Google's Material You tonal palette: the same algorithm Android 12+ uses to
 * theme an entire UI from a single source color. Tone 80 = pastel accent on
 * dark surfaces, tone 40 = saturated accent on light surfaces.
 * Contrast check ensures onAccent meets WCAG AA (>= 4.5:1) for any seed.
 */
export function paletteFromSeed(seedHex: string, dark: boolean): AccentColors {
  const p = TonalPalette.fromInt(argbFromHex(seedHex))
  const accent = p.tone(dark ? 80 : 40)
  const hover = p.tone(dark ? 88 : 30)
  const accentHex = hexFromArgb(accent)
  const onAccentHex = getContrastColor(accentHex)
  return {
    accent: accentHex,
    hover: hexFromArgb(hover),
    onAccent: onAccentHex,
    seedHex,
  }
}

// ---------------------------------------------------------------------------
// Dominant-color extraction from album artwork
// ---------------------------------------------------------------------------

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Nudge a dull average color into a usable vivid seed. */
function boostSaturation(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, v } = rgbToHsv(r, g, b)
  const s2 = Math.max(s, 0.45)
  const v2 = Math.min(0.9, Math.max(0.35, v))
  // HSV → RGB
  const c = v2 * s2
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let rr = 0
  let gg = 0
  let bb = 0
  if (hp < 1) [rr, gg, bb] = [c, x, 0]
  else if (hp < 2) [rr, gg, bb] = [x, c, 0]
  else if (hp < 3) [rr, gg, bb] = [0, c, x]
  else if (hp < 4) [rr, gg, bb] = [0, x, c]
  else if (hp < 5) [rr, gg, bb] = [x, 0, c]
  else [rr, gg, bb] = [c, 0, x]
  const m = v2 - c
  return rgbToHex((rr + m) * 255, (gg + m) * 255, (bb + m) * 255)
}

const extractionCache = new Map<string, string | null>()

/**
 * Extract a vivid seed color from artwork via canvas. Resolves null when the
 * image fails to load, the canvas is tainted (no CORS), or the art is
 * effectively grayscale — callers fall back to the default seed.
 */
export function extractSeedFromArt(url: string): Promise<string | null> {
  const cached = extractionCache.get(url)
  if (cached !== undefined) return Promise.resolve(cached)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const done = (hex: string | null) => {
      clearTimeout(timer)
      extractionCache.set(url, hex)
      resolve(hex)
    }
    const timer = setTimeout(() => done(null), 6000)
    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return done(null)
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        // Score 12 hue buckets by saturated-pixel weight, then average each.
        const buckets = Array.from({ length: 12 }, () => ({ score: 0, r: 0, g: 0, b: 0 }))
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const { h, s, v } = rgbToHsv(r, g, b)
          if (s < 0.15 || v < 0.12) continue // skip near-gray / near-black
          const weight = s * (0.4 + 0.6 * v)
          const bucket = buckets[Math.floor(h / 30) % 12]
          bucket.score += weight
          bucket.r += r * weight
          bucket.g += g * weight
          bucket.b += b * weight
        }
        let best = -1
        let bestScore = 0
        buckets.forEach((bk, i) => {
          if (bk.score > bestScore) {
            bestScore = bk.score
            best = i
          }
        })
        if (best < 0 || bestScore < 4) return done(null) // grayscale artwork
        const bk = buckets[best]
        done(boostSaturation(rgbToHex(bk.r / bk.score, bk.g / bk.score, bk.b / bk.score)))
      } catch {
        done(null) // tainted canvas or unreadable image
      }
    }
    img.onerror = () => done(null)
    img.src = url
  })
}
