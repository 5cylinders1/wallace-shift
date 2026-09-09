/**
 * GLSL shared verbatim by the water vertex and fragment stages.
 *
 * Both stages must agree on the surface height to the last bit: the
 * vertex stage displaces geometry with it and the fragment stage takes its
 * gradient for the normal. Two near-identical copies would eventually
 * drift and produce lighting that does not sit on the mesh, so there is
 * exactly one definition and both stages include it.
 *
 * Written against GLSL ES 1.00 — no array constructors, no `texture()` —
 * because that is what three compiles a plain ShaderMaterial to.
 */
export const waterCommon = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uSwellAmp;
uniform float uFlowSpeed;
uniform float uMicroAmp;
uniform float uMicroScale;
uniform vec2 uMicroAnisotropy;

uniform sampler2D uRipple;
uniform vec2 uRippleCenter;
uniform float uRippleExtent;
uniform float uRippleDisplacement;

// xz = world position, z = radius, w = strength (0 when not touching).
uniform vec4 uContacts[2];
uniform float uContactAmp;

/**
 * Signed surface pressure. Negative values draw a localized depression
 * beneath the hovering mark; positive values displace water over it.
 * Contact remains independent and only exists at the intersection.
 */
uniform vec2 uPressure;
uniform float uPressureAmp;
uniform float uPressureRadius;

#define TAU 6.283185307179586
#define GRAVITY 9.81

/* ------------------------------------------------------------------ */
/* Gradient noise                                                      */
/* ------------------------------------------------------------------ */

/**
 * Sine-free hash. A fract-of-sine hash loses its distribution once the
 * coordinate grows past a few hundred, and this surface runs to 450 units
 * — the far field would visibly degenerate into repeating garbage.
 */
vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return -1.0 + 2.0 * fract((q.xx + q.yz) * q.zy);
}

/**
 * Gradient noise returning its own derivatives: (value, d/dx, d/dy).
 *
 * The derivatives are the entire point. Finite-differencing a five-octave
 * noise field costs three full evaluations and still produces a normal
 * that is subtly wrong at the scale the specular highlights care about.
 */
vec3 noised(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  // Quintic interpolant and its derivative.
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);

  vec2 ga = hash2(i + vec2(0.0, 0.0));
  vec2 gb = hash2(i + vec2(1.0, 0.0));
  vec2 gc = hash2(i + vec2(0.0, 1.0));
  vec2 gd = hash2(i + vec2(1.0, 1.0));

  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));

  float value = va + u.x * (vb - va) + u.y * (vc - va)
              + u.x * u.y * (va - vb - vc + vd);

  vec2 derivative = ga
    + u.x * (gb - ga)
    + u.y * (gc - ga)
    + u.x * u.y * (ga - gb - gc + gd)
    + du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va);

  return vec3(value, derivative);
}

/** Rotation between octaves. Without it every octave shares an axis. */
const mat2 OCTAVE_ROTATION = mat2(0.8, 0.6, -0.6, 0.8);

/**
 * Its transpose, for carrying gradients back to world space.
 *
 * An octave samples noise at R*q, so by the chain rule its world-space
 * derivative is R-transpose times the noise-space one. Using R itself
 * rotates every octave's gradient the wrong way and tilts the normal off
 * the surface it belongs to — the magnitude looks right, so it shows up as
 * highlights that sit slightly beside the ripples rather than on them.
 */
const mat2 OCTAVE_ROTATION_T = mat2(0.8, -0.6, 0.6, 0.8);

/* ------------------------------------------------------------------ */
/* Macro swell                                                         */
/* ------------------------------------------------------------------ */

/**
 * One directional wave, with its amplitude modulated along its own crest.
 *
 * The modulation is what stops the surface reading as procedural. A plain
 * sum of directional sines produces crests that run unbroken from one side
 * of the frame to the other, and at a grazing angle those resolve into the
 * parallel banding that gives the whole illusion away. Fading each wave in
 * and out along its length breaks the crest into travelling patches, which
 * is what real swell does.
 */
