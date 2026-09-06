import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Mesh, ShaderMaterial } from 'three'
import { PARTICLES, WATER_LEVEL } from './waterHeroConfig'
import type { SceneState } from './waterHeroTypes'

/**
 * Droplets and spray thrown off where the emblem crosses the surface.
 *
 * Emission is scroll-driven — nothing is thrown unless the mark is
 * actually moving through the waterline — but flight is time-driven, so
 * stopping the scroll stops new droplets while the ones already in the air
 * keep falling. That split is the whole point: it is what makes a paused
 * frame read as a moment inside a physical event rather than as a
 * freeze-frame.
 *
 * Emitters are the two children's own contact points, not the emblem's
 * centre. A single fountain from the middle of a two-part mark reads as a
 * decal; two sources that track WS_Left and WS_Right independently read as
 * contact.
 *
 * Deliberately only droplets at this stage. No glow, no organised flow, no
 * streaks — those belong to activation, and reaching for them before the
 * water is right would be using spectacle to cover it.
 */

/**
 * Quads, not point sprites.
 *
 * A round point sprite is a bokeh disc, and at any size large enough to
 * see it reads as smoke or foam rather than as water. A droplet in flight
 * is stretched along its own velocity, and that shape is most of what
 * makes it legible — so each particle is a camera-facing quad, elongated
 * along its screen-space direction of travel.
 */
const VERTEX = /* glsl */ `
attribute vec3 aVelocity;
attribute float aLife;
attribute float aSize;
attribute vec2 aCorner;

varying float vAlpha;
varying vec2 vCorner;

void main() {
  vAlpha = smoothstep(0.0, 0.12, aLife) * smoothstep(0.0, 0.6, aLife);
  vCorner = aCorner;

  vec4 view = modelViewMatrix * vec4(position, 1.0);

  // Direction of travel in view space, projected to the screen plane.
  vec3 velocityView = (modelViewMatrix * vec4(aVelocity, 0.0)).xyz;
  vec2 along = normalize(velocityView.xy + vec2(1e-5, 0.0));
  vec2 across = vec2(-along.y, along.x);

  float speed = min(length(velocityView.xy), 3.0);
  float stretch = 1.0 + speed * 0.85;

  vec2 offset = along * aCorner.y * aSize * stretch
              + across * aCorner.x * aSize;

  view.xy += offset;
  gl_Position = projectionMatrix * view;
}
`

const FRAGMENT = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
varying float vAlpha;
varying vec2 vCorner;

