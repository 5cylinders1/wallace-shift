import { CURB_Y, GROUND_Y, SIDEWALK_Y } from './geometry'

/**
 * The lawn, mowing stripes, front walk, driveway, sidewalk and street. The
 * whole group is scaled vertically from the house's base line by the
 * director, which is what makes the lawn deepen as the camera rises.
 */

const VANISH = { x: 1150, y: 700 }

/** x of a line through the vanishing point at a given depth. */
const along = (xAtGround: number, y: number) =>
  VANISH.x + (xAtGround - VANISH.x) * ((y - VANISH.y) / (GROUND_Y - VANISH.y))

function stripes() {
  const polys: string[] = []
  for (let i = -16; i < 16; i += 2) {
    const a = VANISH.x + i * 105
    const b = VANISH.x + (i + 1) * 105
    polys.push(`${a},${GROUND_Y} ${b},${GROUND_Y} ${along(b, SIDEWALK_Y)},${SIDEWALK_Y} ${along(a, SIDEWALK_Y)},${SIDEWALK_Y}`)
  }
  return polys
}

const stripePolys = stripes()

const walk = [
  [982, GROUND_Y],
  [1018, GROUND_Y],
  [along(1018, SIDEWALK_Y), SIDEWALK_Y],
  [along(982, SIDEWALK_Y), SIDEWALK_Y],
]
  .map(([x, y]) => `${x.toFixed(1)},${y}`)
  .join(' ')

const walkJoints = [1100, 1160, 1240, 1330].map((y) => {
  const left = along(982, y)
  const right = along(1018, y)
  return `M${left.toFixed(1)} ${y}H${right.toFixed(1)}`
})

export function SceneGround() {
  return (
    <g id="rf-ground">
      <rect x="-4000" y={GROUND_Y - 6} width="12000" height="4000" fill="url(#rf-lawn)" />
      <g fill="#ffffff" opacity="0.075">
        {stripePolys.map((points) => (
          <polygon key={points} points={points} />
        ))}
      </g>
      {/* Soft contact shadow where the house meets the lawn. */}
      <ellipse cx="1240" cy={GROUND_Y + 10} rx="820" ry="26" fill="#1e3315" opacity="0.28" />

      <polygon points={walk} fill="#cdc6b7" />
      <path d={walkJoints.join('')} stroke="#b3ab9b" strokeWidth="2" />

      {/* Driveway: an apron in front of the garage that turns to the street. */}
      <path
        d={`M1560 ${GROUND_Y}H2330C2380 ${GROUND_Y} 2400 1120 2430 1180L2560 ${SIDEWALK_Y}H2150L2090 1236H1530Z`}
        fill="#d3cfc6"
      />
      <path d={`M1530 1236H2090`} stroke="#b9b3a7" strokeWidth="5" />
      <path d={`M1940 ${GROUND_Y + 2}L1925 1234M2280 ${GROUND_Y + 2}L2214 1236M2150 1300H2480`} stroke="#bdb7ab" strokeWidth="2" />
      <ellipse cx="1760" cy="1232" rx="300" ry="6" fill="#000" opacity="0.06" />

      {/* Sidewalk, curb and street. */}
      <rect x="-4000" y={SIDEWALK_Y} width="12000" height={CURB_Y - SIDEWALK_Y} fill="#d8d3c8" />
      <path
        d={Array.from({ length: 60 }, (_, i) => `M${-1800 + i * 120} ${SIDEWALK_Y}V${CURB_Y}`).join('')}
        stroke="#c4beb2"
        strokeWidth="2"
      />
      <rect x="-4000" y={CURB_Y} width="12000" height="10" fill="#bdb7ab" />
      <rect x="-4000" y={CURB_Y + 10} width="12000" height="1400" fill="#5d6166" />
      <rect x="-4000" y={CURB_Y + 10} width="12000" height="6" fill="#4a4e52" />
      <path d={`M-4000 ${CURB_Y + 170}H8000`} stroke="#e6dfb8" strokeWidth="5" strokeDasharray="60 50" opacity="0.8" />

      {/* Mailbox at the curb. */}
      <g transform={`translate(1240 ${SIDEWALK_Y - 4})`}>
        <rect x="-3" y="-62" width="6" height="62" fill="#2b2e31" />
        <path d="M-17 -62V-80A10 10 0 0 1 -7 -90H11A10 10 0 0 1 21 -80V-62Z" fill="#2b2e31" />
        <rect x="16" y="-86" width="3" height="16" fill="#b4582a" />
      </g>
    </g>
  )
}

