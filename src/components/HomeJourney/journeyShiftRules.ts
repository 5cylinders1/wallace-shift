import { Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'

/** World units match the journey stage: the viewport spans +/-1 vertically
 * and +/-aspect horizontally. Panel edges are normalized drawing-buffer Y. */
export interface JourneyShiftRulesFrame {
  visible: number
  align: number
  makeEdge: number
  launchEdge: number
  drawingHeight: number
  aspect: number
  time: number
  register: number
  markX: number
  markY: number
  markWidth: number
  markHeight: number
  copyRight: number
  pointerX: number
  pointerY: number
  pointerActive: boolean
}

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback
const unit = (value: number) => Math.max(0, Math.min(1, finite(value)))

/** The drafting field behind Make. Long rules run on the mark's own diagonal,
 * each one cut into segments that start laterally slipped and close as the
 * chapter resolves. Nothing here loops on a clock: alignment is scroll, and
 * the only ambient element is a soft pointer reading of the surface. */
export function createJourneyShiftRules() {
  const geometry = new PlaneGeometry(1, 1)
  const material = new ShaderMaterial({
    name: 'HomepageJourney_ShiftRules',
    transparent: true,
    premultipliedAlpha: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uVisible: { value: 0 },
      uAlign: { value: 0 },
      uRegister: { value: 0 },
      uMakeEdge: { value: 2 },
      uLaunchEdge: { value: 2 },
      uDrawingHeight: { value: 1 },
      uAspect: { value: 1 },
      uMark: { value: new Vector2() },
      uMarkWidth: { value: .2 },
      uMarkHeight: { value: .11 },
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
      uniform float uVisible, uAlign, uRegister, uMakeEdge, uLaunchEdge, uDrawingHeight;
      uniform float uAspect, uMarkWidth, uMarkHeight, uCopyRight, uPointerActive;
      uniform vec2 uMark, uPointer;

      float hash(vec2 seed) {
        return fract(sin(dot(seed, vec2(41.317, 289.113))) * 43758.5453);
      }

      float strokeDistance(vec2 point, vec2 from, vec2 to) {
        vec2 offset = point - from;
        vec2 span = to - from;
        float travel = clamp(dot(offset, span) / max(dot(span, span), .00001), 0.0, 1.0);
        return length(offset - span * travel);
      }

      void main() {
        vec2 p = vec2((vUv.x - .5) * 2.0 * uAspect, (vUv.y - .5) * 2.0);
        // The mark's own cut angle. Rules share it so the field reads as the
        // logo's geometry extended across the panel, not as generic hatching.
        vec2 along = normalize(vec2(.30, 1.0));
        vec2 across = vec2(along.y, -along.x);
        float u = dot(p, across);
        float v = dot(p, along);
        // Derivatives must be taken before any branch that can discard.
        float weight = fwidth(u) * .85 + .0006;
        float spacing = .118;
        float index = floor(u / spacing);
        float phase = hash(vec2(index, 3.0));
        float cut = .74;
        float segment = floor(v / cut + phase * 2.0);
        float along01 = fract(v / cut + phase * 2.0);

        float canvasY = 1.0 - gl_FragCoord.y / uDrawingHeight;
        float feather = .5 / uDrawingHeight;
        float panel = smoothstep(uMakeEdge - feather, uMakeEdge + feather, canvasY)
          * (1.0 - smoothstep(uLaunchEdge - feather, uLaunchEdge + feather, canvasY));
        panel *= uVisible;
        if (panel < .001) discard;

        // Each segment is a separate plate of the same rule. Slip retires
        // completely, so a settled chapter shows one continuous straight line.
        float slip = (hash(vec2(index, segment)) - .5) * 2.0;
        float offset = slip * spacing * 2.35 * (1.0 - uAlign);
        float distance = abs(u - (index + .5) * spacing - offset);
        float stroke = 1.0 - smoothstep(weight * .55, weight * 1.9, distance);
        // Open butt joints while the rule is broken; close them on register.
        float joint = smoothstep(0.0, .028, along01) * (1.0 - smoothstep(.972, 1.0, along01));
        stroke *= mix(joint, 1.0, smoothstep(.82, 1.0, uAlign));

        float tone = hash(vec2(index, 11.0));
        float accent = step(.86, tone);
        // The field gathers around the mark and thins toward the panel edges,
        // so the composition stays anchored on the object rather than tiling.
        float focus = exp(-length(p - uMark) / max(.05, uMarkWidth * 2.3));
        float reach = 1.0 - smoothstep(.55, 1.06, length(p * vec2(.62, 1.0)));
        // The copy column keeps a quiet ground; rules fade before they reach it.
        float copyGuard = smoothstep(-.12, .34, p.x - uCopyRight);
        vec2 toPointer = p - uPointer;
        float lamp = exp(-dot(toPointer, toPointer) * 5.2) * uPointerActive;

        float ink = stroke * reach * copyGuard
          * (.050 + .075 * tone + .16 * accent + .22 * focus + .30 * lamp);
        vec3 color = mix(vec3(.30, .55, .61), vec3(.62, .87, .92),
          clamp(accent * .5 + focus * .35 + lamp * .75, 0.0, 1.0));

        // A single datum rule crosses the mark's centre and holds steady while
        // everything around it is still slipping. It is the register target.
        float hair = fwidth(p.x) * 1.15 + .0004;
        float datum = 1.0 - smoothstep(hair * .5, hair * 1.7, abs(p.y - uMark.y));
        float datumReach = (1.0 - smoothstep(.1, .92, abs(p.x - uMark.x) / max(.05, uMarkWidth * 3.4)))
          * copyGuard * (1.0 - smoothstep(.55, 1.0, uAlign));
        ink += datum * datumReach * .28;
        color = mix(color, vec3(.70, .90, .95), clamp(datum * datumReach * 2.0, 0.0, 1.0));

        // Crop marks. They stand off the mark while the plates are slipped
        // and close onto its exact frame as the register resolves, so the
        // chapter ends on a visible, precise landing rather than a fade.
        // Crop marks sit outside the trim, and the halves are still split
        // and oversized here, so the settled frame keeps a real margin.
        vec2 settled = vec2(uMarkWidth * .80, uMarkHeight * 1.02);
        // The mark is docked near the right edge, so the opened frame takes
        // only the horizontal room actually available and opens the rest
        // vertically. It never crosses the stage edge at any viewport width.
        float room = max(0.0, uAspect - uMark.x - .055 - settled.x);
        vec2 standoff = (1.0 - uRegister)
          * vec2(min(uMarkWidth * .30, room), uMarkWidth * .34);
        vec2 extent = settled + standoff;
        float arm = min(extent.x, extent.y) * .34;
        float crop = 0.0;
        for (int corner = 0; corner < 4; corner++) {
          vec2 quadrant = vec2(corner == 0 || corner == 2 ? -1.0 : 1.0,
            corner < 2 ? -1.0 : 1.0);
          vec2 anchor = uMark + extent * quadrant;
          crop = max(crop, 1.0 - smoothstep(hair * .5, hair * 1.7,
            strokeDistance(p, anchor, anchor - vec2(quadrant.x * arm, 0.0))));
          crop = max(crop, 1.0 - smoothstep(hair * .5, hair * 1.7,
            strokeDistance(p, anchor, anchor - vec2(0.0, quadrant.y * arm))));
        }
        float cropFade = smoothstep(0.0, .18, uVisible) * mix(.34, .52, uRegister);
        ink += crop * cropFade;
        color = mix(color, vec3(.74, .92, .97), clamp(crop * 2.0, 0.0, 1.0));

        float alpha = clamp(ink, 0.0, 1.0) * panel;
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `,
  })
  const mesh = new Mesh(geometry, material)
  mesh.name = 'HomepageJourney_ShiftRules'
  mesh.renderOrder = -30
  mesh.frustumCulled = false
  mesh.visible = false
  let disposed = false
  let previousTime: number | null = null

  return {
    mesh,
    update(frame: JourneyShiftRulesFrame) {
      const visible = disposed ? 0 : unit(frame.visible)
      const aspect = Math.max(.001, finite(frame.aspect, 1))
      mesh.visible = visible > .001
        && finite(frame.makeEdge, 2) < 1 && finite(frame.launchEdge, 2) > 0
      if (!mesh.visible) { previousTime = null; return }
      // Behind the mark and the launch backlight, in front of nothing else.
      mesh.position.set(0, 0, -1.6)
      mesh.scale.set(2 * aspect, 2, 1)
      const uniforms = material.uniforms
      uniforms.uVisible.value = visible
      uniforms.uAlign.value = unit(frame.align)
      uniforms.uRegister.value = unit(frame.register)
      uniforms.uMakeEdge.value = finite(frame.makeEdge, 2)
      uniforms.uLaunchEdge.value = finite(frame.launchEdge, 2)
      uniforms.uDrawingHeight.value = Math.max(1, finite(frame.drawingHeight, 1))
      uniforms.uAspect.value = aspect
      uniforms.uMark.value.set(finite(frame.markX), finite(frame.markY))
      uniforms.uMarkWidth.value = Math.max(.01, finite(frame.markWidth, .2))
      uniforms.uMarkHeight.value = Math.max(.005, finite(frame.markHeight, .11))
      uniforms.uCopyRight.value = finite(frame.copyRight, 0)
      if (frame.pointerActive) uniforms.uPointer.value.set(finite(frame.pointerX), finite(frame.pointerY))
      // Fade the reading light rather than switching it, so leaving the
      // window does not snap a lit region of the field back to its base.
      const time = Math.max(0, finite(frame.time))
      const delta = previousTime === null ? 0 : Math.max(0, Math.min(.1, time - previousTime))
      previousTime = time
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
