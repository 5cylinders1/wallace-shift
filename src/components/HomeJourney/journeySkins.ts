import { EdgesGeometry, InstancedBufferAttribute, type BufferGeometry } from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

/** Panel boundaries are normalized viewport Y coordinates measured from the
 * top. Each newly arriving panel owns the pixels beneath its leading edge. */
export interface JourneySurfaceReveal {
  amount: number
  headerEdge: number
  findEdge: number
  makeEdge: number
  launchEdge: number
  drawingHeight: number
  blueprintDraw: number
  shimmer: number
  leftTurn: number
  rightTurn: number
  partScale: number
  register: number
  markWidth: number
  aspect: number
}

export function createJourneySurfaceUniforms() {
  return {
    uJourneySurfaceAmount: { value: 0 },
    uJourneyHeaderEdge: { value: 2 },
    uJourneyFindEdge: { value: 2 },
    uJourneyMakeEdge: { value: 2 },
    uJourneyLaunchEdge: { value: 2 },
    uJourneyDrawingHeight: { value: 1 },
    uJourneyBlueprintDraw: { value: 0 },
    uJourneyShimmer: { value: 0 },
  }
}

type SurfaceUniforms = ReturnType<typeof createJourneySurfaceUniforms>

export const finite = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) ? value : fallback
export const unit = (value: number | undefined) => Math.max(0, Math.min(1, finite(value, 0)))

export function updateJourneySurfaceUniforms(uniforms: SurfaceUniforms, reveal?: JourneySurfaceReveal) {
  uniforms.uJourneySurfaceAmount.value = unit(reveal?.amount)
  uniforms.uJourneyHeaderEdge.value = finite(reveal?.headerEdge, 2)
  uniforms.uJourneyFindEdge.value = finite(reveal?.findEdge, 2)
  uniforms.uJourneyMakeEdge.value = finite(reveal?.makeEdge, 2)
  uniforms.uJourneyLaunchEdge.value = finite(reveal?.launchEdge, 2)
  uniforms.uJourneyDrawingHeight.value = Math.max(1, finite(reveal?.drawingHeight, 1))
  uniforms.uJourneyBlueprintDraw.value = unit(reveal?.blueprintDraw)
  uniforms.uJourneyShimmer.value = unit(reveal?.shimmer)
}

export const journeySurfacePars = /* glsl */ `
uniform float uJourneySurfaceAmount;
uniform float uJourneyHeaderEdge;
uniform float uJourneyFindEdge;
uniform float uJourneyMakeEdge;
uniform float uJourneyLaunchEdge;
uniform float uJourneyDrawingHeight;
uniform float uJourneyBlueprintDraw;
uniform float uJourneyShimmer;

float journeyPassedEdge(float edge) {
  // drawingHeight is the physical canvas height, including its pixel ratio.
  // Half a physical pixel matches the antialiasing on the DOM panel edge.
  float y = 1.0 - gl_FragCoord.y / uJourneyDrawingHeight;
  float feather = .5 / uJourneyDrawingHeight;
  return smoothstep(edge - feather, edge + feather, y);
}

float journeyBlueprintMask() {
  return journeyPassedEdge(uJourneyHeaderEdge)
    * (1.0 - journeyPassedEdge(uJourneyFindEdge))
    * uJourneySurfaceAmount;
}
`

