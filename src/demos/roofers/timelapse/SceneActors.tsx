import { outfits, type CrewMember } from './crew'
import { TRAILER, TRUCK, YARD_SIGN } from './geometry'
import { mixColor } from './math'

/**
 * Crew figures, vehicles, the yard sign and debris. All of these are
 * positioned and posed by the director every frame; React only builds the
 * nodes once.
 */

export function CrewFigure({ member }: { member: CrewMember }) {
  const o = outfits[member]
  const cap = 'cap' in o && o.cap
  return (
    <g id={`rf-crew-${member}`} opacity="0" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path data-part="legBack" stroke={mixColor(o.pants, '#000000', 0.22)} strokeWidth="12" />
      <path data-part="bootBack" stroke="#3a2a1e" strokeWidth="8" />
      <path data-part="armBack" stroke={mixColor(o.shirt, '#000000', 0.2)} strokeWidth="9.5" />
      <path data-part="torso" stroke={o.vest} strokeWidth="25" />
      <path data-part="stripe" stroke={cap ? o.vest : '#eef2f2'} strokeWidth="3" />
      <path data-part="legFront" stroke={o.pants} strokeWidth="12" />
      <path data-part="bootFront" stroke="#3a2a1e" strokeWidth="8" />
      <g data-part="head">
        <circle r="9.5" fill={o.skin} stroke="none" />
        {cap ? (
          <path d="M-10 -3Q-10 -13 0 -13Q10 -13 10 -3ZM4 -5H17" fill={o.hat} stroke={o.hat} strokeWidth="3" />
        ) : (
          <path d="M-11 -2Q-11 -16 0 -16Q11 -16 11 -2ZM-13 -2H15" fill={o.hat} stroke={o.hat} strokeWidth="2.6" />
        )}
      </g>
      <path data-part="armFront" stroke={o.shirt} strokeWidth="9.5" />
      <g data-part="tool" stroke="none">
        <g data-tool="shovel">
          <path d="M-20 -16L14 50" stroke="#8b6a45" strokeWidth="4" />
          <path d="M6 44L24 48L22 60L4 56Z" fill="#5e6469" />
        </g>
        <g data-tool="nailer">
          <path d="M-4 -8H20V2H12V12H5V2H-4Z" fill="#c8402c" />
          <rect x="12" y="2" width="8" height="5" fill="#2b2e31" />
        </g>
        <g data-tool="tablet">
          <rect x="-4" y="-14" width="15" height="20" rx="2" fill="#1c1f22" transform="rotate(-18)" />
          <rect x="-2" y="-12" width="11" height="15" fill="#6f8ea6" transform="rotate(-18)" />
        </g>
        <g data-tool="bundle">
          <rect x="-30" y="-8" width="48" height="13" fill="#3e4247" />
          <rect x="-12" y="-8" width="8" height="13" fill="#c9a227" />
        </g>
        <g data-tool="sweeper">
          <path d="M0 0L22 58" stroke="#2f3236" strokeWidth="4" />
          <rect x="6" y="56" width="46" height="8" rx="2" fill="#2f3236" />
          <rect x="18" y="57" width="20" height="5" fill="#e0552b" />
          <circle cx="10" cy="66" r="5" fill="#1e2124" />
          <circle cx="48" cy="66" r="5" fill="#1e2124" />
        </g>
        <g data-tool="roll">
          <rect x="-8" y="2" width="34" height="15" rx="7.5" fill="#d9dcdd" />
          <ellipse cx="25" cy="9.5" rx="3" ry="7" fill="#b8bec2" />
        </g>
      </g>
    </g>
  )
}

function Wheel({ id, cx, r }: { id: string; cx: number; r: number }) {
  return (
    <g transform={`translate(${cx} ${-r})`}>
      <circle r={r} fill="#1d1f22" />
      <circle r={r * 0.56} fill="#b9bdc1" />
      <g id={id}>
        <path
          d={Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2
            return `M0 0L${(Math.cos(a) * r * 0.5).toFixed(1)} ${(Math.sin(a) * r * 0.5).toFixed(1)}`
          }).join('')}
          stroke="#7e8489"
          strokeWidth="3"
        />
      </g>
      <circle r={r * 0.16} fill="#5d6267" />
    </g>
  )
}

