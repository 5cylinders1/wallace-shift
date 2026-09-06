/**
 * Every tunable value for the water-hero experiment lives here.
 *
 * The experiment is a prototype under review, which means the numbers in
 * this file get changed far more often than the code that reads them.
 * Keeping them in one place is what makes "make the water calmer" a
 * one-line edit rather than a hunt through five shaders.
 *
 * Nothing in this directory is imported by the production site.
 */
import type { QualityTier, QualitySettings } from './waterHeroTypes'

/* ------------------------------------------------------------------ */
/* Asset                                                               */
/* ------------------------------------------------------------------ */

/**
 * The GLB as the browser sees it. Vite serves `public/` from the site
 * root and this project sets no `base`, so the public path maps 1:1.
 *
 * Note the underscore: the file committed to this repo is `ws_logo.glb`,
 * not the `ws-logo.glb` the brief named.
 */
export const WS_LOGO_URL = '/models/ws_logo.glb'

/** The three nodes the Blender export is contracted to contain. */
export const NODE_NAMES = {
  root: 'WS_Logo',
  left: 'WS_Left',
  right: 'WS_Right',
} as const

/* ------------------------------------------------------------------ */
/* World scale                                                         */
/* ------------------------------------------------------------------ */

/**
 * The GLB is authored at roughly 0.3 units wide. Rather than scattering
 * that number through the camera and water maths, the presentation group
 * scales the model so its measured bounding box is exactly this wide, and
 * every other distance in the scene is expressed against it.
 */
export const LOGO_TARGET_WIDTH = 2.0

/** The undisturbed water plane. All submersion maths is relative to it. */
export const WATER_LEVEL = 0

/* ------------------------------------------------------------------ */
/* Logo placement                                                      */
/* ------------------------------------------------------------------ */

/**
 * Clearance above the surface at full emergence, and below it at full
 * submersion — both as a fraction of the logo's own height, so they
 * survive a change to LOGO_TARGET_WIDTH.
 */
export const EMERGED_CLEARANCE = 0.015
/**
 * How far below the surface the emblem starts, as a fraction of its height.
 *
 * Deliberately shallow. Opening on empty water withholds the subject
 * rather than creating anticipation — the visitor should be thinking
 * "something is down there", not "this is a dark water shader". At this
 * depth the silhouette is legible through the surface from the first
 * frame while still being unresolved.
 */
export const SUBMERGED_CLEARANCE = 0.045

/** Where the logo sits on the plane. Kept centred for the beauty shot. */
export const LOGO_CENTER_XZ: [number, number] = [0, 0]

/* ------------------------------------------------------------------ */
/* Narrative phases                                                    */
/* ------------------------------------------------------------------ */

/**
 * The full seven-phase narrative, in normalized progress. Phases 4-7 are
 * declared but not yet driven — they are here so the constants that the
 * later milestones need never have to be renumbered.
 */
export const PHASES = {
  beneathTheSurface: [0.0, 0.1],
  breach: [0.1, 0.3],
  beautyShot: [0.3, 0.43],
  /** A held beat, then the pull begins. */
  attraction: [0.43, 0.58],
  approach: [0.58, 0.82],
  split: [0.82, 0.94],
  passage: [0.94, 1.0],
} as const

/**
 * How much of the narrative is driven by scroll.
 *
 * Now the whole of it. The journey runs from submerged anticipation
 * through the breach and the beauty shot into the approach, the split and
 * the passage, so the stage carries its full scroll distance.
 */
export const IMPLEMENTED_PROGRESS_MAX = 1.0

/** Stage height at full narrative, in svh. Scaled by the value above. */
export const FULL_STAGE_SCROLL_SVH = 720

export const STAGE_SCROLL_SVH = Math.round(
  FULL_STAGE_SCROLL_SVH * IMPLEMENTED_PROGRESS_MAX,
)

/**
 * Where the reduced-motion build parks.
 *
 * Late in phase 3: the emblem is clear of the water, the camera is in the
 * three-quarter composition, and nothing needs to move for the frame to
 * make sense.
 */
export const REDUCED_MOTION_PROGRESS = 0.4

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

