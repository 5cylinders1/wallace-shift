import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

/**
 * Procedural surface library. Every roof, wall and layer texture in the
 * scene is painted here at runtime, so the demo ships no image files for
 * its materials and every finish tiles seamlessly in real-world metres.
 *
 * Each painter returns an albedo canvas and a height field. The height is
 * turned into a tangent-space normal map so courses, seams and butt edges
 * catch the sun as it moves.
 */

export type Rng = () => number

export function seeded(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Surface {
  albedo: Texture
  normal: Texture
  /** World size of one tile in metres, along the texture's u and v. */
  size: [number, number]
}

interface Painted {
  albedo: HTMLCanvasElement
  height: HTMLCanvasElement
  size: [number, number]
  strength: number
  grain?: number
}

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  const context = element.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('2D canvas unavailable')
  return [element, context]
}

/** Draws a shape at every tiled offset that overlaps the canvas. */
function wrapped(width: number, height: number, x: number, y: number, w: number, h: number, draw: (x: number, y: number) => void) {
  for (const ox of [-width, 0, width]) {
    for (const oy of [-height, 0, height]) {
      const nx = x + ox
      const ny = y + oy
      if (nx + w < 0 || nx > width || ny + h < 0 || ny > height) continue
      draw(nx, ny)
    }
  }
}

function shade(hex: string, factor: number): string {
  const value = parseInt(hex.slice(1), 16)
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  const r = clamp(((value >> 16) & 255) * factor)
  const g = clamp(((value >> 8) & 255) * factor)
  const b = clamp((value & 255) * factor)
  return `rgb(${r},${g},${b})`
}

function grey(value: number): string {
  const v = Math.max(0, Math.min(255, Math.round(value * 255)))
  return `rgb(${v},${v},${v})`
}

function addGrain(element: HTMLCanvasElement, amount: number, random: Rng) {
  const context = element.getContext('2d')!
  const image = context.getImageData(0, 0, element.width, element.height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    let n = (random() - 0.5) * amount
    if (random() < 0.025) n += (random() - 0.5) * amount * 3
    data[i] += n
    data[i + 1] += n
    data[i + 2] += n
  }
  context.putImageData(image, 0, 0)
}

function normalFrom(height: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const width = height.width
  const rows = height.height
  const source = height.getContext('2d')!.getImageData(0, 0, width, rows).data
  const [element, context] = canvas(width, rows)
  const out = context.createImageData(width, rows)
  const h = (x: number, y: number) => source[(((y + rows) % rows) * width + ((x + width) % width)) * 4] / 255
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength
      // Canvas rows run downward while texture v runs up the roof.
      const dy = (h(x, y - 1) - h(x, y + 1)) * strength
      const length = Math.hypot(dx, dy, 1)
      const index = (y * width + x) * 4
      out.data[index] = ((-dx / length) * 0.5 + 0.5) * 255
      out.data[index + 1] = ((-dy / length) * 0.5 + 0.5) * 255
      out.data[index + 2] = ((1 / length) * 0.5 + 0.5) * 255
      out.data[index + 3] = 255
    }
  }
  context.putImageData(out, 0, 0)
  return element
}

function finish(painted: Painted, seed: number, anisotropy: number): Surface {
  if (painted.grain) addGrain(painted.albedo, painted.grain, seeded(seed * 7 + 3))
  const albedo = new CanvasTexture(painted.albedo)
  albedo.colorSpace = SRGBColorSpace
  const normal = new CanvasTexture(normalFrom(painted.height, painted.strength))
  normal.colorSpace = NoColorSpace
  for (const texture of [albedo, normal]) {
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.anisotropy = anisotropy
  }
  return { albedo, normal, size: painted.size }
}

/* ------------------------------------------------------------------ */
/* Roof finishes                                                       */
/* ------------------------------------------------------------------ */

interface Tab { x: number; w: number; color: string; ext: number; laminate: boolean; lift: number }

