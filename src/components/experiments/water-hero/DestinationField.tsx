import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three'
import { DESTINATION } from './waterHeroConfig'
import { PASSAGE, passagePoint } from './cameraPath'
import type { DebugTelemetry } from './waterHeroTypes'

/**
 * The space on the far side of the mark.
 *
 * Placeholder, and deliberately spatial. Its job is to prove the passage
 * lands somewhere: the ending used to cut from water to a flat DOM
 * section, which made the whole approach feel abandoned rather than
 * completed.
 *
 * Two things it must not do, both of which the first version did. It must
 * not look like a debug grid, so it is horizontal rules at three uneven
 * depths rather than a uniform lattice. And it must not switch on at a
 * progress threshold while the camera is still openly facing the emblem —
 * so its visibility is driven by how close the camera is to the aperture,
 * which is the same thing as how much of the frame the mark is occluding.
 */
export function DestinationField({
  rigMatrix,
  telemetry,
}: {
  rigMatrix: { elements: number[] } & Parameters<typeof passagePoint>[0]
  telemetry: DebugTelemetry
}) {
  const groupRef = useRef<Group>(null)

  const layers = useMemo(
    () =>
      DESTINATION.layers.map((layer) => {
        const vertices: number[] = []
        const half = DESTINATION.width / 2
        for (let i = 0; i < layer.rules; i += 1) {
          // Uneven spacing: evenly spaced rules read as a ruler.
          const t = i / Math.max(1, layer.rules - 1)
          const y = (t * t * 0.6 + t * 0.4 - 0.5) * layer.spread
          vertices.push(-half, y, 0, half, y, 0)
        }
        const geometry = new BufferGeometry()
        geometry.setAttribute(
          'position',
          new Float32BufferAttribute(vertices, 3),
        )
        const material = new LineBasicMaterial({
          color: new Color(...DESTINATION.color),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
        const lines = new LineSegments(geometry, material)
        lines.position.set(PASSAGE.x, PASSAGE.y, -layer.distance)
        lines.frustumCulled = false
        return { geometry, material, layer, lines }
      }),
    [],
  )

  useEffect(
    () => () => {
      layers.forEach(({ geometry, material }) => {
        geometry.dispose()
        material.dispose()
      })
    },
    [layers],
  )

  const scratch = useMemo(() => new Vector3(), [])

  useFrame(({ camera }) => {
    passagePoint(rigMatrix, 0, scratch)
    const distance = camera.position.distanceTo(scratch)

    const { revealAt, hiddenAt, peakOpacity } = DESTINATION
    const t = Math.min(
      1,
      Math.max(0, (hiddenAt - distance) / (hiddenAt - revealAt)),
    )
    const eased = t * t * (3 - 2 * t)

    layers.forEach(({ material, layer }) => {
      material.opacity = eased * peakOpacity * layer.opacity
    })

    const group = groupRef.current
    if (group) group.visible = eased > 0.004
    telemetry.destinationReveal = eased
  })

  return (
    <group ref={groupRef}>
      {layers.map(({ lines }, index) => (
        <primitive key={index} object={lines} />
      ))}
    </group>
  )
}
