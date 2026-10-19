import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

// These checks inspect bundled assets and pure lookup behavior only.
// No provider module, environment file or network request is used.
const root = new URL('../', import.meta.url)
async function load(relative) {
  const source = await readFile(new URL(relative, root), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { materials } = await load('src/demos/roofers-4/content.ts')
const { HALCYON_SAMPLE_ID, HALCYON_SAMPLE_PREVIEWS, getPreparedPreview, previewKey } = await load('src/demos/roofers-4/prepared-previews.ts')

function dimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'asset must be a JPEG')
  let offset = 2
  while (offset < bytes.length) {
    assert.equal(bytes[offset++], 0xff, 'expected JPEG marker')
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    const length = bytes.readUInt16BE(offset)
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) }
    }
    offset += length
  }
  throw new Error('JPEG is missing dimensions')
}

test('every catalog material has a distinct first finish JPEG matching the original aspect', async () => {
  assert.equal(materials.length, 5)
  assert.deepEqual(Object.keys(HALCYON_SAMPLE_PREVIEWS).sort(), materials.map(material => material.id).sort())
  const original = await readFile(new URL('public/demos/roofers-4/sample-home.jpg', root))
  const originalSize = dimensions(original)
  const paths = new Set()
  const hashes = new Set()
  for (const material of materials) {
    const path = HALCYON_SAMPLE_PREVIEWS[material.id]
    assert.match(path, /^\/demos\/roofers-4\/sample-.+\.jpg$/)
    const bytes = await readFile(new URL(`public${path}`, root))
    const size = dimensions(bytes)
    assert.ok(size.width >= 1000 && size.height >= 600, `${material.id} is large enough for the preview`)
    assert.ok(Math.abs(size.width / size.height - originalSize.width / originalSize.height) < 0.005, `${material.id} preserves aspect`)
    paths.add(path)
    hashes.add(createHash('sha256').update(bytes).digest('hex'))
  }
  assert.equal(paths.size, 5)
  assert.equal(hashes.size, 5)
  assert.ok(!hashes.has(createHash('sha256').update(original).digest('hex')), 'prepared views differ from the original')
})

test('both detail settings reuse prepared first finishes while uploads and other finishes stay isolated', () => {
  for (const material of materials) {
    for (const quality of ['low', 'medium']) {
      const preview = getPreparedPreview(HALCYON_SAMPLE_ID, material.id, 0, quality)
      assert.equal(preview.image, HALCYON_SAMPLE_PREVIEWS[material.id])
      assert.equal(preview.quality, quality)
      assert.equal(preview.prepared, true)
      assert.equal(preview.sourceId, HALCYON_SAMPLE_ID)
      assert.equal(preview.materialId, material.id)
      assert.equal(preview.colorIndex, 0)
      assert.equal(getPreparedPreview('home-1', material.id, 0, quality), null)
      assert.equal(getPreparedPreview(`${HALCYON_SAMPLE_ID}-copy`, material.id, 0, quality), null)
      for (let finish = 1; finish < material.colors.length; finish++) {
        assert.equal(getPreparedPreview(HALCYON_SAMPLE_ID, material.id, finish, quality), null)
      }
    }
    assert.notEqual(previewKey(HALCYON_SAMPLE_ID, material.id, 0, 'low'), previewKey(HALCYON_SAMPLE_ID, material.id, 0, 'medium'))
    assert.equal(getPreparedPreview(HALCYON_SAMPLE_ID, material.id, 0, 'high'), null)
  }
  assert.equal(getPreparedPreview(HALCYON_SAMPLE_ID, 'toString', 0, 'medium'), null)
})

test('caller changes cannot mutate bundled sample previews', () => {
  assert.ok(Object.isFrozen(HALCYON_SAMPLE_PREVIEWS))
  for (const material of materials) {
    const preview = getPreparedPreview(HALCYON_SAMPLE_ID, material.id, 0, 'medium')
    preview.image = 'data:image/jpeg;base64,changed'
    preview.sourceId = 'home-1'
  }
  for (const material of materials) {
    const preview = getPreparedPreview(HALCYON_SAMPLE_ID, material.id, 0, 'medium')
    assert.equal(preview.image, HALCYON_SAMPLE_PREVIEWS[material.id])
    assert.equal(preview.sourceId, HALCYON_SAMPLE_ID)
  }
})
