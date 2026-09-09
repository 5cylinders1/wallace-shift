/** Satin ceramic with a restrained thin-film glaze. The rounded geometry's
 * original cap/shoulder normals supply all variation; no texture or light
 * animation is added to the opaque ivory body. */
export const PEARL_GLAZE = { capRoughness: .31, shoulderRoughness: .22 } as const

export const logoPearlVertexPars = /* glsl */ `
varying float vPearlFace;
`

export const logoPearlVertexNormal = /* glsl */ `
// Both authored front/back caps lie in native XZ and face along +/-Y.
vPearlFace = abs(normalize(objectNormal).y);
`

export const logoPearlFragmentPars = /* glsl */ `
uniform float uPearlTurn;
uniform float uPearlGlowPass;
varying float vPearlFace;
`

export const logoPearlFragmentRoughness = /* glsl */ `
// Broad caps have a softer satin reflection. Polished rounded shoulders
// reveal the sculpture's thickness without a hard white bevel outline.
float pearlCap = smoothstep(.80, .995, vPearlFace);
roughnessFactor = mix(${PEARL_GLAZE.shoulderRoughness}, ${PEARL_GLAZE.capRoughness}, pearlCap);
`

export const logoPearlFragmentPhysical = /* glsl */ `
#ifdef USE_IRIDESCENCE
  // Native thin-film Fresnel changes the reflected light, never the ivory
  // diffuse color. Overall yaw gates it off at both composed endpoints;
  // within the turn, actual view and shoulder normals determine the glint.
  material.iridescence *= uPearlTurn;
  material.iridescenceThickness = mix(iridescenceThicknessMinimum,
    iridescenceThicknessMaximum, smoothstep(.05, .65, 1.0 - vPearlFace));
#endif
`

export const logoPearlFragmentComposite = /* glsl */ `
// Ceramic has no permanent emission. Remove native diffuse, specular AND
// clearcoat from halo capture before the shared opening adds its brief charge.
if (uPearlGlowPass > .5) outgoingLight = vec3(0.0);
`
