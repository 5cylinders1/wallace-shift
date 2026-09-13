import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, Box3, OrthographicCamera, SRGBColorSpace, Vector2, type WebGLRenderer } from 'three'
import { createCrystalEnvironment } from '../experiments/water-hero/crystalEnvironment'
import { useDisposable } from '../experiments/water-hero/useDisposable'
import { loadJourneyModel, type JourneyModel } from './journeyModel'
import { createJourneyWater } from './journeyWater'
import { createJourneyFriction } from './journeyFriction'
import type { JourneyFrame } from './journeyDirector'

interface LogoJourneySceneProps {
  frame: { current: JourneyFrame }
  onFailure?: () => void
  onReady?: () => void
}

const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0

function Failure({ report }: { report: () => void }) {
  useEffect(report, [report])
  return null
}

class JourneyBoundary extends Component<{ children: ReactNode; report: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { console.error('[LogoJourneyScene] Scene boundary failure:', error) }
  render() { return this.state.failed ? <Failure report={this.props.report} /> : this.props.children }
}

function watchRenderer(gl: WebGLRenderer, report: () => void) {
  const lost = (event: Event) => { event.preventDefault(); report() }
  const previous = gl.debug.onShaderError
  gl.debug.onShaderError = (context, program, vertex, fragment) => {
    console.error('[LogoJourneyScene] Shader failure:', {
      program: context.getProgramInfoLog(program),
      vertex: context.getShaderInfoLog(vertex),
      fragment: context.getShaderInfoLog(fragment),
    })
    previous?.(context, program, vertex, fragment)
    report()
  }
  gl.domElement.addEventListener('webglcontextlost', lost)
  return () => {
    gl.domElement.removeEventListener('webglcontextlost', lost)
    gl.debug.onShaderError = previous
  }
}

/** Manual Canvas avoids a second always-running WebGL loop on the homepage.
 * Two wake frames allow the parent scroll measurement to settle first. */
