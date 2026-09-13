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
  viewportHeight: number
  headerOffset: number
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
  const count = 800
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  let seed = 0x4a6f7572
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 0; i < count; i++) {
    // Positions establish conservative bounds; movement happens on the GPU.
    positions.set([(random() - .5) * 1.82, (random() - .5) * 1.54, (random() - .5) * 1.3], i * 3)
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
      varying vec2 vFieldXY;
      void main() {
        vec4 start = projectionMatrix * modelViewMatrix * vec4(aStart, 1.0);
        vec4 end = projectionMatrix * modelViewMatrix * vec4(aEnd, 1.0);
        float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
        vec2 direction = (end.xy / end.w - start.xy / start.w) * vec2(aspect, 1.0);
        direction /= max(length(direction), .00001);
        vec2 perpendicular = vec2(-direction.y, direction.x) / vec2(aspect, 1.0);
        vec4 clip = mix(start, end, aCorner.x);
        // A 3.8px ribbon houses a 1.1px ink core and a restrained light halo.
        clip.xy += perpendicular * aCorner.y * (3.8 * uPixelRatio / uDrawingHeight) * clip.w;
        gl_Position = clip;
        vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
        vFieldXY = (world.xy - uCenter) / uLogoWidth;
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
      varying vec2 vFieldXY;
      void main() {
        float mask = frictionPanelMask();
        if (mask < .001) discard;
        float edge = abs(vAcross);
        float ink = 1.0 - smoothstep(.22, .40, edge);
        float nearSide = smoothstep(-.55, .50, vDepth);
        float center = 1.0 - smoothstep(.75, 1.1, length(vFieldXY / vec2(.52, .31)));
        // Faint front wires still place the logo inside the hollow form,
        // while avoiding a bright crosshatch over the central cut.
        float clearance = 1.0 - center * nearSide * .70;
        float head = fract(uTime * .125 + vSeed * 7.31);
        float packet = exp(-pow((vAlong - head) / .12, 2.0));
        packet *= smoothstep(.03, .15, head) * (1.0 - smoothstep(.80, .98, head));
        // Offset every strand so the network carries light in small groups.
        packet *= smoothstep(.62, .93, .5 + .5 * sin(vSeed * 29.0 + uTime * .31));
        float halo = exp(-edge * edge * 3.5) * packet * .38;
        float alpha = (ink * mix(.18, .57, nearSide) + halo) * clearance * mask;
        // A turquoise trail remains distinct on the pale panel; a tiny cool
        // white head supplies the light cue without washing out the strand.
        float lightHead = exp(-pow((vAlong - head) / .028, 2.0)) * packet;
        vec3 color = mix(vec3(.18, .34, .41), vec3(.05, .65, .79), packet);
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
      varying float vAlpha;
      varying float vTint;
      void main() {
        // Unequal speeds and periodic hesitation create resistance. The
        // sine mapping bunches particles near the middle of their path.
        float t = uTime * (.024 + aSeed.z * .018);
        float hesitation = .017 * sin(uTime * .74 + aSeed.w * 19.0);
        float phase = fract(aSeed.x + t + hesitation);
        float x = (phase * 2.0 - 1.0) * .91 + .18 * sin(phase * 6.2831853);
        float lane = position.y;
        float barrier = exp(-pow((x + .12) / .43, 2.0));
        float side = lane < 0.0 ? -1.0 : 1.0;
        float y = lane + side * barrier * .16 * (1.0 - abs(lane));
        y += sin(uTime * .24 + aSeed.y * 21.0 + x * 4.0) * .035;
        float z = position.z + sin(uTime * .18 + aSeed.w * 17.0) * .055;
        vec3 point = vec3(x, y, z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
        float foreground = smoothstep(-.6, .6, z);
        gl_PointSize = (1.0 + foreground * 1.1 + aSeed.w * .7) * uPixelRatio;
        float entrance = smoothstep(0.0, .10, phase) * (1.0 - smoothstep(.88, 1.0, phase));
        float center = 1.0 - smoothstep(.70, 1.08, length(point.xy / vec2(.55, .34)));
        float clearance = 1.0 - center * mix(.40, .93, foreground);
        vAlpha = entrance * clearance * mix(.264, .576, foreground);
        vTint = aSeed.y;
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
        float core = 1.0 - smoothstep(.28, 1.0, radius);
        if (core < .001) discard;
        vec3 ink = mix(vec3(.12, .28, .35), vec3(.27, .48, .54), vTint);
        gl_FragColor = vec4(ink, core * vAlpha * mask);
      }
    `,
  })
  const cage = new Mesh(cageGeometry(), cageMaterial)
  cage.name = 'JourneyFriction_Cage'
  cage.frustumCulled = false
  const particles = new Points(particleGeometry(), particlesMaterial)
  particles.name = 'JourneyFriction_Particles'
  particles.frustumCulled = false
  const group = new Group()
  group.name = 'JourneyFriction'
  group.visible = false
  group.add(particles, cage)
  let disposed = false

  return {
    group,
    update(state: JourneyFrictionState) {
      if (disposed) return
      group.visible = unit(state.visible) > .001
        && finite(state.findEdge, 2) < 1 && finite(state.makeEdge, 2) > 0
      if (!group.visible) return
      const time = Math.max(0, finite(state.time))
      const width = Math.max(.001, finite(state.logoWidth, 1))
      group.position.set(finite(state.centerX), finite(state.centerY), 0)
      group.scale.setScalar(width)
      // The cage rotates around the stationary GLB; the particle lanes are
      // separate children so their drag direction remains spatially stable.
      cage.rotation.set(.24 + time * .071, .35 + time * .105, -.10)
      uniforms.uTime.value = time
      uniforms.uVisible.value = unit(state.visible)
      uniforms.uFindEdge.value = finite(state.findEdge, 2)
      uniforms.uMakeEdge.value = finite(state.makeEdge, 2)
      uniforms.uDrawingHeight.value = Math.max(1, finite(state.drawingHeight, 1))
      uniforms.uPixelRatio.value = Math.max(.5, Math.min(3, finite(state.pixelRatio, 1)))
      uniforms.uHeaderEdge.value = Math.max(0, finite(state.headerOffset))
        / Math.max(1, finite(state.viewportHeight, 1))
      uniforms.uLogoWidth.value = width
      uniforms.uCenter.value.copy(group.position)
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
