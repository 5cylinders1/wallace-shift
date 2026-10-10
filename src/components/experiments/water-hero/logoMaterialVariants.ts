import { Mesh, MeshStandardMaterial, type BufferGeometry, type Object3D } from 'three'
import { buildElectricContour } from './electricContour'
import { buildGlassGeometry } from './glassGeometry'
import { BLACK_CHROME_MATERIAL, createLogoChromeMaterial } from './logoChrome'
import { FROSTED_CRYSTAL_MATERIAL, createLogoFrostedMaterial } from './logoFrosted'
import { PEARL_CERAMIC_MATERIAL, createLogoPearlMaterial } from './logoPearl'
import { SMOKED_COPPER_MATERIAL, createLogoCopperMaterial } from './logoCopper'
import { LIQUID_MERCURY_MATERIAL, createLogoMercuryMaterial } from './logoMercury'
import { CUT_LIGHT_MATERIAL, createLogoCutLightMaterial } from './logoCutLight'
import { createLogoStudioAluminumMaterial, createLogoStudioCrystalMaterial } from './logoStudio'
import { createLogoCrystalMaterial, createLogoLEDMaterial, logoLEDUniforms } from './logoMaterial'
import { createOpeningFrame, installLogoOpening, logoOpeningUniforms } from './logoOpening'
import { NODE_NAMES, type LogoAppearance } from './waterHeroConfig'

type MaterialSlot = MeshStandardMaterial | MeshStandardMaterial[]
interface OwnedVariants {
  mesh: Mesh
  led: MaterialSlot
  glass: MaterialSlot
  chrome: MaterialSlot
  frosted: MaterialSlot
  pearl: MaterialSlot
  copper: MaterialSlot
  mercury: MaterialSlot
  cutlight: MaterialSlot
  studio: MaterialSlot
  sourceGeometry: BufferGeometry
  glassGeometry: BufferGeometry
}
const variants = new WeakMap<Object3D, OwnedVariants[]>()
const selected = new WeakMap<Object3D, LogoAppearance>()
const slots = (slot: MaterialSlot) => Array.isArray(slot) ? slot : [slot]

/** Allocate once per cloned graph. LED/Electric/Chrome/Mercury/Central Light retain the exact cached GLB
 * geometry; crystal and ceramic finishes share an owned rounded shoulder. */
