import { Component, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import './RoofScan.css'

type Point = [number, number, number]
type View = 'perspective' | 'top'

const ORANGE = '#ef662e'
const SCAN_DURATION = 8.6
const PHASES = ['Locate', 'Scan', 'Measure']

function Box({ position, size, color, ...props }: {
  position: Point
  size: Point
  color: string
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  return <mesh position={position} castShadow receiveShadow {...props}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.79} />
  </mesh>
}

function Surface({ points, color }: { points: Point[]; color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.BufferGeometry()
    shape.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
    shape.setIndex(points.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3])
    shape.computeVertexNormals()
    return shape
  }, [points])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.78} metalness={0.12} />
  </mesh>
}

function Wire({ points, color, opacity = 1 }: { points: Point[]; color: string; opacity?: number }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point))), [points])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineLoop geometry={geometry}>
    <lineBasicMaterial color={color} transparent opacity={opacity} />
  </lineLoop>
}

function Stroke({ start, end, color, radius = 0.012 }: { start: Point; end: Point; color: string; radius?: number }) {
  const { midpoint, length, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const direction = b.clone().sub(a)
    return {
      midpoint: a.add(b).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    }
  }, [start, end])
  return <mesh position={midpoint} quaternion={quaternion}>
    <cylinderGeometry args={[radius, radius, length, 5]} />
    <meshBasicMaterial color={color} />
  </mesh>
}

function Window({ position, side = false, width = 0.92, height = 1.1 }: {
  position: Point; side?: boolean; width?: number; height?: number
}) {
  return <group position={position} rotation={[0, side ? Math.PI / 2 : 0, 0]}>
    <Box position={[0, 0, 0]} size={[width + 0.1, height + 0.1, 0.09]} color="#383e3d" />
    <Box position={[0, 0, 0.056]} size={[width, height, 0.018]} color="#8fa0a0" />
    <Box position={[-width * 0.22, 0, 0.071]} size={[width * 0.38, height - 0.04, 0.013]} color="#aab8b4" />
    <Box position={[0, 0, 0.087]} size={[0.042, height, 0.028]} color="#404948" />
    <Box position={[0, -height / 2 - 0.055, 0.05]} size={[width + 0.17, 0.045, 0.18]} color="#d6d6cd" />
  </group>
}

