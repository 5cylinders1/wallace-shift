import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

const digest = value => createHash('sha256').update(value).digest('hex')
async function fileDigest(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

/** Hash every local asset referenced by the generated composition, its timeline,
 * and the check runtime. Assets are hashed before and after checks so a mutation
 * while the browser is checking cannot certify a different composition.
 */
export async function fingerprintComposition({ folder, timelineFile, cli, checkOptions }) {
  const directory = resolve(folder)
  const html = await readFile(resolve(directory, 'index.html'), 'utf8')
  const names = new Set(['index.html', 'soundtrack.wav'])
  const references = [
    ...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi),
    ...html.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi),
  ]
  for (const match of references) {
    const reference = match[1]
    if (reference.startsWith('#') || reference.startsWith('data:')) continue
    assert(!/^[a-z][a-z\d+.-]*:|^\/\//i.test(reference), `Cannot certify an external composition asset: ${reference}`)
    const pathname = decodeURIComponent(reference.split(/[?#]/)[0])
    const asset = resolve(directory, pathname)
    const name = relative(directory, asset)
    assert(!isAbsolute(name) && name !== '..' && !name.startsWith('../'), `Composition asset escapes its folder: ${reference}`)
    names.add(name)
  }
  const files = []
  for (const name of [...names].sort()) {
    const path = resolve(directory, name)
    const before = await stat(path)
    assert(before.isFile(), `Composition asset is not a file: ${name}`)
    const sha256 = await fileDigest(path)
    const after = await stat(path)
    assert(before.size === after.size && before.mtimeMs === after.mtimeMs, `Composition asset changed during hashing: ${name}`)
    files.push({ path: name, bytes: after.size, sha256 })
  }
  const runtime = { node: process.version, cliSha256: await fileDigest(cli) }
  const manifest = { version: 1, files, timelineSha256: await fileDigest(timelineFile), runtime, checkOptions }
  return { ...manifest, fingerprint: digest(JSON.stringify(manifest)) }
}

export function assertCheckedProof(proof, current, id) {
  assert(proof?.version === 1 && proof.id === id && proof.status === 'checks_and_snapshots_passed', `${id}: no valid completed check proof; run CHECK_ONLY=1 first.`)
  assert(proof.fingerprint === current.fingerprint, `${id}: composition, assets, timeline or check runtime changed since the recorded check; run CHECK_ONLY=1 again.`)
  return proof
}
