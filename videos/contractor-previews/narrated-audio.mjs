/** Local narration production. No network, installation, or synthesis occurs in --plan mode.
 * See narrated/AUDIO.md before running synthesis: the first HF invocation may download
 * the free Kokoro model. Speech is generated locally, with no paid service/API fallback.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { narratedPilot } from './narrated-pilot.mjs'

const production = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const planOnly = args.includes('--plan')
const assembleOnly = args.includes('--assemble-only')
const requested = args.filter(value => !value.startsWith('--'))
const voice = process.env.NARRATION_VOICE || 'af_heart'
const speed = Number(process.env.NARRATION_SPEED || 1)
const gapSeconds = Number(process.env.NARRATION_GAP_SECONDS || 0.2)
assert(speed === 1, 'Keep narration at its native speed; revise the script rather than time-stretching it.')
assert(gapSeconds >= 0.15 && gapSeconds <= 0.25, 'Intersentence gaps must be between 0.15 and 0.25 seconds.')
const scenarios = [narratedPilot]
const moreScenarios = process.env.NARRATION_SCENARIOS || join(production, 'narrated-scenarios.mjs')
if (existsSync(moreScenarios)) {
  const module = await import(pathToFileURL(resolve(moreScenarios)).href)
  assert(Array.isArray(module.narratedScenarios), 'Scenario module must export narratedScenarios.')
  scenarios.push(...module.narratedScenarios)
}
const selected = requested.length ? scenarios.filter(item => requested.includes(item.id)) : [narratedPilot]
for (const id of requested) assert(selected.some(item => item.id === id), `Unknown narration ID: ${id}`)
assert(new Set(scenarios.map(item => item.id)).size === scenarios.length, 'Narration IDs must be unique.')

const segmenter = new Intl.Segmenter('en-US', { granularity: 'sentence' })
function phrasesFor(scene) {
  assert(typeof scene.spoken === 'string' && scene.spoken.trim(), `${scene.id}: spoken text is required.`)
  // Explicit phrases can resolve abbreviations or pronunciation boundaries without
  // guessing word durations. Every phrase must still form the exact spoken script.
  const phrases = scene.phrases || [...segmenter.segment(scene.spoken)].map(item => item.segment.trim()).filter(Boolean)
  assert(phrases.every(text => typeof text === 'string' && text.trim()), `${scene.id}: empty phrase.`)
  assert(phrases.join(' ').replace(/\s+/g, ' ').trim() === scene.spoken.replace(/\s+/g, ' ').trim(), `${scene.id}: phrase text differs from spoken script.`)
  return phrases
}
const plan = selected.map(item => ({ id: item.id, scenes: item.scenes.map(scene => ({ id: scene.id, spoken: scene.spoken, phrases: phrasesFor(scene) })) }))
if (planOnly) {
  console.log(JSON.stringify({ mode: 'plan only; no files generated', provider: 'HyperFrames local Kokoro', voice, speed, intersentenceGapSeconds: gapSeconds, films: plan }, null, 2))
  process.exit(0)
}

const cli = process.env.HYPERFRAMES_CLI
if (!assembleOnly) {
  assert(process.env.ALLOW_LOCAL_TTS === '1', 'Set ALLOW_LOCAL_TTS=1 only after the local model/download route is authorized. Use --plan to inspect scripts without synthesis.')
  assert(cli && existsSync(cli), 'HYPERFRAMES_CLI must point to an already installed HyperFrames CLI; this helper never installs it.')
}
const provider = {
  name: 'HyperFrames local TTS', engine: 'Kokoro ONNX', model: 'kokoro-v1.0', hyperframesVersion: '0.8.210',
  modelSource: 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
  voicesSource: 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
  upstreamModel: 'https://huggingface.co/hexgrad/Kokoro-82M',
  modelLicense: 'Apache-2.0', voice, language: 'en-us', speed,
  execution: 'Local CPU synthesis; no paid speech service.',
}
if (cli) {
  const packagePath = resolve(dirname(cli), '../package.json')
  if (existsSync(packagePath)) provider.hyperframesVersion = JSON.parse(await readFile(packagePath, 'utf8')).version
}
function probe(path) {
  const info = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' }))
  const audio = info.streams.find(stream => stream.codec_type === 'audio')
  assert(audio && audio.codec_name === 'pcm_s16le', `Expected PCM16 WAV: ${path}`)
  const sampleRate = Number(audio.sample_rate)
  const duration = Number(audio.duration || info.format.duration)
  assert(sampleRate > 0 && duration > 0 && Number.isFinite(duration), `Invalid audio timing: ${path}`)
  const samples = Math.round(duration * sampleRate)
  return { duration: samples / sampleRate, sampleRate, channels: audio.channels, samples }
}
function digest(value) { return createHash('sha256').update(value).digest('hex').slice(0, 16) }
function concatQuote(path) { return `'${path.replaceAll("'", "'\\''")}'` }
async function silence(path, sampleRate, channels, samples) {
  const bytes = samples * channels * 2
  const wav = Buffer.alloc(44 + bytes)
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(channels, 22)
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * channels * 2, 28)
  wav.writeUInt16LE(channels * 2, 32); wav.writeUInt16LE(16, 34)
  wav.write('data', 36); wav.writeUInt32LE(bytes, 40)
  await writeFile(path, wav)
}

for (const item of selected) {
  const directory = join(production, 'narrated/audio', item.id)
  const originals = join(directory, 'originals')
  await mkdir(originals, { recursive: true })
  await writeFile(join(directory, 'narration.txt'), `${item.scenes.map(scene => scene.spoken).join('\n\n')}\n`)
  const timing = {
    id: item.id, complete: false, generatedAt: new Date().toISOString(), provider, exactSpokenText: item.scenes.map(scene => scene.spoken).join('\n\n'),
    timingMethod: 'Each complete sentence is synthesized separately and measured with ffprobe. Phrase times describe retained source WAV boundaries, including natural leading/trailing breath; they are not forced word alignment.',
    intersentenceGapSeconds: gapSeconds, processing: 'Original PCM WAVs are retained unchanged. Scene WAVs concatenate originals with explicit silence only. No pitch, speed, denoising, or loudness processing.',
    listeningReview: { status: 'not performed by this helper', required: 'Listen to every sentence and join, compare exact text and pronunciation, and review the final mix.' },
    scenes: [],
  }
  for (const scene of item.scenes) {
    assert(/^[a-z0-9-]+$/.test(scene.id), `Unsafe scene ID: ${scene.id}`)
    const texts = phrasesFor(scene)
    const phrases = []
    const concatLines = []
    let cursorSamples = 0
    let audioFormat
    for (let index = 0; index < texts.length; index++) {
      const text = texts[index]
      const key = digest(JSON.stringify({ text, provider }))
      const stem = `${scene.id}-${String(index + 1).padStart(2, '0')}-${key}`
      const file = join(originals, `${stem}.wav`)
      const metadata = join(originals, `${stem}.json`)
      if (!existsSync(file)) {
        assert(!assembleOnly, `Missing original sentence WAV: ${file}`)
        const textFile = join(originals, `${stem}.txt`)
        await writeFile(textFile, `${text}\n`, { flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error })
        const pending = join(originals, `${stem}.pending.wav`)
        execFileSync(process.execPath, [cli, 'tts', '--text-file', textFile, '--voice', voice, '--speed', String(speed), '--lang', 'en-us', '--output', pending, '--json'], {
          stdio: 'inherit', env: { ...process.env, DO_NOT_TRACK: '1', ORT_DISABLE_TELEMETRY: '1' },
        })
        const measured = probe(pending)
        await rename(pending, file)
        await writeFile(metadata, `${JSON.stringify({ text, provider, generatedAt: new Date().toISOString(), ...measured, sourceFile: `${stem}.wav` }, null, 2)}\n`)
      }
      assert(existsSync(metadata), `Original WAV is missing its provenance: ${metadata}`)
      const provenance = JSON.parse(await readFile(metadata, 'utf8'))
      assert(provenance.text === text && provenance.provider.voice === voice, 'Existing audio provenance does not match the requested text/voice.')
      const measured = probe(file)
      audioFormat ||= measured
      assert(measured.sampleRate === audioFormat.sampleRate && measured.channels === audioFormat.channels, 'All sentences in a scene must use the same audio format.')
      if (index) {
        const gapSamples = Math.round(gapSeconds * measured.sampleRate)
        const gapFile = join(directory, `gap-${measured.sampleRate}-${measured.channels}-${gapSamples}.wav`)
        if (!existsSync(gapFile)) await silence(gapFile, measured.sampleRate, measured.channels, gapSamples)
        concatLines.push(`file ${concatQuote(gapFile)}`)
        cursorSamples += gapSamples
      }
      const startSample = cursorSamples
      cursorSamples += measured.samples
      phrases.push({ text, start: startSample / measured.sampleRate, end: cursorSamples / measured.sampleRate, startSample, endSample: cursorSamples, sourceFile: `originals/${stem}.wav`, duration: measured.duration })
      concatLines.push(`file ${concatQuote(file)}`)
    }
    const file = `${scene.id}.wav`
    const concatFile = join(directory, `${scene.id}.concat.txt`)
    await writeFile(concatFile, `${concatLines.join('\n')}\n`)
    execFileSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c:a', 'pcm_s16le', join(directory, file)], { stdio: 'inherit' })
    const measured = probe(join(directory, file))
    assert(Math.abs(measured.samples - cursorSamples) <= 1, `${scene.id}: joined audio duration differs from source sentence timing.`)
    timing.scenes.push({ id: scene.id, file, spoken: scene.spoken, duration: measured.duration, sampleRate: measured.sampleRate, channels: measured.channels, phrases })
    await writeFile(join(directory, 'timing.json'), `${JSON.stringify(timing, null, 2)}\n`)
    console.log(`${item.id}/${scene.id}: ${measured.duration.toFixed(3)} seconds, ${phrases.length} measured sentences`)
  }
  timing.complete = true
  timing.duration = timing.scenes.reduce((total, scene) => total + scene.duration, 0)
  await writeFile(join(directory, 'timing.json'), `${JSON.stringify(timing, null, 2)}\n`)
  console.log(`${item.id}: narration timing saved to ${join(directory, 'timing.json')}`)
}