function House() {
  return <group>
    <Box position={[0, 0.025, -0.39]} size={[7.1, 0.18, 3.39]} color="#d0cec4" />
    <Box position={[1.85, 0.025, 2.39]} size={[2.83, 0.18, 2.56]} color="#d0cec4" />
    <Box position={[0, 1.055, -0.39]} size={[6.9, 2.04, 3.13]} color="#eeeae0" />
    <Box position={[1.85, 1.055, 2.35]} size={[2.6, 2.04, 2.5]} color="#eeeae0" />
    <Surface points={[[-3.45, 2.075, -1.955], [-3.45, 3.265, -0.4], [-3.45, 2.075, 1.175]]} color="#e5e1d6" />
    <Surface points={[[3.45, 2.075, -1.955], [3.45, 3.265, -0.4], [3.45, 2.075, 1.175]]} color="#e5e1d6" />
    <Surface points={[[0.55, 2.075, 3.605], [1.85, 2.87, 3.605], [3.15, 2.075, 3.605]]} color="#e9e6dd" />

    <Surface points={[[-3.7, 2.09, -2.2], [3.7, 2.09, -2.2], [3.7, 3.36, -0.4], [-3.7, 3.36, -0.4]]} color="#414848" />
    <Surface points={[[-3.7, 3.36, -0.4], [3.7, 3.36, -0.4], [3.7, 2.09, 1.4], [-3.7, 2.09, 1.4]]} color="#414848" />
    <Surface points={[[0.35, 2.09, 0.12], [1.85, 3.02, 0.12], [1.85, 3.02, 3.85], [0.35, 2.09, 3.85]]} color="#424a49" />
    <Surface points={[[1.85, 3.02, 0.12], [3.35, 2.09, 0.12], [3.35, 2.09, 3.85], [1.85, 3.02, 3.85]]} color="#394241" />

    {/* Raised standing seams retain the roof's shape at a small screen size. */}
    {Array.from({ length: 29 }, (_, index) => {
      const x = -3.59 + index * 0.256
      return <group key={`main-seam-${index}`}>
        <Stroke start={[x, 2.11, -2.2]} end={[x, 3.38, -0.4]} color="#57605e" radius={0.009} />
        <Stroke start={[x, 3.38, -0.4]} end={[x, 2.11, 1.4]} color="#57605e" radius={0.009} />
      </group>
    })}
    {Array.from({ length: 15 }, (_, index) => {
      const z = 0.17 + index * 0.255
      return <group key={`wing-seam-${index}`}>
        <Stroke start={[0.35, 2.11, z]} end={[1.85, 3.04, z]} color="#596260" radius={0.009} />
        <Stroke start={[1.85, 3.04, z]} end={[3.35, 2.11, z]} color="#596260" radius={0.009} />
      </group>
    })}
    <Box position={[0, 2.06, -2.19]} size={[7.46, 0.12, 0.09]} color="#454e4b" />
    <Box position={[0, 2.06, 1.39]} size={[7.46, 0.12, 0.09]} color="#454e4b" />
    <Box position={[0.35, 2.06, 2.46]} size={[0.09, 0.12, 2.86]} color="#454e4b" />
    <Box position={[3.35, 2.06, 2.01]} size={[0.09, 0.12, 3.76]} color="#454e4b" />
    <Stroke start={[-3.72, 2.075, -2.21]} end={[-3.72, 3.35, -0.4]} color="#737a74" radius={0.04} />
    <Stroke start={[-3.72, 3.35, -0.4]} end={[-3.72, 2.075, 1.41]} color="#737a74" radius={0.04} />
    <Stroke start={[-3.71, 3.385, -0.4]} end={[3.71, 3.385, -0.4]} color="#616965" radius={0.032} />
    <Stroke start={[0.34, 2.075, 3.86]} end={[1.85, 3.01, 3.86]} color="#68736c" radius={0.043} />
    <Stroke start={[1.85, 3.01, 3.86]} end={[3.36, 2.075, 3.86]} color="#68736c" radius={0.043} />
    <Stroke start={[1.85, 3.045, 0.6]} end={[1.85, 3.045, 3.87]} color="#646d67" radius={0.028} />
    <Window position={[-2.43, 1.22, 1.205]} width={1.05} height={1.07} />
    <Window position={[-0.94, 1.22, 1.205]} width={1.05} height={1.07} />
    <Window position={[1.85, 1.16, 3.64]} width={1.71} height={1.33} />
    <Window position={[3.19, 1.18, 2.69]} side width={1.06} />
    <Window position={[3.49, 1.18, -0.69]} side width={1.6} />
    <Box position={[0.09, 1.025, 1.212]} size={[0.71, 1.8, 0.085]} color="#997b5d" />
    <Box position={[0.25, 1.025, 1.264]} size={[0.035, 0.37, 0.035]} color="#3d4642" />
    <Box position={[0.09, 0.065, 1.64]} size={[1.05, 0.11, 0.63]} color="#b4b2a6" />
    <Box position={[0.09, -0.005, 2.89]} size={[0.79, 0.04, 1.86]} color="#dfdfd7" />
    {[2.22, 2.58, 2.94, 3.3].map(z => <Box key={z} position={[0.09, 0.024, z]} size={[0.72, 0.02, 0.025]} color="#b9bdb3" />)}
    <Box position={[-2.55, 0.135, 1.73]} size={[1.67, 0.24, 0.45]} color="#d0ccbf" />
    <Box position={[-2.55, 0.27, 1.73]} size={[1.57, 0.15, 0.36]} color="#899082" />
    <Box position={[2.8, 0.12, 4.11]} size={[0.9, 0.22, 0.48]} color="#c9c6b9" />
    <Box position={[2.8, 0.25, 4.11]} size={[0.8, 0.16, 0.38]} color="#939985" />
    <Box position={[-1.99, 2.89, -1.28]} size={[0.46, 1.02, 0.55]} color="#bebcb2" />
    <Box position={[-1.99, 3.43, -1.28]} size={[0.57, 0.09, 0.65]} color="#6e766f" />
  </group>
}

