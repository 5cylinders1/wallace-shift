/** Build review-required alignment drafts from actual ASR word timestamps.
 * node narrated-align-asr.mjs <id> --asr report.json --audio original.mp3 [--config review.json]
 * No synthesis, downloads, implicit aliases, or invented timing for missing words.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { narratedPilot } from './narrated-pilot.mjs'

const production = dirname(fileURLToPath(import.meta.url))
const root = resolve(production, '../..')
const [id, ...args] = process.argv.slice(2)
const options = {}
for (let i = 0; i < args.length; i += 2) {
  assert(['--asr', '--audio', '--config', '--output-dir'].includes(args[i]) && args[i + 1], `Invalid option: ${args[i]}`)
  options[args[i].slice(2)] = args[i + 1]
}
assert(id && options.asr && options.audio, 'Usage: narrated-align-asr.mjs <id> --asr report.json --audio original.mp3 [--config review.json]')
let scenario = narratedPilot
if (id !== scenario.id) {
  const module = await import(pathToFileURL(resolve(process.env.NARRATION_SCENARIOS || join(production, 'narrated-scenarios.mjs'))).href)
  scenario = module.narratedScenarios.find(item => item.id === id)
}
assert(scenario, `Unknown film: ${id}`)
const output = resolve(options['output-dir'] || join(root, 'output/narrated-previews', id))
const outputRelative = relative(join(root, 'output'), output)
assert(!outputRelative.startsWith('..') && !isAbsolute(outputRelative), 'Draft output must stay inside repository output/.')
const audioFile = resolve(options.audio)
const asrFile = resolve(options.asr)
assert(existsSync(audioFile), 'Original local audio file is required.')
const configFile = options.config ? resolve(options.config) : null
const config = configFile ? JSON.parse(await readFile(configFile, 'utf8')) : {}
const configRoot = configFile ? dirname(configFile) : process.cwd()
const asr = JSON.parse(await readFile(asrFile, 'utf8'))
const audioHash = createHash('sha256').update(await readFile(audioFile)).digest('hex')
assert(!asr.inputSha256 || asr.inputSha256 === audioHash, 'ASR report belongs to a different audio take.')
const probe = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_format', '-of', 'json', audioFile], { encoding: 'utf8' }))
const duration = Number(probe.format.duration)
const tokenize = text => [...text.toLowerCase().replaceAll('’', "'").matchAll(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)].map(match => match[0])
function wordsFrom(report, source, offset = 0) {
  return report.segments.flatMap(segment => (segment.words || []).flatMap(word => tokenize(word.text || word.word).map(token => ({
    token, text: word.text || word.word, start: word.start + offset, end: word.end + offset, probability: word.probability, source, sourceOffset: offset,
  }))))
}
let rawWords = wordsFrom(asr, asrFile)
assert(rawWords.length, 'ASR report has no actual word timestamps.')
const cropEvidence = []
for (const crop of config.crops || []) {
  assert(Number.isFinite(crop.offset) && crop.offset >= 0, 'Each crop needs its actual original-audio offset.')
  const file = resolve(configRoot, crop.file)
  const report = JSON.parse(await readFile(file, 'utf8'))
  const start = crop.replaceStart ?? crop.offset
  const end = crop.replaceEnd ?? crop.offset + report.durationSeconds
  assert(start >= crop.offset && end <= crop.offset + report.durationSeconds + 0.03 && end <= duration + 0.03 && end > start, 'Invalid crop replacement range.')
  const excluded = rawWords.filter(word => word.end >= start && word.start < end)
  const added = wordsFrom(report, file, crop.offset).filter(word => word.end >= start && word.start < end)
  rawWords = rawWords.filter(word => !(word.end >= start && word.start < end)).concat(added)
  cropEvidence.push({ file, offset: crop.offset, replaceStart: start, replaceEnd: end, removedWords: excluded.map(word => word.text), addedWords: added.map(word => word.text), review: crop.review || 'Crop/source correspondence requires review.' })
}
rawWords.sort((a, b) => a.start - b.start || a.end - b.end)

// Only explicit, reviewed proper-name aliases are eligible. Their word groups
// retain the real observed span; no internal timing is interpolated.
const names = [scenario.name, 'Wallace Shift', ...(config.properNames || [])].map(tokenize)
const aliases = (config.reviewedAliases || []).map(alias => {
  assert(alias.kind === 'proper-name' && alias.reviewedBy?.trim() && alias.evidence?.trim(), 'Aliases require proper-name kind, reviewer, and evidence.')
  const expected = tokenize(alias.expected), recognized = tokenize(alias.recognized)
  assert(expected.length && recognized.length, 'Alias text must contain words.')
  assert(names.some(name => name.some((_, i) => expected.every((token, j) => name[i + j] === token))), `Alias expected text is not a declared proper name: ${alias.expected}`)
  return { ...alias, expectedTokens: expected, recognizedTokens: recognized }
}).sort((a, b) => b.recognizedTokens.length - a.recognizedTokens.length)
const aliasUses = []
const observed = []
for (let index = 0; index < rawWords.length;) {
  const alias = aliases.find(item => item.recognizedTokens.every((token, offset) => rawWords[index + offset]?.token === token))
  if (!alias) { observed.push(rawWords[index++]); continue }
  const group = rawWords.slice(index, index + alias.recognizedTokens.length)
  const use = { expected: alias.expected, recognized: group.map(word => word.text.trim()).join(' '), start: group[0].start, end: group.at(-1).end, reviewedBy: alias.reviewedBy, evidence: alias.evidence, observedWords: group }
  aliasUses.push(use)
  observed.push(...alias.expectedTokens.map(token => ({ token, text: alias.expected, start: use.start, end: use.end, source: group[0].source, alias: use })))
  index += group.length
}
const splitter = new Intl.Segmenter('en-US', { granularity: 'sentence' })
const references = []
const scenePhrases = scenario.scenes.map((scene, sceneIndex) => {
  const phrases = scene.phrases || [...splitter.segment(scene.spoken)].map(part => part.segment.trim())
  assert(phrases.join(' ').replace(/\s+/g, ' ').trim() === scene.spoken.replace(/\s+/g, ' ').trim(), `${scene.id}: phrase/script mismatch.`)
  return phrases.map((text, phraseIndex) => {
    const from = references.length
    references.push(...tokenize(text).map(token => ({ token, sceneIndex, phraseIndex })))
    return { text, from, to: references.length }
  })
})
const matrix = Array.from({ length: references.length + 1 }, () => new Uint16Array(observed.length + 1))
for (let i = 0; i <= references.length; i++) matrix[i][0] = i
for (let j = 0; j <= observed.length; j++) matrix[0][j] = j
for (let i = 1; i <= references.length; i++) for (let j = 1; j <= observed.length; j++) {
  matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (references[i - 1].token === observed[j - 1].token ? 0 : 1))
}
const matched = new Map(), differences = []
let i = references.length, j = observed.length
while (i || j) {
  if (i && j && references[i - 1].token === observed[j - 1].token && matrix[i][j] === matrix[i - 1][j - 1]) {
    matched.set(i - 1, observed[j - 1]); i--; j--
  } else if (i && j && matrix[i][j] === matrix[i - 1][j - 1] + 1) {
    differences.push({ operation: 'substitution', referenceIndex: i - 1, expected: references[i - 1].token, observed: observed[j - 1] }); i--; j--
  } else if (i && matrix[i][j] === matrix[i - 1][j] + 1) {
    differences.push({ operation: 'missing-script-word', referenceIndex: i - 1, expected: references[i - 1].token }); i--
  } else {
    differences.push({ operation: 'extra-recognized-word', observed: observed[j - 1] }); j--
  }
}
differences.reverse()
const invalidTimes = observed.filter(word => !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 || word.end <= word.start || word.end > duration + 0.03)
const issues = []
if (differences.length) issues.push('Unresolved transcript differences; do not invent timestamps or silently discard words. Review source/crop recognition.')
if (invalidTimes.length) issues.push('ASR contains invalid or zero-length word spans. Obtain a better independent crop alignment.')

const detection = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-nostats', '-i', audioFile, '-vn', '-af', 'silencedetect=noise=-38dB:d=0.14', '-f', 'null', '-'], { encoding: 'utf8' })
assert.equal(detection.status, 0, detection.error?.message || detection.stderr)
const silences = []
let silenceStart = 0
for (const event of detection.stderr.matchAll(/silence_(start|end):\s*([\d.]+)/g)) {
  if (event[1] === 'start') silenceStart = Number(event[2])
  else silences.push({ start: silenceStart, end: Number(event[2]) })
}
const phrases = scenePhrases.map(items => items.map(phrase => {
  const words = Array.from({ length: phrase.to - phrase.from }, (_, k) => matched.get(phrase.from + k))
  const complete = words.every(word => word && word.end > word.start)
  return { text: phrase.text, start: complete ? words[0].start : null, end: complete ? words.at(-1).end : null, words: words.filter(Boolean) }
}))
const boundaries = [{ time: 0, method: 'Original source start' }]
for (let sceneIndex = 1; sceneIndex < scenario.scenes.length; sceneIndex++) {
  const left = phrases[sceneIndex - 1].at(-1).end, right = phrases[sceneIndex][0].start
  if (left === null || right === null || right < left) {
    boundaries.push({ time: null, method: 'Unresolved words; no boundary invented' })
    issues.push(`${scenario.scenes[sceneIndex].id}: unresolved scene boundary.`)
    continue
  }
  const candidates = silences.map(gap => ({ start: Math.max(gap.start, left), end: Math.min(gap.end, right) })).filter(gap => gap.end > gap.start).sort((a, b) => (b.end - b.start) - (a.end - a.start))
  const gap = candidates[0]
  boundaries.push({ time: gap ? (gap.start + gap.end) / 2 : (left + right) / 2, method: gap ? 'Midpoint of measured silence between recognized words' : 'ASR interword midpoint; no measured silence matched; review cut carefully', gap: gap || null })
}
boundaries.push({ time: duration, method: 'Measured original source end' })
const provider = config.provider || { name: 'Higgsfield', route: 'browser', model: null, voice: null, generationId: null }
if (!provider.model || !provider.voice) issues.push('Actual model/voice provenance must be supplied before importing.')
const method = 'Draft: exact token sequence alignment to independent ASR word timestamps, with explicit reviewed proper-name aliases only. Complete sentences use matched observed word spans; scene cuts prefer measured silence. No timing is invented for missing/substituted words.'
const draft = {
  id, sourceFile: audioFile, sourceSha256: audioHash, timeBase: 'source-seconds', provider,
  alignmentReview: { status: 'draft_root_review_required; subjective listening and caption review pending', method, noListeningClaim: true, asrReport: asrFile, cropEvidence, aliasUses, issues },
  scenes: scenario.scenes.map((scene, index) => ({ id: scene.id, start: boundaries[index].time, end: boundaries[index + 1].time, phrases: phrases[index].map(({ text, start, end }) => ({ text, start, end })) })),
}
const report = {
  id, sourceFile: audioFile, sourceSha256: audioHash, duration, status: 'draft_only', structurallyImportable: issues.length === 0,
  referenceWords: references.length, observedWordsAfterReviewedAliases: observed.length, editDistance: matrix.at(-1).at(-1),
  differences, invalidTimes, issues, cropEvidence, aliasUses, boundaries, phraseEvidence: phrases,
  limitation: 'ASR agreement does not establish correct pronunciation, natural delivery, or human comprehension. Root must review this draft before accepting it.',
}
await mkdir(output, { recursive: true })
await writeFile(join(output, 'source-alignment.draft.json'), `${JSON.stringify(draft, null, 2)}\n`)
await writeFile(join(output, 'alignment-report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ id, status: report.status, structurallyImportable: report.structurallyImportable, differences: differences.length, invalidTimes: invalidTimes.length, issues, draft: join(output, 'source-alignment.draft.json'), report: join(output, 'alignment-report.json') }, null, 2))
if (issues.length) process.exitCode = 1