export function createLogoMaterialVariants(root: Object3D, worldThickness: number, reflectionProxy = false) {
  if (variants.has(root)) return
  root.updateMatrixWorld(true)
  const authoredRoot = root.getObjectByName(NODE_NAMES.root) ?? root
  const owned: OwnedVariants[] = []
  root.traverse(child => {
    if (!(child instanceof Mesh)) return
    const source = Array.isArray(child.material) ? child.material : [child.material]
    const led = source.map(material => createLogoLEDMaterial(material, reflectionProxy))
    const glass = source.map(material => createLogoCrystalMaterial(material, worldThickness))
    const frosted = source.map(material => createLogoFrostedMaterial(material, worldThickness, reflectionProxy))
    const pearl = source.map(material => createLogoPearlMaterial(material))
    const copper = source.map(material => createLogoCopperMaterial(material, worldThickness, reflectionProxy))
    const openingFrame = createOpeningFrame(child, authoredRoot)
    const chrome = source.map(material => createLogoChromeMaterial(material, openingFrame, child.geometry, reflectionProxy))
    const mercury = source.map(material => createLogoMercuryMaterial(material, openingFrame, child.geometry, reflectionProxy))
    const cutlight = source.map(material => createLogoCutLightMaterial(material, openingFrame, child.geometry, reflectionProxy))
    const studioGlass = child.name === NODE_NAMES.right
    const studio = source.map(material => studioGlass
      ? createLogoStudioCrystalMaterial(material, worldThickness)
      : createLogoStudioAluminumMaterial(material))
    studio.forEach(material => installLogoOpening(material, openingFrame, studioGlass, reflectionProxy))
    led.forEach(material => installLogoOpening(material, openingFrame, false, reflectionProxy))
    glass.forEach(material => installLogoOpening(material, openingFrame, true, reflectionProxy))
    frosted.forEach(material => {
      installLogoOpening(material, openingFrame, true, reflectionProxy)
      const opening = logoOpeningUniforms(material)!
      opening.uOpeningEmissiveGlass.value = 1
      opening.uOpeningGain.value = reflectionProxy ? FROSTED_CRYSTAL_MATERIAL.reflectionGain : 1
    })
    chrome.forEach(material => {
      installLogoOpening(material, openingFrame, false, reflectionProxy)
      const opening = logoOpeningUniforms(material)!
      opening.uOpeningColor.value.setRGB(...BLACK_CHROME_MATERIAL.seamColor)
      opening.uOpeningGain.value = reflectionProxy ? BLACK_CHROME_MATERIAL.reflectionGain : 1
    })
    pearl.forEach(material => {
      installLogoOpening(material, openingFrame, false, reflectionProxy)
      const opening = logoOpeningUniforms(material)!
      opening.uOpeningColor.value.setRGB(...PEARL_CERAMIC_MATERIAL.openingColor)
      opening.uOpeningGain.value = reflectionProxy ? PEARL_CERAMIC_MATERIAL.openingReflectionGain : 1
    })
    copper.forEach(material => {
      installLogoOpening(material, openingFrame, true, reflectionProxy)
      const opening = logoOpeningUniforms(material)!
      opening.uOpeningColor.value.setRGB(...SMOKED_COPPER_MATERIAL.openingColor)
      opening.uOpeningGain.value = reflectionProxy ? SMOKED_COPPER_MATERIAL.openingReflectionGain : 1
    })
    mercury.forEach(material => {
      installLogoOpening(material, openingFrame, false, reflectionProxy)
      const opening = logoOpeningUniforms(material)!
      opening.uOpeningColor.value.setRGB(...LIQUID_MERCURY_MATERIAL.openingColor)
      opening.uOpeningGain.value = reflectionProxy ? LIQUID_MERCURY_MATERIAL.openingReflectionGain : 1
    })
    cutlight.forEach(material => {
      installLogoOpening(material, openingFrame, false, reflectionProxy)
      const opening = logoOpeningUniforms(material)!
      opening.uOpeningColor.value.setRGB(...CUT_LIGHT_MATERIAL.openingColor)
      opening.uOpeningGain.value = reflectionProxy ? CUT_LIGHT_MATERIAL.openingReflectionGain : 1
    })
    const contour = buildElectricContour(child.geometry)
    for (const material of led) {
      const uniforms = logoLEDUniforms(material)!
      uniforms.uElectricSegmentCount.value = contour.length
      contour.forEach((segment, i) => uniforms.uElectricSegments.value[i].copy(segment))
    }
    const entry = {
      mesh: child,
      led: Array.isArray(child.material) ? led : led[0],
      glass: Array.isArray(child.material) ? glass : glass[0],
      chrome: Array.isArray(child.material) ? chrome : chrome[0],
      frosted: Array.isArray(child.material) ? frosted : frosted[0],
      pearl: Array.isArray(child.material) ? pearl : pearl[0],
      copper: Array.isArray(child.material) ? copper : copper[0],
      mercury: Array.isArray(child.material) ? mercury : mercury[0],
      cutlight: Array.isArray(child.material) ? cutlight : cutlight[0],
      studio: Array.isArray(child.material) ? studio : studio[0],
      sourceGeometry: child.geometry,
      glassGeometry: buildGlassGeometry(child.geometry),
    }
    child.castShadow = child.receiveShadow = false
    child.material = entry.led
    owned.push(entry)
  })
  variants.set(root, owned)
  selected.set(root, 'led')
}

/** Include inactive variants in environment/clip setup and cleanup, so changing
 * appearance cannot inherit an uninitialized reflection or leak a material. */
export function logoVariantMaterials(root: Object3D): MeshStandardMaterial[] {
  const materials = new Set<MeshStandardMaterial>()
  for (const entry of variants.get(root) ?? []) {
    for (const material of [...slots(entry.led), ...slots(entry.glass), ...slots(entry.chrome), ...slots(entry.frosted), ...slots(entry.pearl), ...slots(entry.copper), ...slots(entry.mercury), ...slots(entry.cutlight), ...slots(entry.studio)]) materials.add(material)
  }
  return [...materials]
}

export function selectLogoAppearance(root: Object3D, appearance: LogoAppearance) {
  if (selected.get(root) === appearance) return
  for (const entry of variants.get(root) ?? []) {
    entry.mesh.material = appearance === 'glass' ? entry.glass : appearance === 'chrome' ? entry.chrome
      : appearance === 'frosted' ? entry.frosted : appearance === 'pearl' ? entry.pearl
        : appearance === 'copper' ? entry.copper : appearance === 'mercury' ? entry.mercury
          : appearance === 'cutlight' ? entry.cutlight : appearance === 'studio' ? entry.studio : entry.led
    entry.mesh.geometry = appearance === 'glass' || appearance === 'frosted' || appearance === 'pearl' || appearance === 'copper' || appearance === 'studio'
      ? entry.glassGeometry : entry.sourceGeometry
  }
  selected.set(root, appearance)
}

/** Only owned materials/geometry are disposed. Keep the CPU registry valid
 * through StrictMode cleanup/setup; Three reuploads their retained arrays. */
export function disposeLogoMaterialVariants(root: Object3D) {
  for (const material of logoVariantMaterials(root)) material.dispose()
  for (const entry of variants.get(root) ?? []) entry.glassGeometry.dispose()
}
