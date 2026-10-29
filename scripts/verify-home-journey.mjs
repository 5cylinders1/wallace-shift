/** Scroll mathematics, server markup and loading boundaries; not browser/GPU verification. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const urlFor = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
} }).outputText
const { sampleJourneyFrame, sampleBlueprintDraw, PROCESS_TIMING, PROCESS_SCROLL_UNITS,
  ASCENT_GROWTH, CLOSING_CARD_FILL, MARK_RATIO } = await import(urlFor(
  compile(await read('src/components/HomeJourney/journeyDirector.ts'))))
const { createJourneyFrictionMotion } = await import(urlFor(
  compile(await read('src/components/HomeJourney/journeyFrictionMotion.ts'))))
const stageHeight = 1000 - 84
const processHeight = stageHeight * PROCESS_SCROLL_UNITS
const layout = {
  viewportHeight: 1000, viewportWidth: 1800, headerOffset: 84, servicesTop: 4000, servicesHeaderHeight: 300,
  servicesRowsBottom: 5900,
  servicesHeadingRight: 600,
  processHeadingRight: 680,
  servicesHeadingBaseline: 245,
  processTop: 6500, processHeight,
  quizTop: 6500 + processHeight, closingTop: 7900 + processHeight, end: 9500 + processHeight,
}
const close = (a, b, toleranceOrMessage = 1e-8) => assert.ok(
  Math.abs(a - b) < (typeof toleranceOrMessage === 'number' ? toleranceOrMessage : 1e-8),
  `${typeof toleranceOrMessage === 'string' ? `${toleranceOrMessage}: ` : ''}${a} differs from ${b}`)
const servicesWidth = Math.min(240, Math.max(160, layout.viewportWidth * .14))
const servicesX = (layout.servicesHeadingRight + 75 + servicesWidth / 2) * 2 / layout.viewportWidth - 1
const servicesOffscreenX = 1 + servicesWidth / layout.viewportWidth
const servicesEntryStart = layout.servicesTop + layout.servicesHeaderHeight - layout.viewportHeight
const servicesPinStart = layout.servicesTop - layout.headerOffset
const processX = (layout.processHeadingRight + 100 + servicesWidth / 2) * 2 / layout.viewportWidth - 1

await test('blueprint tracing waits until the dark header fully clears the logo plus a twelve-pixel gap', () => {
  for (const height of [640, 720, 960, 1080]) {
    const logoTop = .34
    for (const clearance of [-100, -1, 0, 6, 11.99, 12]) {
      close(sampleBlueprintDraw(logoTop - clearance / height, logoTop, height), 0,
        `no contour may draw at ${clearance}px clearance in a ${height}px viewport`)
    }
    const beginning = sampleBlueprintDraw(logoTop - 13 / height, logoTop, height)
    assert.ok(beginning > 0 && beginning < .01, 'the pen starts gently only after the header is clear')
    close(sampleBlueprintDraw(logoTop - 92 / height, logoTop, height), .5,
      'half of the 160px drawing distance produces half of the trace')
    close(sampleBlueprintDraw(logoTop - 172 / height, logoTop, height), 1)
    close(sampleBlueprintDraw(logoTop - 300 / height, logoTop, height), 1)
  }
})

await test('blueprint tracing remains continuous, reversible, and safe for unavailable viewport measurements', () => {
  const height = 720, logoTop = .31
  const samples = new Map()
  let previous = 0
  for (let clearance = 0; clearance <= 200; clearance++) {
    const value = sampleBlueprintDraw(logoTop - clearance / height, logoTop, height)
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1)
    assert.ok(value >= previous - 1e-10)
    assert.ok(value - previous < .02, 'the contour cannot pop between adjacent scroll pixels')
    samples.set(clearance, value)
    previous = value
  }
  for (let clearance = 200; clearance >= 0; clearance--) {
    close(sampleBlueprintDraw(logoTop - clearance / height, logoTop, height), samples.get(clearance),
      'reverse scrolling erases exactly the same trace progression')
  }
  for (const measurement of [[NaN, logoTop, height], [Infinity, logoTop, height],
    [0, NaN, height], [0, logoTop, NaN], [0, logoTop, 0], [0, logoTop, -100]]) {
    const value = sampleBlueprintDraw(...measurement)
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1,
      'missing or invalid measurements must not produce an invalid shader progress')
    close(value, 0, 'an unavailable logo position cannot start the contour prematurely')
  }
})

await test('logo enters as the services header bottom meets the viewport bottom and arrives by the header pin', () => {
  for (const scroll of [3000, servicesEntryStart - 100, servicesEntryStart - 1, servicesEntryStart]) {
    const frame = sampleJourneyFrame(scroll, layout)
    close(frame.x, servicesOffscreenX)
    close(frame.yaw, 0)
    close(frame.x - frame.scale, 1, 'the front-facing mark begins exactly beyond the viewport edge')
  }
  const beginning = sampleJourneyFrame(servicesEntryStart + 1, layout)
  assert.ok(beginning.x < servicesOffscreenX, 'the first scroll pixel after the boundary starts horizontal travel')
  assert.ok(beginning.x - beginning.scale < 1, 'the entrance has no invisible horizontal runway')
  const halfway = sampleJourneyFrame((servicesEntryStart + servicesPinStart) / 2, layout)
  close(halfway.x, (servicesOffscreenX + servicesX) / 2)
  close(halfway.yaw, 0)
  let previousX = servicesOffscreenX
  for (let i = 0; i <= 20; i++) {
    const frame = sampleJourneyFrame(servicesEntryStart + (servicesPinStart - servicesEntryStart) * i / 20, layout)
    assert.ok(frame.x <= previousX)
    assert.equal(frame.visible, 1, 'entry uses movement instead of an opacity reveal')
    previousX = frame.x
  }
  close(sampleJourneyFrame(servicesPinStart, layout).x, servicesX)
  close(sampleJourneyFrame(servicesPinStart + 100, layout).x, servicesX)
  for (const viewportWidth of [1024, 1280, 1800, 2560]) {
    const measured = { ...layout, viewportWidth, servicesHeadingRight: viewportWidth * .35 }
    const frame = sampleJourneyFrame(servicesPinStart, measured)
    const width = frame.scale * viewportWidth
    const left = (frame.x + 1) * viewportWidth / 2 - width / 2
    close(left - measured.servicesHeadingRight, 75)
    close(width, Math.min(240, Math.max(160, viewportWidth * .14)))
    assert.ok(width <= 240, 'services mark stays compact on wide screens')
  }
  close(sampleJourneyFrame(3000, layout).visible, 0)
  close(sampleJourneyFrame(layout.end, layout).visible, 0)
})

await test('arriving and pinned logo bottom follows the headline baseline without double offset', () => {
  for (const scroll of [3300, 3500, 3950, 4100, 4300, 4600]) {
    const frame = sampleJourneyFrame(scroll, layout)
    const visualTop = Math.max(0, layout.servicesTop - scroll)
    const logoBottom = visualTop + (1 - frame.y) * layout.viewportHeight / 2
    const headingBaseline = Math.max(layout.headerOffset, layout.servicesTop - scroll) + layout.servicesHeadingBaseline
    close(logoBottom, headingBaseline)
    close(frame.servicesSurface, 1)
  }
  for (const scroll of [servicesPinStart, servicesPinStart + 100, servicesPinStart + 400]) {
    const frame = sampleJourneyFrame(scroll, layout)
    const visualTop = Math.max(0, layout.servicesTop - scroll)
    close(visualTop + (1 - frame.y) * layout.viewportHeight / 2,
      layout.headerOffset + layout.servicesHeadingBaseline)
  }
})

await test('entry follows viewport and header measurements, and paused or reversed scroll retains the same pose', () => {
  for (const viewportHeight of [640, 720, 960, 1080]) {
    for (const servicesHeaderHeight of [260, 300, 340]) {
      const measured = { ...layout, viewportHeight, servicesHeaderHeight }
      const start = measured.servicesTop + servicesHeaderHeight - viewportHeight
      const end = measured.servicesTop - measured.headerOffset
      const midpoint = (start + end) / 2
      close(sampleJourneyFrame(start - 1, measured).x, servicesOffscreenX)
      close(sampleJourneyFrame(start, measured).x, servicesOffscreenX)
      assert.ok(sampleJourneyFrame(start + 1, measured).x < servicesOffscreenX)
      close(sampleJourneyFrame(midpoint, measured).x, (servicesOffscreenX + servicesX) / 2)
      close(sampleJourneyFrame(end, measured).x, servicesX)
      const positions = [start - 1, start, start + 1, midpoint, end, end + 100]
      const frames = positions.map(scroll => sampleJourneyFrame(scroll, measured))
      for (let i = positions.length - 1; i >= 0; i--) {
        assert.deepEqual(sampleJourneyFrame(positions[i], measured), frames[i])
        assert.deepEqual(sampleJourneyFrame(positions[i], measured), frames[i], 'holding scroll cannot advance the entrance')
        const visualTop = Math.max(0, measured.servicesTop - positions[i])
        const logoBottom = visualTop + (1 - frames[i].y) * viewportHeight / 2
        const headingBaseline = Math.max(measured.headerOffset, measured.servicesTop - positions[i]) + measured.servicesHeadingBaseline
        close(logoBottom, headingBaseline, 'the entering mark follows the moving headline before it pins')
      }
    }
  }
})

await test('heading releases as the last service row clears, while the logo holds its vertical anchor and aligns with process copy', () => {
  const release = layout.servicesRowsBottom - layout.servicesHeaderHeight - layout.headerOffset
  const processPin = layout.processTop - layout.headerOffset
  const pinned = sampleJourneyFrame(release, layout)
  close(pinned.headerEdge * layout.viewportHeight, layout.headerOffset + layout.servicesHeaderHeight)
  close(pinned.headerEdge * layout.viewportHeight, layout.servicesRowsBottom - release)
  close(pinned.x, servicesX)
  for (const distance of [-200, -1, 0, 1, 80, 200, 350]) {
    const frame = sampleJourneyFrame(release + distance, layout)
    close(frame.headerEdge * layout.viewportHeight,
      layout.headerOffset + layout.servicesHeaderHeight - Math.max(0, distance))
    close(frame.y, pinned.y, 'logo does not rise with the released header')
    close(frame.anchorScale, pinned.anchorScale)
    if (distance > 0) assert.ok(frame.x > pinned.x, 'rightward travel begins immediately after release')
    else close(frame.x, pinned.x)
  }
  let previousX = pinned.x
  for (let scroll = release; scroll <= processPin; scroll += 20) {
    const frame = sampleJourneyFrame(scroll, layout)
    assert.ok(frame.x >= previousX)
    previousX = frame.x
    close(frame.y, pinned.y)
    close(frame.anchorScale, pinned.anchorScale)
  }
  close(sampleJourneyFrame(processPin, layout).x, processX)
  for (const viewportWidth of [1024, 1280, 1800, 2560]) {
    const measured = { ...layout, viewportWidth, servicesHeadingRight: viewportWidth * .35,
      processHeadingRight: viewportWidth * .42 }
    const frame = sampleJourneyFrame(processPin, measured)
    const width = frame.scale * viewportWidth
    const left = (frame.x + 1) * viewportWidth / 2 - width / 2
    close(left - measured.processHeadingRight, 100, 'the process mark sits next to the measured title column')
    assert.ok(left + width <= viewportWidth * .96, 'the mark retains a safe right margin')
    close(frame.y, pinned.y, 'horizontal alignment does not disturb the vertical lock')

    const shorterProcessTitle = sampleJourneyFrame(processPin, { ...measured,
      processHeadingRight: measured.servicesHeadingRight - 50 })
    const shorterLeft = (shorterProcessTitle.x + 1) * viewportWidth / 2 - width / 2
    close(shorterLeft - measured.servicesHeadingRight, 100,
      'a shorter process title does not send the mark back toward the services heading')

    const constrained = sampleJourneyFrame(processPin, { ...measured, processHeadingRight: viewportWidth * .9 })
    const constrainedRight = (constrained.x + 1) * viewportWidth / 2 + width / 2
    close(constrainedRight, viewportWidth * .96, 'an unusually wide title cannot push the logo offscreen')
  }
  for (let unit = 0; unit <= PROCESS_TIMING.end; unit += .1) {
    const frame = sampleJourneyFrame(processPin + unit * stageHeight, layout)
    close(frame.y, pinned.y)
    close(frame.anchorScale, pinned.anchorScale,
      'the separate center offset must stay fixed while the individual parts scale')
  }
})

await test('upward panel wipes and GLB material edges share the same measured stage throughout scrolling', () => {
  const processPin = layout.processTop - layout.headerOffset
  const chapters = [
    ['find', PROCESS_TIMING.findStart, PROCESS_TIMING.findEnd],
    ['make', PROCESS_TIMING.makeStart, PROCESS_TIMING.makeEnd],
    ['launch', PROCESS_TIMING.launchStart, PROCESS_TIMING.launchEnd],
  ]
  for (const [name, start, end] of chapters) {
    const before = sampleJourneyFrame(processPin + start * stageHeight, layout)
    const middle = sampleJourneyFrame(processPin + (start + end) * .5 * stageHeight, layout)
    const after = sampleJourneyFrame(processPin + end * stageHeight, layout)
    close(before[`${name}Wipe`], 0)
    close(before[`${name}Edge`], 1, 'the new color starts at the viewport bottom')
    close(middle[`${name}Wipe`], .5)
    close(middle[`${name}Edge`] * layout.viewportHeight, layout.headerOffset + stageHeight * .5)
    close(after[`${name}Wipe`], 1)
    close(after[`${name}Edge`] * layout.viewportHeight, layout.headerOffset)
    let previous = 1
    for (let unit = start; unit <= end; unit += .02) {
      const frame = sampleJourneyFrame(processPin + unit * stageHeight, layout)
      assert.ok(frame[`${name}Edge`] <= previous)
      previous = frame[`${name}Edge`]
      close(frame[`${name}Edge`] * layout.viewportHeight,
        layout.headerOffset + stageHeight * (1 - frame[`${name}Wipe`]))
    }
  }
  const states = [0, 1.5, 4, 6.2].map(unit => sampleJourneyFrame(processPin + unit * stageHeight, layout))
  assert.deepEqual(states.map(frame => [frame.findWipe, frame.makeWipe, frame.launchWipe]),
    [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    'intro, Find, Make and Launch each have a fully settled reading interval')
  const stageRelease = layout.processTop + layout.processHeight - stageHeight - layout.headerOffset
  const atRelease = sampleJourneyFrame(stageRelease, layout)
  const leaving = sampleJourneyFrame(stageRelease + 120, layout)
  close(atRelease.launchBottom, 1, 'the Launch panel reaches the viewport bottom while pinned')
  close(leaving.launchBottom * layout.viewportHeight, layout.viewportHeight - 120,
    'the trailing light boundary rises with the real panel when the stage releases')
  close(sampleJourneyFrame(stageRelease + layout.viewportHeight, layout).launchBottom, 0,
    'the Launch backlight has no screen pixels once its panel leaves the viewport')
  for (const name of ['find', 'make', 'launch']) {
    close(leaving[`${name}Edge`] * layout.viewportHeight,
      atRelease[`${name}Edge`] * layout.viewportHeight - 120,
      'surface edges continue with the stage after its pin releases')
  }
})

await test('Make turns each half independently, then Launch reassembles and gives the shimmer a quiet finish', () => {
  const sampleChapter = unit => sampleJourneyFrame(layout.processTop - layout.headerOffset + unit * stageHeight, layout)
  const beforeSpins = sampleChapter(PROCESS_TIMING.makeEnd)
  close(beforeSpins.leftTurn, 0)
  close(beforeSpins.rightTurn, 0)
  close(beforeSpins.frictionDock, 0, 'the logo stays at the captured position until the Make wipe completes')
  assert.ok(PROCESS_TIMING.dockEnd < PROCESS_TIMING.leftTurnStart
    && PROCESS_TIMING.dockEnd < PROCESS_TIMING.rightTurnStart,
  'the assembly docks before either half begins its independent turn')
  for (const progress of [0, .25, .5, .75, 1]) {
    const docking = sampleChapter(PROCESS_TIMING.makeEnd
      + progress * (PROCESS_TIMING.dockEnd - PROCESS_TIMING.makeEnd))
    close(docking.makeWipe, 1)
    close(docking.leftTurn, 0)
    close(docking.rightTurn, 0)
    close(docking.split, 0, 'the logo stays assembled while moving to its dock')
    close(docking.partScale, 1, 'the halves do not scale before the logo reaches its dock')
    assert.ok(docking.frictionDock >= 0 && docking.frictionDock <= 1)
  }
  close(sampleChapter(PROCESS_TIMING.dockEnd).frictionDock, 1)
  const firstTurning = sampleChapter((PROCESS_TIMING.leftTurnStart + PROCESS_TIMING.rightTurnStart) * .5)
  assert.ok(firstTurning.leftTurn > 0)
  close(firstTurning.rightTurn, 0, 'the second half starts later instead of mirroring the first')
  const bothTurning = sampleChapter((Math.max(PROCESS_TIMING.leftTurnStart, PROCESS_TIMING.rightTurnStart)
    + Math.min(PROCESS_TIMING.leftTurnEnd, PROCESS_TIMING.rightTurnEnd)) * .5)
  assert.ok(bothTurning.leftTurn > 0 && bothTurning.leftTurn < Math.PI * 2)
  assert.ok(bothTurning.rightTurn < 0 && bothTurning.rightTurn > -Math.PI * 2)
  assert.notEqual(bothTurning.leftTurn, -bothTurning.rightTurn)
  close(bothTurning.partScale, 1.12)
  assert.ok(bothTurning.split > 0)
  const makeRest = sampleChapter((Math.max(PROCESS_TIMING.leftTurnEnd, PROCESS_TIMING.rightTurnEnd)
    + PROCESS_TIMING.launchStart) * .5)
  close(makeRest.leftTurn, Math.PI * 2)
  close(makeRest.rightTurn, -Math.PI * 2)
  close(makeRest.partScale, 1.12)
  const assembled = sampleChapter(PROCESS_TIMING.launchEnd)
  close(assembled.split, 0)
  close(assembled.partScale, 1)
  close(assembled.finish, 1)
  close(assembled.shimmer, 0, 'assembly completes before the final glint')
  close(sampleChapter((PROCESS_TIMING.shimmerStart + PROCESS_TIMING.shimmerEnd) * .5).shimmer, .5)
  const settled = sampleChapter(PROCESS_TIMING.shimmerEnd)
  close(settled.shimmer, 1)
  assert.ok(settled.charge < .25)
  assert.ok(PROCESS_TIMING.ascentEnd >= PROCESS_TIMING.shimmerEnd,
    'the climb is the last thing to finish, so the chapter ends on the mark and not on a glint')
  const resting = sampleChapter(PROCESS_TIMING.ascentEnd + .05)
  close(resting.shimmer, 1)
  close(resting.ascent, 1)
  // Screen-space section boundaries track scroll by definition; the rest of
  // the frame is the pose, and that is what has to be at rest here.
  const scrollRelative = new Set(['headerEdge', 'closingEdge'])
  const restingPose = frame => Object.fromEntries(Object.entries(frame).filter(([key]) => !scrollRelative.has(key)))
  assert.deepEqual(restingPose(sampleChapter(PROCESS_TIMING.end - .1)), restingPose(resting),
    'final logo rests without ongoing spin, scale, climb or shimmer motion')
  const closing = sampleJourneyFrame(layout.closingTop + 200, layout)
  close(closing.water, 1)
  close(closing.dawn, 1)
  close(closing.charge, .12)
  close(closing.surfaceReveal, 0, 'quiz and footer return to the existing crystal treatment')
  close(closing.anchorScale, 0)

  // The closing mark is centred on the enquiry card and grown until one axis
  // spans the fill. It follows the card's measured place in the grid, so it
  // cannot drift when the form changes shape.
  for (const [width, height] of [[1024, 700], [1440, 900], [1728, 967], [1920, 650]]) {
    const card = { left: width * .46, top: layout.closingTop + 120,
      width: width * .5, height: height * .58 }
    const measured = { ...layout, viewportWidth: width, viewportHeight: height,
      closingCardLeft: card.left, closingCardTop: card.top,
      closingCardWidth: card.width, closingCardHeight: card.height }
    const scroll = measured.closingTop + 200
    const frame = sampleJourneyFrame(scroll, measured)
    const markWidth = frame.scale * width
    const markHeight = markWidth * MARK_RATIO
    const centreX = (frame.x + 1) * width * .5
    const centreY = (1 - frame.y) * height * .5
    close(centreX, card.left + card.width * .5, `${width}x${height} centres the mark on the card`)
    close(centreY, card.top - scroll + card.height * .5,
      `${width}x${height} centres it vertically too`)
    // One axis lands exactly on the fill and the other is short of it; neither
    // may exceed it, or the mark would overrun the card it is filling.
    const spans = [markWidth / card.width, markHeight / card.height]
    assert.ok(Math.max(...spans) <= CLOSING_CARD_FILL + 1e-9,
      `${width}x${height} never exceeds the fill (${spans})`)
    assert.ok(Math.abs(Math.max(...spans) - CLOSING_CARD_FILL) < 1e-9,
      `${width}x${height} grows until one axis reaches it (${spans})`)
  }

  // Whichever axis runs out first is the one that binds, at any card shape.
  const filled = shape => {
    const measured = { ...layout, viewportWidth: 1440, viewportHeight: 900,
      closingCardLeft: 200, closingCardTop: layout.closingTop + 100, ...shape }
    const frame = sampleJourneyFrame(measured.closingTop + 200, measured)
    const markWidth = frame.scale * 1440
    return [markWidth / measured.closingCardWidth,
      markWidth * MARK_RATIO / measured.closingCardHeight]
  }
  const wide = filled({ closingCardWidth: 900, closingCardHeight: 700 })
  assert.ok(Math.abs(wide[0] - CLOSING_CARD_FILL) < 1e-9 && wide[1] < CLOSING_CARD_FILL,
    'a card wider than the mark is width-bound')
  const tall = filled({ closingCardWidth: 900, closingCardHeight: 300 })
  assert.ok(Math.abs(tall[1] - CLOSING_CARD_FILL) < 1e-9 && tall[0] < CLOSING_CARD_FILL,
    'a card shallower than the mark is height-bound')
})

await test('Make resolves its misregistration and drafting field before Launch takes the stage', () => {
  const sampleChapter = unit => sampleJourneyFrame(layout.processTop - layout.headerOffset + unit * stageHeight, layout)
  const t = PROCESS_TIMING
  assert.ok(t.rulesStart >= t.makeEnd - 1e-9,
    'the drafting rules belong to the Make panel, not to the Find chapter underneath it')
  assert.ok(t.registerStart >= t.dockEnd - 1e-9,
    'the plates only begin closing once the mark has reached its dock')
  assert.ok(t.registerEnd <= t.launchStart,
    'register finishes before the Launch wipe, so no colour plate ever crosses onto Launch')
  assert.ok(t.rulesEnd <= t.launchStart + (t.launchEnd - t.launchStart),
    'the rules are straight before the Launch panel has finished covering them')
  close(sampleChapter(t.registerStart).register, 0)
  close(sampleChapter(t.registerEnd).register, 1)
  close(sampleChapter(t.rulesStart).rules, 0)
  close(sampleChapter(t.rulesEnd).rules, 1)
  close(sampleChapter(t.ascentStart).ascent, 0)
  close(sampleChapter(t.ascentEnd).ascent, 1)
  close(sampleChapter(t.launchStart).ascent, 0,
    'the climb waits for the panel and the reassembly')
  for (const key of ['register', 'rules', 'ascent']) {
    let previous = -1
    for (let unit = 0; unit <= t.end; unit += .05) {
      const value = sampleChapter(unit)[key]
      assert.ok(value >= -1e-9 && value <= 1 + 1e-9, `${key} stays within its range`)
      assert.ok(value >= previous - 1e-9, `${key} only advances while the chapter runs`)
      previous = value
    }
  }
  // Every one of these belongs to the process panels. The quiz handoff takes
  // them all back down together with the rest of the panel surface treatment.
  const retiring = sampleJourneyFrame(layout.quizTop - layout.viewportHeight * .2, layout)
  for (const key of ['register', 'rules', 'ascent']) {
    close(retiring[key], sampleChapter(t.end)[key] * retiring.surfaceReveal, `${key} retires with the surface`)
  }
  const quiz = sampleJourneyFrame(layout.quizTop + 100, layout)
  for (const key of ['register', 'rules', 'ascent']) close(quiz[key], 0, `${key} is absent from the quiz`)
})

await test('Launch grows and lifts the assembled logo only after its wipe, preserves the dock, and retires reversibly', () => {
  assert.ok(PROCESS_TIMING.ascentStart >= PROCESS_TIMING.launchEnd,
    'the climb starts only once the panel wipe and reassembly have finished')
  assert.ok(PROCESS_TIMING.ascentEnd < PROCESS_TIMING.end)
  assert.ok(ASCENT_GROWTH > 0)
  for (const [width, height] of [[1024, 700], [1280, 720], [1800, 1000], [2560, 1440]]) {
    const stage = height - layout.headerOffset
    const measured = { ...layout, viewportWidth: width, viewportHeight: height,
      processHeight: stage * PROCESS_SCROLL_UNITS,
      quizTop: layout.processTop + stage * PROCESS_SCROLL_UNITS,
      closingTop: layout.processTop + stage * PROCESS_SCROLL_UNITS + 2000,
      end: layout.processTop + stage * PROCESS_SCROLL_UNITS + 4000 }
    const chapterScroll = chapter => measured.processTop - measured.headerOffset + chapter * stage
    const chapterFrame = chapter => sampleJourneyFrame(chapterScroll(chapter), measured)
    const before = chapterFrame(PROCESS_TIMING.launchStart)
    for (const progress of [0, .2, .5, .8, 1]) {
      const frame = chapterFrame(PROCESS_TIMING.launchStart
        + progress * (PROCESS_TIMING.launchEnd - PROCESS_TIMING.launchStart))
      close(frame.scale, before.scale, 'global enlargement must not compete with the incoming wipe and assembly')
    }
    const controller = createJourneyFrictionMotion()
    let time = 0
    const dock = frame => {
      const baseX = (frame.x + 1) * width * .5
      const baseY = (1 - frame.y) * height * .5
      return controller.update({ time: time += .1, width, height, headerOffset: measured.headerOffset,
        baseX, baseY, logoWidth: frame.scale * width, logoHeight: frame.scale * width * .549,
        copyRight: frame.frictionCopyRight, copyBottom: frame.frictionCopyBottom,
        findWipe: frame.findWipe, makeWipe: frame.makeWipe, makeEdge: frame.makeEdge,
        dock: frame.frictionDock, retire: 1 - frame.surfaceReveal, rise: frame.ascent })
    }
    const snapshots = []
    let previousScale = before.scale
    let previousTop = Infinity
    for (const progress of [0, .25, .5, .75, 1]) {
      const chapter = PROCESS_TIMING.ascentStart
        + progress * (PROCESS_TIMING.ascentEnd - PROCESS_TIMING.ascentStart)
      const frame = chapterFrame(chapter)
      close(frame.launchWipe, 1)
      close(frame.partScale, 1, 'growth belongs to the assembled rig, not its individual halves')
      close(frame.split, 0)
      close(frame.leftTurn, Math.PI * 2)
      close(frame.rightTurn, -Math.PI * 2)
      assert.ok(frame.scale >= previousScale - 1e-10)
      assert.ok(frame.scale <= before.scale * (1 + ASCENT_GROWTH) + 1e-10)
      previousScale = frame.scale
      const pose = dock(frame)
      close(width - pose.x - frame.scale * width * .5, Math.max(64, width * .08),
        'the growing logo retains the established right margin')
      close(pose.yaw, 0, 'the assembled mark does not start another turn')
      // The climb is monotonic and always clears navigation, at every size.
      const top = pose.y - frame.scale * width * .549 * .5
      assert.ok(top <= previousTop + 1e-9, 'the mark only ever rises during the ascent')
      assert.ok(top > measured.headerOffset, 'the climbing mark never passes under navigation')
      assert.ok(pose.y <= measured.headerOffset + stage * .5 + 1e-9,
        'the ascent lifts the mark above its dock and never below it')
      previousTop = top
      snapshots.push({ chapter, frame, pose })
    }
    close(previousScale, before.scale * (1 + ASCENT_GROWTH))
    assert.ok(snapshots.at(-1).pose.y < snapshots[0].pose.y - 1,
      'the finished ascent is a visible climb, not a nominal one')
    close(chapterFrame(PROCESS_TIMING.end - .1).scale, previousScale, 'the enlarged mark holds after the lighting sweep')
    for (const snapshot of snapshots.reverse()) {
      assert.deepEqual(chapterFrame(snapshot.chapter), snapshot.frame)
      assert.deepEqual(dock(snapshot.frame), snapshot.pose, 'reverse scrolling restores the same size, climb and dock')
    }
    const grownScale = before.scale * (1 + ASCENT_GROWTH)
    const retireStart = measured.quizTop - height * .65
    const retirement = []
    for (const progress of [0, .25, .5, .75, 1]) {
      const scroll = retireStart + progress * height * .65
      const frame = sampleJourneyFrame(scroll, measured)
      close(frame.scale, grownScale * frame.surfaceReveal + .21 * (1 - frame.surfaceReveal),
        'quiz retirement blends back to its existing scale without a reset')
      close(frame.partScale, 1)
      close(frame.split, 0)
      retirement.push([scroll, frame, dock(frame)])
    }
    close(retirement.at(-1)[1].scale, .21)
    for (const [scroll, frame, pose] of retirement.reverse()) {
      assert.deepEqual(sampleJourneyFrame(scroll, measured), frame)
      assert.deepEqual(dock(frame), pose)
    }
  }
})

await test('reverse scroll, jumps and moved upstream content produce the same finite continuous pose', () => {
  const positions = Array.from({ length: 261 }, (_, index) => 3000 + index * 50)
  const forward = new Map(positions.map(scroll => [scroll, sampleJourneyFrame(scroll, layout)]))
  for (const scroll of positions.reverse()) assert.deepEqual(sampleJourneyFrame(scroll, layout), forward.get(scroll))
  const shifted = { ...layout, servicesTop: layout.servicesTop + 2000,
    servicesRowsBottom: layout.servicesRowsBottom + 2000, processTop: layout.processTop + 2000,
    quizTop: layout.quizTop + 2000, closingTop: layout.closingTop + 2000, end: layout.end + 2000 }
  assert.deepEqual(sampleJourneyFrame(9438, shifted), sampleJourneyFrame(7438, layout))
  for (const height of [600, 900, 1600]) {
    for (let scroll = 3200; scroll < layout.end - 1; scroll += 13) {
      const a = sampleJourneyFrame(scroll, { ...layout, viewportHeight: height })
      const b = sampleJourneyFrame(scroll + .01, { ...layout, viewportHeight: height })
      for (const key of Object.keys(a)) {
        assert.ok(Number.isFinite(a[key]), key)
        assert.ok(Math.abs(a[key] - b[key]) < .001, `${key} jumps at ${scroll}`)
      }
      assert.ok(a.split >= 0 && a.split <= .14)
      assert.ok(a.finish >= 0 && a.finish <= 1)
      assert.ok(a.partScale >= 1 && a.partScale <= 1.12)
      assert.ok(a.shimmer >= 0 && a.shimmer <= 1)
    }
  }
})

const external = {
  react: import.meta.resolve('react'),
  'react/jsx-runtime': import.meta.resolve('react/jsx-runtime'),
  gsap: urlFor('export default {};'),
  '@gsap/react': urlFor('export const useGSAP = () => {};'),
  'gsap/ScrollTrigger': urlFor('export const ScrollTrigger = {};'),
}
const mock = (name, element) => urlFor(`import {createElement} from '${external.react}'; export const ${name}=()=>createElement('${element}',{'data-retired-media':true});`)
const ambientMediaMock = urlFor(`import {createElement} from '${external.react}';
  export const AmbientLoop = ({media, active = true}) => createElement('video', {
    'data-ambient-video': true, 'data-media-active': String(active), poster: media.poster, src: media.video,
  });`)
const overrides = new Map([
  ['src/lib/router.ts', urlFor('export const navigate=()=>{};')],
  ['src/lib/contactAdapter.ts', urlFor('export const submitContactRequest=()=>{throw new Error("No network in markup verification")};')],
  ['src/components/ShiftQuiz/SpotlightMedia.tsx', mock('SpotlightMedia', 'video')],
  ['src/components/AmbientLoop/AmbientLoop.tsx', ambientMediaMock],
])
const cache = new Map()
async function sourceModule(path) {
  if (overrides.has(path)) return overrides.get(path)
  if (cache.has(path)) return cache.get(path)
  let js = compile(await read(path)).replace(/^import ['"][^'"]+\.css['"];?\s*$/gm, '')
  for (const match of [...js.matchAll(/from\s+['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    let target = external[specifier]
    if (!target && specifier.startsWith('.')) {
      const base = new URL(specifier, new URL(path, root)).pathname.slice(root.pathname.length)
      for (const extension of ['.ts', '.tsx']) {
        try { await read(base + extension); target = await sourceModule(base + extension); break }
        catch (error) { if (error.code !== 'ENOENT') throw error }
      }
    }
    assert.ok(target, `Unresolved markup harness dependency ${specifier} in ${path}`)
    js = js.replace(match[0], `from '${target}'`)
  }
  const result = urlFor(js)
  cache.set(path, result)
  return result
}

await test('static/mobile journey restores the three service media panels while preserving copy, order, controls and footer', async () => {
  const { HomeJourney } = await import(await sourceModule('src/components/HomeJourney/HomeJourney.tsx'))
  const html = renderToStaticMarkup(createElement(HomeJourney))
  const positions = ['id="services"', 'id="approach"', 'id="shift-finder"', 'id="contact"', '<footer'].map(id => html.indexOf(id))
  assert.ok(positions.every(position => position >= 0))
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
  assert.equal((html.match(/<footer/g) ?? []).length, 1)
  assert.match(html, /<footer[^>]*role="contentinfo"/)
  assert.match(html, /data-live="false"/)
  assert.doesNotMatch(html, /<canvas|data-retired-media|contact-horizon|home-journey__visual|pit-stop/)
  const pinStart = html.indexOf('<div class="journey-services__pin">')
  assert.ok(pinStart >= 0)
  let pinDepth = 0, pinEnd = -1
  for (const token of html.slice(pinStart).matchAll(/<div\b[^>]*>|<\/div>/g)) {
    pinDepth += token[0].startsWith('</') ? -1 : 1
    if (pinDepth === 0) { pinEnd = pinStart + token.index + token[0].length; break }
  }
  assert.ok(pinEnd > pinStart)
  const pinMarkup = html.slice(pinStart, pinEnd)
  assert.ok(pinMarkup.includes('id="journey-services-heading"'))
  assert.match(pinMarkup, /<\/header>\s*<div class="journey-services__rows">/,
    'the first service row immediately follows the heading with no empty entrance block')
  assert.equal((pinMarkup.match(/data-ambient-video="true"/g) ?? []).length, 3,
    'the heading pin lasts through all three service rows')
  assert.ok(html.indexOf('class="container journey-services__links"') > pinEnd,
    'detail and pricing links sit outside the pin so the header can release above them')
  const panels = ['intro', 'find', 'make', 'launch'].map(name =>
    html.indexOf(`journey-process__panel--${name}`))
  assert.ok(panels.every(position => position > pinEnd))
  assert.deepEqual([...panels].sort((a, b) => a - b), panels,
    'the static layout preserves intro and all three chapters in reading order')
  assert.equal((html.match(/data-ambient-video="true"/g) ?? []).length, 3, 'only the three service loops belong in this journey')
  const { homeServiceMedia } = await import(await sourceModule('src/content/mediaAssets.ts'))
  for (const word of ['TRUST', 'FLOW', 'TIME']) {
    assert.equal((html.match(new RegExp(`class="outcome-field outcome-field--${word.toLowerCase()}"`, 'g')) ?? []).length, 1)
    assert.ok(html.includes(`>${word}</span>`), `${word} retains its oversized decorative outcome word`)
    assert.ok(html.includes(`poster="${homeServiceMedia[word].poster}"`), `${word} receives its cool poster`)
    assert.ok(html.includes(`src="${homeServiceMedia[word].video}"`), `${word} receives its cool loop`)
  }
  for (const text of ['Custom CRMs built around your work', 'AI and workflows with a clear job', 'Websites connected to your business',
    'Find the gaps', 'Build around the work', 'Support the next step']) assert.ok(html.includes(text), text)
  for (const id of ['home-contact-name', 'home-contact-email', 'home-contact-message']) {
    assert.ok(html.includes(`for="${id}"`))
    assert.ok(html.includes(`id="${id}"`))
  }
  assert.match(html, /role="group" aria-label=/)
  assert.match(html, /data-answer-index="0"/)
  assert.match(html, /role="status" aria-live="polite"/)
  for (const href of ['/services', '/pricing', '/approach', '/contact', '/privacy']) assert.ok(html.includes(`href="${href}"`))
  const { ContactCta } = await import(await sourceModule('src/components/ContactCta/ContactCta.tsx'))
  const contactHtml = renderToStaticMarkup(createElement(ContactCta))
  assert.match(contactHtml, /data-ambient-video="true"/, 'other callers retain the original contact background')
  assert.match(contactHtml, /src="\/media\/generated\/contact-horizon\.mp4"/)
  const app = await read('src/App.tsx')
  assert.match(app, /path !== '\/' && <SiteFooter \/>/)
})

await test('each homepage service uses an available graded loop and poster without replacing its original asset', async () => {
  const { homeServiceMedia, serviceMedia } = await import(await sourceModule('src/content/mediaAssets.ts'))
  for (const word of ['TRUST', 'FLOW', 'TIME']) {
    const graded = homeServiceMedia[word]
    const original = serviceMedia[word]
    assert.notEqual(graded.video, original.video, `${word} must keep the source video address intact`)
    assert.notEqual(graded.poster, original.poster, `${word} must keep the source poster address intact`)
    for (const asset of [graded, original]) {
      for (const [kind, pathname] of Object.entries(asset)) {
        assert.match(pathname, /^\/media\/[a-z0-9/-]+\.(mp4|webp)$/)
        const bytes = await readFile(new URL(`public${pathname}`, root))
        assert.ok(bytes.length > 1024, `${pathname} must contain real media`)
        if (kind === 'video') assert.equal(bytes.subarray(4, 8).toString(), 'ftyp', `${pathname} must be an MP4 container`)
        else {
          assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `${pathname} must be a WebP container`)
          assert.equal(bytes.subarray(8, 12).toString(), 'WEBP')
        }
      }
    }
  }
})

await test('journey stays out of the static WebGL import graph and remeasures upstream layout changes', async () => {
  const visited = new Set()
  async function walk(path) {
    if (visited.has(path)) return
    visited.add(path)
    const source = await read(path)
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
    for (const node of ast.statements) {
      if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly) continue
      const specifier = node.moduleSpecifier.text
      assert.ok(!/^(three|@react-three\/fiber)(\/|$)/.test(specifier), `${path} eagerly imports ${specifier}`)
      if (!specifier.startsWith('.') || /\.css$/.test(specifier)) continue
      const base = new URL(specifier, new URL(path, root)).pathname.slice(root.pathname.length)
      for (const extension of ['.ts', '.tsx']) {
        try { await read(base + extension); await walk(base + extension); break }
        catch (error) { if (error.code !== 'ENOENT') throw error }
      }
    }
  }
  await walk('src/components/HomeJourney/HomeJourney.tsx')
  const source = await read('src/components/HomeJourney/HomeJourney.tsx')
  assert.match(source, /lazy\(\(\) => import\('\.\/LogoJourneyScene'\)/)
  assert.match(source, /ScrollTrigger\.addEventListener\('refresh', refresh\)/)
  assert.match(source, /ScrollTrigger\.removeEventListener\('refresh', refresh\)/)

  // The closing section sizes itself against the measured footer so the pair
  // occupy exactly one screen. Both halves of that contract have to survive.
  assert.match(source, /--journey-footer-height/,
    'the measured footer height is published for the closing section')
  assert.match(source, /closingCardWidth/,
    'the enquiry card the closing mark fills is measured, not assumed')
  // The card slides in, so its own rect is wrong while that runs. Its slot is
  // the place it occupies in the grid and never moves.
  assert.match(source, /contact-cta__form-slot/,
    'the card is measured from a slot that the entrance never transforms')
  const closingCss = await read('src/components/HomeJourney/HomeJourney.css')
  assert.match(closingCss, /min-height: calc\(100svh - var\(--journey-footer-height/,
    'the closing section consumes that measurement')
  // The enquiry block's top edge is fixed under navigation rather than being
  // pushed up off a reserved band, which made its position depend on its own
  // height and repeatedly left the heading above the viewport at full scroll.
  assert.match(closingCss, /justify-content: flex-start;\s*\n\s*padding-block: calc\(var\(--journey-header-offset\)/,
    'the closing anchors its enquiry block under navigation')
  for (const element of ['.contact-cta__inner', '.site-footer']) {
    assert.ok(source.includes(element),
      `${element} is measured, since the closing composition is derived from it`)
  }
})

await test('services stay sticky on desktop, including WebGL fallback, with natural static mobile flow', async () => {
  const css = await read('src/components/HomeJourney/HomeJourney.css')
  const headerRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .flatMap(([, selectors, declarations]) => selectors.split(',').map(selector => ({ selector: selector.trim(), declarations })))
    .filter(rule => rule.selector.endsWith('.journey-services__header'))
  const positionFor = (scroll, live) => {
    let position
    for (const { selector, declarations } of headerRules) {
      const scrollGate = selector.match(/\[data-scroll="(true|false)"\]/)?.[1]
      const liveGate = selector.match(/\[data-live="(true|false)"\]/)?.[1]
      if ((scrollGate && scrollGate !== String(scroll)) || (liveGate && liveGate !== String(live))) continue
      const next = declarations.match(/(?:^|;)\s*position\s*:\s*([^;]+)/)?.[1]
      if (next) position = next.trim()
    }
    return position
  }
  assert.equal(positionFor(true, true), 'sticky')
  assert.equal(positionFor(true, false), 'sticky', 'WebGL fallback retains the sticky services header')
  assert.equal(positionFor(false, false), 'relative')
  assert.match(await read('src/components/HomeJourney/HomeJourney.tsx'), /data-scroll=\{interactive\}/)
})

await test('healthy Canvas fallback children do not report a WebGL failure', async () => {
  const effects = []
  const effectKey = '__homeJourneyCanvasFallbackEffects'
  globalThis[effectKey] = effects
  const react = import.meta.resolve('react')
  const reactWithEffects = urlFor(`export * from '${react}';
    export const useEffect = effect => globalThis.${effectKey}.push(effect);`)
  // Installed R3F renders fallback as children of <canvas> even when the
  // WebGL context is healthy. Native fallback visibility does not stop
  // React from mounting its effectful children.
  const fiber = urlFor(`import {createElement} from '${react}';
    export const Canvas = ({fallback}) => createElement('canvas', null, fallback);
    export const useFrame = () => {};
    export const useThree = () => { throw new Error('Scene internals are not mounted by this DOM harness'); };`)
  const replacements = {
    react: reactWithEffects,
    'react/jsx-runtime': import.meta.resolve('react/jsx-runtime'),
    '@react-three/fiber': fiber,
    three: import.meta.resolve('three'),
    '../experiments/water-hero/crystalEnvironment': urlFor('export const createCrystalEnvironment=()=>{};'),
    '../experiments/water-hero/useDisposable': urlFor('export const useDisposable=()=>{};'),
    './journeyModel': urlFor('export const loadJourneyModel=()=>{};'),
    './journeyWater': urlFor('export const createJourneyWater=()=>{};'),
    './journeyFriction': urlFor(`export const createJourneyFriction=()=>{
      throw new Error('Scene resources must not mount in the Canvas DOM fallback harness');
    };`),
    './journeyFrictionMotion': urlFor(`export const createJourneyFrictionMotion=()=>{
      throw new Error('Scene motion must not mount in the Canvas DOM fallback harness');
    };`),
    './journeyLaunchLight': urlFor(`export const createJourneyLaunchLight=()=>{
      throw new Error('Launch lighting must not mount in the Canvas DOM fallback harness');
    };`),
    './journeyShiftRules': urlFor(`export const createJourneyShiftRules=()=>{
      throw new Error('The Make drafting field must not mount in the Canvas DOM fallback harness');
    };`),
    './journeyAscent': urlFor(`export const createJourneyAscent=()=>{
      throw new Error('The Launch ascent field must not mount in the Canvas DOM fallback harness');
    };`),
    './journeyPower': urlFor(`export const createJourneyPower=()=>{
      throw new Error('The quiz charge must not mount in the Canvas DOM fallback harness');
    };`),
    // Pure quaternion math with no renderer resources: the real module runs,
    // which also proves the grab controller constructs and takes its pointer
    // listeners without a GPU context. Its own `three` import is the only
    // thing this harness has to resolve for it.
    './journeySpin': urlFor(compile(await read('src/components/HomeJourney/journeySpin.ts'))
      .replace("from 'three'", `from '${import.meta.resolve('three')}'`)),
    './journeyDirector': urlFor(compile(await read('src/components/HomeJourney/journeyDirector.ts'))),
  }
  let source = compile(await read('src/components/HomeJourney/LogoJourneyScene.tsx'))
  source = source.replace(/from\s+['"]([^'"]+)['"]/g, (_, specifier) => {
    assert.ok(replacements[specifier], `Unknown renderer harness dependency ${specifier}`)
    return `from '${replacements[specifier]}'`
  })
  let failures = 0, ready = 0
  try {
    const { LogoJourneyScene } = await import(urlFor(source))
    const html = renderToStaticMarkup(createElement(LogoJourneyScene, {
      frame: { current: sampleJourneyFrame(layout.servicesTop, layout) },
      onFailure: () => { failures++ }, onReady: () => { ready++ },
    }))
    assert.match(html, /<canvas/)
    for (const effect of effects) effect()
    assert.equal(failures, 0, 'ordinary canvas children cannot trigger fallback state')
    assert.equal(ready, 0, 'DOM mounting alone is not a successfully rendered GLB frame')
  } finally { delete globalThis[effectKey] }
})

await test('compact services mark holds through the third row then moves down and grows for the redraw', () => {
  const compact = { ...layout, servicesHeaderHeight: 134, servicesHeadingBaseline: 98,
    servicesLogoWidth: 140, processHeadingBaseline: 245 }
  const release = compact.servicesRowsBottom - compact.servicesHeaderHeight - compact.headerOffset
  const start = sampleJourneyFrame(release, compact)
  close(start.scale, 140 / compact.viewportWidth)
  close(start.y, 1 - 2 * (compact.headerOffset + 98) / compact.viewportHeight)
  const middle = sampleJourneyFrame((release + compact.processTop - compact.headerOffset) / 2, compact)
  const end = sampleJourneyFrame(compact.processTop - compact.headerOffset, compact)
  assert.ok(middle.y < start.y && middle.y > end.y, 'logo moves down continuously after the last row')
  assert.ok(middle.scale > start.scale && middle.scale < end.scale, 'logo grows into the next chapter')
  close(end.scale, servicesWidth / compact.viewportWidth)
  close(end.y, 1 - 2 * (compact.headerOffset + 245) / compact.viewportHeight)
  close(sampleJourneyFrame(release - 100, compact).y, start.y, 'logo holds before release')
  close(sampleJourneyFrame(release, compact).y, start.y, 'reverse scrolling returns to the same pose')
})
