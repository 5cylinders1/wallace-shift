import { COURSE, EAVE_Y, GROUND_Y, ICE_TOP, ROOF_POLY, GARAGE } from './geometry'
import { seeded } from './math'

/**
 * Every texture in the scene is generated once, here, from a seeded random
 * source — no raster assets. Patterns use world units (`userSpaceOnUse`)
 * so they line up with the roof's courses and sheet seams, and they
 * stretch with the roof plane when the camera rises.
 */

const SHINGLE_TILE_W = 600
const SHINGLE_TILE_H = COURSE * 4

type ShinglePalette = {
  faces: string[]
  shadow: string
  gap: string
  tooth: string
}

const NEW_SHINGLES: ShinglePalette = {
  faces: ['#3d4147', '#464a51', '#373b41', '#4d5157', '#41444a', '#4a4743'],
  shadow: '#202326',
  gap: '#26292d',
  tooth: '#2e3136',
}

const OLD_SHINGLES: ShinglePalette = {
  faces: ['#8d897f', '#7f7b73', '#97928a', '#87837a', '#9d988e', '#8a8378'],
  shadow: '#5b5751',
  gap: '#67635c',
  tooth: '#76726a',
}

function shingleRows(palette: ShinglePalette, seed: number) {
  const random = seeded(seed)
  const rects: Array<{ x: number; y: number; w: number; h: number; fill: string }> = []

  for (let row = 0; row < 4; row += 1) {
    const top = row * COURSE
    rects.push({ x: 0, y: top, w: SHINGLE_TILE_W, h: COURSE, fill: palette.faces[0] })
    let x = random() * 40
    const end = x + SHINGLE_TILE_W
    while (x < end) {
      // A sliver at the end of the row merges into its neighbour instead.
      const remaining = end - x
      const w = remaining < 32 ? remaining : 20 + random() * 30
      const face = palette.faces[Math.floor(random() * palette.faces.length)]
      const parts = [
        { x, y: top + 0.4, w: w - 1, h: COURSE - 2.6, fill: face },
        { x, y: top + COURSE - 2.4, w, h: 2.4, fill: palette.shadow },
        { x: x + w - 1, y: top, w: 1, h: COURSE - 2, fill: palette.gap },
      ]
      if (random() > 0.55) {
        parts.push({
          x: x + 2 + random() * (w * 0.3),
          y: top + 3.2,
          w: w * (0.25 + random() * 0.3),
          h: COURSE - 5.8,
          fill: palette.tooth,
        })
      }
      for (const part of parts) {
        rects.push(part)
        // Wrap anything crossing the tile edge so the repeat has no seam.
        if (part.x + part.w > SHINGLE_TILE_W) rects.push({ ...part, x: part.x - SHINGLE_TILE_W })
      }
      x += w
    }
  }
  return rects
}

const newShingleRects = shingleRows(NEW_SHINGLES, 11)
const oldShingleRects = shingleRows(OLD_SHINGLES, 23)

function deckFlecks(seed: number, w: number, h: number, colors: string[]) {
  const random = seeded(seed)
  return Array.from({ length: 70 }, () => ({
    x: random() * w,
    y: random() * h,
    w: 4 + random() * 10,
    h: 1.2 + random() * 1.6,
    r: Math.round(random() * 180),
    fill: colors[Math.floor(random() * colors.length)],
  }))
}

const oldDeckFlecks = deckFlecks(5, 320, 160, ['#a07848', '#c8a26f', '#8d6a3f', '#b48a57'])
const newDeckFlecks = deckFlecks(9, 320, 160, ['#c99f5c', '#e8c98c', '#bb914f', '#d8b375'])

function stoneBlocks(seed: number) {
  const random = seeded(seed)
  const colors = ['#d9cfb8', '#cbbd9f', '#e2d9c4', '#bfae8e', '#d3c6aa', '#c7b89a', '#ddd2bb']
  const rowHeights = [14, 20, 16, 22]
  const blocks: Array<{ x: number; y: number; w: number; h: number; fill: string }> = []
  let y = 0
  for (const h of rowHeights) {
    let x = random() * 30
    const end = x + 160
    while (x < end) {
      const remaining = end - x
      const w = remaining < 26 ? remaining : 18 + random() * 28
      const block = { x: x + 1, y: y + 1, w: w - 2, h: h - 2, fill: colors[Math.floor(random() * colors.length)] }
      blocks.push(block)
      if (block.x + block.w > 160) blocks.push({ ...block, x: block.x - 160 })
      x += w
    }
    y += h
  }
  return blocks
}

