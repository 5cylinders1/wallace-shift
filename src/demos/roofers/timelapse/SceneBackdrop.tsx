import { GROUND_Y } from './geometry'
import { seeded } from './math'

/**
 * Sky, celestial bodies, clouds and the trees behind the house. Each layer
 * has an id the director moves for parallax as the camera rises.
 */

type Circle = { cx: number; cy: number; r: number; fill: string }

const TREE_TONES = {
  near: ['#29452a', '#365c31', '#4a773b', '#6a9a4c', '#8bb764'],
  back: ['#3a5a3c', '#48704a', '#5b8657', '#77a06a', '#93b880'],
}

function canopy(
  seed: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tones: string[],
): Circle[] {
  const random = seeded(seed)
  const circles: Circle[] = []
  // Three passes, dark to light, each smaller and drawn further toward the
  // sun (upper left), so every cluster reads as lit foliage with volume.
  const passes = [
    { count: 26, scale: 1, shift: 0, tones: [tones[0], tones[1]] },
    { count: 22, scale: 0.78, shift: -0.12, tones: [tones[1], tones[2]] },
    { count: 16, scale: 0.55, shift: -0.24, tones: [tones[2], tones[3]] },
    { count: 9, scale: 0.34, shift: -0.34, tones: [tones[3], tones[4]] },
  ]
  for (const pass of passes) {
    for (let i = 0; i < pass.count; i += 1) {
      const angle = random() * Math.PI * 2
      const dist = Math.sqrt(random()) * pass.scale
      const x = cx + Math.cos(angle) * rx * dist + pass.shift * rx * 0.6
      const y = cy + Math.sin(angle) * ry * dist + pass.shift * ry * 0.5
      const r = (rx * 0.22 + random() * rx * 0.2) * (0.55 + pass.scale * 0.45)
      circles.push({ cx: x, cy: y, r, fill: pass.tones[Math.floor(random() * 2)] })
    }
  }
  return circles
}

type Tree = { trunk: { x: number; w: number; top: number }; circles: Circle[] }

function tree(seed: number, cx: number, top: number, w: number, h: number, tones: string[]): Tree {
  const ry = h * 0.36
  return {
    trunk: { x: cx, w: Math.max(14, w * 0.06), top: top + h * 0.55 },
    circles: [
      ...canopy(seed, cx, top + ry, w * 0.5, ry, tones),
      ...canopy(seed + 100, cx + w * 0.08, top + ry * 1.5, w * 0.44, ry * 0.8, tones),
    ],
  }
}

const backTrees: Tree[] = [
  tree(3, 1180, 330, 560, 520, TREE_TONES.back),
  tree(4, 1540, 380, 440, 470, TREE_TONES.back),
  tree(5, 850, 420, 420, 420, TREE_TONES.back),
]

const sideTrees: Tree[] = [
  tree(7, -260, 140, 520, 900, TREE_TONES.near),
  tree(8, 120, 200, 520, 820, TREE_TONES.near),
  tree(9, 420, 260, 470, 760, TREE_TONES.near),
  tree(10, 2090, 170, 580, 880, TREE_TONES.near),
  tree(11, 2420, 120, 560, 940, TREE_TONES.near),
  tree(12, 2760, 220, 520, 820, TREE_TONES.near),
]

const stars = (() => {
  const random = seeded(77)
  return Array.from({ length: 70 }, () => ({
    cx: -900 + random() * 4400,
    cy: -900 + random() * 1400,
    r: 0.9 + random() * 1.8,
    o: 0.35 + random() * 0.65,
  }))
})()

const treeline = (() => {
  const random = seeded(19)
  let d = `M-1400 ${GROUND_Y + 4} L-1400 960`
  for (let x = -1400; x <= 3800; x += 40) {
    d += ` Q${x + 20} ${930 - random() * 70} ${x + 40} ${950 - random() * 30}`
  }
  return `${d} L3800 ${GROUND_Y + 4} Z`
})()

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="120" ry="34" />
      <ellipse cx="-50" cy="-18" rx="60" ry="40" />
      <ellipse cx="30" cy="-30" rx="70" ry="50" />
      <ellipse cx="90" cy="-8" rx="50" ry="30" />
    </g>
  )
}

function TreeShape({ tree }: { tree: Tree }) {
  return (
    <g>
      <path
        d={`M${tree.trunk.x - tree.trunk.w / 2} ${GROUND_Y + 6} L${tree.trunk.x - tree.trunk.w * 0.3} ${tree.trunk.top} L${tree.trunk.x + tree.trunk.w * 0.3} ${tree.trunk.top} L${tree.trunk.x + tree.trunk.w / 2} ${GROUND_Y + 6} Z`}
        fill="#4b3a2b"
      />
      {tree.circles.map((c, i) => (
        <circle key={i} cx={c.cx.toFixed(1)} cy={c.cy.toFixed(1)} r={c.r.toFixed(1)} fill={c.fill} />
      ))}
    </g>
  )
}

export function SceneSky() {
  return (
    <g id="rf-sky-layer">
      <rect x="-4000" y="-4000" width="12000" height="5200" fill="url(#rf-sky)" />
      <g id="rf-celestial">
        <g id="rf-stars" opacity="0">
          {stars.map((s, i) => (
            <circle key={i} cx={s.cx.toFixed(0)} cy={s.cy.toFixed(0)} r={s.r.toFixed(1)} fill="#f4f1e6" opacity={s.o.toFixed(2)} />
          ))}
        </g>
        <g id="rf-sun" transform="translate(300 600)">
          <circle r="240" fill="url(#rf-sun-glow)" />
          <circle id="rf-sun-disc" r="42" fill="#fff4d8" />
        </g>
        <g id="rf-moon" transform="translate(1900 140)" opacity="0">
          <circle r="120" fill="url(#rf-sun-glow)" opacity="0.35" />
          <path d="M0 -32 A32 32 0 1 0 0 32 A25 32 0 1 1 0 -32 Z" fill="#f2efe0" />
        </g>
      </g>
      <g id="rf-clouds" fill="#ffffff" opacity="0.82">
        <Cloud x={-200} y={60} s={1.4} />
        <Cloud x={760} y={150} s={1} />
        <Cloud x={1700} y={40} s={1.6} />
        <Cloud x={2700} y={170} s={1.1} />
      </g>
    </g>
  )
}

export function SceneTrees() {
  return (
    <>
      <g id="rf-treeline">
        <path d={treeline} fill="#86a486" />
      </g>
      <g id="rf-back-trees">
        {backTrees.map((t, i) => (
          <TreeShape key={i} tree={t} />
        ))}
      </g>
      <g id="rf-side-trees">
        {sideTrees.map((t, i) => (
          <TreeShape key={i} tree={t} />
        ))}
      </g>
    </>
  )
}