export const CAMERA = {
  fov: 32,
  near: 0.05,
  far: 400,

  /**
   * Three keyframes spanning phases 1-3. `azimuth` is measured in radians
   * around +Y from the +Z axis; `height` and `distance` are world units.
   * The director interpolates between them with a smoothstep so a stop
   * anywhere reads as a deliberate hold rather than a pause mid-tween.
   */
  keys: [
    // Phase 1 — close, and angled down into the water rather than across
    // it.
    //
    // The instinct is to open low and level for the cinematic horizon, and
    // it does not work: at a couple of degrees off the surface the Fresnel
    // term is about 0.9, the water becomes a mirror, and the submerged
    // emblem is not merely subtle but genuinely absent. Roughly 17 degrees
    // down brings transmission back over 80% and the silhouette reads.
    { at: 0.0, distance: 3.3, height: 0.9, azimuth: 0.06, targetY: -0.22 },
    // Phase 2 — rising and pulling back as the emblem breaches, trading
    // the downward angle for the reflection.
    { at: 0.3, distance: 5.0, height: 0.42, azimuth: 0.17, targetY: 0.28 },
    // Phase 3 — restrained lateral move into the three-quarter beauty shot.
    //
    // 17 degrees off-axis: enough to open the sidewalls and read the
    // emblem as a solid, short of the orbit that would turn it into a
    // turntable. The eyeline stays low deliberately — lifting the camera
    // to look down reads better in a wireframe and worse in the render,
    // because at 20 degrees the Fresnel term collapses to about 0.05 and
    // the water stops reflecting, losing half the composition.
    { at: 0.43, distance: 5.75, height: 0.62, azimuth: 0.4, targetY: 0.56 },
  ],
} as const

/**
 * How much of the frame's width the emblem is allowed to occupy.
 *
 * The camera keyframes are composed for a landscape frame. A portrait
 * viewport keeps the same vertical field of view but has far less
 * horizontal coverage, so those distances would crop the emblem off both
 * sides. The rig pulls back until the logo fits this fraction, and the
 * fraction itself opens up on narrow screens — a phone wants the mark
 * filling the width, not the same airy landscape composition shrunk.
 */
export const FRAMING = {
  landscapeWidthFraction: 0.36,
  portraitWidthFraction: 0.88,
  /** Aspect at or above which the landscape composition is used as authored. */
  landscapeAspect: 1.3,
  /** Aspect at or below which the portrait framing is fully applied. */
  portraitAspect: 0.5,
} as const

/** Pointer parallax, in radians. Deliberately almost imperceptible. */
export const POINTER = {
  cameraYaw: 0.026,
  cameraPitch: 0.014,
  logoYaw: 0.032,
  /** Per-second approach rate of the damped follow. */
  damping: 3.2,
} as const

/* ------------------------------------------------------------------ */
/* Water                                                               */
/* ------------------------------------------------------------------ */

