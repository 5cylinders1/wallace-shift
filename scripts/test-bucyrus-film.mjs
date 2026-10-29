import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../src/demos/bucyrus-auto/filmTimeline.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } })
const { filmFrame, filmDuration, filmShots, shotStarts, cameraTransform, cameraValues } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

assert.equal(filmShots.length, 5)
assert.ok(filmShots.some(shot => shot.asset === 'film-engine'))
assert.equal(filmFrame(0).index, 0)
assert.equal(filmFrame(0).opacity, 1, 'Opening frame must be visible without a black flash')
for (let i = 1; i < filmShots.length; i++) {
  const cut = filmFrame(shotStarts[i])
  assert.equal(cut.index, i)
  assert.equal(cut.previous, i - 1)
  assert.equal(cut.opacity, 0, 'Outgoing shot must cover the first dissolve frame')
  assert.equal(filmFrame(shotStarts[i] + filmShots[i].dissolve).opacity, 1)
}
assert.equal(filmFrame(filmDuration).index, 0)
assert.equal(filmFrame(filmDuration).previous, filmShots.length - 1)
assert.equal(filmFrame(filmDuration).opacity, 0, 'Loop must dissolve over the last shot')
for (let time = 0; time < filmDuration * 3; time += 17) {
  const f = filmFrame(time)
  assert.ok(f.progress >= 0 && f.progress < 1)
  assert.ok(f.opacity >= 0 && f.opacity <= 1)
  assert.ok(f.reelProgress >= 0 && f.reelProgress < 1)
  assert.ok(!cameraTransform(f.index, f.progress).includes('NaN'))
}
for (let i = 0; i < filmShots.length; i++) {
  assert.notEqual(cameraTransform(i, 0), cameraTransform(i, 1), 'Every shot needs camera movement')
}
for (let i = 0; i < filmShots.length; i++) {
  const [ox, oy] = filmShots[i].origin.split(' ').map(value => parseFloat(value) / 100)
  const next = filmShots[(i + 1) % filmShots.length]
  const max = 1 + next.dissolve / filmShots[i].duration
  for (let p = 0; p <= max; p += 0.01) {
    const { scale, x, y } = cameraValues(i, p)
    assert.ok(x / 100 - ox * (scale - 1) <= 0 && x / 100 + (1 - ox) * (scale - 1) >= 0, 'Horizontal image edges cover frame')
    assert.ok(y / 100 - oy * (scale - 1) <= 0 && y / 100 + (1 - oy) * (scale - 1) >= 0, 'Vertical image edges cover frame')
  }
}
console.log('Bucyrus film: opening, five shots, camera movement, edits, and three seamless loops passed.')
