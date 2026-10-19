import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three'

/**
 * Time of day and weather. A single number from dawn (0) to night (1)
 * drives sun position, light colour, sky gradient and window glow; the
 * storm amount pulls everything toward a low grey ceiling.
 */

interface Key {
  t: number
  elevation: number
  azimuth: number
  sun: string
  sunIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  top: string
  horizon: string
  haze: string
  bottom: string
  cloud: string
  cloudShade: string
  cover: number
  night: number
  stars: number
}

const keys: Key[] = [
  { t: 0, elevation: 5, azimuth: 105, sun: '#ffb48c', sunIntensity: 1.7, hemiSky: '#9fb2d6', hemiGround: '#4a3f3a', hemiIntensity: 0.55, top: '#3a5687', horizon: '#f0b69c', haze: '#b7a8c6', bottom: '#4d4842', cloud: '#f6c9b6', cloudShade: '#6c6f86', cover: 0.38, night: 0.35, stars: 0 },
  { t: 0.28, elevation: 32, azimuth: 62, sun: '#fff0dc', sunIntensity: 3.1, hemiSky: '#bcd4f0', hemiGround: '#5a5446', hemiIntensity: 0.95, top: '#4b7cbd', horizon: '#cfe0ee', haze: '#cddbea', bottom: '#6e6d62', cloud: '#ffffff', cloudShade: '#9aa6b8', cover: 0.34, night: 0, stars: 0 },
  { t: 0.48, elevation: 56, azimuth: 12, sun: '#fff8ee', sunIntensity: 3.4, hemiSky: '#c4dcf5', hemiGround: '#5d5748', hemiIntensity: 1.0, top: '#3d72b6', horizon: '#d4e4f1', haze: '#d0e0ee', bottom: '#74736a', cloud: '#ffffff', cloudShade: '#a3aebd', cover: 0.3, night: 0, stars: 0 },
  { t: 0.7, elevation: 9, azimuth: -98, sun: '#ffc282', sunIntensity: 3.6, hemiSky: '#b4c4e0', hemiGround: '#6a5644', hemiIntensity: 1.0, top: '#33538a', horizon: '#ffc48c', haze: '#a9b3cb', bottom: '#5c5047', cloud: '#ffd8ae', cloudShade: '#7d7f96', cover: 0.36, night: 0.25, stars: 0 },
  { t: 0.84, elevation: -3, azimuth: -76, sun: '#ff9d6c', sunIntensity: 0.6, hemiSky: '#6378a6', hemiGround: '#2e2e38', hemiIntensity: 0.75, top: '#16274a', horizon: '#d58d6e', haze: '#5d6188', bottom: '#26262c', cloud: '#c48a78', cloudShade: '#2e3550', cover: 0.34, night: 1, stars: 0.25 },
  { t: 1, elevation: 36, azimuth: 40, sun: '#a3b6ff', sunIntensity: 0.45, hemiSky: '#2c3a5c', hemiGround: '#14151b', hemiIntensity: 0.45, top: '#060a15', horizon: '#1b2741', haze: '#141d33', bottom: '#08090c', cloud: '#28314d', cloudShade: '#10141f', cover: 0.3, night: 1, stars: 1 },
]

const storm = {
  hemiSky: new Color('#6f7c8a'), hemiGround: new Color('#2b2e31'),
  top: new Color('#262f3a'), horizon: new Color('#55606b'), haze: new Color('#4c5661'), bottom: new Color('#33363a'),
  cloud: new Color('#6a737e'), cloudShade: new Color('#20252c'),
}

export interface Atmosphere {
  sunDirection: Vector3
  sunColor: Color
  sunIntensity: number
  hemiSky: Color
  hemiGround: Color
  hemiIntensity: number
  top: Color
  horizon: Color
  haze: Color
  bottom: Color
  cloud: Color
  cloudShade: Color
  cover: number
  night: number
  stars: number
  fog: Color
}

const tmp = new Color()

export function sampleAtmosphere(t: number, weather: number): Atmosphere {
  const time = Math.max(0, Math.min(1, t))
  let index = keys.findIndex(key => key.t >= time)
  if (index <= 0) index = 1
  const a = keys[index - 1]
  const b = keys[index]
  const k = (time - a.t) / Math.max(0.0001, b.t - a.t)
  const s = k * k * (3 - 2 * k)
  const mix = (x: number, y: number) => x + (y - x) * s
  const color = (x: string, y: string) => new Color(x).lerp(tmp.set(y), s)

  const elevation = (mix(a.elevation, b.elevation) * Math.PI) / 180
  const azimuth = (mix(a.azimuth, b.azimuth) * Math.PI) / 180
  const sunDirection = new Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)).normalize()
  const w = Math.max(0, Math.min(1, weather))

  const atmosphere: Atmosphere = {
    sunDirection,
    sunColor: color(a.sun, b.sun),
    sunIntensity: mix(a.sunIntensity, b.sunIntensity) * (1 - 0.88 * w),
    hemiSky: color(a.hemiSky, b.hemiSky).lerp(storm.hemiSky, w * 0.85),
    hemiGround: color(a.hemiGround, b.hemiGround).lerp(storm.hemiGround, w * 0.8),
    hemiIntensity: mix(a.hemiIntensity, b.hemiIntensity) * (1 - 0.25 * w) + 0.1 * w,
    top: color(a.top, b.top).lerp(storm.top, w * 0.9),
    horizon: color(a.horizon, b.horizon).lerp(storm.horizon, w * 0.9),
    haze: color(a.haze, b.haze).lerp(storm.haze, w * 0.9),
    bottom: color(a.bottom, b.bottom).lerp(storm.bottom, w * 0.9),
    cloud: color(a.cloud, b.cloud).lerp(storm.cloud, w),
    cloudShade: color(a.cloudShade, b.cloudShade).lerp(storm.cloudShade, w),
    cover: mix(a.cover, b.cover) + (0.97 - mix(a.cover, b.cover)) * w,
    night: Math.max(mix(a.night, b.night), w * 0.55),
    stars: mix(a.stars, b.stars) * (1 - w),
    fog: new Color(),
  }
  atmosphere.fog.copy(atmosphere.haze).lerp(atmosphere.horizon, 0.3)
  return atmosphere
}

const vertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
    gl_Position.z = gl_Position.w;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uHaze;
  uniform vec3 uFog;
  uniform vec3 uBottom;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform vec3 uCloud;
  uniform vec3 uCloudShade;
  uniform float uCover;
  uniform float uTime;
  uniform float uFlash;
  uniform float uStars;
  uniform float uSunVisible;
  varying vec3 vDirection;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float value = 0.0; float amplitude = 0.5;
    for (int i = 0; i < 5; i++) { value += amplitude * noise(p); p = p * 2.03 + vec2(1.7, 9.2); amplitude *= 0.5; }
    return value;
  }

  void main() {
    vec3 d = normalize(vDirection);
    float h = d.y;
    vec3 s = normalize(uSunDirection);
    float facing = clamp(0.5 + 0.5 * dot(normalize(d.xz + vec2(1e-4)), normalize(s.xz + vec2(1e-4))), 0.0, 1.0);
    vec3 horizon = mix(uHaze, uHorizon, pow(facing, 2.2));
    vec3 color = mix(horizon, uTop, pow(smoothstep(-0.01, 0.42, h), 0.62));
    color = mix(color, uFog, smoothstep(0.07, -0.005, h));
    color = mix(color, uBottom, smoothstep(-0.02, -0.25, h));
    float sun = max(dot(d, s), 0.0);
    color += uSunColor * (pow(sun, 6.0) * 0.22 + pow(sun, 48.0) * 0.5) * (1.0 - uCover * 0.6);
    color += uSunColor * smoothstep(0.99955, 0.9998, sun) * 6.0 * uSunVisible * (1.0 - uCover * 0.9);

    if (h > 0.0) {
      vec2 uv = d.xz / (h + 0.14) * 1.4 + vec2(uTime * 0.006, uTime * 0.0025);
      float n = fbm(uv);
      float coverage = smoothstep(1.0 - uCover, 1.0 - uCover + 0.32, n);
      float body = smoothstep(0.35, 0.95, fbm(uv * 1.6 + 3.1));
      vec3 cloud = mix(uCloudShade, uCloud, body);
      cloud += uSunColor * pow(sun, 5.0) * 0.35 * (1.0 - uCover * 0.5);
      color = mix(color, cloud, coverage * smoothstep(0.0, 0.16, h) * 0.96);
      float star = step(0.9975, hash(floor(d.xz / (h + 0.3) * 260.0))) * smoothstep(0.08, 0.4, h);
      color += vec3(0.9, 0.93, 1.0) * star * uStars * (1.0 - coverage);
    }

    color += vec3(0.7, 0.78, 1.0) * uFlash * (0.5 + 0.5 * max(h, 0.0));
    gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createSky(): Mesh<SphereGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new Color() },
      uHorizon: { value: new Color() },
      uHaze: { value: new Color() },
      uFog: { value: new Color() },
      uBottom: { value: new Color() },
      uSunColor: { value: new Color() },
      uSunDirection: { value: new Vector3(0, 1, 0) },
      uCloud: { value: new Color() },
      uCloudShade: { value: new Color() },
      uCover: { value: 0.3 },
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uStars: { value: 0 },
      uSunVisible: { value: 1 },
    },
  })
  const mesh = new Mesh(new SphereGeometry(450, 48, 24), material)
  mesh.renderOrder = -10
  mesh.frustumCulled = false
  return mesh
}

export function applySky(sky: Mesh<SphereGeometry, ShaderMaterial>, atmosphere: Atmosphere) {
  const u = sky.material.uniforms
  ;(u.uTop.value as Color).copy(atmosphere.top)
  ;(u.uHorizon.value as Color).copy(atmosphere.horizon)
  ;(u.uHaze.value as Color).copy(atmosphere.haze)
  ;(u.uFog.value as Color).copy(atmosphere.fog)
  ;(u.uBottom.value as Color).copy(atmosphere.bottom)
  ;(u.uSunColor.value as Color).copy(atmosphere.sunColor)
  ;(u.uSunDirection.value as Vector3).copy(atmosphere.sunDirection)
  ;(u.uCloud.value as Color).copy(atmosphere.cloud)
  ;(u.uCloudShade.value as Color).copy(atmosphere.cloudShade)
  u.uCover.value = atmosphere.cover
  u.uStars.value = atmosphere.stars
  u.uSunVisible.value = atmosphere.sunDirection.y > -0.02 ? 1 : 0
}