void main() {
  // A capsule: hard enough at the centre to read as liquid, soft only at
  // the very rim. The wide soft falloff a point sprite needs is exactly
  // what turned these into blobs.
  float r = length(vec2(vCorner.x, vCorner.y * 0.55));
  if (r > 1.0) discard;
  float falloff = 1.0 - smoothstep(0.55, 1.0, r);
  gl_FragColor = vec4(uColor, falloff * vAlpha * 0.62);
}
`

interface BreachParticlesProps {
  sceneState: SceneState
  /** Scaled down on the lower tiers along with everything else. */
  count: number
}

export function BreachParticles({ sceneState, count }: BreachParticlesProps) {
  const meshRef = useRef<Mesh>(null)

  const state = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const life = new Float32Array(count)
    const size = new Float32Array(count)

    // Everything starts dead and far below, so nothing is visible until
    // the water actually throws it.
    for (let i = 0; i < count; i += 1) positions[i * 3 + 1] = -999

    // Per-corner copies, which is what the quads are drawn from.
    const quadPositions = new Float32Array(count * 4 * 3)
    const quadVelocities = new Float32Array(count * 4 * 3)
    const quadLife = new Float32Array(count * 4)
    const quadSize = new Float32Array(count * 4)
    for (let i = 0; i < count * 4; i += 1) quadPositions[i * 3 + 1] = -999

    return {
      positions,
      velocities,
      life,
      size,
      quadPositions,
      quadVelocities,
      quadLife,
      quadSize,
      cursor: 0,
      carry: 0,
    }
  }, [count])

  // Four corners per droplet, so each becomes a stretchable quad.
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const corners = new Float32Array(count * 4 * 2)
    const indices = new Uint32Array(count * 6)

    for (let i = 0; i < count; i += 1) {
      const c = i * 8
      corners.set([-1, -1, 1, -1, 1, 1, -1, 1], c)
      const v = i * 4
      indices.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6)
    }

    g.setAttribute('position', new BufferAttribute(state.quadPositions, 3))
    g.setAttribute('aVelocity', new BufferAttribute(state.quadVelocities, 3))
    g.setAttribute('aLife', new BufferAttribute(state.quadLife, 1))
    g.setAttribute('aSize', new BufferAttribute(state.quadSize, 1))
    g.setAttribute('aCorner', new BufferAttribute(corners, 2))
    g.setIndex(new BufferAttribute(indices, 1))
    g.boundingSphere = null
    return g
  }, [state, count])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        // Normal blending, not additive. Additive is the instinct for
        // droplets catching light, and on near-black water it saturates
        // the moment two sprites overlap — a few hundred of them stopped
        // reading as spray and started reading as glowing cloud.
        side: 2,
        uniforms: { uColor: { value: PARTICLES.color.slice() } },
      }),
    [],
  )

  useEffect(() => {
    material.uniforms.uColor.value = PARTICLES.color
  }, [material])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05)
    const { positions, velocities, life, size } = state

    /* --- Emission: driven by the crossing, not by the clock ---------- */
    const velocity = sceneState.verticalVelocity
    const speed = Math.abs(velocity)

    if (speed > PARTICLES.minSpeed) {
      for (let c = 0; c < 2; c += 1) {
        const contact = sceneState.contacts[c]
        // Only where metal is genuinely cutting the surface.
        if (contact.strength < 0.05) continue

        const intensity =
          Math.min(1, speed / PARTICLES.saturationSpeed) * contact.strength

        // Rate is per second, so a slower display emits fewer, larger
        // batches rather than proportionally less spray.
        state.carry += intensity * PARTICLES.rate * step
        const spawn = Math.floor(state.carry)
        state.carry -= spawn

        for (let s = 0; s < spawn; s += 1) {
          const i = state.cursor
          state.cursor = (state.cursor + 1) % count

          const angle = Math.random() * Math.PI * 2
          const radius = contact.radius * (0.35 + Math.random() * 0.85)

          positions[i * 3] = contact.x + Math.cos(angle) * radius
          positions[i * 3 + 1] = WATER_LEVEL + Math.random() * 0.05
          positions[i * 3 + 2] = contact.z + Math.sin(angle) * radius * 0.6

          // Thrown outward and up, biased along the direction of travel:
          // metal rising drags water up with it, metal descending pushes
          // it out sideways.
          const rising = velocity > 0
          const lift = rising ? PARTICLES.lift : PARTICLES.lift * 0.35
          velocities[i * 3] = Math.cos(angle) * PARTICLES.spread * (0.4 + Math.random())
          velocities[i * 3 + 1] =
            (lift * (0.5 + Math.random())) * Math.min(1, speed / PARTICLES.saturationSpeed)
          velocities[i * 3 + 2] =
            Math.sin(angle) * PARTICLES.spread * (0.4 + Math.random()) * 0.6

          life[i] = 1
          size[i] = PARTICLES.sizeMin + Math.random() * PARTICLES.sizeRange
        }
      }
    }

    /* --- Flight: purely time-driven ---------------------------------- */
    for (let i = 0; i < count; i += 1) {
      if (life[i] <= 0) continue

      velocities[i * 3 + 1] -= PARTICLES.gravity * step
      const drag = 1 - PARTICLES.drag * step
      velocities[i * 3] *= drag
      velocities[i * 3 + 2] *= drag

      positions[i * 3] += velocities[i * 3] * step
      positions[i * 3 + 1] += velocities[i * 3 + 1] * step
      positions[i * 3 + 2] += velocities[i * 3 + 2] * step

      life[i] -= step / PARTICLES.lifetime

      // Retired on contact with the water, which is where a droplet goes.
      if (life[i] <= 0 || positions[i * 3 + 1] < WATER_LEVEL) {
        life[i] = 0
        size[i] = 0
        positions[i * 3 + 1] = -999
      }
    }

    // Fan the per-particle state out to the four corners of each quad.
    const { quadPositions, quadVelocities, quadLife, quadSize } = state
    for (let i = 0; i < count; i += 1) {
      const px = positions[i * 3]
      const py = positions[i * 3 + 1]
      const pz = positions[i * 3 + 2]
      const vx = velocities[i * 3]
      const vy = velocities[i * 3 + 1]
      const vz = velocities[i * 3 + 2]
      const l = life[i]
      const sz = size[i]
      for (let c = 0; c < 4; c += 1) {
        const q = i * 4 + c
        quadPositions[q * 3] = px
        quadPositions[q * 3 + 1] = py
        quadPositions[q * 3 + 2] = pz
        quadVelocities[q * 3] = vx
        quadVelocities[q * 3 + 1] = vy
        quadVelocities[q * 3 + 2] = vz
        quadLife[q] = l
        quadSize[q] = sz
      }
    }

    geometry.attributes.position.needsUpdate = true
    ;(geometry.attributes.aVelocity as BufferAttribute).needsUpdate = true
    ;(geometry.attributes.aLife as BufferAttribute).needsUpdate = true
    ;(geometry.attributes.aSize as BufferAttribute).needsUpdate = true
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
  )
}
