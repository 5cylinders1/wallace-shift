import type { MaterialId } from './content'

/**
 * Procedural, seamless material tiles for the visualizer. Each tile is drawn
 * once per material and color, then repeated by the canvas pattern API.
 * Tiles are deliberately simple so the composite reads as a material
 * suggestion rather than a photoreal render.
 */

const cache = new Map<string, HTMLCanvasElement>()

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Shade a color: amount in -1..1, negative darkens. */
function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
  // Keep the result reusable as input when clay tiles shade a varied base.
  return `#${[r, g, b].map(c => mix(c).toString(16).padStart(2, '0')).join('')}`
}

/** Deterministic jitter per cell so the tile never changes between renders. */
function noise(i: number, j: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function makeTile(material: MaterialId, hex: string): HTMLCanvasElement {
  const key = `${material}:${hex}`
  const cached = cache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  const draw = painters[material]
  draw(canvas, hex)
  cache.set(key, canvas)
  return canvas
}

type Painter = (canvas: HTMLCanvasElement, hex: string) => void

const painters: Record<MaterialId, Painter> = {
  'standing-seam': (canvas, hex) => {
    const panel = 28, panels = 6
    canvas.width = panel * panels
    canvas.height = 168
    const ctx = canvas.getContext('2d')!
    for (let i = 0; i < panels; i++) {
      const x = i * panel
      const grad = ctx.createLinearGradient(x, 0, x + panel, 0)
      grad.addColorStop(0, shade(hex, -0.22))
      grad.addColorStop(0.18, shade(hex, 0.04))
      grad.addColorStop(0.6, hex)
      grad.addColorStop(1, shade(hex, -0.1))
      ctx.fillStyle = grad
      ctx.fillRect(x, 0, panel, canvas.height)
      ctx.fillStyle = shade(hex, -0.45)
      ctx.fillRect(x, 0, 2, canvas.height)
      ctx.fillStyle = shade(hex, 0.14)
      ctx.fillRect(x + 2, 0, 1, canvas.height)
    }
  },

  slate: (canvas, hex) => {
    const w = 36, h = 22, cols = 4, rows = 8
    canvas.width = w * cols
    canvas.height = h * rows
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = shade(hex, -0.6)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? w / 2 : 0
      for (let i = -1; i <= cols; i++) {
        const x = i * w + offset, y = j * h
        const n = noise(i + cols, j)
        ctx.fillStyle = shade(hex, (n - 0.5) * 0.3)
        ctx.fillRect(x + 1, y + 1, w - 2, h - 1)
        ctx.fillStyle = shade(hex, -0.35)
        ctx.fillRect(x + 1, y + h - 2, w - 2, 1.5)
        ctx.fillStyle = shade(hex, 0.08)
        ctx.fillRect(x + 1, y + 1, w - 2, 1)
      }
    }
  },

  cedar: (canvas, hex) => {
    const widths = [18, 26, 22, 30, 20]
    const period = widths.reduce((a, b) => a + b, 0)
    const h = 26, rows = 6
    canvas.width = period
    canvas.height = h * rows
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = shade(hex, -0.6)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? period / 2 : 0
      let x = -period
      let k = 0
      while (x < period * 2) {
        const w = widths[k % widths.length]
        const n = noise(k, j)
        const y = j * h
        ctx.fillStyle = shade(hex, (n - 0.5) * 0.36)
        ctx.fillRect(x + offset + 1, y, w - 2, h - 1)
        ctx.strokeStyle = shade(hex, -0.2)
        ctx.lineWidth = 0.6
        for (let g = 3; g < w - 2; g += 4) {
          ctx.beginPath()
          ctx.moveTo(x + offset + g, y)
          ctx.lineTo(x + offset + g + (n - 0.5), y + h - 1)
          ctx.stroke()
        }
        ctx.fillStyle = shade(hex, -0.45)
        ctx.fillRect(x + offset + 1, y + h - 3, w - 2, 2)
        x += w
        k++
      }
    }
  },

  clay: (canvas, hex) => {
    const w = 30, h = 24, cols = 5, rows = 6
    canvas.width = w * cols
    canvas.height = h * rows
    const ctx = canvas.getContext('2d')!
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * w, y = j * h
        const n = noise(i, j)
        const base = shade(hex, (n - 0.5) * 0.2)
        ctx.fillStyle = shade(base, -0.3)
        ctx.fillRect(x, y, w, h)
        const grad = ctx.createLinearGradient(x, 0, x + w, 0)
        grad.addColorStop(0, shade(base, -0.4))
        grad.addColorStop(0.35, shade(base, 0.16))
        grad.addColorStop(0.55, base)
        grad.addColorStop(1, shade(base, -0.42))
        ctx.fillStyle = grad
        ctx.fillRect(x + 3, y, w - 6, h)
        ctx.fillStyle = shade(base, -0.5)
        ctx.fillRect(x, y + h - 2, w, 2)
        ctx.fillStyle = shade(base, 0.1)
        ctx.fillRect(x, y, w, 1)
      }
    }
  },

  designer: (canvas, hex) => {
    const w = 40, h = 20, cols = 4, rows = 8
    canvas.width = w * cols
    canvas.height = h * rows
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = shade(hex, -0.55)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let j = 0; j < rows; j++) {
      const offset = j % 2 ? w / 2 : 0
      for (let i = -1; i <= cols; i++) {
        const x = i * w + offset, y = j * h
        const n = noise(i + 7, j + 3)
        const notch = 6 + Math.round(n * 10)
        ctx.fillStyle = shade(hex, (n - 0.5) * 0.42)
        ctx.fillRect(x + 1, y + 1, w - 2 - notch, h - 1)
        ctx.fillStyle = shade(hex, (0.5 - n) * 0.3)
        ctx.fillRect(x + w - notch, y + 1, notch - 1, h - 4)
        ctx.fillStyle = shade(hex, -0.4)
        ctx.fillRect(x + 1, y + h - 2, w - 2, 1.5)
      }
    }
  },
}