export const WATER = {
  /** Plane size in world units. Fog reaches the horizon well inside it. */
  size: 900,

  /**
   * Vertex displacement — long, low swell only.
   *
   * Cut hard from the first pass. Large smooth displacement near the
   * camera is exactly what made the foreground read as poured latex: the
   * eye has no reference for the scale of a black surface, so a broad
   * glossy curve becomes a solid.
   */
  swellAmplitude: 0.0105,
  /** Amplitude of the noise band that carries the normal. */
  microAmplitude: 0.031,
  /** World-to-noise frequency. 3.4 puts the base octave near 30cm. */
  microScale: 4.6,
  /** Global time multiplier for the ambient surface. */
  flowSpeed: 0.16,

  /** Schlick F0 for water. */
  fresnelF0: 0.02,
  /**
   * How far the surface normal bends the reflection sample, in UV.
   *
   * Deliberately large, and it took getting this backwards to see why.
   * The bright lanes running to the bottom of the frame are the emblem's
   * own lit sidewalls reflected at grazing incidence — the same thing a
   * lamp post does on a wet road, which is exactly why they read as
   * painted markings. Reducing the distortion to stop the water reaching
   * the bright parts of the sky made them *worse*, because a smooth
   * surface reflects a vertical edge as one unbroken band.
   *
   * Real water shatters that reflection into a shimmering trail, and it
   * does so precisely because its normal varies enough to scatter the
   * sample across the reflected image. So the distortion goes up, and the
   * blow-out it used to cause is handled by the rolloff below instead —
   * two problems that look identical and need opposite corrections.
   */
  reflectionDistortion: 0.072,
  /**
   * Compression applied to the reflection. Higher rolls the peaks off
   * harder; 0 leaves it linear and lets the horizon band blow out.
   */
  reflectionRolloff: 2.4,
  /**
   * World radius over which the reflection stays coherent.
   *
   * Tightened hard. At 1.5 the reflection held together far enough toward
   * the camera to read as a dark road laid on the water — the same
   * coherent central strip the white lanes used to make, just inverted.
   * Confining it to roughly the emblem's own footprint gives a
   * recognisable reflection directly beneath the mark that breaks into
   * ordinary water within about a logo-width.
   */
  reflectionFocus: 0.62,
  /** Same, for the refraction sample. Lower — refraction bends less. */
  refractionDistortion: 0.058,

  /** Per-channel extinction. Red dies first, which is what makes it deep. */
  extinction: [0.78, 0.44, 0.32] as [number, number, number],
  /** The colour water converges to once nothing is left to transmit. */
  deepColor: [0.008, 0.0155, 0.021] as [number, number, number],
  /**
   * Light scattered back out of the water column.
   *
   * Small, but it is the difference between a foreground that reads as
   * deep water and one that reads as a hole cut in the frame.
   */
  scatterColor: [0.0125, 0.0225, 0.0315] as [number, number, number],
  /**
   * Distance fog on the surface.
   *
   * Raised substantially. In playback the sky/water boundary was a hard
   * bright rule across the full width, cutting straight through the
   * emblem's base and flattening the scene into a test render. Fog is what
   * dissolves it: the far water now loses contrast into the sky well
   * before it reaches the horizon line, so the boundary stops being an
   * edge and becomes a gradient.
   */
  fogDensity: 0.032,

  /** Roughness driving the specular lobe for the sky's fill source. */
  specularRoughness: 0.14,
  /**
   * Level fed into the lobe before its rolloff, so the rolloff can
   * actually bound the result. Small: a GGX peak at this roughness is
   * already in the hundreds.
   */
  specularStrength: 0.055,
} as const

/* ------------------------------------------------------------------ */
/* Interaction                                                         */
/* ------------------------------------------------------------------ */

export const INTERACTION = {
  /** World size of the square the ripple simulation covers. */
  extent: 9.0,

  /** Wave-equation damping per fixed step. Below 1, or it never settles. */
  damping: 0.9915,
  /** Fixed simulation timestep. Decoupled from the render rate. */
  fixedStep: 1 / 60,
  /** Ceiling on catch-up steps after a stall, so a tab-out cannot spiral. */
  maxSubSteps: 3,

  /** Splat radius in UV units of the simulation texture. */
  splatRadius: 0.028,
  /** Impulse per unit of vertical speed, before clamping. */
  impulseGain: 0.0165,
  /** Hard ceiling on a single frame's impulse. Keeps it tasteful. */
  impulseClamp: 0.05,
  /** Vertical speed, in world units/sec, at which the impulse saturates. */
  velocitySaturation: 2.6,
  /** How far from the surface a part still disturbs it, in world units. */
  proximityRange: 0.55,

  /** How much of the ripple height reaches the geometry vs. the normal. */
  rippleDisplacement: 0.34,
  rippleNormalGain: 2.0,

  /* Persistent contact — analytic, never enters the ripple simulation. */
  /** Radius of a contact patch as a fraction of the logo's width. */
  contactRadius: 0.135,
  /** Peak height of the meniscus, in world units. */
  contactAmplitude: 0.019,
  /** How much the contact patch dulls the surface. 0 = no darkening. */
  contactDarkening: 0.42,

  /* Pressure — the swelling over something still fully submerged. */
  /**
   * Peak height of the dome, in world units.
   *
   * Very small, and the reason is the viewing angle rather than the
   * physics. Near the horizon a one-degree change in surface normal swings
   * the reflected ray by two, which is easily enough to move a patch of
   * water from the bright horizon band to the dark sky above it. A dome
   * that measures a couple of centimetres therefore reads as a hill.
   */
  pressureAmplitude: 0.0055,
  /** Dome radius, as a multiple of the contact radius. Deliberately broad. */
  pressureRadiusScale: 2.8,
  /** Depth below the surface at which the approach dome has fully built. */
  pressureRange: 0.45,
  /** Faint floor kept while the mass is still deep. */
  deepPressureFloor: 0.14,
  /** Depth over which even that faint indication fades away. */
  deepPressureRange: 1.9,
} as const

/* ------------------------------------------------------------------ */
/* Logo material                                                       */
/* ------------------------------------------------------------------ */

