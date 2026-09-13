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

/** The experiment uses a CSS sticky stage and direct normalized scroll. */
export const IMPLEMENTED_PROGRESS_MAX = 1
export const STAGE_SCROLL_SVH = 600
export const REDUCED_MOTION_PROGRESS = 0
export const CAMERA = { fov: 32, near: 0.025, far: 400 } as const

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
  swellAmplitude: 0.013,
  /** Amplitude of the noise band that carries the normal. */
  microAmplitude: 0.014,
  /** Fine ripples stretch along X into quiet horizontal crests. */
  microScale: 7.6,
  microAnisotropy: [0.42, 1.0] as [number, number],
  /** Global time multiplier for the ambient surface. */
  flowSpeed: 0.18,

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
  reflectionDistortion: 0.075,
  /**
   * Compression applied to the reflection. Higher rolls the peaks off
   * harder; 0 leaves it linear and lets the horizon band blow out.
   */
  reflectionRolloff: 1.05,
  /** Filtered reflection grows softer toward camera instead of keeping a
   * perfectly sharp emblem inside every distorted foreground wave. */
  reflectionBlur: [0.15, 4.5] as [number, number],
  reflectionAttenuation: 0.13,
  /**
   * Preserve the reflected mark through the visible foreground. Fine
   * horizontal ripples break its image; a tiny spatial mask must not erase
   * the long silver reflection that grounds the production composition.
   */
  reflectionFocus: 8.0,
  /** Same, for the refraction sample. Lower — refraction bends less. */
  refractionDistortion: 0.040,

  /** Per-channel extinction. Red dies first, which is what makes it deep. */
  extinction: [0.78, 0.44, 0.32] as [number, number, number],
  /** The colour water converges to once nothing is left to transmit. */
  deepColor: [0.00135, 0.00245, 0.0034] as [number, number, number],
  /**
   * Light scattered back out of the water column.
   *
   * Small, but it is the difference between a foreground that reads as
   * deep water and one that reads as a hole cut in the frame.
   */
  scatterColor: [0.0017, 0.0036, 0.0050] as [number, number, number],
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
  specularRoughness: 0.17,
  /**
   * Level fed into the lobe before its rolloff, so the rolloff can
   * actually bound the result. Small: a GGX peak at this roughness is
   * already in the hundreds.
   */
  specularStrength: 0.033,
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
  rippleDisplacement: 0.40,
  rippleNormalGain: 2.5,

  /* Persistent contact — analytic, never enters the ripple simulation. */
  /** Radius of a contact patch as a fraction of the logo's width. */
  contactRadius: 0.135,
  /** Peak height of the meniscus, in world units. */
  contactAmplitude: 0.024,
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

} as const

/* ------------------------------------------------------------------ */
/* Logo material                                                       */
/* ------------------------------------------------------------------ */

/** Smoked optical glass. Refraction is composited from an isolated scene
 * capture so transparent underwater particles are present inside the glass.
 * The authored bevels carry a restrained cool luminous rim. RGB is linear. */
export const LOGO_MATERIAL = {
  baseColor: [.48, .59, .66],
  metalness: 0,
  roughness: .16,
  ior: 1.46,
  specularIntensity: .85,
  envMapIntensity: 1.08,
  rimColor: [.42, .78, 1.0],
  rimStrength: .82,
} as const

export const REFLECTION_PROXY_MATERIAL = LOGO_MATERIAL

/** Original clear optical base, also used by Frosted and Smoked Copper.
 * Keep these inherited settings stable when refining the Glass comparison. */
export const CLEAR_CRYSTAL_MATERIAL = {
  baseColor: [1, 1, 1],
  metalness: 0,
  roughness: .045,
  ior: 1.52,
  specularIntensity: 1,
  envMapIntensity: 1.12,
  absorption: [.024, .010, .006],
  /** Clear glass has no opaque diffuse undercoat, in either view. */
  bodyFill: [0, 0],
  iridescence: .64,
  iridescenceIOR: 1.36,
  iridescenceThicknessRange: [180, 460],
  /** Red-to-blue IOR difference; refraction scales with thickness, not pixels. */
  dispersion: .045,
  internalReflection: .65,
} as const

/** Iridescent Glass: a stronger dielectric film in reflected light, while
 * the body retains the clear base's absorption and clean optical surface. */
export const GLASSMORPH_LOGO_MATERIAL = {
  ...CLEAR_CRYSTAL_MATERIAL,
  /** Broaden studio glints without blurring the captured scene through glass.
   * Lower reflected energy keeps the white cards from washing out the film. */
  roughness: .14,
  envMapIntensity: .70,
  internalReflection: .42,
  iridescence: 1,
  iridescenceIOR: 1.78,
  iridescenceThicknessRange: [220, 620],
  dispersion: .065,
} as const

