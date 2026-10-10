/**
 * Builds the roof tool's sample: an aerial-style illustration of a house
 * (public/demos/roofers/sample-roof.svg) and the lookup the tool shows for
 * it (src/demos/roofers/roof/sampleLookup.json): the same shape the live
 * /api/roof-lookup returns, so the sample and live paths share every line
 * of the front end.
 *
 * The house outline is not drawn by hand: the roof planes are rasterised
 * into a mask and traced with `buildingOutline`. The frame is given a
 * synthetic web-Mercator georeference at 0°, 0° so outlines are lat/lng,
 * exactly as live footprints are.
 *
 *   node scripts/roof-sample/generate.ts
 */
import { rm, writeFile } from 'node:fs/promises'
import { distanceToRing, pointInRing, ringArea } from '../../api/_lib/roof/polygon.ts'
import { buildingOutline } from './trace.ts'
import { fromFrame } from '../../src/demos/roofers/roof/geo.ts'
import type { FootprintBuilding, Imagery, LatLng, MapFrame, RoofLookup } from '../../src/demos/roofers/roof/types.ts'
import {
  PIXELS,
  SIDEWALK_Y,
  STREET_Y,
  TILE_METERS,
  chimney,
  driveway,
  neighbours,
  pin,
  planes,
  ridges,
  shed,
  valleys,
  walk,
  type SamplePlane,
  type Vec,
} from './geometry.ts'

const PX = PIXELS / TILE_METERS
/** The published frame: the central 34 m of the tile, so the house fills it. */
const CROP = { x: 3, y: 3.5, size: 34 }
const SQFT_PER_M2 = 10.7639
const root = new URL('../../', import.meta.url)

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                     */
/* ------------------------------------------------------------------ */

const px = ([x, y]: Vec): Vec => [x * PX, y * PX]
const pts = (polygon: Vec[]) => polygon.map((p) => px(p).map((v) => v.toFixed(1)).join(',')).join(' ')

function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mix = (hex: string, factor: number) => {
  const value = parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * factor)))
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`
}

/* ------------------------------------------------------------------ */
/* Illustration                                                         */
/* ------------------------------------------------------------------ */

/** Sun from the south-east: south and east faces lit, north in shade. */
const LIGHT: Record<number, number> = { 0: 0.78, 90: 1.04, 180: 1.12, 270: 0.9 }
const ROOF = '#857f74'
const random = seeded(7)

function coursesFor(plane: SamplePlane, index: number): string {
  // Shingle courses run along the eave: perpendicular to the down-slope.
  const horizontal = plane.azimuthDeg === 0 || plane.azimuthDeg === 180
  const xs = plane.polygon.map((p) => p[0] * PX)
  const ys = plane.polygon.map((p) => p[1] * PX)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const step = 3.2
  const lines: string[] = []
  if (horizontal) for (let y = y0 + step / 2; y < y1; y += step) lines.push(`M${x0.toFixed(1)} ${y.toFixed(1)}H${x1.toFixed(1)}`)
  else for (let x = x0 + step / 2; x < x1; x += step) lines.push(`M${x.toFixed(1)} ${y0.toFixed(1)}V${y1.toFixed(1)}`)
  // Tab joints, staggered, so the courses read as shingles.
  const joints: string[] = []
  if (horizontal) {
    for (let y = y0; y < y1; y += step) {
      const shift = random() * 6
      for (let x = x0 + shift; x < x1; x += 5.5 + random() * 4) joints.push(`M${x.toFixed(1)} ${y.toFixed(1)}v${step.toFixed(1)}`)
    }
  } else {
    for (let x = x0; x < x1; x += step) {
      const shift = random() * 6
      for (let y = y0 + shift; y < y1; y += 5.5 + random() * 4) joints.push(`M${x.toFixed(1)} ${y.toFixed(1)}h${step.toFixed(1)}`)
    }
  }
  return `<g clip-path="url(#plane-${index})"><path d="${lines.join('')}" stroke="#2b2824" stroke-width="0.7" opacity="0.32"/><path d="${joints.join('')}" stroke="#2b2824" stroke-width="0.5" opacity="0.22"/></g>`
}

function canopy(cx: number, cy: number, r: number, seed: number, tones: string[]): string {
  const rand = seeded(seed)
  const parts: string[] = []
  for (let pass = 0; pass < 4; pass += 1) {
    const count = 14 - pass * 2
    for (let i = 0; i < count; i += 1) {
      const angle = rand() * Math.PI * 2
      const dist = Math.sqrt(rand()) * r * (1 - pass * 0.18)
      const x = cx + Math.cos(angle) * dist + pass * r * 0.06
      const y = cy + Math.sin(angle) * dist + pass * r * 0.05
      const rr = r * (0.34 - pass * 0.05) * (0.8 + rand() * 0.4)
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${tones[pass]}"/>`)
    }
  }
  return parts.join('')
}