export const journeySurfaceComposite = /* glsl */ `
// These are independent treatments of one GLB surface. Their masks use the
// exact same screen boundaries as the panels, rather than whole-logo fades.
float journeyHeaderPassed = journeyPassedEdge(uJourneyHeaderEdge);
float journeyFindPassed = journeyPassedEdge(uJourneyFindEdge);
float journeyMakePassed = journeyPassedEdge(uJourneyMakeEdge);
float journeyLaunchPassed = journeyPassedEdge(uJourneyLaunchEdge);
float journeySoftReflection = 1.0 - exp(-journeyServicesRadiance * 1.3);
float journeyPlaneLight = mix(.42, 1.0, chromeFace);

// Find sits inside the cage as a solid polished object. A wide studio card
// reveals the cap planes while the actual environment adds softer detail;
// the darker sidewalls and directional cyan edge make its depth readable.
float journeyFindCard = exp(-pow((chromeCardCoordinate + .08) / .40, 2.0));
journeyFindCard *= .20 + .80 * pow(abs(chromeReflection.z), 1.2);
vec3 journeyFindEnvironment = vec3(1.0) - exp(-max(totalSpecular, vec3(0.0)) * 2.3);
float journeyFindEdgeDirection = pow(max(0.0, dot(chromeWorldNormal,
  normalize(vec3(-.65, .70, .35)))), 2.0);
float journeyFindRim = (1.0 - chromeFace) * (.35 + journeyEdge * .65)
  * journeyFindEdgeDirection;
vec3 journeySatin = vec3(.009, .015, .020) * mix(.38, 1.0, chromeFace)
  + journeyFindEnvironment * .25
  + vec3(.22, .30, .34) * journeyFindCard * .45 * mix(.18, 1.0, chromeFace)
  + vec3(.055, .22, .31) * journeyFindRim;
vec3 journeyPolished = vec3(.27, .34, .39) * journeyPlaneLight
  + vec3(.72, .85, .91) * journeySoftReflection * .25
  + vec3(.89, .94, 1.0) * chromeCard * .23;

// A restrained thin-film tint follows angle and plane position. The final
// glint travels once under scroll control, with no idle strobe or hard rim.
vec3 journeyFilm = .5 + .5 * cos(vec3(0.0, 2.0944, 4.1888)
  + (1.0 - chromeNoV) * 5.2 + vChromePlane.x * .25);
vec3 journeyPearl = vec3(.40, .47, .58) * journeyPlaneLight
  + vec3(.65, .82, .96) * journeySoftReflection * .23
  + chromeCard * vec3(.13, .16, .20)
  + journeyFilm * (.035 + journeyEdge * .10);
float journeySweepPosition = .5
  + atan(vChromePlane.x + vChromePlane.y * .26) / 3.14159265;
float journeySweepEnvelope = smoothstep(0.0, .10, uJourneyShimmer)
  * (1.0 - smoothstep(.90, 1.0, uJourneyShimmer));
float journeySweep = exp(-pow((journeySweepPosition - uJourneyShimmer) / .032, 2.0))
  * journeySweepEnvelope;
journeyPearl += vec3(.60, .80, 1.0) * journeySweep * mix(.24, .72, chromeFace);

vec3 journeyPanelSkin = mix(journeyServicesBody, vec3(.96), journeyHeaderPassed);
journeyPanelSkin = mix(journeyPanelSkin, journeySatin, journeyFindPassed);
journeyPanelSkin = mix(journeyPanelSkin, journeyPolished, journeyMakePassed);
journeyPanelSkin = mix(journeyPanelSkin, journeyPearl, journeyLaunchPassed);
outgoingLight = mix(outgoingLight, journeyPanelSkin, uJourneySurfaceAmount);
`

/** Blueprint faces are ink-and-paper drafting, not gray metal under the
 * photographic tone mapper. Apply paper white after output conversion. */
export const journeyBlueprintOutput = /* glsl */ `
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(.985), journeyBlueprintMask());
`

type DrawingPoint = [number, number, number]
type DrawingSegment = { start: DrawingPoint; end: DrawingPoint }

const segmentLength = ({ start, end }: DrawingSegment) =>
  Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2])

/** EdgesGeometry emits unrelated edge pairs. Reconnect each cap's authored
 * perimeter before assigning distance, so the pen follows the actual contour
 * instead of revealing disconnected segments in mesh-buffer order. */