/** Architectural laminated shingles: random-width tabs, dragon-tooth butts. */
function paintShingles(palette: string[], seed: number, exposure = 0.143, courses = 12, widthRange: [number, number] = [0.15, 0.34], shadow = 0.5, laminate = true): Painted {
  const size = exposure * courses
  const px = 1024
  const [albedo, a] = canvas(px, px)
  const [height, h] = canvas(px, px)
  const random = seeded(seed)
  const ch = px / courses
  const perMetre = px / size
  a.fillStyle = shade(palette[0], 0.55)
  a.fillRect(0, 0, px, px)
  h.fillStyle = grey(0.1)
  h.fillRect(0, 0, px, px)

  const average = palette.reduce((sum, hex) => { const v = parseInt(hex.slice(1), 16); return [sum[0] + ((v >> 16) & 255), sum[1] + ((v >> 8) & 255), sum[2] + (v & 255)] }, [0, 0, 0]).map(c => c / palette.length)
  const toHex = (rgb: number[]) => `#${rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`
  palette = palette.map(hex => { const v = parseInt(hex.slice(1), 16); return toHex([((v >> 16) & 255) * 0.5 + average[0] * 0.5, ((v >> 8) & 255) * 0.5 + average[1] * 0.5, (v & 255) * 0.5 + average[2] * 0.5]) })
  const layout: Tab[][] = []
  for (let course = 0; course < courses; course++) {
    const tabs: Tab[] = []
    let x = random() * px
    const end = x + px
    while (x < end) {
      const w = Math.min(end - x, (widthRange[0] + random() * (widthRange[1] - widthRange[0])) * perMetre)
      if (end - x - w < widthRange[0] * perMetre * 0.6) {
        tabs.push({ x, w: end - x, color: palette[Math.floor(random() * palette.length)], ext: random() * ch * 0.16, laminate: laminate && random() < 0.45, lift: random() })
        break
      }
      tabs.push({ x, w, color: palette[Math.floor(random() * palette.length)], ext: random() * ch * 0.16, laminate: laminate && random() < 0.45, lift: random() })
      x += w
    }
    layout.push(tabs)
  }

  const drawCourse = (course: number, offsetY: number) => {
    const butt = px - course * ch + offsetY
    const top = butt - ch
    for (const tab of layout[course]) {
      const bottom = butt + tab.ext
      wrapped(px, px * 4, tab.x, top, tab.w, bottom - top + 18, (x) => {
        const bright = 0.94 + tab.lift * 0.12
        a.fillStyle = shade(tab.color, bright)
        a.fillRect(x, top, tab.w - 1.4, bottom - top)
        if (tab.laminate) {
          a.fillStyle = 'rgba(0,0,0,0.13)'
          a.fillRect(x, bottom - ch * 0.42, tab.w - 1.4, ch * 0.42)
        }
        a.fillStyle = 'rgba(0,0,0,0.5)'
        a.fillRect(x + tab.w - 1.4, top, 1.4, bottom - top)
        const gradient = a.createLinearGradient(0, bottom, 0, bottom + 16)
        gradient.addColorStop(0, `rgba(0,0,0,${shadow})`)
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        a.fillStyle = gradient
        a.fillRect(x - 1, bottom, tab.w + 2, 16)

        const ramp = h.createLinearGradient(0, top, 0, bottom)
        ramp.addColorStop(0, grey(0.2))
        ramp.addColorStop(1, grey(0.62 + (tab.laminate ? 0.18 : 0) + tab.lift * 0.08))
        h.fillStyle = ramp
        h.fillRect(x, top, tab.w - 1.4, bottom - top)
        h.fillStyle = grey(0.15)
        h.fillRect(x + tab.w - 1.4, top, 1.4, bottom - top)
      })
    }
  }

  for (let course = 0; course < courses; course++) drawCourse(course, 0)
  // The lowest course's butts overhang the next tile's top course.
  a.save(); h.save()
  a.beginPath(); a.rect(0, 0, px, ch * 0.5); a.clip()
  h.beginPath(); h.rect(0, 0, px, ch * 0.5); h.clip()
  drawCourse(0, -px)
  a.restore(); h.restore()
  return { albedo, height, size: [size, size], strength: 3.2, grain: 26 }
}

