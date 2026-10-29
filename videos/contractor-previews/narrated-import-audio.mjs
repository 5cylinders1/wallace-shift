/** Import browser-generated Higgsfield narration. No synthesis or network access.
 * --template velar          prints a blank source-time alignment manifest
 * --inspect /path/audio    prints duration and candidate silent intervals only
 * alignment.json           retains source audio and writes measured scene WAVs
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { constants, existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { narratedPilot } from './narrated-pilot.mjs'

const production = dirname(fileURLToPath(import.meta.url))
const [command, parameter] = process.argv.slice(2)
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const ffprobe = process.env.FFPROBE || 'ffprobe'
function localPath(value, base = process.cwd()) {
  assert(typeof value === 'string' && value.trim() && !/^[a-z][a-z\d+.-]*:\/\//i.test(value), 'Supply a local audio file, not a remote URL.')
  const file = isAbsolute(value) ? value : resolve(base, value)
  assert(existsSync(file), `Missing local audio file: ${file}`)
  return file
}
function probe(file) {
  const result = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }))
  const audio = result.streams.find(stream => stream.codec_type === 'audio')
  assert(audio, `No audio stream: ${file}`)
  return { duration: Number(audio.duration || result.format.duration), sampleRate: Number(audio.sample_rate), channels: audio.channels, codec: audio.codec_name }
}
const normalize = value => value.replace(/\s+/g, ' ').trim()
async function scenarioFor(id) {
  if (id === narratedPilot.id) return narratedPilot
  const source = process.env.NARRATION_SCENARIOS || join(production, 'narrated-scenarios.mjs')
  assert(existsSync(source), `Missing scenario module for ${id}`)
  const { narratedScenarios } = await import(pathToFileURL(resolve(source)).href)
  const scenario = narratedScenarios.find(item => item.id === id)
  assert(scenario, `Unknown film: ${id}`)
  return scenario
}
if (command === '--template') {
  const scenario = await scenarioFor(parameter || 'velar')
  const splitter = new Intl.Segmenter('en-US', { granularity: 'sentence' })
  console.log(JSON.stringify({
    id: scenario.id, sourceFile: '/absolute/path/to/exported-narration.wav', timeBase: 'source-seconds',
    provider: { name: 'Higgsfield', route: 'browser', model: 'Record the model actually shown', voice: 'Record the voice actually selected', generationId: null },
    alignmentReview: { status: 'pending', method: 'Listen and verify each sentence against the source; silence candidates are suggestions only.', evidence: null },
    scenes: scenario.scenes.map(scene => ({ id: scene.id, start: null, end: null, phrases: [...splitter.segment(scene.spoken)].map(item => ({ text: item.segment.trim(), start: null, end: null })) })),
  }, null, 2))
  process.exit(0)
}
if (command === '--inspect') {
  const file = localPath(parameter)
  const audio = probe(file)
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'silencedetect=noise=-38dB:d=0.14', '-f', 'null', '-'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.error?.message || result.stderr)
  const events = [...result.stderr.matchAll(/silence_(start|end):\s*([\d.]+)/g)].map(match => ({ type: match[1], time: Number(match[2]) }))
  const intervals = []
  let start = 0
  for (const event of events) {
    if (event.type === 'start') start = event.time
    else intervals.push({ start, end: event.time, suggestedBoundary: (start + event.time) / 2 })
  }
  if (events.at(-1)?.type === 'start') intervals.push({ start, end: audio.duration, suggestedBoundary: (start + audio.duration) / 2 })
  console.log(JSON.stringify({ file, ...audio, method: 'FFmpeg amplitude-only silence detection; no speech recognition or forced alignment.', warning: 'These pauses do not identify sentences. Listen to the source and supply verified text-to-time mapping before importing.', silenceThresholdDb: -38, minimumSilenceSeconds: 0.14, intervals }, null, 2))
  process.exit(0)
}

assert(command, 'Supply an alignment manifest, --template <id>, or --inspect <local-audio-file>.')
const manifestFile = localPath(command)
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'))
assert(manifest.timeBase === 'source-seconds', 'Manifest timestamps must explicitly use source-seconds.')
assert(!manifest.alignmentReview?.issues?.length, 'Resolve the alignment report issues before importing this draft.')
assert(!manifest.alignmentReview?.status?.startsWith('draft_'), 'Review and accept the ASR alignment draft before importing; keep any listening limitations explicit.')
assert(manifest.provider?.name === 'Higgsfield' && manifest.provider.route === 'browser', 'Record the actual Higgsfield browser provider.')
assert(typeof manifest.provider.voice === 'string' && manifest.provider.voice.trim(), 'Record the selected voice, or explicitly state that it was not exposed.')
assert(typeof manifest.provider.model === 'string' && manifest.provider.model.trim(), 'Record the selected model, or explicitly state that it was not exposed.')
const scenario = await scenarioFor(manifest.id)
assert(Array.isArray(manifest.scenes) && manifest.scenes.length === scenario.scenes.length, 'Map every scene exactly once.')
assert(new Set(manifest.scenes.map(scene => scene.id)).size === scenario.scenes.length, 'Duplicate scene IDs in alignment manifest.')
const directory = join(production, 'narrated/audio', scenario.id)
const sourceRecords = new Map()
const prepared = []
for (const scene of scenario.scenes) {
  const aligned = manifest.scenes.find(item => item.id === scene.id)
  assert(aligned, `Missing scene: ${scene.id}`)
  const file = localPath(aligned.sourceFile || manifest.sourceFile, dirname(manifestFile))
  let source = sourceRecords.get(file)
  if (!source) {
    const data = await readFile(file)
    const sha256 = createHash('sha256').update(data).digest('hex')
    const extension = extname(file).toLowerCase()
    assert(/^\.(wav|mp3|m4a|mp4|webm|ogg|flac|aac)$/.test(extension), `Unsupported source extension: ${extension}`)
    source = { file, originalName: basename(file), sha256, retainedFile: `originals/higgsfield-${sha256.slice(0, 16)}${extension}`, ...probe(file) }
    sourceRecords.set(file, source)
  }
  assert(Number.isFinite(aligned.start) && Number.isFinite(aligned.end) && aligned.start >= 0 && aligned.end > aligned.start && aligned.end <= source.duration + 0.03, `${scene.id}: invalid scene source in/out points.`)
  assert(Array.isArray(aligned.phrases) && aligned.phrases.length, `${scene.id}: sentence timing is required.`)
  assert(normalize(aligned.phrases.map(phrase => phrase.text).join(' ')) === normalize(scene.spoken), `${scene.id}: aligned transcript differs from the scripted spoken text. Correct the script or the take before importing.`)
  for (let index = 0; index < aligned.phrases.length; index++) {
    const phrase = aligned.phrases[index]
    assert(Number.isFinite(phrase.start) && Number.isFinite(phrase.end) && phrase.start >= aligned.start && phrase.end > phrase.start && phrase.end <= aligned.end && (!index || phrase.start >= aligned.phrases[index - 1].end), `${scene.id}: invalid or overlapping sentence source timestamps.`)
  }
  prepared.push({ scene, aligned, source })
}

await mkdir(join(directory, 'originals'), { recursive: true })
for (const source of sourceRecords.values()) {
  await copyFile(source.file, join(directory, source.retainedFile), constants.COPYFILE_EXCL).catch(error => { if (error.code !== 'EEXIST') throw error })
  const retainedHash = createHash('sha256').update(await readFile(join(directory, source.retainedFile))).digest('hex')
  assert.equal(retainedHash, source.sha256, 'Retained source hash mismatch.')
}
const timing = {
  id: scenario.id, complete: false, generatedAt: new Date().toISOString(), provider: manifest.provider,
  exactSpokenText: scenario.scenes.map(scene => scene.spoken).join('\n\n'),
  timingMethod: `${manifest.alignmentReview?.method || 'Supplied source-time sentence/scene boundaries.'} Source originals retained unchanged; scene clips decoded to PCM with FFmpeg and measured using ffprobe.`,
  alignmentReview: manifest.alignmentReview || { status: 'pending' },
  processing: 'Cuts only at supplied in/out points; original pitch, speed, volume and pauses preserved. No normalization or synthetic gaps.',
  sources: [...sourceRecords.values()].map(({ file: _file, ...source }) => source),
  scenes: [],
}
for (const { scene, aligned, source } of prepared) {
  const file = `${scene.id}.wav`
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(directory, source.retainedFile), '-vn', '-af', `asetpts=PTS-STARTPTS,atrim=start=${aligned.start}:end=${aligned.end},asetpts=PTS-STARTPTS`, '-c:a', 'pcm_s16le', join(directory, file)], { stdio: 'inherit' })
  const measured = probe(join(directory, file))
  assert(Math.abs(measured.duration - (aligned.end - aligned.start)) < 0.06, `${scene.id}: decoded duration differs from supplied source in/out points.`)
  timing.scenes.push({
    id: scene.id, file, spoken: scene.spoken, duration: measured.duration, sampleRate: measured.sampleRate, channels: measured.channels,
    sourceFile: source.retainedFile, sourceStart: aligned.start, sourceEnd: aligned.end,
    phrases: aligned.phrases.map(phrase => ({ text: phrase.text, start: phrase.start - aligned.start, end: Math.min(phrase.end - aligned.start, measured.duration), sourceStart: phrase.start, sourceEnd: phrase.end, sourceFile: source.retainedFile })),
  })
  console.log(`${scenario.id}/${scene.id}: ${measured.duration.toFixed(3)} seconds, ${aligned.phrases.length} supplied sentence cues`)
}
timing.complete = true
timing.duration = timing.scenes.reduce((total, scene) => total + scene.duration, 0)
await writeFile(join(directory, 'source-alignment.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(join(directory, 'narration.txt'), `${timing.exactSpokenText}\n`)
await writeFile(join(directory, 'timing.json'), `${JSON.stringify(timing, null, 2)}\n`)
console.log(JSON.stringify({ id: scenario.id, complete: timing.complete, duration: timing.duration, scenes: timing.scenes.length, alignmentReview: timing.alignmentReview, timing: join(directory, 'timing.json') }, null, 2))