/**
 * A minimal, non-destructive correction to the exported material.
 *
 * The GLB authors WS_BlackMetal as metalness 0.9 with a base colour of
 * 0.0012. Under glTF's metallic-roughness model a metal's base colour *is*
 * its reflectance, so 0.0012 does not describe black metal — it describes
 * a surface that absorbs 99.9% of everything it sees, and it renders as a
 * hole in the frame with no bevel, no highlight and no environment. The
 * value is plausible in Blender's viewport and wrong in a glTF renderer.
 *
 * Roughness and metalness are taken from the file untouched; only
 * reflectance is lifted, to the low end of real blackened steel. The
 * source GLB is not modified and the material is cloned before this is
 * applied.
 */
export const WETNESS = {
  /**
   * How fast the wet line falls back toward the waterline, in world units
   * per second. Slow: a heavy object drains for a while after it surfaces,
   * and a film that vanished the instant it cleared the water would read
   * as a rendering glitch rather than as drying.
   */
  drainRate: 0.085,
  /** Height of the wet-to-dry transition. */
  fade: 0.19,
  /**
   * Brightness of the meniscus line at the draining edge.
   *
   * Restrained on purpose. This is the cue that carries wetness on a
   * near-black surface, and it is also the one that would tip the emblem
   * into looking lacquered if pushed.
   */
  beadGain: [0.2, 0.225, 0.26] as [number, number, number],
} as const

/**
 * The emblem as the water is allowed to see it.
 *
 * Duller, rougher and darker than the real thing, and lit from the sky
 * cube alone so no low key light can reach it. That last part is what
 * removes the lanes at source: there is no bright sidewall left to smear
 * across the foreground, only a graphite silhouette that reads as the mark
 * without competing with it.
 */
export const REFLECTION_PROXY_MATERIAL = {
  /**
   * Brighter than the first attempt, and safe to be.
   *
   * Once the proxy is lit from the sky cube alone there is no low key for
   * it to catch, so raising it cannot bring the lanes back — it only makes
   * the reflection legible as the mark. Too dark and the water carries an
   * anonymous dark carpet, which is the failure this architecture was
   * supposed to fix.
   */
  baseColor: 0.058,
  roughness: 0.34,
  envMapIntensity: 1.15,
} as const

/**
 * The split, which exists to open a passage rather than to animate a logo.
 *
 * The displacement is not a chosen percentage — it comes from measuring
 * the assembled mark. See PASSAGE in cameraPath.ts: the corridor is 0.191
 * wide with the emblem closed, opens at 0.9 per unit of per-side movement,
 * and needs ±0.143 to give the camera comfortable clearance.
 */
export const SPLIT = {
  /** Rotation each half takes, in radians. Restrained: engineered, not thrown. */
  rotation: 0.1,
  /** Complementary depth shift, so the two halves pass rather than mirror. */
  depthShift: 0.06,
} as const

/**
 * The light inside the mark.
 *
 * A structural cue for the opening, not an effect. It lights the interior
 * sidewalls that the split exposes and nothing else — the emblem stays a
 * physical black-metal object, because making the whole thing emissive
 * would throw away every bit of material weight the lighting rig just
 * bought. This is also the one place the brand's warm accent is spent, and
 * it is spent only once something has happened to justify it.
 */
export const SEAM = {
  color: [1.0, 0.46, 0.24] as [number, number, number],
  /** Peak emissive level on the interior faces at full separation. */
  intensity: 0.55,
  /** How far the glow reaches from the split plane, in world units. */
  falloff: 0.42,
} as const

