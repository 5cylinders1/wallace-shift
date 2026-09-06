import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three'
import { rippleFragmentShader, rippleVertexShader } from './shaders/rippleShader'
import { INTERACTION } from './waterHeroConfig'

const MAX_SPLATS = 4

/**
 * A GPU heightfield covering a square of water around the emblem.
 *
 * This is the transient half of the interaction model. It knows nothing
 * about scroll: impulses are pushed in when something moves through the
 * surface, and from then on the field propagates and decays on its own
 * clock. Freezing the narrative therefore freezes the logo but not the
 * rings it already made — which is the whole point of keeping the
 * persistent contact response (an analytic term in the water shader)
 * separate from this.
 *
 * It is emphatically not a fluid simulation. It is a wave equation on a
 * grid, which is enough to make water look like it noticed.
 */
export class RippleField {
  readonly resolution: number

  private readonly renderer: WebGLRenderer
  private readonly targets: [WebGLRenderTarget, WebGLRenderTarget]
  private readonly scene: Scene
  private readonly camera: OrthographicCamera
  private readonly material: ShaderMaterial
  private readonly geometry: PlaneGeometry
  private readonly mesh: Mesh

  private read = 0
  private accumulator = 0
  private pending: Vector4[] = []

  /**
   * A CPU-side proxy for how much energy is in the field, decayed with the
   * same constant as the simulation. Reading the real thing back would
   * stall the pipeline every frame for a debug number.
   */
  energy = 0

  constructor(renderer: WebGLRenderer, resolution: number) {
    this.renderer = renderer
    this.resolution = resolution

    const options = {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    }

    this.targets = [
      new WebGLRenderTarget(resolution, resolution, options),
      new WebGLRenderTarget(resolution, resolution, options),
    ]

    this.material = new ShaderMaterial({
      vertexShader: rippleVertexShader,
      fragmentShader: rippleFragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uPrevious: { value: this.targets[0].texture },
        uTexel: { value: new Vector2(1 / resolution, 1 / resolution) },
        uDamping: { value: INTERACTION.damping },
        uSplats: {
          value: Array.from({ length: MAX_SPLATS }, () => new Vector4(0, 0, 1, 0)),
        },
      },
    })

    this.geometry = new PlaneGeometry(2, 2)
    this.mesh = new Mesh(this.geometry, this.material)
    this.mesh.frustumCulled = false

    this.scene = new Scene()
    this.scene.add(this.mesh)
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

    this.clear()
  }

  /** Both buffers start flat, or the first step propagates uninitialised memory. */
  private clear() {
    const previous = this.renderer.getRenderTarget()
    for (const target of this.targets) {
      this.renderer.setRenderTarget(target)
      this.renderer.clearColor()
    }
    this.renderer.setRenderTarget(previous)
  }

  get texture() {
    return this.targets[this.read].texture
  }

  /**
   * Queues an impulse, in simulation UV space. Impulses are held until the
   * next step and flushed exactly once: injecting them per substep would
   * make a single splash three times louder on a frame that stuttered.
   */
  addImpulse(u: number, v: number, amplitude: number) {
    if (amplitude === 0) return
    if (u < 0 || u > 1 || v < 0 || v > 1) return
    if (this.pending.length >= MAX_SPLATS) return
    this.pending.push(new Vector4(u, v, INTERACTION.splatRadius, amplitude))
    this.energy += Math.abs(amplitude)
  }

  /** Advances the field on its own fixed timestep, whatever the frame rate. */
  step(delta: number) {
    this.accumulator += Math.min(delta, 0.1)

    const slots = this.material.uniforms.uSplats.value as Vector4[]
    let steps = 0

    while (
      this.accumulator >= INTERACTION.fixedStep &&
      steps < INTERACTION.maxSubSteps
    ) {
      this.accumulator -= INTERACTION.fixedStep
      steps += 1

      for (let i = 0; i < MAX_SPLATS; i += 1) {
        const impulse = steps === 1 ? this.pending[i] : undefined
        if (impulse) slots[i].copy(impulse)
        else slots[i].set(0, 0, 1, 0)
      }

      const write = 1 - this.read
      this.material.uniforms.uPrevious.value = this.targets[this.read].texture

      const previousTarget = this.renderer.getRenderTarget()
      this.renderer.setRenderTarget(this.targets[write])
      this.renderer.render(this.scene, this.camera)
      this.renderer.setRenderTarget(previousTarget)

      this.read = write
      this.energy *= INTERACTION.damping
    }

    // Dropped steps still have to drain, or the field runs in slow motion
    // after every stall and never catches up.
    if (this.accumulator > INTERACTION.fixedStep * INTERACTION.maxSubSteps) {
      this.accumulator = 0
    }

    this.pending.length = 0
  }

  dispose() {
    this.targets.forEach((target) => target.dispose())
    this.geometry.dispose()
    this.material.dispose()
    this.scene.clear()
  }
}
