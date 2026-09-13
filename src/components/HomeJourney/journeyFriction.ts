import { BufferAttribute, BufferGeometry, DoubleSide, Group, IcosahedronGeometry,
  Mesh, Points, ShaderMaterial, Vector2, WireframeGeometry } from 'three'

/** The scene uses the journey renderer's world units: viewport Y is +/-1.
 * Panel edges are measured from the top of its physical drawing buffer. */
export interface JourneyFrictionState {
  visible: number
  time: number
  findEdge: number
  makeEdge: number
  drawingHeight: number
  pixelRatio: number
  centerX: number
  centerY: number
  logoWidth: number
  viewportWidth: number
  viewportHeight: number
  headerOffset: number
  pointerX: number
  pointerY: number
  pointerActive: boolean
}

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback
const unit = (value: number) => Math.max(0, Math.min(1, finite(value)))

// Shared by both effects: the moving panel edge reveals their actual pixels,
// so neither the particles nor the cage leak onto adjacent process skins.
const panelMask = /* glsl */ `
uniform float uVisible;
uniform float uFindEdge;
uniform float uMakeEdge;
uniform float uHeaderEdge;
uniform float uDrawingHeight;
float frictionPanelMask() {
  float y = 1.0 - gl_FragCoord.y / uDrawingHeight;
  float feather = .5 / uDrawingHeight;
  return smoothstep(uFindEdge - feather, uFindEdge + feather, y)
    * (1.0 - smoothstep(uMakeEdge - feather, uMakeEdge + feather, y))
    * smoothstep(uHeaderEdge - feather, uHeaderEdge + feather, y)
    * uVisible;
}
`

/** Screen-space ribbons keep a fine, consistent line on retina displays.
 * Only the geodesic's unique triangle edges are retained; there are no faces. */
function cageGeometry() {
  const polyhedron = new IcosahedronGeometry(.70, 1)
  const wireframe = new WireframeGeometry(polyhedron)
  const edges = wireframe.getAttribute('position')
  const positions: number[] = [], starts: number[] = [], ends: number[] = []
  const corners: number[] = [], seeds: number[] = []
  const triangles = [[0, -1], [1, -1], [0, 1], [0, 1], [1, -1], [1, 1]]
  for (let edge = 0; edge < edges.count; edge += 2) {
    const a = [edges.getX(edge), edges.getY(edge), edges.getZ(edge)]
    const b = [edges.getX(edge + 1), edges.getY(edge + 1), edges.getZ(edge + 1)]
    for (const [along, side] of triangles) {
      positions.push(...(along ? b : a))
      starts.push(...a); ends.push(...b)
      corners.push(along, side)
      seeds.push(((edge / 2) * .61803398875) % 1)
    }
  }
  polyhedron.dispose()
  wireframe.dispose()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('aStart', new BufferAttribute(new Float32Array(starts), 3))
  geometry.setAttribute('aEnd', new BufferAttribute(new Float32Array(ends), 3))
  geometry.setAttribute('aCorner', new BufferAttribute(new Float32Array(corners), 2))
  geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1))
  return geometry
}

function particleGeometry() {
  const count = 5200
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  let seed = 0x4a6f7572
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 0; i < count; i++) {
    // Stable normalized viewport seeds. The cage never translates or scales
    // this buffer: nearby particles deform around its moving world position.
    positions.set([(random() - .5) * 2.12, (random() - .5) * 2.12, (random() - .5) * 1.16], i * 3)
    seeds.set([random(), random(), random(), random()], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4))
  return geometry
}

