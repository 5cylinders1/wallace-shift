/** Package the existing production without installing, rendering, or uploading.
 * --plan prints the explicit allowlist inventory. --archive verifies all eleven
 * deliveries, hashes retained files, then writes a new local tar.gz handoff.
 * Do not run --archive while capture, composition, rendering, or QA is active.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, lstat, readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join, relative } from 'node:path'
import { root } from './runtime.mjs'
import { contractorPreviewIds as ids } from '../../scripts/contractor-preview-contract.mjs'

const mode = process.argv[2] || '--plan'
assert(['--plan', '--archive'].includes(mode) && process.argv.length <= 3, 'Use --plan or --archive only.')
const production = 'videos/contractor-previews'
const idSet = new Set(ids)
const forbiddenSegment = /^(?:\.env(?:\..*)?|\.demo-preview\.local|\.git|\.vercel|\.aws|node_modules|__pycache__|audio-qa-deps|audio-qa-models|(?:storage[-_]?state|auth[-_]?state|browser[-_]?state|cookies?|credentials?|secrets?)(?:[._-].*)?|.*\.(?:pem|key|p12|pfx))$/i
const forbiddenName = /(?:client_secret|credentials|cookie-jar|browser-state|access-token|refresh-token)/i
const chosen = []
function allowed(path) {
  const parts = path.split('/')
  if (parts.some(part => forbiddenSegment.test(part) || forbiddenName.test(part))) return false
  if (['package.json', 'package-lock.json', '.gitignore'].includes(path)) return true
  if (path.startsWith('docs/demos/') && path.endsWith('.md')) return true
  if (path.startsWith('src/demos/') && /\.(?:tsx?|css|json|svg)$/.test(path)) return true
  if (/^scripts\/(?:test-(?:contractor|narrated)[\w-]*|contractor-preview-contract)\.mjs$/.test(path)) return true
  if (path.startsWith('public/media/demo-previews/')) {
    const match = parts.at(-1).match(/^(.+)\.(mp4|jpg|vtt)$/)
    return parts.length === 4 && Boolean(match && idSet.has(match[1]))
  }
  if (path.startsWith('output/contractor-previews/')) return /\.(?:json|png|txt|log)$/.test(path)
  if (path.startsWith('output/live-narrated-previews/')) return /\.(?:json|png|jpe?g|txt|log)$/.test(path) && !parts.some(part => part.startsWith('.'))
  if (path.startsWith('output/narrated-previews/')) {
    if (['encoded-visual-review.json', 'mobile-controls-report.json', 'release-build.log', 'release-validation.json'].includes(parts[2]) && parts.length === 3) return true
    if (parts[2] === 'encoded-visual-review') return /\.(?:json|png|jpe?g|txt|log)$/.test(path) && !parts.some(part => part.startsWith('.'))
    if (['player-revision', 'final-framing'].includes(parts[2])) return idSet.has(parts[3]) && /\.(?:json|png|jpe?g|txt|log)$/.test(path) && !parts.some(part => part.startsWith('.'))
    if (parts[2] === 'legacy-baseline') return /\.(?:mp4|jpg|vtt)$/.test(path)
    if (!idSet.has(parts[2])) return false
    // Keep recognition crops and review evidence, not duplicate masters or
    // entire browser recordings. Downloaded models live outside this tree.
    return /\.(?:json|txt|log|png|jpe?g|wav|mp3)$/.test(path) && !parts.some(part => part.startsWith('.'))
  }
  if (!path.startsWith(`${production}/`)) return false
  const tail = path.slice(production.length + 1).split('/')
  if (tail.length === 1) return /\.(?:mjs|py|md)$/.test(path) || ['package.json', 'package-lock.json'].includes(tail[0])
  if (tail[0] === 'fonts') return /\.(?:ttf|woff2?|md|txt)$/.test(path)
  if (tail[0] === 'narrated') {
    if (tail.length === 2) return tail[1] === 'AUDIO.md'
    if (tail[1] === 'music') return ['LICENSE.md', 'A-kind-of-hope.mp3'].includes(tail.at(-1))
    // Include PCM edits in the archive, while keeping them out of Git.
    return tail[1] === 'audio' && idSet.has(tail[2]) && /\.(?:json|txt|mp3|wav)$/.test(path)
  }
  if (!idSet.has(tail[0])) return false
  if (tail.length === 2) return ['index.html', 'soundtrack.wav', 'gsap.min.js'].includes(tail[1]) || /\.ttf$/.test(path)
  return tail[1] === 'clips' && tail.length === 3 && /^(?:narrated|edit)-[a-z0-9-]+\.mp4$/.test(tail[2])
}
async function walk(path) {
  let entries
  try { entries = await readdir(join(root, path), { withFileTypes: true }) }
  catch (error) { if (error.code === 'ENOENT') return; throw error }
  for (const entry of entries) {
    if (forbiddenSegment.test(entry.name) || forbiddenName.test(entry.name)) continue
    const name = `${path}/${entry.name}`
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue
      await walk(name)
    } else if (allowed(name)) {
      assert(!entry.isSymbolicLink(), `Refusing symlink: ${name}`)
      const info = await lstat(join(root, name))
      assert(info.isFile(), `Not a regular file: ${name}`)
      chosen.push({ path: name, bytes: info.size, mtimeMs: info.mtimeMs })
    }
  }
}
for (const path of ['docs/demos', 'src/demos', 'scripts', production, 'public/media/demo-previews', 'output/contractor-previews', 'output/narrated-previews', 'output/live-narrated-previews']) await walk(path)
for (const path of ['package.json', 'package-lock.json', '.gitignore']) {
  const info = await lstat(join(root, path))
  assert(info.isFile() && !info.isSymbolicLink(), `Not a regular file: ${path}`)
  chosen.push({ path, bytes: info.size, mtimeMs: info.mtimeMs })
}
chosen.sort((a, b) => a.path.localeCompare(b.path))
assert(new Set(chosen.map(file => file.path)).size === chosen.length, 'Duplicate archive paths')
assert(chosen.every(file => !file.path.includes('\n') && !file.path.includes('\0') && !file.path.startsWith('/') && !file.path.split('/').includes('..')), 'Unsafe archive path')
const summary = {
  mode, files: chosen.length, bytes: chosen.reduce((total, file) => total + file.bytes, 0), ids,
  excluded: ['All environment/credential files including .demo-preview.local', 'Browser authentication/storage state', 'Git internals', 'ASR dependencies and downloaded models', 'node_modules', 'Raw full-page browser recordings', 'Duplicate rendered masters and HyperFrames caches'],
  recommendedGitignore: ['/videos/contractor-previews/narrated/audio/**/*.wav', '/videos/contractor-previews/__pycache__/'],
}
if (mode === '--plan') {
  // Large inventories exceed the pipe buffer. Finish writing before exiting,
  // otherwise a redirected --plan JSON can be silently truncated.
  await new Promise((resolve, reject) => process.stdout.write(`${JSON.stringify({ ...summary, inventory: chosen.map(({ path, bytes }) => ({ path, bytes })) }, null, 2)}\n`, error => error ? reject(error) : resolve()))
  process.exit(0)
}

