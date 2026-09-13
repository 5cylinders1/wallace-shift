import { Mesh, PlaneGeometry, ShaderMaterial } from 'three'

/** World units match the journey stage: viewport Y spans +/-1. */
export interface JourneyPowerFrame {
  visible: number
  power: number
  surge: number
  centerX: number
  centerY: number
  markWidth: number
}

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback
const unit = (value: number) => Math.max(0, Math.min(1, finite(value)))

/** The charge the quiz mark gathers as questions are answered. It is a soft
 * photographic backlight, not a rim or a halo edge: the mark should look lit
 * from behind by its own accumulating energy. Each answered question also
 * sends one short surge through it, so committing to an answer is felt. */
export function createJourneyPower() {
  const geometry = new PlaneGeometry(1, 1)
  const material = new ShaderMaterial({
    name: 'HomepageJourney_QuizCharge',
    transparent: true,
    premultipliedAlpha: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uVisible: { value: 0 },
      uPower: { value: 0 },
      uSurge: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uVisible, uPower, uSurge;
      void main() {
        if (uVisible < .001) discard;
        vec2 p = (vUv - .5) * 2.0;
        float radius = length(p * vec2(1.0, 1.22));
        // Two overlapping falloffs: a tight core that tracks the charge and
        // a wide bloom that only opens once the mark is fully powered.
        float core = exp(-radius * radius * 4.6);
        float bloom = exp(-radius * radius * 1.5) * smoothstep(.45, 1.0, uPower);
        // Cool at the centre, warming toward lavender at the edge, matching
        // the iridescence the mark itself gains across the same three steps.
        vec3 tint = mix(vec3(.24, .56, .74), vec3(.44, .34, .72),
          smoothstep(.1, .9, radius));
        float charge = (.10 + .30 * uPower) * core + .16 * bloom;
        // Each answer opens the backlight briefly, so the section flashes
        // behind the mark at the moment the reader commits.
        charge += uSurge * (.34 * core + .24 * bloom);
        // Gaussian tails never reach zero on their own. Retire them before
        // the plane boundary so brighter answers cannot expose its rectangle.
        float falloff = 1.0 - smoothstep(.55, 1.0, radius);
        float alpha = clamp(charge * falloff * uPower * uVisible, 0.0, 1.0);
        gl_FragColor = vec4(tint * alpha, alpha);
      }
    `,
  })
  const mesh = new Mesh(geometry, material)
  mesh.name = 'HomepageJourney_QuizCharge'
  mesh.renderOrder = -25
  mesh.frustumCulled = false
  mesh.visible = false
  let disposed = false

  return {
    mesh,
    update(frame: JourneyPowerFrame) {
      const visible = disposed ? 0 : unit(frame.visible)
      const power = unit(frame.power)
      const width = Math.max(.001, finite(frame.markWidth, .2))
      mesh.visible = visible > .001 && power > .001
      if (!mesh.visible) return
      mesh.position.set(finite(frame.centerX), finite(frame.centerY), -.6)
      mesh.scale.set(width * 3.4, width * 2.9, 1)
      material.uniforms.uVisible.value = visible
      material.uniforms.uPower.value = power
      material.uniforms.uSurge.value = unit(frame.surge)
    },
    dispose() {
      if (disposed) return
      disposed = true
      mesh.visible = false
      geometry.dispose()
      material.dispose()
    },
  }
}