vec3 swellOctave(vec2 p, float t, vec2 dir, float wavelength, float amp) {
  float k = TAU / wavelength;
  // Deep-water dispersion: long swell genuinely travels slower per
  // wavelength than the chop riding on it.
  float omega = sqrt(GRAVITY * k) * uFlowSpeed;

  float envelope = clamp(
    0.55 + 0.9 * noised(p * 0.21 + vec2(t * 0.017, 0.0)).x,
    0.1,
    1.0
  );

  float phase = dot(dir, p) * k + t * omega;
  float scale = amp * envelope;

  // The envelope varies over ~30 world units against wavelengths of 2-5,
  // so treating it as locally constant here costs nothing measurable and
  // saves carrying its derivative through every octave.
  return vec3(scale * sin(phase), scale * k * cos(phase) * dir);
}

/**
 * The long swell. The only band that displaces geometry.
 *
 * Three crossing directions, deliberately not evenly spaced and not
 * axis-aligned, at wavelengths set against the emblem's 2-unit width. The
 * amplitude is small on purpose: large smooth displacement close to camera
 * is what makes dark water read as poured latex rather than as water.
 */
vec3 swellFull(vec2 p, float t) {
  vec3 h = vec3(0.0);
  h += swellOctave(p, t, vec2( 0.1197, 0.9928), 2.60, 1.000);
  h += swellOctave(p, t, vec2(-0.2195, 0.9756), 1.35, 0.450);
  h += swellOctave(p, t, vec2( 0.3898, 0.9209), 0.74, 0.180);
  return h * 0.5376 * uSwellAmp;
}

float swellHeight(vec2 p, float t) {
  return swellFull(p, t).x;
}

/* ------------------------------------------------------------------ */
/* Micro detail                                                        */
/* ------------------------------------------------------------------ */

/**
 * High-frequency surface texture, as (height, d/dx, d/dz).
 *
 * Never displaces geometry — it lives entirely in the normal, which makes
 * it resolution-independent and free of the aliasing a displaced grid this
 * fine would produce. This is the band that carries most of the realism:
 * it is what breaks a mirror into facets, and a mirror is what dark water
 * looks like without it.
 *
 * Each octave drifts in its own direction and is rotated relative to the
 * last, so no two ever lock into a repeating pattern.
 */
vec3 microDetail(vec2 p, float t) {
  vec3 sum = vec3(0.0);
  vec2 q = p * uMicroAnisotropy * uMicroScale;
  float amp = 1.0;
  float freq = uMicroScale;
  mat2 back = mat2(1.0, 0.0, 0.0, 1.0);

  // Octave 1
  vec3 n = noised(q + vec2(t * 0.21, t * -0.13));
  sum += vec3(n.x, (back * n.yz) * freq) * amp;

  // Octave 2
  q = OCTAVE_ROTATION * q * 2.13; amp *= 0.46; freq *= 2.13;
  back = back * OCTAVE_ROTATION_T;
  n = noised(q + vec2(t * -0.29, t * 0.19));
  sum += vec3(n.x, (back * n.yz) * freq) * amp;

#if DETAIL_OCTAVES > 2
  // Octave 3
  q = OCTAVE_ROTATION * q * 2.07; amp *= 0.46; freq *= 2.07;
  back = back * OCTAVE_ROTATION_T;
  n = noised(q + vec2(t * 0.37, t * 0.31));
  sum += vec3(n.x, (back * n.yz) * freq) * amp;
#endif

#if DETAIL_OCTAVES > 3
  // Octave 4
  q = OCTAVE_ROTATION * q * 2.19; amp *= 0.46; freq *= 2.19;
  back = back * OCTAVE_ROTATION_T;
  n = noised(q + vec2(t * -0.44, t * 0.41));
  sum += vec3(n.x, (back * n.yz) * freq) * amp;
#endif

  // Chain rule through the initial anisotropic domain, after each
  // octave's rotation has already been carried back to that domain.
  return vec3(sum.x, sum.yz * uMicroAnisotropy) * uMicroAmp;
}