function JourneyFrames({ frame, ready, report, reportReady }: {
  frame: LogoJourneySceneProps['frame']; ready: boolean; report: () => void; reportReady: () => void
}) {
  const advance = useThree(state => state.advance)
  const clock = useThree(state => state.clock)
  const gl = useThree(state => state.gl)
  useEffect(() => {
    let handle = 0
    let previous: number | null = null
    let settling = 2
    let stopped = false
    let cleared = false
    const update = (now: number) => {
      handle = 0
      if (stopped || document.hidden) { previous = null; return }
      if (!ready || frame.current.visible <= .001) {
        previous = null
        if (!cleared) { gl.clear(); cleared = true }
        if (--settling > 0) handle = window.requestAnimationFrame(update)
        return
      }
      try {
        const delta = previous === null ? 0 : Math.max(0, Math.min(.1, (now - previous) / 1000))
        previous = now
        cleared = false
        advance(clock.elapsedTime + delta, false)
        reportReady()
        handle = window.requestAnimationFrame(update)
      } catch (error) {
        console.error('[LogoJourneyScene] Frame failure:', error)
        stopped = true
        report()
      }
    }
    const wake = () => {
      settling = 2
      if (document.hidden) {
        window.cancelAnimationFrame(handle)
        handle = 0
        previous = null
      } else if (!handle && !stopped) handle = window.requestAnimationFrame(update)
    }
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', wake)
    document.addEventListener('visibilitychange', wake)
    wake()
    return () => {
      stopped = true
      window.cancelAnimationFrame(handle)
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', wake)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [advance, clock, gl, frame, ready, report, reportReady])
  return null
}

function JourneyObjects({ frame, report, reportReady }: {
  frame: LogoJourneySceneProps['frame']; report: () => void; reportReady: () => void
}) {
  const gl = useThree(state => state.gl)
  const [model, setModel] = useState<JourneyModel | null>(null)
  const [bounds] = useState(() => new Box3())
  const [drawingSize] = useState(() => new Vector2())
  const friction = useDisposable(createJourneyFriction, value => value.dispose(), [])
  const resources = useDisposable(() => {
    const environment = createCrystalEnvironment(gl, 'soft-glass')
    try { return { environment, water: createJourneyWater() } } catch (error) {
      environment.dispose()
      throw error
    }
  }, value => { value.environment.dispose(); value.water.dispose() }, [gl])

  useEffect(() => {
    const controller = new AbortController()
    let owned: JourneyModel | null = null
    loadJourneyModel(controller.signal).then(value => {
      if (controller.signal.aborted) { value.dispose(); return }
      owned = value
      setModel(value)
    }).catch(error => {
      if (!controller.signal.aborted) {
        console.error('[LogoJourneyScene] Model load failure:', error)
        report()
      }
    })
    return () => { controller.abort(); owned?.dispose() }
  }, [report])

  useEffect(() => {
    if (!model || !resources) return
    model.setEnvironment(resources.environment.environment)
  }, [model, resources])

  useEffect(() => watchRenderer(gl, report), [gl, report])

  useFrame(({ camera, size, scene, clock }) => {
    if (!model || !resources || !(camera instanceof OrthographicCamera)) return
    const pose = frame.current
    const aspect = size.width / Math.max(1, size.height)
    // CSS-size-independent world coordinates: viewport top/bottom are +/-1.
    camera.left = -aspect; camera.right = aspect
    camera.top = 1; camera.bottom = -1
    camera.updateProjectionMatrix()
    model.rig.position.set(pose.x * aspect, pose.y, 0)
    model.rig.scale.setScalar(Math.max(.001, pose.scale) * 2 * aspect)
    // Keep the original logo center locked after the heading releases,
    // independent of material changes and each piece's temporary scale.
    model.rig.position.setY(pose.y + model.height * aspect * Math.max(0, pose.anchorScale))
    gl.getDrawingBufferSize(drawingSize)
    model.rig.rotation.set(0, pose.yaw, 0)
    model.update(unit(pose.finish), unit(pose.charge), Math.max(0, pose.split),
      pose.partTurn, unit(pose.visible), clock.elapsedTime, unit(pose.servicesSurface), {
        amount: unit(pose.surfaceReveal), headerEdge: pose.headerEdge,
        findEdge: pose.findEdge, makeEdge: pose.makeEdge, launchEdge: pose.launchEdge,
        drawingHeight: drawingSize.y, shimmer: unit(pose.shimmer),
        leftTurn: pose.leftTurn, rightTurn: pose.rightTurn, partScale: pose.partScale,
      })
    // The cage shares the logo's center but owns its rotation. Its screen
    // masks match the arriving Find panel and departing Make panel exactly.
    friction?.update({
      visible: pose.findWipe > 0 && pose.makeWipe < 1 ? unit(pose.visible) * unit(pose.surfaceReveal) : 0,
      time: clock.elapsedTime, findEdge: pose.findEdge, makeEdge: pose.makeEdge,
      drawingHeight: drawingSize.y, pixelRatio: gl.getPixelRatio(),
      centerX: model.rig.position.x, centerY: model.rig.position.y,
      logoWidth: model.rig.scale.x, viewportHeight: size.height,
      headerOffset: pose.headerOffset,
    })
    model.rig.updateMatrixWorld(true)
    bounds.setFromObject(model.rig)
    resources.water.update(gl, scene, camera, size.width, size.height,
      (bounds.min.y + 1) * .5, unit(pose.water) * unit(pose.visible), clock.elapsedTime)
  }, -1)

  return <>
    <JourneyFrames frame={frame} ready={Boolean(model && resources)} report={report} reportReady={reportReady} />
    {resources && <primitive object={resources.water.mesh} dispose={null} />}
    {model && <primitive object={model.rig} dispose={null} />}
    {friction && <primitive object={friction.group} dispose={null} />}
  </>
}

/** Desktop-only presentation; the owner decides whether to load this chunk. */
export function LogoJourneyScene({ frame, onFailure, onReady }: LogoJourneySceneProps) {
  const [failed, setFailed] = useState(false)
  const failureReported = useRef(false)
  const readyReported = useRef(false)
  const failureCallback = useRef(onFailure)
  const readyCallback = useRef(onReady)
  useEffect(() => {
    failureCallback.current = onFailure
    readyCallback.current = onReady
  }, [onFailure, onReady])
  const report = useCallback(() => {
    failureReported.current = true
    setFailed(true)
    failureCallback.current?.()
  }, [])
  const reportReady = useCallback(() => {
    if (failureReported.current || readyReported.current) return
    readyReported.current = true
    readyCallback.current?.()
  }, [])
  if (failed) return null
  return <JourneyBoundary report={report}>
    <Canvas orthographic frameloop="never" dpr={[1, 1.4]}
      camera={{ position: [0, 0, 8], near: .01, far: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      // Canvas mounts its HTML fallback even when WebGL succeeds. Keep it
      // inert; actual renderer errors are reported by the boundaries above.
      fallback={<span>Interactive logo unavailable.</span>}
      onCreated={({ gl }) => {
        gl.setClearColor(0, 0)
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = .95
        gl.outputColorSpace = SRGBColorSpace
      }}>
      <JourneyObjects frame={frame} report={report} reportReady={reportReady} />
    </Canvas>
  </JourneyBoundary>
}

export default LogoJourneyScene