export function createJourneyFriction() {
  const uniforms = {
    uVisible: { value: 0 },
    uTime: { value: 0 },
    uFindEdge: { value: 2 },
    uMakeEdge: { value: 2 },
    uHeaderEdge: { value: 0 },
    uDrawingHeight: { value: 1 },
    uPixelRatio: { value: 1 },
    uLogoWidth: { value: 1 },
    uCenter: { value: new Vector2() },
    uAspect: { value: 1 },
    uPointer: { value: new Vector2() },
    uPointerActive: { value: 0 },
    uPointerRadius: { value: .3 },
    uLogoVelocity: { value: new Vector2() },
  }
  const cageMaterial = new ShaderMaterial({
    name: 'JourneyFriction_CageMaterial', uniforms,
    transparent: true, depthTest: true, depthWrite: false,
    side: DoubleSide, toneMapped: false,
    vertexShader: /* glsl */ `
      attribute vec3 aStart;
      attribute vec3 aEnd;
      attribute vec2 aCorner;
      attribute float aSeed;
      uniform float uDrawingHeight;
      uniform float uPixelRatio;
      uniform float uLogoWidth;
      uniform vec2 uCenter;
      varying float vAcross;
      varying float vAlong;
      varying float vSeed;
      varying float vDepth;
      void main() {
        vec4 start = projectionMatrix * modelViewMatrix * vec4(aStart, 1.0);
        vec4 end = projectionMatrix * modelViewMatrix * vec4(aEnd, 1.0);
        float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
        vec2 direction = (end.xy / end.w - start.xy / start.w) * vec2(aspect, 1.0);
        direction /= max(length(direction), .00001);
        vec2 perpendicular = vec2(-direction.y, direction.x) / vec2(aspect, 1.0);
        vec4 clip = mix(start, end, aCorner.x);
        // Screen-space ink has enough weight to read across the metal face;
        // the extra ribbon width is reserved for localized light packets.
        clip.xy += perpendicular * aCorner.y * (4.4 * uPixelRatio / uDrawingHeight) * clip.w;
        gl_Position = clip;
        vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
        vDepth = world.z / uLogoWidth;
        vAcross = aCorner.y;
        vAlong = aCorner.x;
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      ${panelMask}
      uniform float uTime;
      varying float vAcross;
      varying float vAlong;
      varying float vSeed;
      varying float vDepth;
      void main() {
        float mask = frictionPanelMask();
        if (mask < .001) discard;
        float edge = abs(vAcross);
        float ink = 1.0 - smoothstep(.22, .40, edge);
        float nearSide = smoothstep(-.55, .50, vDepth);
        float head = fract(uTime * .125 + vSeed * 7.31);
        float packet = exp(-pow((vAlong - head) / .12, 2.0));
        packet *= smoothstep(.03, .15, head) * (1.0 - smoothstep(.80, .98, head));
        // Offset every strand so the network carries light in small groups.
        packet *= smoothstep(.62, .93, .5 + .5 * sin(vSeed * 29.0 + uTime * .31));
        float halo = exp(-edge * edge * 3.5) * packet * .38;
        float alpha = min(1.0, ink * mix(.16, .86, nearSide) + halo) * mask;
        // A turquoise trail remains distinct on the pale panel; a tiny cool
        // white head supplies the light cue without washing out the strand.
        float lightHead = exp(-pow((vAlong - head) / .028, 2.0)) * packet;
        vec3 strand = mix(vec3(.20, .33, .40), vec3(.06, .39, .49), nearSide);
        vec3 color = mix(strand, vec3(.04, .72, .85), packet);
        color = mix(color, vec3(.87, .99, 1.0), lightHead * ink * .92);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
  const particlesMaterial = new ShaderMaterial({
    name: 'JourneyFriction_ParticleMaterial', uniforms,
    transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uAspect;
      uniform float uLogoWidth;
      uniform vec2 uCenter;
      uniform vec2 uLogoVelocity;
      uniform vec2 uPointer;
      uniform float uPointerActive;
      uniform float uPointerRadius;
      varying float vAlpha;
      varying float vTint;
      void main() {
        // Slow, unequal currents fill the scene. Their seed positions stay
        // in world space while the logo moves through them like an obstacle.
        vec3 point = position;
        point.x *= uAspect;
        point.x += sin(uTime * .23 + aSeed.x * 23.0 + position.y * 5.0) * .075;
        point.y += sin(uTime * .19 + aSeed.y * 19.0 + position.x * 4.0) * .065;
        point.z += sin(uTime * .17 + aSeed.w * 17.0) * .04;
        float foreground = smoothstep(-.6, .6, point.z);
        float cageRadius = uLogoWidth * .77;
        vec2 fromCage = point.xy - uCenter;
        float cageDistance = max(length(fromCage), .0001);
        vec2 cageDirection = fromCage / cageDistance;
        float pressure = exp(-pow(cageDistance / max(.001, cageRadius), 2.0));
        // Resistance visibly gathers into a rim around the moving cage.
        // A directional wake bends the surrounding lanes after each bounce.
        point.xy += cageDirection * pressure * cageRadius * mix(.48, .77, foreground);
        float wake = exp(-pow(cageDistance / max(.001, cageRadius * 1.9), 2.0));
        point.xy += uLogoVelocity * wake * .13;
        vec2 tangent = vec2(-cageDirection.y, cageDirection.x);
        point.xy += tangent * pressure * sin(uTime * 1.2 + aSeed.w * 12.0) * .035;
        vec2 fromPointer = point.xy - uPointer;
        float pointerDistance = max(length(fromPointer), .0001);
        float pointerPressure = exp(-pow(pointerDistance / uPointerRadius, 2.0)) * uPointerActive;
        point.xy += fromPointer / pointerDistance * pointerPressure * uPointerRadius * .82;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
        gl_PointSize = (1.25 + foreground * 1.7 + aSeed.w * .8
          + min(.8, pressure * .5 + pointerPressure * .5)) * uPixelRatio;
        vec2 screen = vec2(point.x / uAspect * .5 + .5, .5 - point.y * .5);
        float copyZone = (1.0 - smoothstep(.35, .48, screen.x))
          * (1.0 - smoothstep(.59, .75, screen.y));
        float viewportFade = (1.0 - smoothstep(1.0, 1.06, abs(point.x / uAspect)))
          * (1.0 - smoothstep(1.0, 1.06, abs(point.y)));
        vAlpha = mix(.43, .82, foreground) * mix(1.0, .15, copyZone) * viewportFade;
        vTint = min(1.0, aSeed.y * .70 + pressure * .25 + pointerPressure * .30);
      }
    `,
    fragmentShader: /* glsl */ `
      ${panelMask}
      varying float vAlpha;
      varying float vTint;
      void main() {
        float mask = frictionPanelMask();
        if (mask < .001) discard;
        float radius = length(gl_PointCoord - .5) * 2.0;
        float core = 1.0 - smoothstep(.45, 1.0, radius);
        if (core < .001) discard;
        vec3 ink = mix(vec3(.06, .20, .29), vec3(.11, .53, .64), vTint);
        gl_FragColor = vec4(ink, core * vAlpha * mask);
      }
    `,
  })
  const cage = new Mesh(cageGeometry(), cageMaterial)
  cage.name = 'JourneyFriction_Cage'
  cage.frustumCulled = false
  // Transparent GLB faces write their depth first. Front cage strands then
  // draw across the face; hidden rear strands correctly fail the depth test.
  cage.renderOrder = 3
  const cageRig = new Group()
  cageRig.name = 'JourneyFriction_CageRig'
  cageRig.add(cage)
  const particles = new Points(particleGeometry(), particlesMaterial)
  particles.name = 'JourneyFriction_Particles'
  particles.frustumCulled = false
  particles.renderOrder = 4
  const group = new Group()
  group.name = 'JourneyFriction'
  group.visible = false
  group.add(particles, cageRig)
  let disposed = false
  let previousTime: number | null = null
  const previousCenter = new Vector2()

  return {
    group,
    update(state: JourneyFrictionState) {
      if (disposed) return
      group.visible = unit(state.visible) > .001
        && finite(state.findEdge, 2) < 1 && finite(state.makeEdge, 2) > 0
      if (!group.visible) {
        previousTime = null
        uniforms.uLogoVelocity.value.set(0, 0)
        uniforms.uPointerActive.value = 0
        return
      }
      const time = Math.max(0, finite(state.time))
      const width = Math.max(.001, finite(state.logoWidth, 1))
      const centerX = finite(state.centerX), centerY = finite(state.centerY)
      const height = Math.max(1, finite(state.viewportHeight, 1))
      const delta = previousTime === null ? 0 : Math.max(0, Math.min(.1, time - previousTime))
      const smoothing = 1 - Math.exp(-delta * 10)
      if (delta > .0001) {
        const vx = Math.max(-2, Math.min(2, (centerX - previousCenter.x) / delta))
        const vy = Math.max(-2, Math.min(2, (centerY - previousCenter.y) / delta))
        uniforms.uLogoVelocity.value.x += (vx - uniforms.uLogoVelocity.value.x) * smoothing
        uniforms.uLogoVelocity.value.y += (vy - uniforms.uLogoVelocity.value.y) * smoothing
      }
      previousCenter.set(centerX, centerY)
      previousTime = time
      cageRig.position.set(centerX, centerY, 0)
      cageRig.scale.setScalar(width)
      // Only the cage follows the GLB. The viewport field stays put.
      cage.rotation.set(.24 + time * .071, .35 + time * .105, -.10)
      uniforms.uTime.value = time
      uniforms.uVisible.value = unit(state.visible)
      uniforms.uFindEdge.value = finite(state.findEdge, 2)
      uniforms.uMakeEdge.value = finite(state.makeEdge, 2)
      uniforms.uDrawingHeight.value = Math.max(1, finite(state.drawingHeight, 1))
      uniforms.uPixelRatio.value = Math.max(.5, Math.min(3, finite(state.pixelRatio, 1)))
      uniforms.uHeaderEdge.value = Math.max(0, finite(state.headerOffset)) / height
      uniforms.uLogoWidth.value = width
      uniforms.uCenter.value.set(centerX, centerY)
      uniforms.uAspect.value = Math.max(1, finite(state.viewportWidth, 1)) / height
      if (state.pointerActive) uniforms.uPointer.value.set(finite(state.pointerX), finite(state.pointerY))
      uniforms.uPointerActive.value += ((state.pointerActive ? 1 : 0) - uniforms.uPointerActive.value) * smoothing
      uniforms.uPointerRadius.value = Math.max(.12, Math.min(.5, 220 / height))
    },
    dispose() {
      if (disposed) return
      disposed = true
      group.visible = false
      cage.geometry.dispose()
      particles.geometry.dispose()
      cageMaterial.dispose()
      particlesMaterial.dispose()
    },
  }
}
