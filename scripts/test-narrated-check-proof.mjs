import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { assertCheckedProof, fingerprintComposition } from '../videos/contractor-previews/narrated-check-proof.mjs'

test('checked rendering rejects changes to every composition dependency', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'narrated-check-proof-'))
  try {
    const folder = join(directory, 'film')
    await mkdir(join(folder, 'clips'), { recursive: true })
    const files = {
      'film/index.html': '<script src="gsap.min.js"></script><style>@font-face{src:url("font.ttf")}</style><video src="clips/edit-opening.mp4"></video><audio src="soundtrack.wav"></audio>',
      'film/soundtrack.wav': 'fixture audio',
      'film/clips/edit-opening.mp4': 'fixture video',
      'film/gsap.min.js': 'fixture animation runtime',
      'film/font.ttf': 'fixture font',
      'timeline.json': '{"total":1}',
      'cli.mjs': 'fixture check runtime',
    }
    for (const [file, value] of Object.entries(files)) await writeFile(join(directory, file), value)
    const input = { folder, timelineFile: join(directory, 'timeline.json'), cli: join(directory, 'cli.mjs'), checkOptions: { samples: 8, snapshots: true, heroFrameTimes: '0.65' } }
    const checked = await fingerprintComposition(input)
    const proof = { ...checked, id: 'fixture', status: 'checks_and_snapshots_passed' }
    assert.equal(checked.files.length, 5)
    assert.equal(assertCheckedProof(proof, await fingerprintComposition(input), 'fixture'), proof)
    assert.throws(() => assertCheckedProof(null, checked, 'fixture'), /no valid completed check proof/)
    assert.throws(() => assertCheckedProof(proof, checked, 'another-film'), /no valid completed check proof/)
    for (const file of Object.keys(files)) {
      const path = join(directory, file)
      const original = await readFile(path)
      await writeFile(path, Buffer.concat([original, Buffer.from('\nchanged')]))
      const current = await fingerprintComposition(input)
      assert.throws(() => assertCheckedProof(proof, current, 'fixture'), /changed since the recorded check/, file)
      await writeFile(path, original)
    }
    const changedOptions = await fingerprintComposition({ ...input, checkOptions: { ...input.checkOptions, samples: 9 } })
    assert.throws(() => assertCheckedProof(proof, changedOptions, 'fixture'), /changed since the recorded check/)
    await writeFile(join(folder, 'index.html'), '<video src="https://example.test/video.mp4"></video>')
    await assert.rejects(fingerprintComposition(input), /Cannot certify an external composition asset/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