const delivery = []
for (const id of ids) {
  const timelinePath = `output/narrated-previews/${id}/edit-timeline.json`
  const timeline = JSON.parse(await readFile(join(root, timelinePath), 'utf8'))
  const filmPath = `public/media/demo-previews/${id}.mp4`
  const film = await stat(join(root, filmPath))
  const edit = await stat(join(root, timelinePath))
  assert(film.mtimeMs >= edit.mtimeMs, `${id}: final video predates the current composition; finish rendering before packaging.`)
  const probe = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', join(root, filmPath)], { encoding: 'utf8' }))
  assert(probe.streams.some(stream => stream.codec_type === 'audio') && probe.streams.some(stream => stream.codec_type === 'video'), `${id}: audio and video are required.`)
  assert(Math.abs(Number(probe.format.duration) - timeline.total) < 0.25, `${id}: delivered duration differs from current timeline.`)
  for (const required of [`${production}/${id}/index.html`, `${production}/narrated/audio/${id}/timing.json`, `public/media/demo-previews/${id}.jpg`, `public/media/demo-previews/${id}.vtt`, `output/narrated-previews/${id}/checked-composition.json`, `output/narrated-previews/${id}/delivery-probe.json`, `output/narrated-previews/${id}/delivery-loudness.json`]) {
    assert(chosen.some(file => file.path === required), `${id}: missing required handoff file ${required}`)
  }
  delivery.push({ id, durationSeconds: Number(probe.format.duration), currentTimelineSeconds: timeline.total })
}
async function digest(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}
for (const file of chosen) {
  file.sha256 = await digest(join(root, file.path))
  const after = await stat(join(root, file.path))
  assert(after.size === file.bytes && after.mtimeMs === file.mtimeMs, `File changed during packaging: ${file.path}`)
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const destination = join(root, 'output/narrated-handoffs', stamp)
await mkdir(join(root, 'output/narrated-handoffs'), { recursive: true })
await mkdir(destination, { recursive: false })
const manifest = { version: 1, recordedAt: new Date().toISOString(), ...summary, delivery, files: chosen.map(({ mtimeMs: _mtime, ...file }) => file),
  limitations: 'Packaging validates file integrity and current delivery durations, not subjective listening, buyer validation, deployment, or live verification. Read included QA reports for their exact scope. Historical evidence retains original absolute source paths; editable composition assets and active scene audio use archive-relative paths.' }
await writeFile(join(destination, 'HANDOFF.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(join(destination, 'HANDOFF.md'), `# Wallace Shift narrated contractor demos\n\nThis archive retains eleven delivered previews, editable HyperFrames/GSAP compositions, scene recordings, imported and paced narration, scripts, music attribution, and recorded QA evidence. It contains no access grants, environment files, dependency installations, or downloaded ASR models.\n\nExtract into a dedicated folder and preserve its relative paths. The included compositions already have local clips, soundtrack, fonts, and GSAP. The production README explains the capture, compose, check and render tools. Install the pinned dependencies separately and supply local FFmpeg/ffprobe; no package installation runs during extraction.\n\nOriginal source audio and all PCM edits are retained. JSON provenance can reference the original machine's absolute paths; these are historical evidence, not required for playing the included films. Re-importing a take requires relinking its sourceFile to the retained originals. Composing from active timing and clips uses relative paths. Interactive recapture requires the application repository and a separately authorized local access grant, which this archive intentionally excludes.\n\nHANDOFF.json records SHA-256 and byte size for every retained project file. The archive's adjacent sha256 file verifies the archive itself. Inspect included validation reports: packaging is not evidence of human listening, buyer comprehension, deployment or live verification.\n`)
const list = join(destination, 'archive-files.txt')
await writeFile(list, `${chosen.map(file => file.path).join('\0')}\0`)
const archive = join(destination, 'wallace-shift-contractor-narrated-editables.tar.gz')
// Python's standard library gives every member an explicit archive-relative
// name. BSD tar applies the later -C to list entries, unlike GNU tar.
execFileSync(process.env.PYTHON || 'python3', ['-c', `
import json, pathlib, sys, tarfile
root, destination, archive = map(pathlib.Path, sys.argv[1:])
manifest = json.loads((destination / 'HANDOFF.json').read_text())
with tarfile.open(archive, 'w:gz', compresslevel=4) as bundle:
    for item in manifest['files']:
        bundle.add(root / item['path'], arcname=item['path'], recursive=False)
    for name in ['HANDOFF.json', 'HANDOFF.md']:
        bundle.add(destination / name, arcname=name, recursive=False)
`, root, destination, archive], { stdio: 'inherit' })
for (const file of chosen) {
  const after = await stat(join(root, file.path))
  assert(after.size === file.bytes && after.mtimeMs === file.mtimeMs, `File changed while tar ran; do not deliver archive: ${file.path}`)
}
const archiveSha256 = await digest(archive)
await writeFile(`${archive}.sha256`, `${archiveSha256}  wallace-shift-contractor-narrated-editables.tar.gz\n`)
console.log(JSON.stringify({ archive, archiveSha256, bytes: (await stat(archive)).size, manifest: join(destination, 'HANDOFF.json'), relativeArchive: relative(root, archive) }, null, 2))