/** The space beyond the aperture. Placeholder, not the production section. */
export const DESTINATION = {
  /**
   * The space beyond the aperture.
   *
   * Revealed by proximity to the opening rather than by a progress
   * threshold, and deliberately not a grid. A uniform lattice switching on
   * while the camera still faces the emblem reads as a debug room and as a
   * mode change — both of which it was. Horizontal rules at uneven depths
   * echo the site's own dividers, carry depth hierarchy, and only resolve
   * once the mark is large enough in frame to be doing the revealing.
   */
  /** Depths behind the mark, and each layer's relative weight. */
  layers: [
    { distance: 5.2, rules: 5, spread: 1.5, opacity: 1.0 },
    { distance: 8.0, rules: 7, spread: 2.4, opacity: 0.6 },
    { distance: 12.0, rules: 9, spread: 3.4, opacity: 0.32 },
  ],
  /**
   * Narrow on purpose. A field wide enough to span the frame is a backdrop
   * and reads as the environment changing; one that fits inside the
   * aperture's cone reads as something seen *through* the opening, which
   * is the whole point of revealing it there.
   */
  width: 4.2,
  /**
   * Bright enough to exist.
   *
   * The first values put the brightest rule at 0.21 against a sky of
   * roughly 0.2-0.25 — the same value as the thing it was drawn on, which
   * is why the field never appeared in playback despite being correctly
   * placed, correctly timed, and filling 114% of the frame's width. It was
   * not missing; it had no contrast.
   */
  color: [0.62, 0.74, 0.95] as [number, number, number],
  /**
   * Camera distance to the aperture at which the field is fully revealed,
   * and at which it is still invisible. Closer means more occluded frame.
   */
  revealAt: 1.4,
  hiddenAt: 3.4,
  peakOpacity: 0.9,
} as const

export const LOGO_MATERIAL = {
  /** Reflectance for dark polished metal. Blackened steel sits ~0.04-0.08. */
  baseColor: 0.05,
  /** Multiplier on the reflected environment. */
  envMapIntensity: 1.5,
} as const

/* ------------------------------------------------------------------ */
/* Breach particles                                                    */
/* ------------------------------------------------------------------ */

/**
 * Droplets and spray, and only those.
 *
 * Restrained deliberately: this is water leaving a surface, not an effect.
 * Everything here is physically motivated by the crossing — nothing spawns
 * anywhere except at a contact patch that is genuinely cutting the water.
 */
export const PARTICLES = {
  /**
   * Off.
   *
   * Two attempts — round point sprites, then velocity-stretched capsules —
   * and both read as debris rather than as water. Sprite-based spray on a
   * near-black surface is a harder problem than it looks, and a clean
   * breach carried by displacement, contact deformation and runoff is
   * better than a breach with unconvincing particles in it. The system is
   * kept intact behind this flag; the activated field later is a separate
   * visual problem and will be solved as one.
   */
  enabled: false,

  /** Pool size at the high tier. Scaled down with quality. */
  count: 340,
  /** Droplets per second per contact, at full intensity. */
  rate: 34,
  /** Vertical speed below which nothing is thrown at all. */
  minSpeed: 0.18,
  /** Speed at which emission and launch velocity saturate. */
  saturationSpeed: 2.4,

  lift: 1.5,
  spread: 0.5,
  gravity: 5.2,
  /** Air resistance. Fine spray decelerates fast; this is what stops it
   *  looking like debris on a ballistic arc. */
  drag: 1.4,
  lifetime: 1.15,

  sizeMin: 0.008,
  sizeRange: 0.016,
  color: [0.46, 0.52, 0.6] as [number, number, number],
} as const

/* ------------------------------------------------------------------ */
/* Environment and lighting                                            */
/* ------------------------------------------------------------------ */

/**
 * One rectangular soft source.
 *
 * `inSky` is the important field. A source marked false lights the metal
 * but is absent from the sky the camera sees and the water reflects.
 */
export interface StudioSource {
  name: string
  azimuth: number
  elevation: number
  angularSize: number
  intensity: number
  color: [number, number, number]
  inSky: boolean
}

/**
 * The lighting rig.
 *
 * The split between sky and lighting is the architectural fix for the
 * white ribbons that ran from the emblem to the bottom of the frame.
 *
 * The geometry of the problem is not solvable by tuning. A polished face
 * shows whatever sits in its mirror direction, and in this composition the
 * emblem's front faces mirror a direction roughly two degrees above the
 * horizon — so the source that describes them has to sit low. A low source
 * is also, unavoidably, exactly what lays a glitter path across water seen
 * at a grazing angle. Roughness, exposure and specular clamping all trade
 * one of those against the other; none of them separates the two.
 *
 * A stage separates them by flagging the light off the water. The renderer
 * equivalent is two environments: `scene.environment` (every source) lights
 * the metal, while `scene.background` (only `inSky` sources) is what the
 * camera sees and what the planar reflection pass renders. The emblem's
 * own reflection still appears in the water, because that comes from the
 * scene geometry rather than from the background.
 */