function paintSlate(palette: string[], seed: number): Painted {
  const exposure = 0.19
  const courses = 6
  const size = exposure * courses
  const px = 1024
  const [albedo, a] = canvas(px, px)
  const [height, h] = canvas(px, px)
  const random = seeded(seed)
  const ch = px / courses
  const slate = 0.285 * (px / size)
  a.fillStyle = '#111315'
  a.fillRect(0, 0, px, px)
  h.fillStyle = grey(0.08)
  h.fillRect(0, 0, px, px)
  const rows: { x: number; w: number; color: string; ext: number; tilt: number; lift: number }[][] = []
  for (let course = 0; course < courses; course++) {
    const count = Math.round(px / slate)
    const w = px / count
    const offset = (course % 2) * w * 0.5 + (random() - 0.5) * 6
    rows.push(Array.from({ length: count }, (_, index) => ({
      x: offset + index * w,
      w,
      color: palette[Math.floor(random() * palette.length)],
      ext: random() * 7,
      tilt: (random() - 0.5) * 6,
      lift: random(),
    })))
  }
  const draw = (course: number, offsetY: number) => {
    const butt = px - course * ch + offsetY
    const top = butt - ch * 1.05
    for (const piece of rows[course]) {
      wrapped(px, px * 4, piece.x, top, piece.w, ch + 30, (x) => {
        const bottom = butt + piece.ext
        a.fillStyle = shade(piece.color, 0.82 + piece.lift * 0.32)
        a.beginPath()
        a.moveTo(x + 1.5, top)
        a.lineTo(x + piece.w - 1.5, top)
        a.lineTo(x + piece.w - 1.5, bottom + piece.tilt)
        a.lineTo(x + 1.5, bottom - piece.tilt)
        a.closePath()
        a.fill()
        // Natural cleft: faint streaks along the grain.
        for (let s = 0; s < 5; s++) {
          a.fillStyle = `rgba(255,255,255,${0.025 + random() * 0.035})`
          a.fillRect(x + random() * piece.w, top, 1 + random() * 2, ch)
        }
        const gradient = a.createLinearGradient(0, bottom, 0, bottom + 20)
        gradient.addColorStop(0, 'rgba(0,0,0,0.55)')
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        a.fillStyle = gradient
        a.fillRect(x, bottom, piece.w, 20)

        const ramp = h.createLinearGradient(0, top, 0, bottom)
        ramp.addColorStop(0, grey(0.25))
        ramp.addColorStop(1, grey(0.7 + piece.lift * 0.15))
        h.fillStyle = ramp
        h.fillRect(x + 1.5, top, piece.w - 3, bottom - top)
      })
    }
  }
  for (let course = 0; course < courses; course++) draw(course, 0)
  a.save(); h.save()
  a.beginPath(); a.rect(0, 0, px, ch * 0.4); a.clip()
  h.beginPath(); h.rect(0, 0, px, ch * 0.4); h.clip()
  draw(0, -px)
  a.restore(); h.restore()
  return { albedo, height, size: [size, size], strength: 4, grain: 14 }
}

