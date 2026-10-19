import { useEffect, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, OrthographicCamera } from 'three'

type FlightProps = {
  active: boolean
  flight: RefObject<{ progress: number; bank: number }>
  onReady: () => void
  onFailure: () => void
}

const motors = [
  [-1.15, .08, -.78], [1.15, .08, -.78],
  [-1.15, .08, .78], [1.15, .08, .78],
] as const

function Quadcopter({ active, flight }: Pick<FlightProps, 'active' | 'flight'>) {
  const body = useRef<Group>(null)
  const propellers = useRef<Group>(null)
  useFrame(({ clock }, delta) => {
    if (!body.current || !active) return
    const progress = flight.current.progress
    const targetYaw = -.28 + progress * .56
    body.current.rotation.y = MathUtils.damp(body.current.rotation.y, targetYaw, 5, delta)
    body.current.rotation.z = MathUtils.damp(body.current.rotation.z, -.06 + Math.sin(progress * Math.PI * 2) * .1 - flight.current.bank, 5, delta)
    body.current.rotation.x = -.08 + Math.sin(progress * Math.PI) * .1
    body.current.position.y = Math.sin(clock.elapsedTime * 1.5) * .025
    propellers.current?.children.forEach((propeller, index) => { propeller.rotation.y += delta * (index % 2 ? 32 : -32) })
  })
  return <group ref={body} rotation={[-.08, -.28, -.06]}>
    <mesh scale={[.51, .19, .76]}>
      <sphereGeometry args={[1, 32, 20]} /><meshStandardMaterial color="#54625e" metalness={.72} roughness={.33} />
    </mesh>
    <mesh position={[0, -.08, .02]} scale={[.47, .13, .64]}>
      <sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color="#152021" metalness={.4} roughness={.48} />
    </mesh>
    <mesh position={[0, .18, -.03]} scale={[.28, .035, .41]}>
      <sphereGeometry args={[1, 24, 12]} /><meshStandardMaterial color="#9bada5" metalness={.72} roughness={.4} />
    </mesh>
    {[-.18, -.09, 0, .09, .18].map(x => <mesh key={x} position={[x, .185, -.17]} rotation={[-.12, 0, 0]}>
      <boxGeometry args={[.022, .018, .3]} /><meshStandardMaterial color="#253532" />
    </mesh>)}
    {motors.map(([x, y, z], index) => <group key={index}>
      <mesh position={[x * .56, -.015, z * .63]} rotation={[0, -Math.atan2(z, x), Math.PI / 2]}>
        <cylinderGeometry args={[.065, .085, 1.08, 8]} /><meshStandardMaterial color="#364b48" metalness={.65} roughness={.35} />
      </mesh>
      <mesh position={[x, y, z]}>
        <cylinderGeometry args={[.115, .1, .21, 24]} /><meshStandardMaterial color="#788c83" metalness={.8} roughness={.3} />
      </mesh>
      <mesh position={[x, y + .115, z]}>
        <cylinderGeometry args={[.07, .08, .045, 20]} /><meshStandardMaterial color="#273531" metalness={.8} roughness={.3} />
      </mesh>
      <mesh position={[x, y + .145, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[.54, 40]} /><meshBasicMaterial color="#a1b7aa" transparent opacity={.09} depthWrite={false} />
      </mesh>
      <mesh position={[x, y - .12, z]}>
        <sphereGeometry args={[.055, 12, 8]} /><meshStandardMaterial color={index > 1 ? '#8fc8af' : '#ca8567'} emissive={index > 1 ? '#598e75' : '#7f3b27'} emissiveIntensity={.7} />
      </mesh>
    </group>)}
    <group ref={propellers}>
      {motors.map(([x, y, z], index) => <group key={index} position={[x, y + .15, z]} rotation={[0, index * .67, 0]}>
        <mesh scale={[.55, .013, .055]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#172420" metalness={.35} roughness={.5} /></mesh>
      </group>)}
    </group>
    {[-1, 1].map(side => <group key={side} position={[side * .32, -.15, .2]}>
      <mesh position={[side * .05, -.14, .04]} rotation={[0, 0, side * .25]}><cylinderGeometry args={[.022, .027, .34, 10]} /><meshStandardMaterial color="#91a59b" metalness={.7} roughness={.3} /></mesh>
      <mesh position={[side * .09, -.3, .04]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.025, .025, .52, 12]} /><meshStandardMaterial color="#394c44" metalness={.5} roughness={.4} /></mesh>
    </group>)}
    <mesh position={[0, -.22, .52]}><sphereGeometry args={[.105, 20, 16]} /><meshStandardMaterial color="#80968b" metalness={.8} roughness={.27} /></mesh>
    <group position={[0, -.34, .57]} rotation={[-.18, 0, 0]}>
      <mesh><boxGeometry args={[.28, .23, .22]} /><meshStandardMaterial color="#253936" metalness={.8} roughness={.33} /></mesh>
      <mesh position={[0, 0, .14]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.105, .105, .09, 32]} /><meshStandardMaterial color="#9aaea3" metalness={.9} roughness={.22} /></mesh>
      <mesh position={[0, 0, .191]} rotation={[0, 0, 0]}><circleGeometry args={[.079, 32]} /><meshStandardMaterial color="#072f35" metalness={.9} roughness={.08} /></mesh>
      <mesh position={[-.025, .024, .194]}><circleGeometry args={[.019, 16]} /><meshBasicMaterial color="#84b2ab" transparent opacity={.7} /></mesh>
    </group>
  </group>
}

function ContextMonitor({ onFailure }: Pick<FlightProps, 'onFailure'>) {
  const canvas = useThree(state => state.gl.domElement)
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [canvas, onFailure])
  return null
}

function CameraFit() {
  const get = useThree(state => state.get)
  const size = useThree(state => state.size)
  const invalidate = useThree(state => state.invalidate)
  useEffect(() => {
    const { camera } = get()
    if (!(camera instanceof OrthographicCamera)) return
    // The desktop framing is authored at 330 × 175. Fit both dimensions so
    // the rotor sweep retains the same margin in the compact phone stage.
    camera.zoom = 82 * Math.min(1, size.width / 330, size.height / 175)
    camera.updateProjectionMatrix()
    invalidate()
  }, [get, size.width, size.height, invalidate])
  return null
}

export default function SurveyDrone({ active, flight, onReady, onFailure }: FlightProps) {
  return <Canvas orthographic camera={{ position: [2.4, 2.6, 5.5], zoom: 82, near: .1, far: 30 }}
    dpr={[1, 1.5]} frameloop={active ? 'always' : 'never'} fallback={null}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    onCreated={({ gl }) => { gl.setClearColor('#102322', 0); onReady() }}>
    <ambientLight intensity={1.35} />
    <directionalLight position={[2, 6, 4]} intensity={4} color="#e9f5e9" />
    <directionalLight position={[-4, 1, -2]} intensity={3} color="#8bbfac" />
    <pointLight position={[1, -1, 3]} intensity={8} color="#aacfc9" />
    <Quadcopter active={active} flight={flight} />
    <CameraFit />
    <ContextMonitor onFailure={onFailure} />
  </Canvas>
}