function Ground() {
  const lines = useMemo(() => {
    const points: number[] = []
    for (let step = -11; step <= 11; step += 1) {
      const value = step * 0.75
      points.push(-8.25, -0.09, value, 8.25, -0.09, value, value, -0.09, -8.25, value, -0.09, 8.25)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [])
  useEffect(() => () => lines.dispose(), [lines])
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#f3f3ee" roughness={1} />
    </mesh>
    <lineSegments geometry={lines}>
      <lineBasicMaterial color="#c8cbc3" transparent opacity={0.44} />
    </lineSegments>
    <Wire points={[[-4.12, -0.03, -2.8], [4.08, -0.03, -2.8], [4.08, -0.03, 4.5], [-4.12, -0.03, 4.5]]} color="#8f9c89" opacity={0.55} />
    <Stroke start={[-3.7, -0.03, 5.01]} end={[3.35, -0.03, 5.01]} color="#a2a99b" radius={0.012} />
    <Stroke start={[-3.7, -0.03, 4.77]} end={[-3.7, -0.03, 5.25]} color="#a2a99b" radius={0.012} />
    <Stroke start={[3.35, -0.03, 4.77]} end={[3.35, -0.03, 5.25]} color="#a2a99b" radius={0.012} />
    <Stroke start={[4.62, -0.03, -2.2]} end={[4.62, -0.03, 3.85]} color="#a2a99b" radius={0.012} />
    <Stroke start={[4.39, -0.03, -2.2]} end={[4.86, -0.03, -2.2]} color="#a2a99b" radius={0.012} />
    <Stroke start={[4.39, -0.03, 3.85]} end={[4.86, -0.03, 3.85]} color="#a2a99b" radius={0.012} />
  </>
}

function Scene({ active, running, run, view, onPhase, onComplete }: {
  active: boolean; running: boolean; run: number; view: View
  onPhase: (phase: number) => void; onComplete: () => void
}) {
  const { camera, invalidate, size } = useThree()
  const elapsed = useRef(0)
  const lastPhase = useRef(-1)
  const scan = useRef<THREE.Group>(null)
  const wingScan = useRef<THREE.Group>(null)
  const measured = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Mesh>(null)
  const desiredPosition = useMemo(() => new THREE.Vector3(...(view === 'top' ? [0.01, 15, 0.01] : [9, 7.7, 11.3])), [view])
  const target = useMemo(() => new THREE.Vector3(0, 0.8, 0.6), [])
  useEffect(() => {
    elapsed.current = 0
    lastPhase.current = -1
    invalidate()
  }, [run, invalidate])
  useEffect(() => {
    if (active) invalidate()
  }, [active, running, view, invalidate])
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      // Three.js owns this mutable camera; resize its projection outside React render.
      // eslint-disable-next-line react-hooks/immutability
      camera.zoom = Math.min(size.width / 12.5, size.height / 10.2)
      camera.updateProjectionMatrix()
      invalidate()
    }
  }, [camera, size, invalidate])
  useFrame((_, delta) => {
    if (!active) return
    const difference = camera.position.distanceTo(desiredPosition)
    if (difference > 0.01) {
      camera.position.lerp(desiredPosition, Math.min(1, delta * 7))
      camera.lookAt(target)
    }
    if (running) elapsed.current = Math.min(SCAN_DURATION, elapsed.current + Math.min(delta, 0.06))
    const progress = elapsed.current / SCAN_DURATION
    const phase = progress < 0.12 ? 0 : progress < 0.78 ? 1 : 2
    if (phase !== lastPhase.current) {
      lastPhase.current = phase
      onPhase(phase)
    }
    const sweep = THREE.MathUtils.clamp((progress - 0.12) / 0.66, 0, 1)
    const x = -3.77 + sweep * 7.54
    if (scan.current) {
      scan.current.visible = phase === 1
      scan.current.position.x = x
    }
    if (beam.current) {
      beam.current.visible = phase === 1
      beam.current.position.x = x
    }
    if (wingScan.current) {
      wingScan.current.visible = phase === 1 && x >= 0.35 && x <= 3.35
      wingScan.current.position.set(x, 3.05 - Math.abs(x - 1.85) * 0.62, 0)
    }
    if (measured.current) measured.current.visible = phase === 2
    if (running && progress === 1) onComplete()
    if ((running && progress < 1) || difference > 0.01) invalidate()
  })
  return <>
    <color attach="background" args={['#f3f3ee']} />
    <fog attach="fog" args={['#f3f3ee', 16, 32]} />
    <ambientLight intensity={1.65} />
    <directionalLight position={[-5, 10, 5]} intensity={2.35} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={0.045} shadow-bias={-0.0001} />
    <directionalLight position={[4, 4, -5]} intensity={0.75} color="#e2e9e8" />
    <Ground />
    <House />
    <mesh ref={beam} position={[-3.77, 2.1, 0.8]} rotation={[0, Math.PI / 2, 0]} visible={false}>
      <planeGeometry args={[7.4, 4.3]} />
      <meshBasicMaterial color={ORANGE} transparent opacity={0.075} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <group ref={scan} visible={false}>
      <Stroke start={[0, 2.12, -2.21]} end={[0, 3.397, -0.4]} color={ORANGE} radius={0.021} />
      <Stroke start={[0, 3.397, -0.4]} end={[0, 2.12, 1.41]} color={ORANGE} radius={0.021} />
      <Stroke start={[0, -0.015, -2.9]} end={[0, -0.015, 4.6]} color={ORANGE} radius={0.016} />
      <Stroke start={[0, -0.015, -2.9]} end={[0, 4.2, -2.9]} color={ORANGE} radius={0.009} />
    </group>
    <group ref={wingScan} visible={false}>
      <Stroke start={[0, 0, 1.38]} end={[0, 0, 3.87]} color={ORANGE} radius={0.022} />
    </group>
    <group ref={measured} visible={false}>
      <Wire points={[[-3.72, 2.12, -2.22], [-3.72, 3.395, -0.4], [-3.72, 2.12, 1.42], [3.72, 2.12, 1.42], [3.72, 3.395, -0.4], [3.72, 2.12, -2.22]]} color={ORANGE} opacity={0.46} />
      <Stroke start={[-3.72, 3.407, -0.4]} end={[3.72, 3.407, -0.4]} color="#d88c5d" radius={0.01} />
      <Stroke start={[0.34, 2.13, 3.88]} end={[1.85, 3.045, 3.88]} color="#d88c5d" radius={0.013} />
      <Stroke start={[1.85, 3.045, 3.88]} end={[3.37, 2.13, 3.88]} color="#d88c5d" radius={0.013} />
      {([[-3.72, 3.407, -0.4], [3.72, 3.407, -0.4], [1.85, 3.065, 3.88], [-3.72, 2.14, 1.42], [0.34, 2.14, 3.88], [3.37, 2.14, 3.88]] as Point[]).map((position, index) => <mesh key={index} position={position}>
        <sphereGeometry args={[0.042, 10, 8]} />
        <meshBasicMaterial color={ORANGE} />
      </mesh>)}
    </group>
  </>
}