function orderedContours(segments: DrawingSegment[], tolerance: number) {
  const key = (point: DrawingPoint) => point.map(value => Math.round(value / tolerance)).join(',')
  const nodes = new Map<string, { point: DrawingPoint; edges: number[] }>()
  segments.forEach((segment, index) => {
    for (const point of [segment.start, segment.end]) {
      const id = key(point)
      let node = nodes.get(id)
      if (!node) { node = { point, edges: [] }; nodes.set(id, node) }
      node.edges.push(index)
    }
  })
  const unused = new Set(segments.map((_, index) => index))
  const contours: DrawingSegment[][] = []
  while (unused.size) {
    const candidates = [...nodes.entries()].filter(([, node]) => node.edges.some(index => unused.has(index)))
    // Native -Z is the upright mark's top. Start at its upper-left corner;
    // prefer an open endpoint if a future authored contour is not closed.
    candidates.sort(([, a], [, b]) => {
      const aOpen = a.edges.filter(index => unused.has(index)).length === 1 ? 0 : 1
      const bOpen = b.edges.filter(index => unused.has(index)).length === 1 ? 0 : 1
      return aOpen - bOpen || a.point[2] - b.point[2] || a.point[0] - b.point[0]
    })
    const first = candidates[0][0]
    let current = first
    const contour: DrawingSegment[] = []
    while (true) {
      const node = nodes.get(current)!
      const available = node.edges.filter(index => unused.has(index))
      if (!available.length) break
      const other = (index: number) => key(segments[index].start) === current
        ? segments[index].end : segments[index].start
      available.sort((a, b) => other(a)[2] - other(b)[2] || other(b)[0] - other(a)[0])
      const selected = available[0]
      const next = other(selected)
      contour.push({ start: node.point, end: next })
      unused.delete(selected)
      current = key(next)
      if (current === first) break
    }
    if (contour.length) contours.push(contour)
  }
  return contours
}

/** Creases come from the authored GLB, excluding coplanar triangle diagonals.
 * Children inherit each half's real pivot rotation and assembly movement. */
