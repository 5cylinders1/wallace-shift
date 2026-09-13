import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'

/** World units match the journey stage: the viewport spans +/-1 vertically
 * and +/-aspect horizontally. Panel edges are normalized drawing-buffer Y. */
export interface JourneyAscentFrame {
  visible: number
  ascent: number
  shimmer: number
  launchEdge: number
  launchBottom: number
  drawingHeight: number
  aspect: number
  time: number
  markX: number
  markY: number
  markWidth: number
  markHeight: number
  horizonY: number
  copyRight: number
  pointerX: number
  pointerY: number
  pointerActive: boolean
}

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback
const unit = (value: number) => Math.max(0, Math.min(1, finite(value)))

/** The Launch environment. A single horizon rule gives the chapter a ground,
 * three parallax layers of fine streaks give it depth and direction, and a
 * tapering wake beneath the mark records the climb as one long exposure.
 * Scroll drives the distance travelled; the pointer only moves the parallax. */
export function createJourneyAscent() {
  const geometry = new PlaneGeometry(1, 1)
  const material = new ShaderMaterial({
    name: 'HomepageJourney_Ascent',
    transparent: true,
    premultipliedAlpha: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uVisible: { value: 0 },
      uAscent: { value: 0 },
      uShimmer: { value: 0 },
      uLaunchEdge: { value: 2 },
      uLaunchBottom: { value: 2 },
      uDrawingHeight: { value: 1 },
      uAspect: { value: 1 },
      uTime: { value: 0 },
      uMark: { value: new Vector2() },
      uMarkWidth: { value: .2 },
      uMarkHeight: { value: .11 },
      uHorizon: { value: 0 },
      uCopyRight: { value: 0 },
      uPointer: { value: new Vector2() },
      uPointerActive: { value: 0 },
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
      uniform float uVisible, uAscent, uShimmer, uLaunchEdge, uLaunchBottom;
      uniform float uDrawingHeight, uAspect, uTime, uMarkWidth, uMarkHeight;
      uniform float uHorizon, uCopyRight, uPointerActive;
      uniform vec2 uMark, uPointer;

      float hash(vec2 seed) {
        return fract(sin(dot(seed, vec2(31.719, 157.431))) * 43758.5453);
      }

      void main() {
        float canvasY = 1.0 - gl_FragCoord.y / uDrawingHeight;
        float feather = .5 / uDrawingHeight;
        float panel = smoothstep(uLaunchEdge - feather, uLaunchEdge + feather, canvasY)
          * (1.0 - smoothstep(uLaunchBottom - feather, uLaunchBottom + feather, canvasY));
        panel *= uVisible;
        if (panel < .001) discard;

        vec2 p = vec2((vUv.x - .5) * 2.0 * uAspect, (vUv.y - .5) * 2.0);
        vec3 color = vec3(0.0);
        float alpha = 0.0;

        // The panel gains a floor. Deepening the lower stage is what makes a
        // rise legible at all; a flat field has no up.
        float ground = smoothstep(.45, -1.0, p.y);
        float deepen = ground * .40 * (.25 + .75 * uAscent);
        color += vec3(.038, .039, .072) * deepen;
        alpha += deepen;

        // Three depth layers of long, sparse streaks. Near layers travel
        // further and answer the pointer more, which is the parallax read.
        // Sparse and slow is the whole discipline here: this is air moving
        // past a climbing object, not a starfield.
        for (int layer = 0; layer < 3; layer++) {
          float depth = float(layer) * .5;
          float density = mix(1.0, 1.85, depth);
          float speed = mix(1.0, .36, depth);
          vec2 q = p;
          q.x += uPointer.x * mix(.095, .024, depth) * uPointerActive;
          q.y += uPointer.y * mix(.048, .012, depth) * uPointerActive;
          float lane = 3.2;
          float column = floor(q.x * density / .155);
          float withinColumn = q.x * density / .155 - column - .5;
          // Scroll supplies the travel; the slow clock only keeps the field
          // from freezing solid when the reader pauses mid-chapter.
          float travel = uTime * .10 * speed + uAscent * 4.2 * speed;
          float path = q.y * density + travel + hash(vec2(column, 5.0)) * 53.0;
          float cell = fract(path / lane);
          float cycle = floor(path / lane);
          // Most columns are empty on any given pass, so the field reads as
          // occasional streaks rather than a repeating curtain.
          float carries = step(.72, hash(vec2(column, cycle * 1.7 + 21.0)));
          float reach = mix(.24, .62, hash(vec2(column, 9.0)));
          float streak = smoothstep(0.0, .04, cell)
            * (1.0 - smoothstep(reach * .28, reach, cell));
          float thin = exp(-pow(withinColumn / .045, 2.0));
          float lit = streak * thin * carries * mix(.085, .032, depth)
            * smoothstep(.02, .30, uAscent);
          color += mix(vec3(.42, .62, .80), vec3(.54, .47, .78),
            hash(vec2(column, 13.0))) * lit;
          alpha += lit;
        }

        // One horizon rule. The mark crosses it, which is the launch.
        float reveal = smoothstep(0.0, .30, uAscent);
        float across = 1.0 - smoothstep(.50, 1.02, abs(p.x) / uAspect);
        float rule = exp(-pow((p.y - uHorizon) / .0042, 2.0));
        float bloom = exp(-pow((p.y - uHorizon) / .080, 2.0));
        // The light pass over the mark also carries across the horizon, so
        // the two Launch events read as one moment rather than two effects.
        float pass = sin(uShimmer * 3.14159265);
        float horizon = (rule * (.50 + .30 * pass) + bloom * (.13 + .12 * pass))
          * across * reveal;
        color += vec3(.58, .78, .90) * horizon;
        alpha += horizon;

        // The wake: the mark's own light smeared back down the climb. It
        // tapers with distance and never appears above the mark's centre.
        vec2 wake = p - uMark;
        float below = max(0.0, -wake.y);
        float far = clamp(below / max(.05, uMarkWidth * 2.1), 0.0, 1.0);
        float taper = exp(-below / max(.03, uMarkWidth * 1.35));
        float columnFalloff = exp(-pow(wake.x
          / max(.02, uMarkWidth * .5 * mix(1.0, .42, far)), 2.0));
        float striation = .70 + .30 * sin(wake.y * 38.0 - uAscent * 22.0 - uTime * 1.1);
        float above = 1.0 - smoothstep(-uMarkHeight * .45, uMarkHeight * .1, wake.y);
        float plume = taper * columnFalloff * striation * above
          * smoothstep(.03, .42, uAscent) * .52;
        color += mix(vec3(.34, .64, .78), vec3(.48, .40, .80), far) * plume;
        alpha += plume;

        // The copy column stays a quiet ground at every stage of the climb.
        float copyGuard = smoothstep(-.16, .36, p.x - uCopyRight);
        float guard = mix(.12, 1.0, copyGuard);
        alpha = clamp(alpha, 0.0, 1.0) * guard * panel;
        gl_FragColor = vec4(color * guard * panel, alpha);
      }
    `,
  })
  const mesh = new Mesh(geometry, material)
  mesh.name = 'HomepageJourney_Ascent'
  mesh.renderOrder = -30
  mesh.frustumCulled = false
  mesh.visible = false
  let disposed = false
  let previousTime: number | null = null

  return {
    mesh,
    update(frame: JourneyAscentFrame) {
      const visible = disposed ? 0 : unit(frame.visible)
      const aspect = Math.max(.001, finite(frame.aspect, 1))
      mesh.visible = visible > .001
        && finite(frame.launchEdge, 2) < 1 && finite(frame.launchBottom, 2) > 0
      if (!mesh.visible) { previousTime = null; return }
      mesh.position.set(0, 0, -1.6)
      mesh.scale.set(2 * aspect, 2, 1)
      const uniforms = material.uniforms
      const time = Math.max(0, finite(frame.time))
      const delta = previousTime === null ? 0 : Math.max(0, Math.min(.1, time - previousTime))
      previousTime = time
      uniforms.uVisible.value = visible
      uniforms.uAscent.value = unit(frame.ascent)
      uniforms.uShimmer.value = unit(frame.shimmer)
      uniforms.uLaunchEdge.value = finite(frame.launchEdge, 2)
      uniforms.uLaunchBottom.value = finite(frame.launchBottom, 2)
      uniforms.uDrawingHeight.value = Math.max(1, finite(frame.drawingHeight, 1))
      uniforms.uAspect.value = aspect
      uniforms.uTime.value = time
      uniforms.uMark.value.set(finite(frame.markX), finite(frame.markY))
      uniforms.uMarkWidth.value = Math.max(.01, finite(frame.markWidth, .2))
      uniforms.uMarkHeight.value = Math.max(.005, finite(frame.markHeight, .11))
      uniforms.uHorizon.value = finite(frame.horizonY, 0)
      uniforms.uCopyRight.value = finite(frame.copyRight, 0)
      if (frame.pointerActive) uniforms.uPointer.value.set(finite(frame.pointerX), finite(frame.pointerY))
      uniforms.uPointerActive.value += ((frame.pointerActive ? 1 : 0)
        - uniforms.uPointerActive.value) * (1 - Math.exp(-delta * 9))
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
