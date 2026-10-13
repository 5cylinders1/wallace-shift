import type { MaterialId } from './materials'

/** Local, deterministic material surfaces; no image generation or network calls. */
const cache = new Map<string, HTMLCanvasElement>()
export const tileUnits: Record<MaterialId, { widthPx: number; widthFeet: number }> = {
  slate: { widthPx: 72, widthFeet: 1 },
  'standing-seam': { widthPx: 64, widthFeet: 1.33 },
  cedar: { widthPx: 56, widthFeet: 0.8 },
  clay: { widthPx: 68, widthFeet: 1.25 },
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function shade(hex: string, amount: number) {
  return `rgb(${rgb(hex).map(channel => Math.round(amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount)).join(',')})`
}

const noise = (i: number, j: number) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s) }

function grain(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, seed: number) {
  for (let k = 0; k < width * height / 12; k++) {
    const light = noise(k, seed + 8) > 0.5
    ctx.fillStyle = light ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.04)'
    ctx.fillRect(x + noise(k, seed) * width, y + noise(k, seed + 4) * height, 1.2, 1.2)
  }
}

export function makeTile(material: MaterialId, hex: string) {
  const key = `${material}:${hex}`
  if (cache.has(key)) return cache.get(key)!
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  if (material === 'standing-seam') {
    const w = 64, cols = 10
    canvas.width = w * cols; canvas.height = 256
    for (let i = 0; i < cols; i++) {
      const x = i * w, variation = (noise(i, 2) - 0.5) * 0.05
      const gradient = ctx.createLinearGradient(x, 0, x + w, 0)
      gradient.addColorStop(0, shade(hex, -0.17)); gradient.addColorStop(0.08, shade(hex, 0.02)); gradient.addColorStop(0.55, shade(hex, variation)); gradient.addColorStop(1, shade(hex, -0.1))
      ctx.fillStyle = gradient; ctx.fillRect(x, 0, w, canvas.height)
      ctx.fillStyle = shade(hex, -0.4); ctx.fillRect(x, 0, 2.5, canvas.height)
      ctx.fillStyle = shade(hex, 0.18); ctx.fillRect(x + 2.5, 0, 1.5, canvas.height)
      grain(ctx, x + 5, 0, w - 5, canvas.height, i)
    }
  } else if (material === 'slate') {
    const w = 72, h = 44, cols = 8, rows = 10
    canvas.width = w * cols; canvas.height = h * rows
    ctx.fillStyle = shade(hex, -0.56); ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
      const x = i * w + (j % 2 ? w / 2 : 0), y = j * h, n = noise(i + cols, j)
      ctx.fillStyle = shade(hex, (n - 0.5) * 0.3); ctx.fillRect(x + 1, y, w - 2, h - 1.5)
      const gradient = ctx.createLinearGradient(x, y, x + w, y + h)
      gradient.addColorStop(0, 'rgba(255,255,255,.09)'); gradient.addColorStop(0.45, 'rgba(255,255,255,0)'); gradient.addColorStop(1, 'rgba(0,0,0,.1)')
      ctx.fillStyle = gradient; ctx.fillRect(x + 1, y, w - 2, h - 1.5)
      ctx.fillStyle = shade(hex, -0.38); ctx.fillRect(x + 1, y + h - 3, w - 2, 2)
      ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 0.7
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + noise(k, i + j) * w, y + 1); ctx.lineTo(x + noise(k, i + j + 3) * w, y + h - 3); ctx.stroke() }
      grain(ctx, x + 1, y, w - 2, h - 3, i + j * 8)
    }
  } else if (material === 'cedar') {
    const period = 560, h = 48, rows = 10
    canvas.width = period; canvas.height = h * rows
    ctx.fillStyle = shade(hex, -0.5); ctx.fillRect(0, 0, period, canvas.height)
    for (let j = 0; j < rows; j++) {
      const widths: number[] = []; let total = 0, k = 0
      while (period - total > 82) { const w = 42 + Math.round(noise(k, j * 3) * 32); widths.push(w); total += w; k++ }
      widths.push(period - total)
      let x = 0
      widths.forEach((w, i) => {
        const y = j * h, n = noise(i + 11, j)
        ctx.fillStyle = shade(hex, (n - 0.5) * 0.28); ctx.fillRect(x + 1, y, w - 2, h - 2)
        for (let g = 3; g < w - 2; g += 3) {
          ctx.strokeStyle = `rgba(55,42,24,${0.04 + noise(g, j) * 0.13})`; ctx.lineWidth = 0.6
          ctx.beginPath(); ctx.moveTo(x + g, y); ctx.lineTo(x + g + (n - 0.5) * 3, y + h - 3); ctx.stroke()
        }
        ctx.fillStyle = shade(hex, -0.34); ctx.fillRect(x + 1, y + h - 3, w - 2, 2)
        ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x + 1, y + h - 4, w - 2, 1)
        x += w
      })
    }
  } else {
    const w = 68, h = 56, cols = 8, rows = 10
    canvas.width = w * cols; canvas.height = h * rows
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * w, y = j * h, n = noise(i, j)
      ctx.fillStyle = shade(hex, -0.26); ctx.fillRect(x, y, w, h)
      const gradient = ctx.createLinearGradient(x, 0, x + w, 0)
      gradient.addColorStop(0, shade(hex, -0.27)); gradient.addColorStop(0.22, shade(hex, 0.04 + n * 0.05)); gradient.addColorStop(0.5, shade(hex, (n - 0.5) * 0.1)); gradient.addColorStop(0.8, shade(hex, -0.1)); gradient.addColorStop(1, shade(hex, -0.32))
      ctx.fillStyle = gradient; ctx.fillRect(x + 4, y, w - 8, h - 2)
      ctx.fillStyle = shade(hex, -0.37); ctx.fillRect(x, y + h - 3, w, 3)
      ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.fillRect(x + 7, y, w - 14, 1)
      grain(ctx, x + 4, y + 1, w - 8, h - 4, i + j * cols)
    }
  }
  cache.set(key, canvas)
  return canvas
}

/** Material units use real-plane dimensions; projection provides foreshortening. */
export function planeTexture(material: MaterialId, hex: string, eaveFeet: number, slopeFeet: number, scale: number) {
  const tile = makeTile(material, hex), unit = tileUnits[material]
  const canvas = document.createElement('canvas')
  canvas.width = 1200; canvas.height = Math.max(160, Math.min(2400, Math.round(1200 * slopeFeet / Math.max(1, eaveFeet))))
  const ctx = canvas.getContext('2d')!
  const pattern = ctx.createPattern(tile, 'repeat')
  if (pattern) {
    const k = canvas.width / Math.max(1, eaveFeet) * unit.widthFeet / unit.widthPx * scale
    pattern.setTransform(new DOMMatrix().translate(0, canvas.height).scale(k, k))
    ctx.fillStyle = pattern; ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  return canvas
}
