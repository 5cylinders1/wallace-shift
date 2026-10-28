/** Checks the encoded public films, not their creative effectiveness.
 *
 *   node scripts/test-contractor-preview-media.mjs
 *   PREVIEW_IDS=velar node scripts/test-contractor-preview-media.mjs
 *
 * Requires FFmpeg/ffprobe on PATH, or FFMPEG and FFPROBE executable paths.
 * Browser acceptance separately compares measured duration to the gallery label.
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, open, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { contractorPreviewIds } from './contractor-preview-contract.mjs'

const ids = process.env.PREVIEW_IDS ? process.env.PREVIEW_IDS.split(',') : contractorPreviewIds
for (const id of ids) assert(contractorPreviewIds.includes(id), `Unknown preview ID: ${id}`)
const mediaRoot = resolve(process.env.PREVIEW_MEDIA_ROOT || 'public/media/demo-previews')
const output = resolve('output/contractor-previews/media-verification.json')
const report = {
  recordedAt: new Date().toISOString(), mediaRoot, testedPreviewIds: ids,
  completeInventoryRun: ids.length === contractorPreviewIds.length,
  scope: 'Encoded stream, timing, caption, loudness and fast-start checks. Does not establish pleasant narration, understandable storytelling, or buyer validation.',
  checks: [], previews: [], errors: [],
}
function check(name, condition, details) {
  report.checks.push({ name, passed: !!condition, ...(details === undefined ? {} : { details }) })
  assert(condition, name)
}
function probe(path) {
  return JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path], { encoding: 'utf8' }))
}
function timestamp(value) {
  return value.split(':').reduce((seconds, part) => seconds * 60 + Number(part), 0)
}
async function boxes(path) {
  const file = await open(path, 'r')
  try {
    const { size } = await file.stat()
    const result = []
    for (let offset = 0; offset + 8 <= size;) {
      const header = Buffer.alloc(16)
      await file.read(header, 0, 16, offset)
      const shortSize = header.readUInt32BE(0)
      const length = shortSize === 1 ? Number(header.readBigUInt64BE(8)) : shortSize || size - offset
      assert(length >= 8 && offset + length <= size, 'Invalid MP4 top-level box')
      result.push({ type: header.toString('ascii', 4, 8), offset, length })
      offset += length
    }
    return result
  } finally { await file.close() }
}

for (const id of ids) {
  try {
    const path = resolve(mediaRoot, `${id}.mp4`)
    const info = probe(path)
    const video = info.streams.filter(stream => stream.codec_type === 'video')
    const audio = info.streams.filter(stream => stream.codec_type === 'audio')
    const durationSeconds = Number(info.format.duration)
    check(`${id}: one H.264 1080p video stream`, video.length === 1 && video[0].codec_name === 'h264' && video[0].width === 1920 && video[0].height === 1080 && video[0].pix_fmt === 'yuv420p')
    check(`${id}: finite positive duration`, Number.isFinite(durationSeconds) && durationSeconds > 0, durationSeconds)
    check(`${id}: one AAC audio stream`, audio.length === 1 && audio[0].codec_name === 'aac')
    check(`${id}: browser-compatible audio`, [1, 2].includes(audio[0].channels) && [44100, 48000].includes(Number(audio[0].sample_rate)))
    check(`${id}: audio spans the film`, Math.abs(Number(audio[0].duration) - durationSeconds) < 0.5, { videoSeconds: durationSeconds, audioSeconds: Number(audio[0].duration) })
    const atoms = await boxes(path)
    check(`${id}: metadata precedes video data for fast start`, atoms.some(atom => atom.type === 'moov') && atoms.findIndex(atom => atom.type === 'moov') < atoms.findIndex(atom => atom.type === 'mdat'))
    const captions = await readFile(resolve(mediaRoot, `${id}.vtt`), 'utf8')
    check(`${id}: WebVTT captions present`, /^WEBVTT\s/.test(captions))
    const cues = [...captions.matchAll(/(\d{2}:\d{2}(?::\d{2})?\.\d{3}) --> (\d{2}:\d{2}(?::\d{2})?\.\d{3})[^\n]*\n([^]*?)(?=\n\s*\n|$)/g)].map(match => ({ start: timestamp(match[1]), end: timestamp(match[2]), text: match[3].trim() }))
    check(`${id}: nonempty caption cues`, cues.length > 0 && cues.every(cue => cue.text.length > 0), cues.length)
    check(`${id}: caption timing fits the film`, cues.every((cue, index) => cue.start >= 0 && cue.end > cue.start && cue.end <= durationSeconds + 0.1 && (!index || cue.start >= cues[index - 1].end - 0.01)))
    const poster = probe(resolve(mediaRoot, `${id}.jpg`)).streams.find(stream => stream.codec_type === 'video')
    check(`${id}: usable JPEG poster`, poster?.codec_name === 'mjpeg' && poster.width >= 800)
    const measurement = spawnSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-nostats', '-i', path, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    assert.equal(measurement.status, 0, `${id}: FFmpeg audio measurement failed: ${measurement.error?.message || measurement.stderr}`)
    const loudnessJson = measurement.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0]
    assert(loudnessJson, `${id}: missing loudness measurement`)
    const levels = JSON.parse(loudnessJson)
    const loudness = { integratedLufs: Number(levels.input_i), truePeakDbtp: Number(levels.input_tp), loudnessRangeLu: Number(levels.input_lra) }
    check(`${id}: non-silent audio at a usable level`, Number.isFinite(loudness.integratedLufs) && loudness.integratedLufs >= -30 && loudness.integratedLufs <= -10, loudness)
    check(`${id}: audio has peak headroom`, Number.isFinite(loudness.truePeakDbtp) && loudness.truePeakDbtp <= -0.1, loudness.truePeakDbtp)
    report.previews.push({ id, durationSeconds, bytes: Number(info.format.size), video: video[0], audio: audio[0], captionCueCount: cues.length, loudness })
  } catch (error) {
    report.errors.push({ id, message: error.message })
  }
}
report.passed = report.errors.length === 0
await mkdir(resolve('output/contractor-previews'), { recursive: true })
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, previews: report.previews.length, completeInventoryRun: report.completeInventoryRun, report: output, errors: report.errors }, null, 2))
if (!report.passed) process.exitCode = 1
