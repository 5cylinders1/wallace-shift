import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, Box3, Euler, OrthographicCamera, Quaternion, SRGBColorSpace, Vector2,
  type WebGLRenderer } from 'three'
import { createCrystalEnvironment } from '../experiments/water-hero/crystalEnvironment'
import { useDisposable } from '../experiments/water-hero/useDisposable'
import { loadJourneyModel, type JourneyModel } from './journeyModel'
import { createJourneyWater } from './journeyWater'
import { createJourneyFriction } from './journeyFriction'
import { createJourneyFrictionMotion } from './journeyFrictionMotion'
import { createJourneyLaunchLight } from './journeyLaunchLight'
import { createJourneyShiftRules } from './journeyShiftRules'
import { createJourneyAscent } from './journeyAscent'
import { createJourneyPower } from './journeyPower'
import { createJourneySpin } from './journeySpin'
import { sampleBlueprintDraw, type JourneyFrameSource } from './journeyDirector'

interface LogoJourneySceneProps {
  frame: JourneyFrameSource
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
 * Refresh the scroll pose before drawing, regardless of RAF callback order. */
function JourneyFrames({ frame, ready, report, reportReady }: {
  frame: LogoJourneySceneProps['frame']; ready: boolean; report: () => void; reportReady: () => void
}) {
  const advance = useThree(state => state.advance)
  const clock = useThree(state => state.clock)
  const gl = useThree(state => state.gl)
  const setSize = useThree(state => state.setSize)
  useEffect(() => {
    let handle = 0
    let previous: number | null = null
    let settling = 2
    let stopped = false
    let cleared = false
    const update = (now: number) => {
      handle = 0
      if (stopped || document.hidden) { previous = null; return }
      frame.sync?.()
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
    // The canvas has to be the size of the box it sits in, and a window
    // resize is not the only thing that changes that box. It is `width: 100%`
    // of the layout viewport, so the document's scrollbar arriving or leaving
    // resizes it silently; so does a resize that happened while this tab was
    // in the background, where no frames ran to deliver the observation.
    // Left behind, the renderer keeps the older size and three writes it onto
    // the element as inline pixels — and the scene ends in a hard line partway
    // across the section, with the page's own ground beside it.
    //
    // Measured against what was last applied rather than against the canvas's
    // own box: the stylesheet holds that box at 100% of the container so a
    // canvas briefly behind its box scales rather than exposing an edge, which
    // would make the canvas agree with the container even while the renderer
    // did not.
    const host = gl.domElement.parentElement
    const applied = { width: 0, height: 0 }
    const fit = () => {
      if (!host) return
      const { width, height } = host.getBoundingClientRect()
      if (width < 1 || height < 1) return
      if (Math.abs(width - applied.width) < .5 && Math.abs(height - applied.height) < .5) return
      applied.width = width
      applied.height = height
      setSize(width, height)
      // Nothing draws on its own here, so the new buffer needs a frame or it
      // stays the colour it was cleared to.
      wake()
    }
    const boxes = host && new ResizeObserver(fit)
    if (host && boxes) boxes.observe(host)
    fit()

    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', wake)
    document.addEventListener('visibilitychange', wake)
    wake()
    return () => {
      stopped = true
      if (boxes) boxes.disconnect()
      window.cancelAnimationFrame(handle)
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', wake)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [advance, clock, gl, setSize, frame, ready, report, reportReady])
  return null
}

function JourneyObjects({ frame, report, reportReady }: {
  frame: LogoJourneySceneProps['frame']; report: () => void; reportReady: () => void
}) {
  const gl = useThree(state => state.gl)
  const [model, setModel] = useState<JourneyModel | null>(null)
  const [bounds] = useState(() => new Box3())
  const [drawingSize] = useState(() => new Vector2())
  const [frictionMotion] = useState(createJourneyFrictionMotion)
  const pointer = useRef({ x: 0, y: 0, active: false })
  const friction = useDisposable(createJourneyFriction, value => value.dispose(), [])
  const launchLight = useDisposable(createJourneyLaunchLight, value => value.dispose(), [])
  const shiftRules = useDisposable(createJourneyShiftRules, value => value.dispose(), [])
  const ascent = useDisposable(createJourneyAscent, value => value.dispose(), [])
  const charge = useDisposable(createJourneyPower, value => value.dispose(), [])
  const tilt = useRef({ x: 0, y: 0 })
  const [spin] = useState(createJourneySpin)
  const [poseAngles] = useState(() => new Euler())
  const [poseQuaternion] = useState(() => new Quaternion())
  // The mark's live screen box in CSS pixels, plus whether the quiz chapter
  // currently owns it. Written by the frame loop, read by the pointer
  // handlers, so a grab always tests against what is actually on screen.
  const grip = useRef({ centerX: 0, centerY: 0, halfWidth: 0, halfHeight: 0, grabbable: false })
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

  useEffect(() => {
    const move = (event: PointerEvent) => {
      pointer.current.x = event.clientX; pointer.current.y = event.clientY
      pointer.current.active = event.pointerType !== 'touch'
    }
    const leave = () => { pointer.current.active = false }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    // Normalized against the mark's own radius, with Y flipped so dragging
    // down tips the top of the mark away from the reader.
    const local = (event: PointerEvent) => {
      const radius = Math.max(1, Math.max(grip.current.halfWidth, grip.current.halfHeight))
      return {
        x: (event.clientX - grip.current.centerX) / radius,
        y: (grip.current.centerY - event.clientY) / radius,
      }
    }
    const inside = (event: PointerEvent) =>
      Math.abs(event.clientX - grip.current.centerX) <= grip.current.halfWidth
      && Math.abs(event.clientY - grip.current.centerY) <= grip.current.halfHeight
    const seconds = (event: PointerEvent) => event.timeStamp / 1000
    const release = () => {
      if (!spin.grabbed) return
      spin.release()
      delete root.dataset.journeyGrabbing
    }
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType === 'touch') return
      if (!grip.current.grabbable || !inside(event)) return
      // Claim the drag: without this the browser starts a text selection
      // across the quiz copy as soon as the pointer moves.
      event.preventDefault()
      const point = local(event)
      spin.grab(point.x, point.y, seconds(event))
      root.dataset.journeyGrabbing = 'true'
    }
    const move = (event: PointerEvent) => {
      if (!spin.grabbed) return
      const point = local(event)
      spin.move(point.x, point.y, seconds(event))
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      window.removeEventListener('blur', release)
      spin.cancel()
      delete root.dataset.journeyGrabbing
    }
  }, [spin])

  useFrame(({ camera, size, scene, clock }, delta) => {
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
    const motion = frictionMotion.update({
      time: clock.elapsedTime, width: size.width, height: size.height,
      headerOffset: pose.headerOffset,
      baseX: (model.rig.position.x / aspect + 1) * size.width * .5,
      baseY: (1 - model.rig.position.y) * size.height * .5,
      logoWidth: pose.scale * size.width, logoHeight: pose.scale * size.width * model.height,
      copyRight: pose.frictionCopyRight, copyBottom: pose.frictionCopyBottom,
      findWipe: pose.findWipe, makeWipe: pose.makeWipe, makeEdge: pose.makeEdge,
      dock: pose.frictionDock, retire: 1 - pose.surfaceReveal,
      rise: pose.ascent,
    })
    model.rig.position.set((motion.x / size.width * 2 - 1) * aspect,
      1 - motion.y / size.height * 2, 0)
    gl.getDrawingBufferSize(drawingSize)
    // Launch is the only chapter the reader can touch. A few degrees of
    // damped tilt moves the reflections across the glass without ever
    // turning the mark away from the straight-on editorial pose.
    const tiltAmount = unit(pose.launchWipe) * unit(pose.surfaceReveal) * unit(pose.visible)
    const aimX = pointer.current.active
      ? (pointer.current.x / size.width * 2 - 1) * .075 * tiltAmount : 0
    const aimY = pointer.current.active
      ? (pointer.current.y / size.height * 2 - 1) * .055 * tiltAmount : 0
    const settle = 1 - Math.exp(-Math.max(0, Math.min(.1, delta)) * 6)
    tilt.current.x += (aimY - tilt.current.x) * settle
    tilt.current.y += (aimX - tilt.current.y) * settle
    // Scroll composes the pose; the reader's own rotation is applied in
    // screen space on top of it, and retires as the quiz leaves the view.
    poseAngles.set(tilt.current.x, pose.yaw + motion.yaw + tilt.current.y, 0)
    poseQuaternion.setFromEuler(poseAngles)
    model.rig.quaternion.copy(spin.advance(delta, unit(pose.quiz))).multiply(poseQuaternion)
    model.update(unit(pose.finish), unit(pose.charge), Math.max(0, pose.split),
      pose.partTurn, unit(pose.visible), clock.elapsedTime, unit(pose.servicesSurface), {
        amount: unit(pose.surfaceReveal), headerEdge: pose.headerEdge,
        findEdge: pose.findEdge, makeEdge: pose.makeEdge, launchEdge: pose.launchEdge,
        drawingHeight: drawingSize.y, shimmer: unit(pose.shimmer),
        blueprintDraw: sampleBlueprintDraw(pose.headerEdge,
          (motion.y - pose.scale * size.width * model.height * .5) / size.height, size.height),
        leftTurn: pose.leftTurn, rightTurn: pose.rightTurn, partScale: pose.partScale,
        register: unit(pose.register), markWidth: model.rig.scale.x, aspect,
      }, {
        power: unit(pose.power), surge: unit(pose.surge),
        presence: unit(pose.quiz), pixelRatio: gl.getPixelRatio(),
      })
    // The cage shares the logo's center but owns its rotation. Its screen
    // masks match the arriving Find panel and departing Make panel exactly.
    friction?.update({
      visible: pose.findWipe > 0 && pose.makeWipe < 1 ? unit(pose.visible) * unit(pose.surfaceReveal) : 0,
      time: clock.elapsedTime, findEdge: pose.findEdge, makeEdge: pose.makeEdge,
      drawingHeight: drawingSize.y, pixelRatio: gl.getPixelRatio(),
      centerX: model.rig.position.x, centerY: model.rig.position.y,
      logoWidth: model.rig.scale.x, viewportHeight: size.height,
      viewportWidth: size.width,
      pointerX: (pointer.current.x / size.width * 2 - 1) * aspect,
      pointerY: 1 - pointer.current.y / size.height * 2,
      pointerActive: pointer.current.active,
      headerOffset: pose.headerOffset,
    })
    launchLight?.update({
      centerX: model.rig.position.x, centerY: model.rig.position.y,
      logoWidth: model.rig.scale.x,
      visible: unit(pose.visible) * unit(pose.surfaceReveal) * unit(pose.launchWipe),
      launchEdge: pose.launchEdge, launchBottom: pose.launchBottom,
      drawingHeight: drawingSize.y, shimmer: unit(pose.shimmer),
      ascent: unit(pose.ascent),
    })
    // Both panel environments share the mark's live world pose, so their
    // horizons, wakes and focus follow the same object the reader is watching.
    const pointerWorldX = (pointer.current.x / size.width * 2 - 1) * aspect
    const pointerWorldY = 1 - pointer.current.y / size.height * 2
    const copyRight = (pose.frictionCopyRight / size.width * 2 - 1) * aspect
    shiftRules?.update({
      visible: unit(pose.visible) * unit(pose.surfaceReveal),
      align: unit(pose.rules), register: unit(pose.register),
      makeEdge: pose.makeEdge, launchEdge: pose.launchEdge,
      drawingHeight: drawingSize.y, aspect, time: clock.elapsedTime,
      markX: model.rig.position.x, markY: model.rig.position.y,
      markWidth: model.rig.scale.x,
      markHeight: model.rig.scale.x * model.height, copyRight,
      pointerX: pointerWorldX, pointerY: pointerWorldY,
      pointerActive: pointer.current.active,
    })
    // The grab box is the mark's own screen rectangle, so the cursor hint
    // and the actual hit test always describe the same area.
    const markScreenWidth = model.rig.scale.x * size.width / (2 * aspect)
    grip.current.centerX = (model.rig.position.x / aspect + 1) * size.width * .5
    grip.current.centerY = (1 - model.rig.position.y) * size.height * .5
    grip.current.halfWidth = markScreenWidth * .5
    grip.current.halfHeight = markScreenWidth * model.height * .5
    grip.current.grabbable = unit(pose.quiz) > .55 && unit(pose.visible) > .5
    if (!grip.current.grabbable) spin.cancel()
    charge?.update({
      visible: unit(pose.visible) * unit(pose.quiz),
      power: unit(pose.power), surge: unit(pose.surge),
      centerX: model.rig.position.x, centerY: model.rig.position.y,
      markWidth: model.rig.scale.x,
    })
    ascent?.update({
      visible: unit(pose.visible) * unit(pose.surfaceReveal) * unit(pose.launchWipe),
      ascent: unit(pose.ascent), shimmer: unit(pose.shimmer),
      launchEdge: pose.launchEdge, launchBottom: pose.launchBottom,
      drawingHeight: drawingSize.y, aspect, time: clock.elapsedTime,
      markX: model.rig.position.x, markY: model.rig.position.y,
      markWidth: model.rig.scale.x,
      markHeight: model.rig.scale.x * model.height,
      // The horizon is the mark's own docked height. Everything above it in
      // this chapter is distance the mark has actually travelled.
      horizonY: 1 - (motion.y + motion.rise) / size.height * 2,
      copyRight,
      pointerX: pointerWorldX, pointerY: pointerWorldY,
      pointerActive: pointer.current.active,
    })
    model.rig.updateMatrixWorld(true)
    bounds.setFromObject(model.rig)
    resources.water.update(gl, scene, camera, size.width, size.height,
      (bounds.min.y + 1) * .5, unit(pose.water) * unit(pose.visible), clock.elapsedTime,
      { sectionEdge: pose.closingEdge, amount: unit(pose.dawn) })
  }, -1)

  return <>
    <JourneyFrames frame={frame} ready={Boolean(model && resources)} report={report} reportReady={reportReady} />
    {resources && <primitive object={resources.water.mesh} dispose={null} />}
    {model && <primitive object={model.rig} dispose={null} />}
    {friction && <primitive object={friction.group} dispose={null} />}
    {launchLight && <primitive object={launchLight.mesh} dispose={null} />}
    {shiftRules && <primitive object={shiftRules.mesh} dispose={null} />}
    {ascent && <primitive object={ascent.mesh} dispose={null} />}
    {charge && <primitive object={charge.mesh} dispose={null} />}
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