function tree(xm: number, ym: number, rm: number, seed: number): { shadow: string; crown: string } {
  const [x, y] = px([xm, ym])
  const r = rm * PX
  return {
    shadow: `<ellipse cx="${(x - r * 0.42).toFixed(1)}" cy="${(y - r * 0.38).toFixed(1)}" rx="${(r * 1.02).toFixed(1)}" ry="${(r * 0.96).toFixed(1)}" fill="#1d2a16" opacity="0.34"/>`,
    crown: canopy(x, y, r, seed, ['#2f4a25', '#3f6330', '#557f3d', '#77a052']),
  }
}

function neighbour(x0: number, y0: number, w: number, h: number, ridgeVertical: boolean): string {
  const [ax, ay] = px([x0, y0])
  const W = w * PX
  const H = h * PX
  const tone = '#76726c'
  const shade = mix(tone, 0.82)
  const lit = mix(tone, 1.1)
  const halves = ridgeVertical
    ? `<rect x="${ax}" y="${ay}" width="${W / 2}" height="${H}" fill="${shade}"/><rect x="${ax + W / 2}" y="${ay}" width="${W / 2}" height="${H}" fill="${lit}"/><path d="M${ax + W / 2} ${ay}V${ay + H}" stroke="#a8a297" stroke-width="1.2"/>`
    : `<rect x="${ax}" y="${ay}" width="${W}" height="${H / 2}" fill="${shade}"/><rect x="${ax}" y="${ay + H / 2}" width="${W}" height="${H / 2}" fill="${lit}"/><path d="M${ax} ${ay + H / 2}H${ax + W}" stroke="#a8a297" stroke-width="1.2"/>`
  return `<rect x="${ax - 8}" y="${ay - 8}" width="${W}" height="${H}" fill="#14100c" opacity="0.22"/>${halves}`
}

function shedSvg(): string {
  const [x0, y0] = px(shed[0])
  const [x1, y1] = px(shed[2])
  const mid = (y0 + y1) / 2
  return `<rect x="${(x0 - 7).toFixed(1)}" y="${(y0 - 7).toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" fill="#14100c" opacity="0.25"/>
<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(mid - y0).toFixed(1)}" fill="${mix('#6f5a49', 0.82)}"/>
<rect x="${x0.toFixed(1)}" y="${mid.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - mid).toFixed(1)}" fill="${mix('#6f5a49', 1.1)}"/>
<path d="M${x0.toFixed(1)} ${mid.toFixed(1)}H${x1.toFixed(1)}" stroke="#a89882" stroke-width="1.2"/>`
}

