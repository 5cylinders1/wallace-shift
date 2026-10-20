import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { EARTH, backfillEdge, clayBottom, shaleBottom, topsoilBottom } from './ground'
import { seeded, type Rng } from './geometry'

/** Pixels per metre of the painted soil section. */
export const STRATA_PX = 80

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return [element, element.getContext('2d')!]
}

function texture(element: HTMLCanvasElement, repeat = false): CanvasTexture {
  const result = new CanvasTexture(element)
  result.colorSpace = SRGBColorSpace
  result.anisotropy = 4
  if (repeat) { result.wrapS = RepeatWrapping; result.wrapT = RepeatWrapping }
  return result
}

const pick = <T,>(random: Rng, list: T[]): T => list[Math.floor(random() * list.length)]

/**
 * The ground in section, painted once: topsoil, the clay that moves with the
 * seasons, laminated shale, and limestone beds where the piers stop. The
 * strip covers the whole cut face; the side faces reuse it.
 */
export function strataTexture(): CanvasTexture {
  const width = (EARTH.x1 - EARTH.x0) * STRATA_PX
  const height = Math.round((EARTH.top - EARTH.bottom) * STRATA_PX)
  const [element, context] = canvas(width, height)
  const random = seeded(7)
  const px = (x: number) => (x - EARTH.x0) * STRATA_PX
  const py = (y: number) => (EARTH.top - y) * STRATA_PX
  const toX = (p: number) => p / STRATA_PX + EARTH.x0

  const band = (upper: (x: number) => number, lower: (x: number) => number, fill: string) => {
    context.beginPath()
    for (let p = 0; p <= width; p += 8) context.lineTo(p, py(upper(toX(p))))
    for (let p = width; p >= 0; p -= 8) context.lineTo(p, py(lower(toX(p))))
    context.closePath()
    context.fillStyle = fill
    context.fill()
    return () => {
      context.beginPath()
      for (let p = 0; p <= width; p += 8) context.lineTo(p, py(upper(toX(p))))
      for (let p = width; p >= 0; p -= 8) context.lineTo(p, py(lower(toX(p))))
      context.closePath()
      context.clip()
    }
  }
  const sky = () => EARTH.top
  const floor = () => EARTH.bottom

  // Limestone bedrock, in beds with partings and joints.
  const rockClip = band(shaleBottom, floor, '#c8c1b1')
  context.save(); rockClip()
  let bed = -6.2
  while (bed > EARTH.bottom) {
    const thickness = 0.32 + random() * 0.46
    const tone = pick(random, ['#cfc8b8', '#c2bbab', '#cbc4b4', '#bbb4a4'])
    context.fillStyle = tone
    context.fillRect(0, py(bed), width, thickness * STRATA_PX)
    context.strokeStyle = 'rgba(76, 70, 60, 0.55)'
    context.lineWidth = 1.6
    context.beginPath()
    for (let p = 0; p <= width; p += 12) context.lineTo(p, py(bed) + Math.sin(p * 0.013 + bed * 5) * 1.6)
    context.stroke()
    let joint = random() * 300
    while (joint < width) {
      context.strokeStyle = 'rgba(80, 74, 64, 0.35)'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(joint, py(bed))
      context.lineTo(joint + (random() - 0.5) * 6, py(bed - thickness))
      context.stroke()
      joint += 90 + random() * 260
    }
    bed -= thickness
  }
  for (let i = 0; i < 3800; i++) {
    context.fillStyle = random() < 0.6 ? 'rgba(90, 84, 72, 0.28)' : 'rgba(236, 230, 214, 0.35)'
    context.fillRect(random() * width, random() * height, 1 + random() * 2, 1 + random() * 1.5)
  }
  context.restore()

  // Shale and stiff clay: fine laminations.
  const shaleClip = band(clayBottom, shaleBottom, '#827c6f')
  context.save(); shaleClip()
  for (let y = -3.8; y > -7.6; y -= 0.035 + random() * 0.05) {
    context.strokeStyle = pick(random, ['rgba(52, 49, 43, 0.35)', 'rgba(140, 134, 120, 0.3)', 'rgba(92, 87, 77, 0.4)'])
    context.lineWidth = 0.8 + random() * 1.4
    context.beginPath()
    const phase = random() * 10
    for (let p = 0; p <= width; p += 16) context.lineTo(p, py(y) + Math.sin(p * 0.004 + phase) * 3 + Math.sin(p * 0.021 + phase) * 0.8)
    context.stroke()
  }
  context.restore()

  // Clay: mottled, with lime nodules and iron staining.
  const clayClip = band(topsoilBottom, clayBottom, '#a57d58')
  context.save(); clayClip()
  for (let i = 0; i < 520; i++) {
    const x = random() * width, y = py(-0.4 - random() * 4.1)
    const r = 6 + random() * 26
    const g = context.createRadialGradient(x, y, 0, x, y, r)
    const color = pick(random, ['178, 138, 98', '138, 104, 72', '168, 118, 76', '122, 94, 68'])
    g.addColorStop(0, `rgba(${color}, 0.42)`)
    g.addColorStop(1, `rgba(${color}, 0)`)
    context.fillStyle = g
    context.fillRect(x - r, y - r, r * 2, r * 2)
  }
  for (let i = 0; i < 260; i++) {
    context.fillStyle = 'rgba(176, 102, 46, 0.35)'
    context.beginPath()
    context.ellipse(random() * width, py(-0.5 - random() * 3.8), 2 + random() * 5, 1 + random() * 3, random() * 3, 0, Math.PI * 2)
    context.fill()
  }
  for (let i = 0; i < 1400; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(220, 206, 180, 0.55)' : 'rgba(70, 50, 34, 0.35)'
    context.beginPath()
    context.arc(random() * width, py(-0.4 - random() * 4.2), 0.8 + random() * 1.8, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()

  // Backfill beside the basement walls: looser, mixed, with stone.
  for (const side of [-1, 1]) {
    context.save()
    context.beginPath()
    context.moveTo(px(side * 6), py(-2.85))
    for (let y = -2.85; y <= 0.05; y += 0.1) context.lineTo(px(side * backfillEdge(y)), py(y))
    context.lineTo(px(side * 6), py(0.05))
    context.closePath()
    context.fillStyle = '#8e7a63'
    context.fill()
    context.clip()
    for (let i = 0; i < 900; i++) {
      const x = px(side * (6 + random() * 1.4)), y = py(-random() * 2.9)
      context.fillStyle = pick(random, ['#9b978e', '#6f6b64', '#857c70', '#5e5145', '#a39b8d'])
      context.beginPath()
      context.ellipse(x, y, 1.5 + random() * 5, 1 + random() * 3.5, random() * 3, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }

  // Topsoil, with fine roots.
  const topClip = band(sky, topsoilBottom, '#5b4836')
  context.save(); topClip()
  for (let i = 0; i < 2600; i++) {
    context.fillStyle = random() < 0.55 ? 'rgba(30, 22, 15, 0.45)' : 'rgba(120, 96, 70, 0.4)'
    context.fillRect(random() * width, py(-random() * 0.45), 1 + random() * 2, 1 + random() * 2)
  }
  context.restore()

  // Roots under the right-hand lawn, below the tree.
  context.strokeStyle = 'rgba(46, 32, 22, 0.55)'
  context.lineCap = 'round'
  const root = (x: number, y: number, angle: number, length: number, thickness: number, depth: number) => {
    if (depth > 5 || thickness < 0.4) return
    const x2 = x + Math.cos(angle) * length, y2 = y + Math.sin(angle) * length
    context.lineWidth = thickness
    context.beginPath()
    context.moveTo(x, y)
    context.quadraticCurveTo((x + x2) / 2 + (random() - 0.5) * length * 0.4, (y + y2) / 2 + (random() - 0.5) * length * 0.3, x2, y2)
    context.stroke()
    const branches = 1 + Math.floor(random() * 2.4)
    for (let i = 0; i < branches; i++) root(x2, y2, angle + (random() - 0.5) * 1.1, length * (0.55 + random() * 0.25), thickness * 0.62, depth + 1)
  }
  for (let i = 0; i < 9; i++) root(px(12.2 + (random() - 0.5) * 0.6), py(-0.1), Math.PI * (0.2 + random() * 0.6), 40 + random() * 70, 4.2, 0)

  // Grain and a little depth.
  const shade = context.createLinearGradient(0, 0, 0, height)
  shade.addColorStop(0, 'rgba(255, 248, 235, 0.04)')
  shade.addColorStop(1, 'rgba(20, 16, 12, 0.12)')
  context.fillStyle = shade
  context.fillRect(0, 0, width, height)
  for (let i = 0; i < 26000; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.05)'
    context.fillRect(random() * width, random() * height, 1, 1)
  }
  return texture(element)
}

/** Concrete block, 16 × 8 in. units in running bond; 4 units × 8 courses per tile. */
export function blockTexture(): CanvasTexture {
  const size = 512
  const [element, context] = canvas(size, size)
  const random = seeded(19)
  context.fillStyle = '#a19d94'
  context.fillRect(0, 0, size, size)
  const w = size / 4, h = size / 8, joint = 4
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 ? w / 2 : 0
    for (let col = -1; col < 5; col++) {
      const x = col * w + offset, y = row * h
      const tone = 196 + Math.floor((random() - 0.5) * 16)
      context.fillStyle = `rgb(${tone}, ${tone - 3}, ${tone - 10})`
      context.fillRect(x + joint / 2, y + joint / 2, w - joint, h - joint)
    }
  }
  for (let i = 0; i < 9000; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(60, 56, 50, 0.16)' : 'rgba(255, 255, 255, 0.12)'
    context.fillRect(random() * size, random() * size, 1 + random(), 1 + random())
  }
  return texture(element, true)
}

/** Poured concrete with form-tie holes, 2 m per tile. */
export function concreteTexture(): CanvasTexture {
  const size = 512
  const [element, context] = canvas(size, size)
  const random = seeded(23)
  context.fillStyle = '#c4c0b7'
  context.fillRect(0, 0, size, size)
  for (let i = 0; i < 70; i++) {
    const x = random() * size, y = random() * size, r = 20 + random() * 70
    const g = context.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, random() < 0.5 ? 'rgba(150, 146, 138, 0.18)' : 'rgba(225, 222, 214, 0.2)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = g
    context.fillRect(x - r, y - r, r * 2, r * 2)
  }
  for (let i = 0; i < 12000; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(70, 66, 60, 0.12)' : 'rgba(255, 255, 255, 0.1)'
    context.fillRect(random() * size, random() * size, 1, 1)
  }
  context.fillStyle = 'rgba(80, 76, 70, 0.55)'
  for (let gx = 0; gx < 3; gx++) for (let gy = 0; gy < 3; gy++) {
    context.beginPath()
    context.arc(64 + gx * 170, 64 + gy * 170, 3.2, 0, Math.PI * 2)
    context.fill()
  }
  context.strokeStyle = 'rgba(110, 106, 98, 0.18)'
  context.lineWidth = 1.5
  for (let y = 0; y <= size; y += 154) { context.beginPath(); context.moveTo(0, y); context.lineTo(size, y); context.stroke() }
  return texture(element, true)
}

export type HatchKind = 'concrete' | 'gravel' | 'stud' | 'wood'

/** Architectural section hatches, one metre per tile. */
export function hatchTexture(kind: HatchKind): CanvasTexture {
  const size = 256
  const [element, context] = canvas(size, size)
  const random = seeded(kind.length * 31)
  if (kind === 'concrete') {
    context.fillStyle = '#d6d2c8'
    context.fillRect(0, 0, size, size)
    for (let i = 0; i < 520; i++) {
      context.fillStyle = 'rgba(70, 66, 60, 0.55)'
      context.fillRect(random() * size, random() * size, 1.4, 1.4)
    }
    context.strokeStyle = 'rgba(70, 66, 60, 0.6)'
    context.lineWidth = 1
    for (let i = 0; i < 46; i++) {
      const x = random() * size, y = random() * size, r = 2.5 + random() * 3, a = random() * Math.PI
      context.beginPath()
      for (let k = 0; k < 3; k++) context.lineTo(x + Math.cos(a + k * 2.09) * r, y + Math.sin(a + k * 2.09) * r)
      context.closePath()
      context.stroke()
    }
  } else if (kind === 'gravel') {
    context.fillStyle = '#cdc6b8'
    context.fillRect(0, 0, size, size)
    context.strokeStyle = 'rgba(80, 74, 66, 0.7)'
    context.lineWidth = 1.2
    for (let i = 0; i < 140; i++) {
      context.beginPath()
      context.ellipse(random() * size, random() * size, 3 + random() * 5, 2.5 + random() * 4, random() * 3, 0, Math.PI * 2)
      context.stroke()
    }
  } else if (kind === 'stud') {
    context.fillStyle = '#ebe5d8'
    context.fillRect(0, 0, size, size)
    context.strokeStyle = 'rgba(150, 132, 108, 0.6)'
    context.lineWidth = 1.4
    for (let y = -20; y < size + 20; y += 22) {
      context.beginPath()
      for (let x = 0; x <= size; x += 4) context.lineTo(x, y + Math.sin(x * 0.19) * 8)
      context.stroke()
    }
  } else {
    context.fillStyle = '#c29d6e'
    context.fillRect(0, 0, size, size)
    context.strokeStyle = 'rgba(110, 80, 48, 0.45)'
    for (let y = 0; y < size; y += 6) { context.beginPath(); context.moveTo(0, y + random() * 2); context.lineTo(size, y + random() * 2); context.stroke() }
  }
  return texture(element, true)
}

/** Fine lawn noise, tinted by season in the shader. */
export function lawnTexture(): CanvasTexture {
  const size = 256
  const [element, context] = canvas(size, size)
  const random = seeded(41)
  context.fillStyle = '#9a9a92'
  context.fillRect(0, 0, size, size)
  for (let i = 0; i < 16000; i++) {
    const v = 120 + Math.floor(random() * 110)
    context.fillStyle = `rgba(${v}, ${v}, ${v - 8}, 0.5)`
    context.fillRect(random() * size, random() * size, 1, 1 + random() * 2)
  }
  return texture(element, true)
}

/** Lap siding, painted model-white: one course every 15 cm, 1.2 m per tile. */
export function sidingTexture(): CanvasTexture {
  const [element, context] = canvas(64, 256)
  context.fillStyle = '#f1ede5'
  context.fillRect(0, 0, 64, 256)
  for (let y = 0; y < 256; y += 32) {
    const g = context.createLinearGradient(0, y, 0, y + 32)
    g.addColorStop(0, 'rgba(120, 110, 96, 0.28)')
    g.addColorStop(0.12, 'rgba(120, 110, 96, 0)')
    g.addColorStop(0.9, 'rgba(255, 255, 255, 0)')
    g.addColorStop(1, 'rgba(255, 255, 255, 0.35)')
    context.fillStyle = g
    context.fillRect(0, y, 64, 32)
  }
  return texture(element, true)
}

/**
 * A crack drawn on a wall face, transparent elsewhere. `path` is in metres
 * on the face, from its lower-left corner.
 */
export function crackTexture(widthM: number, heightM: number, paths: [number, number][][], seed: number): CanvasTexture {
  const scale = 160
  const [element, context] = canvas(Math.round(widthM * scale), Math.round(heightM * scale))
  const random = seeded(seed)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const path of paths) {
    for (let pass = 0; pass < 2; pass++) {
      context.strokeStyle = pass === 0 ? 'rgba(255, 250, 240, 0.35)' : 'rgba(34, 28, 24, 0.92)'
      context.beginPath()
      path.forEach(([x, y], index) => {
        const px = x * scale + (pass === 0 ? 2 : 0), py = (heightM - y) * scale + (pass === 0 ? 2 : 0)
        if (index === 0) context.moveTo(px, py)
        else {
          const [x0, y0] = path[index - 1]
          const steps = Math.max(2, Math.round(Math.hypot(x - x0, y - y0) * 22))
          for (let s = 1; s <= steps; s++) {
            const t = s / steps
            const jitter = s === steps ? 0 : (random() - 0.5) * 2.2
            context.lineTo((x0 + (x - x0) * t) * scale + jitter + (pass === 0 ? 2 : 0), (heightM - (y0 + (y - y0) * t)) * scale + jitter + (pass === 0 ? 2 : 0))
          }
        }
      })
      context.lineWidth = pass === 0 ? 7 : 5
      context.stroke()
    }
  }
  const result = texture(element)
  return result
}

/** A pale mineral bloom along the base of a damp wall. */
export function efflorescenceTexture(widthM: number, heightM: number): CanvasTexture {
  const scale = 100
  const [element, context] = canvas(Math.round(widthM * scale), Math.round(heightM * scale))
  const random = seeded(77)
  for (let i = 0; i < 2600; i++) {
    const x = random() * element.width
    const y = element.height - Math.pow(random(), 2.2) * element.height
    context.fillStyle = `rgba(250, 248, 240, ${0.18 + random() * 0.35})`
    context.beginPath()
    context.arc(x, y, 0.6 + random() * 2.4, 0, Math.PI * 2)
    context.fill()
  }
  return texture(element)
}

/** Soft round shadow for the model's base. */
export function contactShadowTexture(): CanvasTexture {
  const [element, context] = canvas(256, 256)
  const g = context.createRadialGradient(128, 128, 10, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = g
  context.fillRect(0, 0, 256, 256)
  return new CanvasTexture(element)
}

export function disposeAll(textures: Texture[]) {
  for (const item of textures) item.dispose()
}