export function Truck({ company }: { company: string }) {
  return (
    <g id="rf-truck" transform={`translate(${TRUCK.x + 1600} ${TRUCK.baseY})`}>
      <ellipse cx="170" cy="2" rx="190" ry="9" fill="#000" opacity="0.18" />
      {/* ladder rack and ladder */}
      <path d="M20 -96V-142M186 -96V-142M300 -100V-142M14 -142H306" stroke="#2b2f33" strokeWidth="5" fill="none" />
      <path d="M8 -150H310M8 -158H310" stroke="#c0c5c9" strokeWidth="4" />
      <path d={Array.from({ length: 13 }, (_, i) => `M${18 + i * 24} -158V-150`).join('')} stroke="#a7adb2" strokeWidth="3" />
      {/* bed */}
      <path d="M2 -40V-96H198V-40Z" fill="#f2f2ef" />
      <path d="M2 -96H198V-90H2Z" fill="#d9d9d3" />
      <path d="M2 -62H198" stroke="#dedfd9" strokeWidth="2" />
      {/* cab */}
      <path d="M198 -40V-130L206 -137H264L292 -100L334 -94L340 -62V-40Z" fill="#f4f4f1" />
      <path d="M208 -128H260L282 -101H208Z" fill="url(#rf-truck-glass)" />
      <path d="M244 -128V-101" stroke="#2b2f33" strokeWidth="3" />
      <path d="M206 -100V-46M282 -100L284 -46" stroke="#d3d3cd" strokeWidth="2" />
      <rect x="198" y="-48" width="142" height="8" fill="#dcdcd6" />
      <rect x="330" y="-86" width="10" height="9" fill="#f4e6b8" />
      <rect x="2" y="-90" width="6" height="12" fill="#c43b2f" />
      <rect x="334" y="-52" width="12" height="14" fill="#2b2f33" />
      <rect x="-6" y="-52" width="12" height="14" fill="#2b2f33" />
      <rect x="-20" y="-44" width="16" height="6" fill="#2b2f33" />
      {/* Copper stripe and door branding. */}
      <path d="M2 -60H338V-54H2Z" fill="#b4582a" />
      <text
        x="245"
        y="-80"
        textAnchor="middle"
        fontFamily="Archivo, system-ui, sans-serif"
        fontWeight="800"
        fontSize="14"
        fill="#14181c"
        textLength={company.length > 9 ? 76 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {company}
      </text>
      <text x="245" y="-68" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontWeight="700" fontSize="7.5" letterSpacing="1.4" fill="#b4582a">
        ROOFING
      </text>
      <path d="M41 -40A33 33 0 0 1 107 -40M235 -40A33 33 0 0 1 301 -40" fill="#26292c" />
      <Wheel id="rf-truck-wheel-0" cx={74} r={25} />
      <Wheel id="rf-truck-wheel-1" cx={268} r={25} />
    </g>
  )
}

export function Trailer() {
  return (
    <g id="rf-trailer" transform={`translate(${TRAILER.x + 1600} ${TRAILER.baseY})`}>
      <ellipse cx="140" cy="2" rx="160" ry="8" fill="#000" opacity="0.2" />
      <g id="rf-debris-pile" transform="translate(0 -100) scale(1 0) translate(0 100)">
        <path d="M8 -98Q30 -128 66 -114Q96 -140 132 -118Q170 -138 204 -116Q232 -128 254 -98Z" fill="#6c685f" />
        <path d="M40 -112l16 -6 4 8-18 4zM120 -126l20 -4 2 8-20 3zM190 -120l14 -7 5 7-15 6zM84 -110l18 2-2 7-17-2z" fill="#4f4b45" />
        <path d="M150 -112l12 -2 1 6-12 1zM60 -104l10 -5 4 6-11 3z" fill="#a08d72" />
      </g>
      <rect x="0" y="-102" width="264" height="70" fill="#33373b" />
      <rect x="0" y="-106" width="264" height="8" fill="#4b5055" />
      <path d={Array.from({ length: 8 }, (_, i) => `M${18 + i * 32} -98V-34`).join('')} stroke="#2a2d31" strokeWidth="4" />
      <rect x="0" y="-38" width="264" height="6" fill="#26292c" />
      <path d="M264 -40H300" stroke="#2b2e31" strokeWidth="6" />
      <path d="M86 -36A30 30 0 0 1 186 -36" fill="#26292c" />
      <Wheel id="rf-trailer-wheel-0" cx={112} r={21} />
      <Wheel id="rf-trailer-wheel-1" cx={160} r={21} />
      <rect id="rf-trailer-cover" x="-2" y="-112" width="268" height="12" rx="3" fill="#5f7d4c" opacity="0" />
    </g>
  )
}

export function YardSign({ company, phone }: { company: string; phone: string }) {
  return (
    <g id="rf-yard-sign" transform={`translate(${YARD_SIGN.x} ${YARD_SIGN.y}) scale(1 0)`}>
      <path d="M-56 0V-70M56 0V-70" stroke="#2b2e31" strokeWidth="4" />
      <rect x="-80" y="-158" width="160" height="96" fill="#fbfaf7" />
      <rect x="-80" y="-158" width="160" height="22" fill="#14181c" />
      <text x="0" y="-143" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontWeight="700" fontSize="10" letterSpacing="2" fill="#f4efe6">
        ANOTHER ROOF BY
      </text>
      <text
        x="0"
        y="-108"
        textAnchor="middle"
        fontFamily="Archivo, system-ui, sans-serif"
        fontWeight="800"
        fontSize="18"
        fill="#b35d27"
        textLength={company.length > 12 ? 140 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {company}
      </text>
      <text x="0" y="-80" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontWeight="600" fontSize="12" fill="#14181c">
        {phone}
      </text>
    </g>
  )
}

export const DEBRIS_COUNT = 14

export function Debris() {
  const tones = ['#8d897f', '#7f7b73', '#5b5751', '#b98f5c']
  return (
    <g id="rf-debris">
      {Array.from({ length: DEBRIS_COUNT }, (_, i) => (
        <rect key={i} x="-7" y="-3" width="14" height="6" fill={tones[i % tones.length]} opacity="0" />
      ))}
    </g>
  )
}

export function Ropes() {
  return (
    <g id="rf-ropes" fill="none" stroke="#e7b93a" strokeWidth="2">
      <path id="rf-rope-r1" />
      <path id="rf-rope-r2" />
      <path id="rf-rope-r3" />
    </g>
  )
}

export function RoofBundles() {
  return (
    <g id="rf-bundles" opacity="0">
      {[
        [1560, 616],
        [1608, 616],
        [1585, 604],
        [1170, 616],
        [1218, 616],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} data-bundle data-x={x} data-y={y} transform={`translate(${x} ${y})`}>
          <rect x="-22" y="-10" width="44" height="12" fill="#3e4247" />
          <rect x="-6" y="-10" width="9" height="12" fill="#c9a227" />
        </g>
      ))}
    </g>
  )
}