export function createJourneyBlueprintEdges(geometry: BufferGeometry, uniforms: SurfaceUniforms) {
  // The real GLB has a six-segment rounded bevel. Its cap-to-bevel angle is
  // smaller than the usual 20–30 degree crease cutoff, which would omit the
  // entire front outline. Extract those shallow creases, then retain only
  // each cap's rim and the long sidewall joins; omit the intermediate bevel
  // rings so this remains a clean drawing rather than a dense wireframe.
  const edgeGeometry = new EdgesGeometry(geometry, 8)
  const source = geometry.getAttribute('position')
  let minDepth = Infinity, maxDepth = -Infinity
  for (let i = 0; i < source.count; i++) {
    minDepth = Math.min(minDepth, source.getY(i))
    maxDepth = Math.max(maxDepth, source.getY(i))
  }
  const depth = maxDepth - minDepth
  const tolerance = Math.max(.000001, depth * .00001)
  const positions = edgeGeometry.getAttribute('position')
  const front: DrawingSegment[] = [], rear: DrawingSegment[] = [], joins: DrawingSegment[] = []
  for (let i = 0; i < positions.count; i += 2) {
    const a = positions.getY(i), b = positions.getY(i + 1)
    const capRim = Math.abs(a - b) <= tolerance
      && (Math.abs(a - minDepth) <= tolerance || Math.abs(a - maxDepth) <= tolerance)
    const sideJoin = Math.abs(a - b) > depth * .6
    if (!capRim && !sideJoin) continue
    const segment: DrawingSegment = {
      start: [positions.getX(i), a, positions.getZ(i)],
      end: [positions.getX(i + 1), b, positions.getZ(i + 1)],
    }
    if (segmentLength(segment) < tolerance) continue
    if (sideJoin) joins.push(segment)
    else if (Math.abs(a - maxDepth) <= tolerance) front.push(segment)
    else rear.push(segment)
  }
  edgeGeometry.dispose()
  const drawing: number[] = [], traceStart: number[] = [], traceEnd: number[] = [], tracePath: number[] = []
  const frontVertices: { point: DrawingPoint; progress: number }[] = []
  let path = 0
  const append = (segment: DrawingSegment, start: number, end: number, pathId: number) => {
    drawing.push(...segment.start, ...segment.end)
    traceStart.push(start); traceEnd.push(end); tracePath.push(pathId)
  }
  for (const [capIndex, cap] of [front, rear].entries()) {
    for (const contour of orderedContours(cap, tolerance)) {
      const perimeter = contour.reduce((sum, segment) => sum + segmentLength(segment), 0)
      let travelled = 0
      contour.forEach((segment, index) => {
        const start = travelled / perimeter
        travelled += segmentLength(segment)
        const end = index === contour.length - 1 ? 1 : travelled / perimeter
        append(segment, start, end, path)
        if (capIndex === 0) frontVertices.push({ point: segment.start, progress: start })
      })
      path++
    }
  }
  const capPathCount = path
  for (const segment of joins) {
    // The short thickness lines follow the closest cap corner as the pen
    // reaches it. They do not pop on before either visible perimeter begins.
    const endpoint = segment.start[1] > segment.end[1] ? segment.start : segment.end
    const closest = frontVertices.reduce<{ point: DrawingPoint; progress: number } | undefined>((best, vertex) => {
      const distance = (point: DrawingPoint) => Math.hypot(point[0] - endpoint[0], point[2] - endpoint[2])
      return !best || distance(vertex.point) < distance(best.point) ? vertex : best
    }, undefined)
    const start = Math.min(.94, closest?.progress ?? 0)
    // Orient each thickness stroke front-to-back, matching its cap start.
    const ordered = segment.start === endpoint ? segment : { start: segment.end, end: segment.start }
    append(ordered, start, start + .06, path++)
  }
  const inkGeometry = new LineSegmentsGeometry().setPositions(drawing)
  inkGeometry.setAttribute('instanceTraceStart', new InstancedBufferAttribute(new Float32Array(traceStart), 1))
  inkGeometry.setAttribute('instanceTraceEnd', new InstancedBufferAttribute(new Float32Array(traceEnd), 1))
  inkGeometry.setAttribute('instanceTracePath', new InstancedBufferAttribute(new Float32Array(tracePath), 1))
  inkGeometry.userData.blueprintCapPathCount = capPathCount
  const material = new LineMaterial({
    color: '#10171d',
    // Screen-space triangles avoid WebGL's one-physical-pixel line limit.
    // LineSegments2 measures the logical viewport before every render, so
    // this weight remains 1.4 CSS pixels on both ordinary and retina screens.
    linewidth: 1.4,
    worldUnits: false,
    alphaToCoverage: true,
    transparent: true,
    opacity: 1,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  material.name = 'HomepageJourney_BlueprintInk'
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float instanceTraceStart;
        attribute float instanceTraceEnd;
        varying float vJourneyTrace;
      `)
      .replace('gl_Position = clip;', `
      gl_Position = clip;
      vJourneyTrace = position.y < .5 ? instanceTraceStart : instanceTraceEnd;
      // A clip-space bias keeps crease ink clear of its coplanar white face
      // without changing source vertices or exposing the hidden rear edges.
      gl_Position.z -= .00004 * gl_Position.w;
    `)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${journeySurfacePars}\nvarying float vJourneyTrace;`)
      .replace('#include <colorspace_fragment>', `
        #include <colorspace_fragment>
        // Derivatives must run before spatially varying panel discards.
        float journeyPenFeather = max(fwidth(vJourneyTrace), .00001);
        float journeyInk = journeyBlueprintMask();
        if (journeyInk < .001 || uJourneyBlueprintDraw <= 0.0) discard;
        // Interpolated arc length follows each closed contour. Only the
        // travelling pen tip is antialiased; completed ink stays fully black.
        if (uJourneyBlueprintDraw < 1.0) journeyInk *= 1.0 - smoothstep(
          uJourneyBlueprintDraw - journeyPenFeather,
          uJourneyBlueprintDraw + journeyPenFeather, vJourneyTrace);
        gl_FragColor.a *= journeyInk;
      `)
  }
  material.customProgramCacheKey = () => 'homepage-journey-blueprint-trace-v4'
  const edges = new LineSegments2(inkGeometry, material)
  edges.name = 'HomepageJourney_BlueprintEdges'
  edges.renderOrder = 2
  edges.visible = false
  return edges
}