function StaticHouse() {
  return <svg className="ct-scan-fallback" viewBox="0 0 680 470" role="img" aria-label="Illustration of a modern home with a measured pitched roof">
    <defs>
      <pattern id="ct-scan-grid" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .4 -1 .4 340 100)">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#d5d8ce" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="680" height="470" fill="#f3f3ee" />
    <rect y="70" width="680" height="360" fill="url(#ct-scan-grid)" />
    <path d="m121 284 246 110 195-115-235-100Z" fill="#e1e3d8" />
    <path d="m147 220 0 85 223 90v-91Z" fill="#ede9de" />
    <path d="m370 304 150-81v84l-150 88Z" fill="#dad9cf" />
    <path d="m130 223 105-122 215 89-76 125Z" fill="#414a47" />
    <path d="m235 101 93 24 215 106-93-41Z" fill="#58615b" />
    <path d="m374 315 76-125 93 41Z" fill="#e6e3d7" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map(n => <path key={n} d={`m${152 + n * 28} ${232 + n * 11} 98-120`} stroke="#717971" opacity=".5" />)}
    <path d="m241 260 98-120" stroke={ORANGE} strokeWidth="3" />
    <path d="m241 260v87l96-137v-70Z" fill={ORANGE} opacity=".12" />
    <path d="m168 260 47 19v40l-47-19Zm78 30 48 19v40l-48-19Z" fill="#899a96" />
    <path d="m410 308 58-33v48l-58 32Z" fill="#899a96" />
    <path d="m134 329 231 94m-235-103 0 18m235 76v18" fill="none" stroke="#96a18f" />
  </svg>
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? <StaticHouse /> : this.props.children }
}

