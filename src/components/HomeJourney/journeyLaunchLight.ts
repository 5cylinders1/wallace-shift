import { Mesh, PlaneGeometry, ShaderMaterial } from 'three'

interface LaunchLightFrame {
  centerX: number
  centerY: number
  logoWidth: number
  visible: number
  launchEdge: number
  launchBottom: number
  drawingHeight: number
  shimmer: number
  ascent: number
}

const unit = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0

/** A soft photographic backlight behind the assembled mark. It belongs to
 * the Launch panel's exact wipe and is driven entirely by scroll progress. */
export function createJourneyLaunchLight() {
  const geometry = new PlaneGeometry(1, 1)
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: {
      uVisible: { value: 0 }, uLaunchEdge: { value: 2 },
      uLaunchBottom: { value: 2 },
      uDrawingHeight: { value: 1 }, uShimmer: { value: 0 },
      uAscent: { value: 0 },
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
      uniform float uVisible, uLaunchEdge, uLaunchBottom, uDrawingHeight, uShimmer, uAscent;
      void main() {
        float canvasY = 1.0 - gl_FragCoord.y / uDrawingHeight;
        float feather = .5 / uDrawingHeight;
        float panel = smoothstep(uLaunchEdge - feather, uLaunchEdge + feather, canvasY);
        panel *= 1.0 - smoothstep(uLaunchBottom - feather, uLaunchBottom + feather, canvasY);
        vec2 p = (vUv - .5) * 2.0;
        float falloff = 1.0 - smoothstep(.68, 1.0, length(p));
        float cyan = exp(-dot(p + vec2(.20, .05), p + vec2(.20, .05)) * 5.0);
        float violet = exp(-dot(p - vec2(.24, .14), p - vec2(.24, .14)) * 6.0);
        float lightPass = sin(uShimmer * 3.14159265);
        // The halo opens as the mark climbs, so the growth reads as the mark
        // clearing its own light rather than a sprite being scaled up.
        float strength = (.060 + .048 * uAscent + .055 * lightPass + .025 * uShimmer)
          * (cyan + violet);
        vec3 tint = mix(vec3(.14, .46, .65), vec3(.39, .23, .62), violet / max(.001, cyan + violet));
        gl_FragColor = vec4(tint, strength * falloff * panel * uVisible);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const mesh = new Mesh(geometry, material)
  mesh.name = 'HomepageJourney_LaunchBacklight'
  mesh.renderOrder = -20
  mesh.visible = false
  let disposed = false

  return {
    mesh,
    update(frame: LaunchLightFrame) {
      const visible = disposed ? 0 : unit(frame.visible)
      mesh.visible = visible > .001 && frame.logoWidth > 0
      if (!mesh.visible) return
      mesh.position.set(frame.centerX, frame.centerY, -.8)
      mesh.scale.set(frame.logoWidth * (2.4 + .5 * unit(frame.ascent)),
        frame.logoWidth * (1.9 + .45 * unit(frame.ascent)), 1)
      material.uniforms.uVisible.value = visible
      material.uniforms.uLaunchEdge.value = frame.launchEdge
      material.uniforms.uLaunchBottom.value = frame.launchBottom
      material.uniforms.uDrawingHeight.value = Math.max(1, frame.drawingHeight)
      material.uniforms.uShimmer.value = unit(frame.shimmer)
      material.uniforms.uAscent.value = unit(frame.ascent)
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