export const STUDIO_SOURCES: StudioSource[] = [
  /**
   * The front-face shaper. Large, only moderately bright, and kept out of
   * the sky — this is the source that was drawing the ribbons.
   *
   * Size matters more than intensity. At roughness 0.18 a small bright
   * source leaves a hard dot on a black face while a large dim one lays a
   * gradient across it, and that gradient is what reads as machined metal.
   * There is a ceiling on that: taken far enough the source covers every
   * direction the faces point at, every face returns the same value, and
   * the emblem goes flat grey. This sits below it.
   */
  {
    name: 'key',
    azimuth: -0.42,
    elevation: 0.3,
    angularSize: 0.72,
    intensity: 1.5,
    color: [1.0, 0.985, 0.965],
    inSky: false,
  },
  /**
   * High and narrow: this is what draws the bevels. Kept in the sky, since
   * at 57 degrees its reflection lands a few centimetres from the camera
   * rather than streaking away toward the horizon.
   */
  {
    name: 'fill',
    azimuth: 0.58,
    elevation: 1.0,
    angularSize: 0.46,
    intensity: 4.6,
    color: [0.9, 0.94, 1.0],
    inSky: true,
  },
  /**
   * Silhouette separation on the far edge. Lighting only — at 26 degrees
   * its reflection would land in the lower third of the frame.
   *
   * This used to be a warm ember source: it read as a visible light card
   * floating in the environment, and it spent the brand accent before
   * anything had happened to justify it. The warm light belongs to
   * activation, where it comes from inside the mark.
   */
  {
    name: 'rim',
    azimuth: 1.78,
    elevation: 0.46,
    angularSize: 0.44,
    intensity: 3.4,
    color: [0.93, 0.96, 1.0],
    inSky: false,
  },
  /**
   * The reflection card.
   *
   * Below the horizon, so the water surface can never reflect it — the
   * reflected ray from a camera above the water always points up. Its only
   * job is to put light on the emblem's undersides and lower bevels, which
   * are the faces a planar reflection actually shows. Without it the
   * reflection is an unlit shape and reads as an unrelated dark mass
   * rather than as a continuation of the mark.
   */
  {
    name: 'underlight',
    azimuth: -0.2,
    elevation: -0.42,
    angularSize: 0.85,
    intensity: 2.3,
    color: [0.88, 0.92, 1.0],
    inSky: false,
  },
]

export const ENVIRONMENT = {
  /** Face size of the procedural cubes. One render each, at mount. */
  cubeSize: 256,

  zenith: [0.007, 0.0085, 0.012] as [number, number, number],
  horizon: [0.036, 0.043, 0.055] as [number, number, number],
  nadir: [0.004, 0.005, 0.007] as [number, number, number],
  /** The wide band of lift at eye level — the rig's primary source. */
  horizonGlow: [0.074, 0.086, 0.108] as [number, number, number],

  /**
   * Background dimming.
   *
   * Now that the low sources are out of the sky entirely this no longer
   * has to carry the glitter-path correction, so it can go back up and let
   * the horizon read.
   */
  backgroundIntensity: 0.5,
  environmentIntensity: 1.0,

  toneMappingExposure: 0.92,
} as const

/* ------------------------------------------------------------------ */
/* Quality tiers                                                       */
/* ------------------------------------------------------------------ */

export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: {
    dprCap: 1.75,
    waterSegments: 320,
    reflectionSize: 1024,
    refractionSize: 1024,
    rippleSize: 256,
    detailOctaves: 4,
    particles: PARTICLES.count,
  },
  medium: {
    dprCap: 1.35,
    waterSegments: 224,
    reflectionSize: 640,
    refractionSize: 768,
    rippleSize: 192,
    detailOctaves: 3,
    particles: Math.round(PARTICLES.count * 0.55),
  },
  low: {
    dprCap: 1.0,
    waterSegments: 144,
    reflectionSize: 384,
    refractionSize: 512,
    rippleSize: 128,
    detailOctaves: 2,
    particles: Math.round(PARTICLES.count * 0.28),
  },
}

/**
 * Submersion presets the debug overlay can jump to.
 *
 * The two extremes overshoot slightly so they land on the same rig height
 * the scroll curve reaches — a value of exactly 1 would put the top edge
 * on the waterline, which is not "fully submerged".
 */
export const SUBMERSION_PRESETS = [
  { label: 'Fully submerged', value: 1.16 },
  { label: '75%', value: 0.75 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 },
  { label: 'Surface', value: 0.03 },
  { label: 'Fully above', value: -0.015 },
] as const