function ControlIcon({ type }: { type: 'pause' | 'play' | 'replay' | 'expand' }) {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    {type === 'pause' && <path d="M7 5v10M13 5v10" stroke="currentColor" strokeWidth="1.8" />}
    {type === 'play' && <path d="m7 4 9 6-9 6Z" fill="currentColor" />}
    {type === 'replay' && <path d="M4.6 6.3A6 6 0 1 1 4 12M4.5 2.8v4.1h4.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
    {type === 'expand' && <path d="m10 3 7 4-7 4-7-4 7-4Zm-7 8 7 4 7-4M3 15l7 4 7-4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />}
  </svg>
}

export default function RoofScan() {
  const root = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [ready, setReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [complete, setComplete] = useState(false)
  const [phase, setPhase] = useState(0)
  const [run, setRun] = useState(0)
  const [view, setView] = useState<View>('perspective')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const checkVisibility = () => setTabVisible(document.visibilityState === 'visible')
    const changeMotion = () => { if (motion.matches) setRunning(false) }
    const observer = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false), { threshold: 0.08 })
    if (root.current) observer.observe(root.current)
    document.addEventListener('visibilitychange', checkVisibility)
    motion.addEventListener('change', changeMotion)
    checkVisibility()
    // Canvas's fallback is also mounted inside a working <canvas>, so it cannot
    // report availability. Probe WebGL2 once before enabling the 3D controls.
    const start = requestAnimationFrame(() => {
      let supported: boolean
      try {
        const context = document.createElement('canvas').getContext('webgl2', { powerPreference: 'low-power' })
        supported = context !== null
        context?.getExtension('WEBGL_lose_context')?.loseContext()
      } catch {
        supported = false
      }
      setFailed(!supported)
      setReady(true)
      // Reduced-motion visitors receive a static model until they press Play.
      setRunning(supported && !motion.matches)
      setStarted(supported && !motion.matches)
    })
    return () => {
      cancelAnimationFrame(start)
      observer.disconnect()
      document.removeEventListener('visibilitychange', checkVisibility)
      motion.removeEventListener('change', changeMotion)
    }
  }, [])

  const replay = () => { setComplete(false); setPhase(0); setRun(current => current + 1); setStarted(true); setRunning(true) }
  const toggleRunning = () => { setStarted(true); setRunning(current => !current) }
  const finish = () => { setRunning(false); setComplete(true) }
  const isActive = visible && tabVisible

  return <div ref={root} className={`ct-scan${running && isActive ? ' ct-scan--running' : ''}${complete ? ' ct-scan--complete' : ''}`} style={{ '--ct-scan-accent': ORANGE } as CSSProperties}>
    <div className="ct-scan-header">
      <div><span className="ct-scan-kicker">A clearer view, from above.</span><span className="ct-scan-model">Sample property <span aria-hidden="true">/</span> 3D roof study</span></div>
      <span className="ct-scan-live"><span /> {failed ? 'MODEL PREVIEW' : complete ? 'SCAN COMPLETE' : running && isActive ? 'ROOF SCAN' : started ? 'SCAN PAUSED' : 'READY TO SCAN'}</span>
    </div>
    <div className="ct-scan-canvas" aria-hidden="true">
      {ready && !failed ? <SceneBoundary onFailure={() => setFailed(true)}>
        <Canvas orthographic shadows={{ type: THREE.PCFShadowMap }} frameloop="demand" dpr={[1, 1.75]} camera={{ position: [9, 7.7, 11.3], zoom: 43, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }} fallback={<StaticHouse />} onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0.8, 0.6)
          gl.setClearColor('#f3f3ee')
          gl.domElement.addEventListener('webglcontextlost', () => setFailed(true), { once: true })
        }}>
          <Scene active={isActive} running={running && !failed} run={run} view={view} onPhase={setPhase} onComplete={finish} />
        </Canvas>
      </SceneBoundary> : <StaticHouse />}
    </div>
    <div className="ct-scan-callout ct-scan-callout--pitch"><span>ROOF PITCH</span><strong>6 <i>/</i> 12</strong><b aria-hidden="true" /></div>
    <div className="ct-scan-callout ct-scan-callout--area"><b aria-hidden="true" /><span>EST. ROOF AREA</span><strong>2,420 <small>sq ft</small></strong></div>
    <div className="ct-scan-orientation" aria-hidden="true"><span>N</span><svg viewBox="0 0 30 30"><path d="m15 3 5 20-5-5-5 5Z" fill="#75806f" /></svg></div>
    <div className="ct-scan-footer">
      <div className="ct-scan-progress" aria-label={`Illustrative scan: ${complete ? 'complete' : PHASES[phase].toLowerCase()}`}>
        {PHASES.map((label, index) => <span key={label} className={index <= phase ? 'is-current' : ''}><i>{index < phase || complete ? '✓' : `0${index + 1}`}</i>{label}</span>)}
      </div>
      <div className="ct-scan-controls">
        <button type="button" aria-label={view === 'perspective' ? 'Switch to top view' : 'Switch to 3D view'} aria-pressed={view === 'top'} disabled={failed} onClick={() => setView(current => current === 'perspective' ? 'top' : 'perspective')}><ControlIcon type="expand" /><span>{view === 'perspective' ? 'Top view' : '3D view'}</span></button>
        <button type="button" aria-label={complete ? 'Replay roof scan' : running ? 'Pause roof scan' : 'Play roof scan'} disabled={failed} onClick={() => complete ? replay() : toggleRunning()}><ControlIcon type={complete ? 'replay' : running ? 'pause' : 'play'} /><span>{complete ? 'Replay' : running ? 'Pause' : 'Play'}</span></button>
      </div>
    </div>
    <p className="ct-scan-disclaimer">Illustrative model. Your roof is measured separately.</p>
    <span className="ct-scan-sr" role="status">{failed ? 'Static model preview. The interactive 3D view is unavailable on this device.' : complete ? 'Sample roof scan complete. Illustrative roof area: 2,420 square feet, pitch: 6 in 12.' : `${PHASES[phase]} phase. This is a sample roof, not a measurement of your property.`}</span>
  </div>
}