/** Two-piece barrel profile: alternating crowns and pans, overlapping courses. */
function paintClay(palette: string[], seed: number): Painted {
  const tile = 0.3
  const exposure = 0.34
  const across = 3
  const courses = 3
  const size: [number, number] = [tile * across, exposure * courses]
  const px = 1024
  const [albedo, a] = canvas(px, px)
  const [height, h] = canvas(px, px)
  const random = seeded(seed)
  const tw = px / across
  const ch = px / courses
  const colors: string[][] = Array.from({ length: courses }, () => Array.from({ length: across }, () => palette[Math.floor(random() * palette.length)]))
  const albedoData = a.createImageData(px, px)
  const heightData = h.createImageData(px, px)
  for (let y = 0; y < px; y++) {
    const course = Math.floor((px - 1 - y) / ch)
    const inCourse = ((px - 1 - y) % ch) / ch // 0 at butt, 1 at top
    for (let x = 0; x < px; x++) {
      const column = Math.floor(x / tw)
      const t = (x % tw) / tw
      const profile = Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5 // pan 0 → crown 1
      const color = colors[course][column]
      const value = parseInt(color.slice(1), 16)
      const butt = inCourse < 0.06 ? 0.55 + inCourse * 7 : 1
      const shadow = inCourse > 0.94 ? 0.55 : 1
      const light = (0.62 + profile * 0.5) * butt * shadow
      const index = (y * px + x) * 4
      albedoData.data[index] = ((value >> 16) & 255) * light
      albedoData.data[index + 1] = ((value >> 8) & 255) * light
      albedoData.data[index + 2] = (value & 255) * light
      albedoData.data[index + 3] = 255
      const heightValue = (profile * 0.75 + (1 - inCourse) * 0.25) * 255
      heightData.data[index] = heightData.data[index + 1] = heightData.data[index + 2] = heightValue
      heightData.data[index + 3] = 255
    }
  }
  a.putImageData(albedoData, 0, 0)
  h.putImageData(heightData, 0, 0)
  // Weathering blooms.
  for (let i = 0; i < 70; i++) {
    a.fillStyle = `rgba(${random() < 0.5 ? '60,40,30' : '255,235,210'},${0.03 + random() * 0.05})`
    a.beginPath()
    a.ellipse(random() * px, random() * px, 10 + random() * 40, 6 + random() * 24, 0, 0, Math.PI * 2)
    a.fill()
  }
  return { albedo, height, size, strength: 6, grain: 18 }
}

function paintShake(palette: string[], seed: number): Painted {
  const painted = paintShingles(palette, seed, 0.2, 6, [0.08, 0.26], 0.62, false)
  const context = painted.albedo.getContext('2d')!
  const random = seeded(seed + 11)
  // Split-wood grain running down the slope.
  for (let i = 0; i < 2600; i++) {
    const light = random() < 0.5
    context.fillStyle = light ? `rgba(255,236,205,${0.03 + random() * 0.05})` : `rgba(40,24,12,${0.04 + random() * 0.07})`
    context.fillRect(random() * 1024, random() * 1024, 1 + random() * 1.5, 18 + random() * 90)
  }
  const heightContext = painted.height.getContext('2d')!
  for (let i = 0; i < 900; i++) {
    heightContext.fillStyle = `rgba(0,0,0,${0.05 + random() * 0.08})`
    heightContext.fillRect(random() * 1024, random() * 1024, 1.5, 30 + random() * 80)
  }
  return { ...painted, strength: 4.4, grain: 18 }
}

