import { HalfFloatType, LinearFilter, Mesh, NoToneMapping, PlaneGeometry,
  ShaderMaterial, Vector2, WebGLRenderTarget, Color, type Camera, type Scene, type WebGLRenderer } from 'three'

/** Where the sun sits along the horizon, in viewport width. A fixed point:
 * following the travelling mark made it slide in from the right across the
 * handoff, which read as an effect rather than a place. It stands under the
 * enquiry card so the card's glass has real light behind it, with the mark
 * further left along the same waterline. */
export const SUN_POSITION = .66

/** One small capture of the actual, currently posed logo, lying on a surface
 * built in ground distance rather than in screen space. The same plane carries
 * the dawn above that waterline. */
export function createJourneyWater() {
  const target = new WebGLRenderTarget(2, 2, {
    type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter,
    depthBuffer: true, stencilBuffer: false,
  })
  const material = new ShaderMaterial({
    // Every term below is accumulated already multiplied by its own coverage,
    // which is what premultiplied blending expects. Straight alpha squared the
    // reflection and mist against their own weights and lost most of them.
    transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
    uniforms: {
      uLogo: { value: target.texture }, uWater: { value: 0 }, uBase: { value: .32 },
      uTime: { value: 0 }, uTexel: { value: new Vector2(.001, .001) },
      uSection: { value: -1 }, uSunX: { value: SUN_POSITION }, uDawn: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, .999, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uLogo;
      uniform float uWater, uBase, uTime, uSection, uSunX, uDawn;
      uniform vec2 uTexel;
      varying vec2 vUv;
      // Graded against the existing /contact sunset the homepage sits beside:
      // a near-black sky, one thin saturated line, and dark water carrying
      // lighter bands. The previous values were a pale blue-grey wash with a
      // diffuse glow in it — low contrast where the reference is high.
      const vec3 SKY_TOP = vec3(.010, .013, .018);
      const vec3 SKY_LOW = vec3(.040, .042, .050);
      const vec3 DAWN_WARM = vec3(1.0, .40, .13);
      const vec3 DAWN_CORE = vec3(1.0, .58, .26);
      const vec3 WATER_DEEP = vec3(.005, .009, .013);
      // A full descent and return over eight minutes, so the sun visibly sets
      // across four minutes of reading and comes back without ever snapping.
      const float SUN_CYCLE = 0.0130900;

      /** Swell height in .x and its along-view slope in .y, from one sum.
       * Every octave advances with +ground and +time, so crests travel from
       * the horizon toward the reader. Each fades with the distance term, so
       * the far field goes smooth rather than aliasing — which is also how
       * real water reads at range. */
      vec2 journeySwell(float lateral, float ground, float time, float detail) {
        float a = lateral * .70 + ground * 3.1 + time * 1.05;
        float b = lateral * -1.55 + ground * 5.3 + time * 1.55;
        float c = lateral * 3.30 + ground * 8.9 + time * 2.15;
        float d = lateral * -7.10 + ground * 15.5 + time * 3.05;
        vec2 sum = vec2(sin(a), cos(a) * 3.1) * .55 * mix(.35, 1.0, detail);
        sum += vec2(sin(b), cos(b) * 5.3) * .30 * mix(.18, 1.0, detail);
        sum += vec2(sin(c), cos(c) * 8.9) * .16 * detail;
        sum += vec2(sin(d), cos(d) * 15.5) * .08 * detail * detail;
        return sum;
      }

      void main() {
        // The closing section owns this composition. Above its top edge the
        // canvas stays empty, so the dawn never paints over the quiz above it.
        float fromTop = 1.0 - vUv.y;
        float inSection = smoothstep(uSection - .003, uSection + .003, fromTop);
        if (inSection < .002) discard;
        float below = uBase - vUv.y;
        float depth = max(0.0, below);
        float height = max(0.0, -below);
        float waterMask = smoothstep(-.004, .015, below);
        float across = vUv.x - uSunX;

        // A flat plane under a camera a little above it: screen distance below
        // the horizon is inversely proportional to distance across the ground.
        // Without this the wave field is banded in screen space, which is what
        // made the surface read as stripes rather than as a receding plane.
        float ground = .075 / max(depth, .0012);
        float lateral = across * ground * 1.5;
        // One pixel covers unbounded ground at the horizon, so detail has to
        // die before it gets there or it turns into moire.
        float detail = 1.0 / (1.0 + ground * ground * .05);
        vec2 swell = journeySwell(lateral, ground, uTime, detail);
        float wave = swell.x;
        float slope = swell.y * detail;
        // Grazing angles reflect; the water underfoot shows its own darkness.
        float fresnel = smoothstep(1.6, 13.0, ground);

        // The mark's reflection, displaced by the surface it is lying on
        // rather than by a separate ripple of its own.
        vec2 sampleUv = vec2(vUv.x + slope * (.0004 + depth * .0075),
          uBase + depth * (1.0 + depth * .55));
        vec2 spread = uTexel * (1.0 + depth * depth * 210.0);
        vec4 reflection = texture2D(uLogo, sampleUv) * .4;
        reflection += texture2D(uLogo, sampleUv + vec2(spread.x, 0.0)) * .2;
        reflection += texture2D(uLogo, sampleUv - vec2(spread.x, 0.0)) * .2;
        reflection += texture2D(uLogo, sampleUv + vec2(0.0, spread.y)) * .1;
        reflection += texture2D(uLogo, sampleUv - vec2(0.0, spread.y)) * .1;
        float valid = step(0.0, sampleUv.x) * step(sampleUv.x, 1.0)
          * step(0.0, sampleUv.y) * step(sampleUv.y, 1.0);
        float reflectionGain = waterMask * valid * exp(-depth * 6.5) * .30;

        vec3 color = vec3(0.0);
        float alpha = 0.0;

        // Where the sun stands right now, and how much light is left in it.
        float sunSet = .5 - .5 * cos(uTime * SUN_CYCLE);
        float sunY = mix(.075, -.022, sunSet);
        // Most of the light is already gone at the top of the descent, and
        // almost all of it by the time the sun is on the line.
        float sunLight = mix(.46, .10, sunSet) * uDawn;
        float dy = height - sunY;

        // Water is its own dark body near the reader and a mirror of the sky
        // at range. Crests catch that sky and troughs fall back into the
        // body's own colour, which is what gives the surface form instead of
        // a flat wash with sparkle scattered over it.
        vec3 skyMirror = mix(SKY_LOW, mix(SKY_LOW, DAWN_WARM, .35),
          exp(-(across * across) / .09) * sunLight);
        float form = clamp(.5 + slope * .12, 0.0, 1.0);
        // Less mirroring and a wider shading range: dark water carrying
        // legible bands, rather than an evenly lit blue-grey surface.
        vec3 body = mix(WATER_DEEP, skyMirror, fresnel * .55) * mix(.30, 1.85, form);
        float mist = exp(-pow((depth - .012) / .022, 2.0));
        color += (body + vec3(.11, .14, .17) * mist * .18) * waterMask;
        alpha += (.58 + mist * .07) * waterMask;
        color += reflection.rgb * reflectionGain;
        alpha += reflection.a * reflectionGain;

        // The leading edge of each crest, which is what makes a roll legible
        // as a roll rather than as a gradient moving.
        float crestLine = smoothstep(.70, .97, wave) * detail;
        color += vec3(.26, .33, .40) * crestLine * .16 * waterMask;
        alpha += crestLine * .12 * waterMask;

        float sky = 1.0 - waterMask;
        float skyFall = exp(-height / .30);
        // These stops sit below the section's own ink, so raising coverage
        // darkens the upper frame toward the reference rather than lifting it.
        float skyAlpha = mix(.30, .52, skyFall) * sky * uDawn;
        color += mix(SKY_TOP, SKY_LOW, skyFall) * skyAlpha;
        alpha += skyAlpha;

        // A thin line of light along the waterline and a low disc that sits
        // on it. The disc carries its own elevation, so it genuinely sinks
        // behind the horizon rather than only fading out where it stands.
        // The same light, concentrated instead of spread: a third of the
        // former thickness and a much smaller halo, so the total energy falls
        // while the line itself finally reads as a line.
        float band = exp(-(height * height) / .0008) * exp(-(across * across) / .22) * sky;
        float halo = exp(-(across * across) / .030 - (dy * dy) / .0022) * sky;
        float core = exp(-(across * across) / .0030 - (dy * dy) / .00012) * sky;
        color += (DAWN_WARM * (band * .22 + halo * .040) + DAWN_CORE * core * .55) * sunLight;
        alpha += (band * .17 + halo * .035 + core * .30) * sunLight;

        // The sun's track is the crests catching that light, so it holds as a
        // line at range and breaks into a moving path toward the reader.
        float crest = pow(max(0.0, wave * .5 + .5), 12.0);
        float track = exp(-(across * across) / (.006 + depth * .16)) * exp(-depth / .30);
        float path = track * (.40 + 1.45 * crest) * waterMask;
        color += mix(DAWN_WARM, DAWN_CORE, exp(-depth / .07)) * path * .30 * sunLight;
        alpha += path * .18 * sunLight;

        // Sparser glitter away from the track keeps the rest of the surface
        // alive, which is most of what separates water from a gradient.
        float glitter = pow(max(0.0, wave * .5 + .5), 30.0) * detail * waterMask;
        color += vec3(.42, .52, .62) * glitter * .055;
        alpha += glitter * .05;

        // Only coverage is clamped. Scaling the colour down with it dimmed the
        // sun's core to about 60% of itself, because that is exactly where the
        // most terms overlap. Premultiplied colour is allowed past its own
        // coverage: that is what an emissive highlight is.
        float fade = uWater * inSection;
        gl_FragColor = vec4(color * fade, min(1.0, alpha) * fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const geometry = new PlaneGeometry(2, 2)
  const mesh = new Mesh(geometry, material)
  mesh.name = 'JourneyQuietWater'
  mesh.frustumCulled = false
  mesh.renderOrder = -100
  const clearColor = new Color()
  let width = 0, height = 0
  return {
    mesh,
    update(renderer: WebGLRenderer, scene: Scene, camera: Camera,
      viewportWidth: number, viewportHeight: number, base: number, water: number, time: number,
      dawn?: { sectionEdge?: number; amount?: number }) {
      mesh.visible = water > .001
      material.uniforms.uWater.value = water
      material.uniforms.uBase.value = base
      material.uniforms.uTime.value = time
      const edge = dawn?.sectionEdge
      material.uniforms.uSection.value = Number.isFinite(edge) ? edge! : -1
      const amount = dawn?.amount
      material.uniforms.uDawn.value = Number.isFinite(amount)
        ? Math.max(0, Math.min(1, amount!)) : 1
      if (water <= .001) return
      // The reflection is the only sampled texture in the composition, so its
      // resolution is what the water's sharpness is limited by.
      const fit = Math.min(1, 1024 / Math.max(viewportWidth, viewportHeight))
      const nextWidth = Math.max(2, Math.round(viewportWidth * fit))
      const nextHeight = Math.max(2, Math.round(viewportHeight * fit))
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth; height = nextHeight
        target.setSize(width, height)
        material.uniforms.uTexel.value.set(1 / width, 1 / height)
      }
      const previousTarget = renderer.getRenderTarget()
      const previousToneMapping = renderer.toneMapping
      const previousAlpha = renderer.getClearAlpha()
      renderer.getClearColor(clearColor)
      mesh.visible = false
      try {
        renderer.toneMapping = NoToneMapping
        renderer.setRenderTarget(target)
        renderer.setClearColor(0, 0)
        renderer.clear()
        renderer.render(scene, camera)
      } finally {
        renderer.setRenderTarget(previousTarget)
        renderer.toneMapping = previousToneMapping
        renderer.setClearColor(clearColor, previousAlpha)
        mesh.visible = true
      }
    },
    dispose() { target.dispose(); geometry.dispose(); material.dispose() },
  }
}