function illustration(): string {
  const stripes: string[] = []
  for (let i = -20; i < 40; i += 1) {
    const x = i * 30
    if (i % 2 === 0) stripes.push(`<path d="M${x} 0L${x + 400} 400H${x + 430}L${x + 30} 0Z"/>`)
  }

  const clips = planes.map((plane, i) => `<clipPath id="plane-${i}"><polygon points="${pts(plane.polygon)}"/></clipPath>`).join('')
  const shadow = planes
    .map((plane) => `<polygon points="${plane.polygon.map((p) => px([p[0] - 0.95, p[1] - 0.85]).map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`)
    .join('')
  const roof = planes
    .map((plane, i) => {
      const fill = mix(ROOF, LIGHT[plane.azimuthDeg] ?? 1)
      return `<polygon points="${pts(plane.polygon)}" fill="${fill}"/>${coursesFor(plane, i)}`
    })
    .join('')
  const edges = planes.map((plane) => `<polygon points="${pts(plane.polygon)}" fill="none" stroke="#3a3631" stroke-width="0.6" opacity="0.5"/>`).join('')
  const ridgeLines = ridges.map(([a, b]) => `M${px(a).join(' ')}L${px(b).join(' ')}`).join('')
  const valleyLines = valleys.map(([a, b]) => `M${px(a).join(' ')}L${px(b).join(' ')}`).join('')

  const trees = [tree(5.2, 9.5, 5.2, 3), tree(35.5, 6.2, 4.4, 9), tree(4.8, 31.5, 3.6, 5), tree(13.4, 9.6, 2.6, 11), tree(37.6, 29, 3.2, 13)]

  const vents = [px([16.2, 15.9]), px([24.8, 16.4])].map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#2a2724"/><circle cx="${(x - 0.6).toFixed(1)}" cy="${(y - 0.6).toFixed(1)}" r="1.1" fill="#6c675f"/>`)

  const [carX, carY] = px([28.9, 31.2])

  const view = [CROP.x * PX, CROP.y * PX, CROP.size * PX, CROP.size * PX].map((v) => v.toFixed(1)).join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" width="800" height="800">
<defs>${clips}
<linearGradient id="vignette" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1410" stop-opacity="0.18"/><stop offset="0.5" stop-color="#0d1410" stop-opacity="0"/><stop offset="1" stop-color="#0d1410" stop-opacity="0.12"/></linearGradient>
</defs>
<rect width="${PIXELS}" height="${PIXELS}" fill="#6e9748"/>
<g fill="#7fa857" opacity="0.55">${stripes.join('')}</g>
<path d="M0 ${(3.2 * PX).toFixed(1)}H${PIXELS}M${(4.2 * PX).toFixed(1)} 0V${(SIDEWALK_Y * PX - 6).toFixed(1)}M${(37.9 * PX).toFixed(1)} 0V${(SIDEWALK_Y * PX - 6).toFixed(1)}" stroke="#d9d2bd" stroke-width="1.2" opacity="0.7"/>
${neighbours.map((n) => neighbour(n.x, n.y, n.w, n.h, n.ridgeVertical)).join('')}
<polygon points="${pts(driveway)}" fill="#cfcac0"/>
<path d="M${px([26.6, 28]).join(' ')}L${px([33.2, 28]).join(' ')}M${px([26.4, 33.5]).join(' ')}L${px([33.4, 33.5]).join(' ')}" stroke="#b8b2a6" stroke-width="0.8"/>
<polygon points="${pts(walk)}" fill="#d6cfc1"/>
<rect x="0" y="${(SIDEWALK_Y * PX).toFixed(1)}" width="${PIXELS}" height="${(1.3 * PX).toFixed(1)}" fill="#d8d3c8"/>
<rect x="0" y="${(STREET_Y * PX).toFixed(1)}" width="${PIXELS}" height="${PIXELS}" fill="#5c6065"/>
<rect x="0" y="${(STREET_Y * PX).toFixed(1)}" width="${PIXELS}" height="1.4" fill="#bdb7ab"/>
<g fill="#1a1510" opacity="0.3">${shadow}</g>
${trees.map((t) => t.shadow).join('')}
<g transform="translate(${carX.toFixed(1)} ${carY.toFixed(1)})"><rect x="-9" y="-20" width="18" height="40" rx="5" fill="#1d2a3a"/><rect x="-7.4" y="-11" width="14.8" height="9" rx="2" fill="#6d8396"/><rect x="-7.4" y="6" width="14.8" height="6" rx="2" fill="#5b7184"/></g>
${shedSvg()}
${roof}
${edges}
<path d="${valleyLines}" stroke="#3b3732" stroke-width="1.3" stroke-linecap="round"/>
<path d="${ridgeLines}" stroke="#b9b3a6" stroke-width="1.7" stroke-linecap="round"/>
${vents.join('')}
<polygon points="${pts(chimney.map(([x, y]) => [x - 0.5, y - 0.45] as Vec))}" fill="#14100c" opacity="0.35"/>
<polygon points="${pts(chimney)}" fill="#c2b49a"/>
<polygon points="${pts(chimney)}" fill="none" stroke="#8d806b" stroke-width="1"/>
<rect x="${(px(chimney[0])[0] + 3).toFixed(1)}" y="${(px(chimney[0])[1] + 3).toFixed(1)}" width="4" height="4" fill="#3b342c"/>
${trees.map((t) => t.crown).join('')}
<rect width="${PIXELS}" height="${PIXELS}" fill="url(#vignette)"/>
</svg>
`
}

/* ------------------------------------------------------------------ */
/* Measurement                                                          */
/* ------------------------------------------------------------------ */

/* Synthetic georeference: an 800 px frame over the 34 m crop, at 0°, 0°. */
const FRAME: MapFrame = {
  width: 800,
  height: 800,
  center: { lat: 0, lng: 0 },
  zoom: Math.log2(156543.03392 / (CROP.size / 800)),
}

const IMAGERY: Imagery = {
  src: '/demos/roofers/sample-roof.svg',
  provider: 'sample',
  credits: [{ text: 'Illustration · not a real property' }],
}

/** Tile metres → frame pixels → lat/lng. */
const toFramePx = ([x, y]: Vec): [number, number] => [((x - CROP.x) / CROP.size) * 800, ((y - CROP.y) / CROP.size) * 800]
const toLatLng = (point: Vec): LatLng => {
  const { lat, lng } = fromFrame(toFramePx(point), FRAME)
  return { lat: Math.round(lat * 1e9) / 1e9, lng: Math.round(lng * 1e9) / 1e9 }
}

function building(id: string, ring: Vec[]): FootprintBuilding {
  return {
    id,
    ring: ring.map(toLatLng),
    areaSqFt: Math.round(ringArea(ring) * SQFT_PER_M2),
    distanceM: Math.round(distanceToRing(pin, ring) * 10) / 10,
    corners: ring.length,
  }
}

function lookup(): RoofLookup {
  const mask = new Uint8Array(PIXELS * PIXELS)
  for (let y = 0; y < PIXELS; y += 1) {
    for (let x = 0; x < PIXELS; x += 1) {
      const point: Vec = [(x + 0.5) / PX, (y + 0.5) / PX]
      if (planes.some((plane) => pointInRing(point, plane.polygon))) mask[y * PIXELS + x] = 1
    }
  }
  const all = planes.flatMap((plane) => plane.polygon.map(px))
  const box = {
    x0: Math.min(...all.map((p) => p[0])),
    y0: Math.min(...all.map((p) => p[1])),
    x1: Math.max(...all.map((p) => p[0])),
    y1: Math.max(...all.map((p) => p[1])),
  }
  const traced = buildingOutline(mask, PIXELS, PIXELS, { seed: [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2], box, tolerance: 1.6 })
  const house = traced.polygons[0].map(([x, y]) => [x / PX, y / PX] as Vec)

  const rect = (x: number, y: number, w: number, h: number): Vec[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
  const buildings = [
    building('sample-house', house),
    building('sample-shed', shed),
    ...neighbours.map((n, i) => building(`sample-neighbour-${i + 1}`, rect(n.x, n.y, n.w, n.h))),
  ].sort((a, b) => a.distanceM - b.distanceM)

  return {
    ok: true,
    source: 'sample',
    address: { formatted: 'Sample house (illustration)', street: null, city: null, state: null, zip: null },
    location: toLatLng(pin),
    precision: 'rooftop',
    buildings,
    home: 'sample-house',
    frame: FRAME,
    imagery: IMAGERY,
    credits: [],
    measure: null,
  }
}

const svg = illustration()
const sample = lookup()
await writeFile(new URL('public/demos/roofers/sample-roof.svg', root), svg)
await writeFile(new URL('src/demos/roofers/roof/sampleLookup.json', root), `${JSON.stringify(sample, null, 2)}\n`)
await rm(new URL('src/demos/roofers/roof/sampleMeasurement.json', root), { force: true })
console.log(
  `sample lookup: ${sample.buildings.map((b) => `${b.id} ${b.areaSqFt} sq ft (${b.corners} corners, ${b.distanceM} m)`).join('; ')}; svg ${(svg.length / 1024).toFixed(1)} KB`,
)