/** Standing-seam pan between ribs; the ribs themselves are real geometry. */
function paintSeamPan(base: string, seed: number): Painted {
  const px = 256
  const [albedo, a] = canvas(px, px)
  const [height, h] = canvas(px, px)
  const random = seeded(seed)
  a.fillStyle = base
  a.fillRect(0, 0, px, px)
  for (let i = 0; i < 24; i++) {
    a.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},${0.012 + random() * 0.02})`
    a.fillRect(random() * px, 0, 4 + random() * 22, px)
  }
  h.fillStyle = grey(0.5)
  h.fillRect(0, 0, px, px)
  // Two pencil ribs stiffen each pan.
  for (const x of [px / 3, (px * 2) / 3]) {
    const ramp = h.createLinearGradient(x - 5, 0, x + 5, 0)
    ramp.addColorStop(0, grey(0.5))
    ramp.addColorStop(0.5, grey(0.62))
    ramp.addColorStop(1, grey(0.5))
    h.fillStyle = ramp
    h.fillRect(x - 5, 0, 10, px)
  }
  return { albedo, height, size: [0.4064, 0.4064], strength: 2.4, grain: 4 }
}

/* ------------------------------------------------------------------ */
/* System layers                                                       */
/* ------------------------------------------------------------------ */

function paintDeck(seed: number): Painted {
  const [albedo, a] = canvas(1024, 512)
  const [height, h] = canvas(1024, 512)
  const random = seeded(seed)
  a.fillStyle = '#b48a55'
  a.fillRect(0, 0, 1024, 512)
  h.fillStyle = grey(0.5)
  h.fillRect(0, 0, 1024, 512)
  const flakes = ['#c49a63', '#a77a45', '#d3ad75', '#93693a', '#bf9258', '#8a6236']
  for (let i = 0; i < 5200; i++) {
    const x = random() * 1024
    const y = random() * 512
    const w = 8 + random() * 26
    const hgt = 3 + random() * 8
    a.save()
    a.translate(x, y)
    a.rotate((random() - 0.5) * 0.9)
    a.fillStyle = flakes[Math.floor(random() * flakes.length)]
    a.globalAlpha = 0.55 + random() * 0.45
    a.fillRect(-w / 2, -hgt / 2, w, hgt)
    a.restore()
  }
  a.globalAlpha = 1
  // 4x8 sheet joints and nail lines on 24-inch rafters.
  a.fillStyle = 'rgba(40,24,10,0.65)'
  a.fillRect(0, 0, 1024, 3)
  a.fillRect(0, 0, 3, 512)
  h.fillStyle = grey(0.2)
  h.fillRect(0, 0, 1024, 3)
  h.fillRect(0, 0, 3, 512)
  for (let column = 0; column < 4; column++) {
    for (let y = 12; y < 512; y += 38) {
      a.fillStyle = 'rgba(70,70,74,0.8)'
      a.beginPath()
      a.arc(column * 256 + 6, y, 2.4, 0, Math.PI * 2)
      a.fill()
    }
  }
  return { albedo, height, size: [2.4384, 1.2192], strength: 1.4, grain: 16 }
}

function paintUnderlayment(seed: number): Painted {
  const [albedo, a] = canvas(512, 512)
  const [height, h] = canvas(512, 512)
  const random = seeded(seed)
  a.fillStyle = '#8f99a1'
  a.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 1400; i++) {
    a.strokeStyle = `rgba(255,255,255,${0.03 + random() * 0.04})`
    a.beginPath()
    const x = random() * 512
    const y = random() * 512
    a.moveTo(x, y)
    a.lineTo(x + 30, y + 30)
    a.stroke()
  }
  // Roll lap band and printed alignment guides.
  a.fillStyle = 'rgba(30,38,46,0.18)'
  a.fillRect(0, 0, 512, 22)
  a.fillStyle = 'rgba(28,46,70,0.55)'
  a.fillRect(0, 34, 512, 2)
  a.fillRect(0, 44, 512, 1.5)
  for (let y = 110; y < 512; y += 96) {
    for (let x = 18; x < 512; x += 64) {
      a.beginPath()
      a.arc(x, y, 3, 0, Math.PI * 2)
      a.fill()
    }
  }
  h.fillStyle = grey(0.5)
  h.fillRect(0, 0, 512, 512)
  h.fillStyle = grey(0.62)
  h.fillRect(0, 0, 512, 22)
  return { albedo, height, size: [1.0, 0.9144], strength: 1.5, grain: 10 }
}

function paintIceWater(seed: number): Painted {
  const [albedo, a] = canvas(512, 512)
  const [height, h] = canvas(512, 512)
  a.fillStyle = '#1d2024'
  a.fillRect(0, 0, 512, 512)
  a.fillStyle = 'rgba(255,255,255,0.05)'
  a.fillRect(0, 0, 512, 16)
  h.fillStyle = grey(0.5)
  h.fillRect(0, 0, 512, 512)
  h.fillStyle = grey(0.66)
  h.fillRect(0, 0, 512, 16)
  void seed
  return { albedo, height, size: [1.0, 0.9144], strength: 1.2, grain: 34 }
}

/* ------------------------------------------------------------------ */
/* House and site                                                      */
/* ------------------------------------------------------------------ */

function paintBatten(base: string, seed: number): Painted {
  const [albedo, a] = canvas(512, 512)
  const [height, h] = canvas(512, 512)
  const random = seeded(seed)
  a.fillStyle = base
  a.fillRect(0, 0, 512, 512)
  h.fillStyle = grey(0.4)
  h.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 40; i++) {
    a.fillStyle = `rgba(0,0,0,${0.008 + random() * 0.014})`
    a.fillRect(random() * 512, 0, 6 + random() * 50, 512)
  }
  const spacing = 128
  for (let x = 0; x < 512; x += spacing) {
    a.fillStyle = 'rgba(0,0,0,0.14)'
    a.fillRect(x + 22, 0, 3, 512)
    a.fillStyle = 'rgba(255,255,255,0.18)'
    a.fillRect(x, 0, 2, 512)
    h.fillStyle = grey(0.85)
    h.fillRect(x, 0, 22, 512)
  }
  return { albedo, height, size: [1.6256, 1.6256], strength: 3, grain: 6 }
}

function paintStone(seed: number): Painted {
  const [albedo, a] = canvas(512, 512)
  const [height, h] = canvas(512, 512)
  const random = seeded(seed)
  a.fillStyle = '#9b958b'
  a.fillRect(0, 0, 512, 512)
  h.fillStyle = grey(0.15)
  h.fillRect(0, 0, 512, 512)
  const palette = ['#9a9286', '#a49c8e', '#8a847b', '#ada595', '#938c81', '#b3aa99', '#857f77']
  let y = 0
  while (y < 512) {
    const rowH = 34 + random() * 40
    let x = random() * -60
    while (x < 512) {
      const w = 50 + random() * 90
      wrapped(512, 512, x, y, w, rowH, (sx, sy) => {
        a.fillStyle = palette[Math.floor(random() * palette.length)]
        a.beginPath()
        a.roundRect(sx + 3, sy + 3, w - 6, rowH - 6, 9)
        a.fill()
        a.fillStyle = 'rgba(255,255,255,0.08)'
        a.fillRect(sx + 6, sy + 5, w - 14, 4)
        h.fillStyle = grey(0.6 + random() * 0.3)
        h.beginPath()
        h.roundRect(sx + 3, sy + 3, w - 6, rowH - 6, 9)
        h.fill()
      })
      x += w
    }
    y += rowH
  }
  return { albedo, height, size: [1.4, 1.4], strength: 4, grain: 12 }
}

function paintLawn(seed: number): Painted {
  const [albedo, a] = canvas(512, 512)
  const [height, h] = canvas(512, 512)
  const random = seeded(seed)
  a.fillStyle = '#4c6236'
  a.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 260; i++) {
    const x = random() * 512
    const y = random() * 512
    const r = 20 + random() * 70
    wrapped(512, 512, x - r, y - r, r * 2, r * 2, (sx, sy) => {
      const gradient = a.createRadialGradient(sx + r, sy + r, 0, sx + r, sy + r, r)
      const tone = random() < 0.5 ? '96,120,62' : '52,70,36'
      gradient.addColorStop(0, `rgba(${tone},0.18)`)
      gradient.addColorStop(1, `rgba(${tone},0)`)
      a.fillStyle = gradient
      a.fillRect(sx, sy, r * 2, r * 2)
    })
  }
  for (let i = 0; i < 9000; i++) {
    a.fillStyle = random() < 0.5 ? 'rgba(120,150,80,0.25)' : 'rgba(30,45,20,0.25)'
    a.fillRect(random() * 512, random() * 512, 1, 3)
  }
  h.fillStyle = grey(0.5)
  h.fillRect(0, 0, 512, 512)
  return { albedo, height, size: [5, 5], strength: 1, grain: 12 }
}

function paintConcrete(seed: number): Painted {
  const [albedo, a] = canvas(512, 512)
  const [height, h] = canvas(512, 512)
  const random = seeded(seed)
  a.fillStyle = '#b9b5ad'
  a.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 120; i++) {
    a.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},0.03)`
    a.beginPath()
    a.arc(random() * 512, random() * 512, 10 + random() * 60, 0, Math.PI * 2)
    a.fill()
  }
  a.fillStyle = 'rgba(60,58,54,0.5)'
  a.fillRect(0, 0, 512, 3)
  a.fillRect(0, 0, 3, 512)
  h.fillStyle = grey(0.5)
  h.fillRect(0, 0, 512, 512)
  h.fillStyle = grey(0.3)
  h.fillRect(0, 0, 512, 3)
  h.fillRect(0, 0, 3, 512)
  return { albedo, height, size: [3, 3], strength: 1.5, grain: 18 }
}

