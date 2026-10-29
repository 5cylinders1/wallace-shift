/** Tighten an existing approved narration take without generating new speech.
 * node narrated-pace-audio.mjs <id>
 * PACE_TEMPO=1.08 or 1.10; PACE_HANDLE_SECONDS=.12–.18. Defaults 1.08/.14.
 * Original scene WAVs and imported timing are retained; reruns never stack tempo.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const id = process.argv[2]
assert(id && /^[a-z0-9-]+$/.test(id), 'Supply a valid film ID.')
const directory = join(dirname(fileURLToPath(import.meta.url)), 'narrated/audio', id)
const ffmpeg = process.env.FFMPEG || 'ffmpeg', ffprobe = process.env.FFPROBE || 'ffprobe'
const tempo = Number(process.env.PACE_TEMPO || 1.08)
const handle = Number(process.env.PACE_HANDLE_SECONDS || 0.14)
assert([1.08, 1.10].includes(tempo), 'Use the authorized modest tempo change 1.08 or 1.10.')
assert(handle >= 0.12 && handle <= 0.18, 'Retain 0.12–0.18s boundary handles.')
const hash = data => createHash('sha256').update(data).digest('hex')
const activeText = await readFile(join(directory, 'timing.json'), 'utf8')
const active = JSON.parse(activeText)
const sourceText = active.pacing ? await readFile(join(directory, active.pacing.sourceTimingFile), 'utf8') : activeText
const source = JSON.parse(sourceText)
assert(source.complete && !source.pacing, 'Pace a complete, unpaced imported take.')
const sourceHash = hash(sourceText)
const sourceTimingFile = `unpaced-timing-${sourceHash.slice(0, 16)}.json`
if (!existsSync(join(directory, sourceTimingFile))) await writeFile(join(directory, sourceTimingFile), sourceText, { flag: 'wx' })
assert(hash(await readFile(join(directory, sourceTimingFile))) === sourceHash, 'Original timing snapshot changed.')
const settings = { tempo, handleSeconds: handle, targetSentenceGapSeconds: 0.25, silenceThresholdDb: -42, minimumSilenceSeconds: 0.12, algorithm: 2 }
const runKey = hash(JSON.stringify({ sourceHash, settings })).slice(0, 16)
const relativeOutput = `paced/${runKey}`
const output = join(directory, relativeOutput)
await mkdir(output, { recursive: true })
function probe(file) {
  const data = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }))
  const audio = data.streams.find(stream => stream.codec_type === 'audio')
  return { duration: Number(audio.duration || data.format.duration), sampleRate: Number(audio.sample_rate), channels: audio.channels }
}
function silenceIntervals(file, duration) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=noise=-42dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.error?.message || result.stderr)
  const intervals = []
  let start = null
  for (const match of result.stderr.matchAll(/silence_(start|end):\s*([\d.]+)/g)) {
    if (match[1] === 'start') start = Number(match[2])
    else { intervals.push({ start: start ?? 0, end: Number(match[2]) }); start = null }
  }
  if (start !== null) intervals.push({ start, end: duration })
  return intervals
}
const quoted = file => `'${file.replaceAll("'", "'\\''")}'`
async function concat(files, file, listFile) {
  await writeFile(listFile, `${files.map(path => `file ${quoted(path)}`).join('\n')}\n`)
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c:a', 'pcm_s16le', '-ar', '48000', file], { stdio: 'inherit' })
}
const report = { id, sourceTimingFile, sourceTimingSha256: sourceHash, settings, feedback: 'User watched Velar: keep this voice and tighten pacing; it felt slow.', subjectiveListening: 'Not claimed by this transformation helper.', originalFiles: [], scenes: [], warnings: [] }
const paced = { ...source, generatedAt: new Date().toISOString(), scenes: [], pacing: { ...settings, sourceTimingFile, sourceTimingSha256: sourceHash, report: `${relativeOutput}/pacing-report.json` } }
for (const scene of source.scenes) {
  const original = join(directory, scene.file)
  const originalHash = hash(await readFile(original))
  report.originalFiles.push({ file: scene.file, sha256: originalHash })
  const measuredSource = probe(original)
  const silences = silenceIntervals(original, measuredSource.duration)
  const extracted = [], phrases = [], edits = [], segments = []
  const planned = scene.phrases.map((phrase, index) => {
    const previous = scene.phrases[index - 1]
    assert(Number.isFinite(phrase.start) && Number.isFinite(phrase.end) && phrase.start >= 0 && phrase.end > phrase.start && phrase.end <= measuredSource.duration + 0.03 && (!previous || phrase.start >= previous.end), `${scene.id}: invalid source caption timing.`)
    const nextStart = scene.phrases[index + 1]?.start ?? measuredSource.duration
    // ASR can include silence in its first word or end before a final consonant.
    const leading = silences.find(gap => gap.start <= phrase.start + 0.02 && gap.end >= phrase.start && gap.end <= phrase.start + 1.2)
    const trailing = silences.find(gap => gap.end >= phrase.end && gap.start <= phrase.end + 0.75 && gap.start >= phrase.end - 0.25)
    const speechStart = leading ? leading.end : phrase.start
    const speechEnd = trailing ? trailing.start : phrase.end
    let trimStart = Math.max(0, speechStart - handle)
    let trimEnd = Math.min(measuredSource.duration, speechEnd + handle)
    if (!leading) {
      trimStart = Math.max(0, Math.min(trimStart, phrase.start - handle))
      if (index === 0 && phrase.start < 0.35) trimStart = 0
    }
    if (!trailing) {
      trimEnd = index === scene.phrases.length - 1 ? measuredSource.duration : Math.max(trimEnd, (phrase.end + nextStart) / 2)
      report.warnings.push(`${scene.id}/${index + 1}: no trailing silence matched; retained extra source conservatively.`)
    }
    assert(trimStart >= 0 && trimEnd <= measuredSource.duration + 0.001 && trimEnd > trimStart, `${scene.id}: invalid retained sentence range.`)
    return { phrase, index, trimStart, trimEnd, speechStart, speechEnd, leading, trailing }
  })
  // A handle may cross the next sentence's ASR boundary. Union retained ranges
  // and process the continuous source only once; never cut or duplicate speech.
  // A gap may be removed only when it is wholly inside measured source silence.
  const groups = []
  for (const item of planned) {
    const previous = groups.at(-1)
    const gapIsSilence = previous && silences.some(gap => gap.start <= previous.trimEnd + 1 / 48000 && gap.end >= item.trimStart - 1 / 48000)
    if (previous && (item.trimStart <= previous.trimEnd + 1 / 48000 || !gapIsSilence)) {
      previous.trimStart = Math.min(previous.trimStart, item.trimStart)
      previous.trimEnd = Math.max(previous.trimEnd, item.trimEnd)
      previous.items.push(item)
    } else groups.push({ trimStart: item.trimStart, trimEnd: item.trimEnd, items: [item] })
  }
  let cursor = 0, previousSourceEnd = -1
  for (const [groupIndex, group] of groups.entries()) {
    assert(group.trimStart > previousSourceEnd, `${scene.id}: source audio would be duplicated.`)
    previousSourceEnd = group.trimEnd
    const file = join(output, `${scene.id}-segment-${groupIndex + 1}.wav`)
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', original, '-af', `atrim=start=${group.trimStart}:end=${group.trimEnd},asetpts=PTS-STARTPTS,atempo=${tempo}`, '-ar', '48000', '-c:a', 'pcm_s16le', file], { stdio: 'inherit' })
    const measured = probe(file)
    const scale = measured.duration / (group.trimEnd - group.trimStart)
    const merged = group.items.length > 1
    for (const [groupPhraseIndex, item] of group.items.entries()) {
      const { phrase, index, speechStart, speechEnd } = item
      // Inside merged audio, preserve the accepted, non-overlapping ASR caption
      // boundaries. Only the outside edges use the measured silence refinement.
      const captionSourceStart = merged && groupPhraseIndex > 0 ? phrase.start : speechStart
      const captionSourceEnd = merged && groupPhraseIndex < group.items.length - 1 ? phrase.end : speechEnd
      const captionStart = cursor + Math.max(0, captionSourceStart - group.trimStart) * scale
      const captionEnd = cursor + Math.min(measured.duration, Math.max(0, captionSourceEnd - group.trimStart) * scale)
      assert(captionEnd > captionStart && (!phrases.length || captionStart >= phrases.at(-1).end - 1 / 48000), `${scene.id}: invalid merged caption span.`)
      const mapping = { sourceSceneFile: scene.file, segment: groupIndex + 1, mergedSentenceCount: group.items.length, trimStart: group.trimStart, trimEnd: group.trimEnd, observedSpeechStart: speechStart, observedSpeechEnd: speechEnd, captionSourceStart, captionSourceEnd, outputStart: cursor, outputDuration: measured.duration, measuredScale: scale, tempo }
      phrases.push({ ...phrase, start: captionStart, end: captionEnd, originalSceneStart: phrase.start, originalSceneEnd: phrase.end, paceMapping: mapping })
      edits.push({ text: phrase.text, phrase: index + 1, desiredTrimStart: item.trimStart, desiredTrimEnd: item.trimEnd, originalCaptionStart: phrase.start, originalCaptionEnd: phrase.end, leadingSilence: item.leading || null, trailingSilence: item.trailing || null, ...mapping })
    }
    segments.push({ sourceStart: group.trimStart, sourceEnd: group.trimEnd, phrases: group.items.map(item => item.index + 1), outputStart: cursor, outputDuration: measured.duration, measuredScale: scale, tempo })
    extracted.push(file)
    cursor += measured.duration
  }
  const file = `${relativeOutput}/${scene.id}.wav`
  await concat(extracted, join(directory, file), join(output, `${scene.id}.concat.txt`))
  const measured = probe(join(directory, file))
  assert(Math.abs(measured.duration - cursor) < 0.001, 'Measured scene/phrase timing differs.')
  assert(hash(await readFile(original)) === originalHash, 'Original imported scene WAV was modified.')
  paced.scenes.push({ ...scene, file, duration: measured.duration, sampleRate: measured.sampleRate, channels: measured.channels, phrases })
  report.scenes.push({ id: scene.id, originalDuration: measuredSource.duration, pacedDuration: measured.duration, edits, segments })
  console.log(`${id}/${scene.id}: ${measuredSource.duration.toFixed(3)} → ${measured.duration.toFixed(3)} seconds`)
}
paced.duration = paced.scenes.reduce((total, scene) => total + scene.duration, 0)
paced.timingMethod = `${source.alignmentReview?.method || source.timingMethod} Sentence boundaries refined against measured source silence; overlapping retained ranges are merged and processed once. Accepted interior caption spans are remapped within merged segments. No spoken text removed.`
paced.processing = `Existing Higgsfield take, pitch-preserving atempo=${tempo}. Sentence-adjacent silence trimmed with ${handle}s handles; original scene WAVs, imported timing and source hashes retained. No speech generation. Natural within-sentence pauses and continuous audio at overlapping sentence boundaries are preserved.`
paced.alignmentReview = { ...source.alignmentReview, pacingReview: 'Transformation follows user feedback; subjective listening is not claimed. Independent paced-audio ASR and final playback review remain separate checks.' }
await concat(paced.scenes.map(scene => join(directory, scene.file)), join(output, 'narration-review.wav'), join(output, 'narration-review.concat.txt'))
report.originalDuration = source.duration
report.pacedDuration = paced.duration
report.reviewAudio = `${relativeOutput}/narration-review.wav`
report.spokenTextUnchanged = paced.exactSpokenText === source.exactSpokenText && paced.scenes.every((scene, index) => scene.phrases.map(phrase => phrase.text).join(' ') === source.scenes[index].phrases.map(phrase => phrase.text).join(' '))
assert(report.spokenTextUnchanged, 'Spoken text was changed during pacing.')
await writeFile(join(output, 'pacing-report.json'), `${JSON.stringify(report, null, 2)}\n`)
await writeFile(join(output, 'timing.json'), `${JSON.stringify(paced, null, 2)}\n`)
await writeFile(join(directory, 'timing.json'), `${JSON.stringify(paced, null, 2)}\n`)
console.log(JSON.stringify({ id, tempo, originalSeconds: source.duration, pacedSeconds: paced.duration, timing: join(directory, 'timing.json'), reviewAudio: join(output, 'narration-review.wav'), warnings: report.warnings }, null, 2))