const stones = stoneBlocks(31)

function iceSpeckles(seed: number) {
  const random = seeded(seed)
  return Array.from({ length: 26 }, () => ({ x: random() * 60, y: random() * 60, r: 0.6 + random() * 0.8 }))
}

const speckles = iceSpeckles(41)

const roofPoints = ROOF_POLY.map(([x, y]) => `${x},${y}`).join(' ')
const garagePoints = GARAGE.poly.map(([x, y]) => `${x},${y}`).join(' ')

export function ScenePatterns() {
  return (
    <defs>
      <linearGradient id="rf-sky" gradientUnits="userSpaceOnUse" x1="0" y1="-700" x2="0" y2="1080">
        <stop id="rf-sky-top" offset="0" stopColor="#7fa6cf" />
        <stop id="rf-sky-mid" offset="0.62" stopColor="#b9cfe0" />
        <stop id="rf-sky-low" offset="1" stopColor="#f2d6b8" />
      </linearGradient>

      <radialGradient id="rf-sun-glow">
        <stop offset="0" stopColor="#fff7e2" stopOpacity="0.9" />
        <stop offset="0.25" stopColor="#ffe9bf" stopOpacity="0.35" />
        <stop offset="1" stopColor="#ffe9bf" stopOpacity="0" />
      </radialGradient>

      <radialGradient id="rf-window-glow">
        <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="rf-glass" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#3f4d5a" />
        <stop offset="0.45" stopColor="#7f94a3" />
        <stop offset="1" stopColor="#56687a" />
      </linearGradient>

      <linearGradient id="rf-lawn" gradientUnits="userSpaceOnUse" x1="0" y1={GROUND_Y} x2="0" y2="2100">
        <stop offset="0" stopColor="#8db95f" />
        <stop offset="0.45" stopColor="#5f9a3b" />
        <stop offset="1" stopColor="#3d7428" />
      </linearGradient>

      <linearGradient id="rf-roof-sheen" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="260" y2="0">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.22" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>

      <linearGradient id="rf-wall-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2b241c" stopOpacity="0.14" />
        <stop offset="0.45" stopColor="#2b241c" stopOpacity="0.03" />
        <stop offset="1" stopColor="#2b241c" stopOpacity="0.08" />
      </linearGradient>

      <linearGradient id="rf-eave-shadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.28" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </linearGradient>

      <linearGradient id="rf-truck-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2f3b46" />
        <stop offset="0.6" stopColor="#8299a8" />
        <stop offset="1" stopColor="#3b4854" />
      </linearGradient>

      <pattern id="rf-shingle-new" patternUnits="userSpaceOnUse" x="0" y={EAVE_Y % SHINGLE_TILE_H} width={SHINGLE_TILE_W} height={SHINGLE_TILE_H}>
        {newShingleRects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
        ))}
      </pattern>

      <pattern id="rf-shingle-old" patternUnits="userSpaceOnUse" x="0" y={EAVE_Y % SHINGLE_TILE_H} width={SHINGLE_TILE_W} height={SHINGLE_TILE_H}>
        {oldShingleRects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
        ))}
      </pattern>

      <pattern id="rf-shingle-new-garage" patternUnits="userSpaceOnUse" x="0" y={GARAGE.eaveY % SHINGLE_TILE_H} width={SHINGLE_TILE_W} height={SHINGLE_TILE_H} href="#rf-shingle-new" />
      <pattern id="rf-shingle-old-garage" patternUnits="userSpaceOnUse" x="0" y={GARAGE.eaveY % SHINGLE_TILE_H} width={SHINGLE_TILE_W} height={SHINGLE_TILE_H} href="#rf-shingle-old" />

      <pattern id="rf-deck" patternUnits="userSpaceOnUse" x="0" y={EAVE_Y % 160} width="320" height="160">
        <rect width="320" height="160" fill="#b98f5c" />
        {oldDeckFlecks.map((f, i) => (
          <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h} fill={f.fill} transform={`rotate(${f.r} ${f.x} ${f.y})`} />
        ))}
        <path d="M0 0.8H320M0 80.8H320M80 0V80M240 0V80M0 80V160M160 80V160M320 80V160" stroke="#6e5232" strokeWidth="1.6" />
      </pattern>

      <pattern id="rf-deck-new" patternUnits="userSpaceOnUse" x="0" y={EAVE_Y % 160} width="320" height="160">
        <rect width="320" height="160" fill="#dbb574" />
        {newDeckFlecks.map((f, i) => (
          <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h} fill={f.fill} transform={`rotate(${f.r} ${f.x} ${f.y})`} />
        ))}
      </pattern>

      <pattern id="rf-underlay" patternUnits="userSpaceOnUse" x="0" y={ICE_TOP % 72} width="400" height="72">
        <rect width="400" height="72" fill="#d9dcdd" />
        <rect y="64" width="400" height="8" fill="#c6cacc" />
        <rect y="70.6" width="400" height="1.4" fill="#9fa6aa" />
        {[20, 120, 220, 320].map((x) => (
          <g key={x}>
            <rect x={x} y="18" width="46" height="2.2" fill="#8f9aa1" />
            <rect x={x + 50} y="46" width="30" height="2.2" fill="#8f9aa1" />
            <circle cx={x + 10} cy="34" r="2.1" fill="#3f6aa1" />
            <circle cx={x + 62} cy="60" r="2.1" fill="#3f6aa1" />
          </g>
        ))}
      </pattern>

      <pattern id="rf-ice" patternUnits="userSpaceOnUse" width="60" height="60">
        <rect width="60" height="60" fill="#2b2e31" />
        {speckles.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#4a4e52" />
        ))}
      </pattern>

      <pattern id="rf-siding" patternUnits="userSpaceOnUse" width="200" height="9">
        <rect width="200" height="9" fill="#f5f4f0" />
        <rect y="6.4" width="200" height="1.4" fill="#e6e4de" />
        <rect y="7.8" width="200" height="1.2" fill="#cfcdc5" />
      </pattern>

      <pattern id="rf-stone" patternUnits="userSpaceOnUse" width="160" height="72">
        <rect width="160" height="72" fill="#a79a80" />
        {stones.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill={b.fill} />
        ))}
      </pattern>

      <pattern id="rf-brick" patternUnits="userSpaceOnUse" width="40" height="12">
        <rect width="40" height="12" fill="#7d4c3a" />
        <path d="M0 5.5H40M0 11.5H40M10 0V5.5M30 6V12" stroke="#b9a58c" strokeWidth="1" />
      </pattern>

      <clipPath id="rf-roof-clip">
        <polygon points={roofPoints} />
      </clipPath>
      <clipPath id="rf-garage-clip">
        <polygon points={garagePoints} />
      </clipPath>

      {/* Layer reveals. The director moves these rects; the union of each
          pair is "full courses so far" plus "the course being worked". */}
      <clipPath id="rf-old-clip">
        <rect id="rf-old-clip-full" x="0" y="0" width="3000" height="2000" />
        <rect id="rf-old-clip-part" x="0" y="0" width="0" height="0" />
      </clipPath>
      <clipPath id="rf-new-clip">
        <rect id="rf-new-clip-full" x="0" y={EAVE_Y + 40} width="3000" height="0" />
        <rect id="rf-new-clip-part" x="0" y="0" width="0" height="0" />
      </clipPath>
      <clipPath id="rf-under-clip">
        <rect id="rf-under-clip-rect" x="0" y={ICE_TOP} width="3000" height="0" />
      </clipPath>
      <clipPath id="rf-ice-clip">
        <rect id="rf-ice-clip-rect" x="0" y="0" width="0" height="2000" />
      </clipPath>
      <clipPath id="rf-garage-old-clip">
        <rect id="rf-garage-old-clip-rect" x="0" y="0" width="3000" height="2000" />
      </clipPath>
      <clipPath id="rf-garage-new-clip">
        <rect id="rf-garage-new-clip-rect" x="0" y={GARAGE.eaveY + 20} width="3000" height="0" />
      </clipPath>
    </defs>
  )
}