/* ------------------------------------------------------------------ */
/* Interaction                                                         */
/* ------------------------------------------------------------------ */

/** Simulation texture lookup, zero outside the simulated square. */
float rippleHeight(vec2 p) {
  vec2 uv = (p - uRippleCenter) / uRippleExtent + 0.5;
  vec2 clamped = clamp(uv, 0.0, 1.0);
  if (clamped != uv) return 0.0;
  return texture2D(uRipple, uv).r;
}

/**
 * The standing meniscus where the metal passes through the surface.
 *
 * A collar, not a bump: the profile is zero at the contact point, peaks
 * about one radius out and decays. Water climbing the side of the object
 * is what sells a stationary intersection, and it is deliberately
 * independent of the ripple simulation so it does not decay away when the
 * logo stops moving.
 */
float contactProfile(float d, float r) {
  float g = exp(-0.5 * (d * d) / max(r * r, 1e-6));
  float g4 = g * g * g * g;
  return (g - g4) * 2.174;
}

float contactHeight(vec2 p) {
  float h = 0.0;
  h += uContacts[0].w * uContactAmp *
       contactProfile(length(p - uContacts[0].xy), uContacts[0].z);
  h += uContacts[1].w * uContactAmp *
       contactProfile(length(p - uContacts[1].xy), uContacts[1].z);
  return h;
}

/** Analytic gradient of the contact collar. */
vec2 contactGradient(vec2 p) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < 2; i++) {
    vec2 delta = p - uContacts[i].xy;
    float d = max(length(delta), 1e-4);
    float r = max(uContacts[i].z, 1e-4);
    float e = exp(-0.5 * (d * d) / (r * r));
    // d/dd of (e - e^4) * 2.174, times the radial unit vector.
    float dProfile = 2.174 * (-d / (r * r)) * (e - 4.0 * e * e * e * e);
    g += uContacts[i].w * uContactAmp * dProfile * (delta / d);
  }
  return g;
}

/**
 * How strongly a point sits in the disturbed collar around a contact.
 *
 * Deliberately the same profile as the height, not a blob centred on the
 * object: the centre of a contact patch is inside the metal, where nothing
 * is drawn. What is visible is the ring just outside it, where the water is
 * locally steeper and scatters instead of mirroring.
 */
float contactMask(vec2 p) {
  float m = 0.0;
  m += uContacts[0].w *
       contactProfile(length(p - uContacts[0].xy), uContacts[0].z);
  m += uContacts[1].w *
       contactProfile(length(p - uContacts[1].xy), uContacts[1].z);
  return clamp(m, 0.0, 1.0);
}

/**
 * Signed, broad pressure deformation. The authored depression anticipates
 * entry without depending on velocity or an impact emission. Height and
 * gradient preserve its sign so the lighting remains attached to it.
 */
float pressureHeight(vec2 p) {
  float h = 0.0;
  float r = max(uPressureRadius, 1e-4);
  for (int i = 0; i < 2; i++) {
    vec2 d = p - uContacts[i].xy;
    h += uPressure[i] * uPressureAmp * exp(-0.5 * dot(d, d) / (r * r));
  }
  return h;
}

vec2 pressureGradient(vec2 p) {
  vec2 g = vec2(0.0);
  float r = max(uPressureRadius, 1e-4);
  for (int i = 0; i < 2; i++) {
    vec2 d = p - uContacts[i].xy;
    float e = exp(-0.5 * dot(d, d) / (r * r));
    g += uPressure[i] * uPressureAmp * e * (-d / (r * r));
  }
  return g;
}

/** The height the geometry is displaced to. */
float surfaceHeight(vec2 p, float t) {
  return swellHeight(p, t)
       + rippleHeight(p) * uRippleDisplacement
       + contactHeight(p)
       + pressureHeight(p);
}
`