function paintGarageDoor(): Painted {
  const [albedo, a] = canvas(512, 256)
  const [height, h] = canvas(512, 256)
  a.fillStyle = '#e9e6df'
  a.fillRect(0, 0, 512, 256)
  h.fillStyle = grey(0.5)
  h.fillRect(0, 0, 512, 256)
  for (let row = 1; row < 4; row++) {
    a.fillStyle = 'rgba(0,0,0,0.25)'
    a.fillRect(0, row * 64 - 2, 512, 3)
    h.fillStyle = grey(0.2)
    h.fillRect(0, row * 64 - 2, 512, 3)
  }
  // Top row of lites.
  for (let i = 0; i < 8; i++) {
    a.fillStyle = '#20262c'
    a.fillRect(10 + i * 62.5, 12, 50, 40)
  }
  return { albedo, height, size: [1, 1], strength: 2 }
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export type SurfaceKey =
  | `shingle:${string}` | `slate:${string}` | `clay:${string}` | `shake:${string}` | `seam:${string}`
  | 'deck' | 'underlayment' | 'icewater' | 'batten' | 'stone' | 'lawn' | 'concrete' | 'garage'

export class SurfaceLibrary {
  private readonly cache = new Map<string, Surface>()
  private readonly anisotropy: number

  constructor(anisotropy: number) {
    this.anisotropy = anisotropy
  }

  get(key: SurfaceKey, palette: string[] = []): Surface {
    const cacheKey = `${key}|${palette.join(',')}`
    const hit = this.cache.get(cacheKey)
    if (hit) return hit
    const seed = [...cacheKey].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
    const kind = key.split(':')[0]
    let painted: Painted
    switch (kind) {
      case 'shingle': painted = paintShingles(palette, seed); break
      case 'slate': painted = paintSlate(palette, seed); break
      case 'clay': painted = paintClay(palette, seed); break
      case 'shake': painted = paintShake(palette, seed); break
      case 'seam': painted = paintSeamPan(palette[0] ?? '#333333', seed); break
      case 'deck': painted = paintDeck(seed); break
      case 'underlayment': painted = paintUnderlayment(seed); break
      case 'icewater': painted = paintIceWater(seed); break
      case 'batten': painted = paintBatten(palette[0] ?? '#efede8', seed); break
      case 'stone': painted = paintStone(seed); break
      case 'lawn': painted = paintLawn(seed); break
      case 'concrete': painted = paintConcrete(seed); break
      default: painted = paintGarageDoor(); break
    }
    const surface = finish(painted, seed, this.anisotropy)
    this.cache.set(cacheKey, surface)
    return surface
  }

  dispose() {
    for (const surface of this.cache.values()) {
      surface.albedo.dispose()
      surface.normal.dispose()
    }
    this.cache.clear()
  }
}

/** A soft round glow, used for light washes, sun glints and hail impacts. */
export function glowTexture(): Texture {
  // Grey on black, not white on transparent: alpha and emissive maps read RGB.
  const [element, context] = canvas(128, 128)
  context.fillStyle = '#000'
  context.fillRect(0, 0, 128, 128)
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.25, '#8c8c8c')
  gradient.addColorStop(0.6, '#1f1f1f')
  gradient.addColorStop(1, '#000000')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  const texture = new CanvasTexture(element)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** A wall wash: bright at the fixture, fanning downward. */
export function washTexture(): Texture {
  const [element, context] = canvas(128, 256)
  context.fillStyle = '#000'
  context.fillRect(0, 0, 128, 256)
  const gradient = context.createRadialGradient(64, 14, 2, 64, 70, 120)
  gradient.addColorStop(0, '#f2f2f2')
  gradient.addColorStop(0.3, '#555555')
  gradient.addColorStop(0.75, '#0d0d0d')
  gradient.addColorStop(1, '#000000')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 256)
  const texture = new CanvasTexture(element)
  texture.colorSpace = SRGBColorSpace
  return texture
}