export type LogoAppearance = 'led' | 'electric' | 'glass' | 'chrome' | 'frosted' | 'pearl' | 'copper' | 'mercury' | 'cutlight'
/** User-approved favorite. Selecting the comparison never rewrites this. */
export const PREFERRED_LOGO_APPEARANCE: LogoAppearance = 'led'
export const PREVIEW_LOGO_APPEARANCE: LogoAppearance = 'glass'

/** Saved top runner: full-glow opal LED, approved 2026-09-07.
 * Keep this profile and its full additive halo unchanged when trying variants. */
export const LED_LOGO_MATERIAL = {
  housingColor: [.028, .040, .050],
  metalness: .28,
  roughness: .30,
  envMapIntensity: .72,
  color: [.64, .88, 1.0],
  intensity: 1.65,
  reflectionGain: .62,
} as const

/** Alternate direction: a dark energized body with cyan branching currents.
 * It shares the solid mesh, reflection proxy and selective emission halo. */
export const ELECTRIC_LOGO_MATERIAL = {
  color: [.08, .50, 1.0],
  intensity: 2.4,
  reflectionGain: .62,
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
  /** Height relative to width; lighting cards can be taller than the sky source. */
  aspectRatio?: number
  intensity: number
  /** Separate metal-side level for a source also visible in the sky. */
  lightingIntensity?: number
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
  /** Offset key: the front reflects its continuous shoulder, not a flat white center. */
  {
    name: 'key',
    azimuth: -.34,
    elevation: .16,
    angularSize: .78,
    aspectRatio: .90,
    intensity: 1.45,
    color: [1.0, 0.985, 0.965],
    inSky: false,
  },
  /** Keep the visible sky source; flag down its contribution to metal edges. */
  {
    name: 'fill',
    azimuth: .45,
    elevation: .92,
    angularSize: .86,
    intensity: 1.70,
    lightingIntensity: .62,
    color: [.96, .975, 1.0],
    inSky: true,
  },
  /** Quiet side fill preserves the thickness as the logo turns. */
  {
    name: 'rim',
    azimuth: 1.80,
    elevation: .38,
    angularSize: 1.10,
    aspectRatio: .90,
    intensity: .58,
    color: [.96, .975, 1.0],
    inSky: false,
  },
  /** Cool, broad water bounce sits below the key without becoming a bright stripe. */
  {
    name: 'underlight',
    azimuth: -.20,
    elevation: -.40,
    angularSize: 1.20,
    aspectRatio: .70,
    intensity: .32,
    color: [.74, .86, 1.0],
    inSky: false,
  },
  /** The reverse face remains metal throughout the complete underwater turn. */
  {
    name: 'rear-softbox',
    azimuth: -2.70,
    elevation: .25,
    angularSize: 1.20,
    aspectRatio: .90,
    intensity: 1.0,
    color: [.94, .965, 1.0],
    inSky: false,
  },
  /** Overlapping low-level fill prevents an unlit gap in the 180-degree turn. */
  {
    name: 'turn-fill',
    azimuth: -1.65,
    elevation: .24,
    angularSize: 1.30,
    aspectRatio: 1.0,
    intensity: .38,
    color: [.86, .92, 1.0],
    inSky: false,
  },
]

export const ENVIRONMENT = {
  /** Face size of the procedural cubes. One render each, at mount. */
  cubeSize: 256,

  /** Visible void: near black, with a narrow trace of blue at the water. */
  zenith: [0.0001, 0.0002, 0.0003] as [number, number, number],
  horizon: [0.004, 0.0055, 0.007] as [number, number, number],
  nadir: [0.0002, 0.00035, 0.0005] as [number, number, number],
  horizonGlow: [0.008, 0.012, 0.017] as [number, number, number],
  horizonFalloff: 20,

  /** Metal retains its established diffuse studio base. Darkening the
   * visible sky must not remove the lighting that describes its surfaces. */
  lightingBase: {
    zenith: [0.007, 0.0085, 0.012] as [number, number, number],
    horizon: [0.036, 0.043, 0.055] as [number, number, number],
    nadir: [0.004, 0.005, 0.007] as [number, number, number],
    horizonGlow: [0.074, 0.086, 0.108] as [number, number, number],
    horizonFalloff: 7.5,
  },

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
    particles: 2600,
  },
  medium: {
    dprCap: 1.35,
    waterSegments: 224,
    reflectionSize: 640,
    refractionSize: 768,
    rippleSize: 192,
    detailOctaves: 3,
    particles: 1700,
  },
  low: {
    dprCap: 1.0,
    waterSegments: 144,
    reflectionSize: 384,
    refractionSize: 512,
    rippleSize: 128,
    detailOctaves: 2,
    particles: 850,
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
