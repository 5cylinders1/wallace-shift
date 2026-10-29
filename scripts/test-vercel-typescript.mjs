import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Vercel compiles functions separately after the Vite build. Its Node builder
// finds the nearest tsconfig.json from each entry, rather than traversing the
// solution's project references as `tsc -b` does. Mirror its compiler defaults
// and emit overrides, then check real server sources without executing them.
// Upstream: https://github.com/vercel/vercel/blob/main/packages/node/src/typescript.ts
// Entry discovery: https://github.com/vercel/vercel/blob/main/packages/node/src/build.ts
const root = fileURLToPath(new URL('../', import.meta.url))
const ignoredDiagnostics = new Set([6059, 18002, 18003])
const formatHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: () => root,
  getNewLine: () => '\n',
}

async function serverSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? serverSources(path) : /\.ts$/.test(entry.name) && !/\.d\.ts$/.test(entry.name) ? [path] : []
  }))
  return nested.flat()
}

function functionConfig(entry) {
  const configPath = ts.findConfigFile(dirname(entry), ts.sys.fileExists)
  assert.ok(configPath, `No tsconfig.json found for ${relative(root, entry)}`)
  const read = ts.readConfigFile(configPath, ts.sys.readFile)
  assert.equal(read.error, undefined, read.error && ts.formatDiagnostics([read.error], formatHost))
  const raw = {
    ...read.config,
    compilerOptions: {
      ...read.config.compilerOptions,
      sourceMap: true,
      inlineSourceMap: false,
      inlineSources: true,
      declaration: false,
      noEmit: false,
      outDir: '$$ts-node$$',
    },
  }
  const options = raw.compilerOptions
  for (const field of ['out', 'outFile', 'composite', 'declarationDir', 'declarationMap', 'emitDeclarationOnly', 'tsBuildInfoFile', 'incremental']) delete options[field]
  // These match Vercel's defaults for Node >= 16. The repository must override
  // ES2021 because its runtime code uses Object.hasOwn and newer standard APIs.
  options.target ??= 'ES2021'
  options.esModuleInterop ??= true
  if (options.module === undefined) {
    options.module = 'NodeNext'
    options.moduleResolution = 'NodeNext'
    options.strict = false
  }
  const parsed = ts.parseJsonConfigFileContent(raw, ts.sys, dirname(configPath), undefined, configPath)
  const errors = parsed.errors.filter(error => !ignoredDiagnostics.has(error.code))
  assert.equal(errors.length, 0, ts.formatDiagnostics(errors, formatHost))
  return { path: configPath, parsed }
}

test('server sources typecheck and emit using Vercel nearest-config discovery', async context => {
  const entries = [...await serverSources(join(root, 'api')), join(root, 'middleware.ts')]
  assert.ok(entries.length > 1, 'Expected API sources and middleware')
  const groups = new Map()
  for (const entry of entries) {
    const config = functionConfig(entry)
    const group = groups.get(config.path) ?? { parsed: config.parsed, entries: [] }
    group.entries.push(entry)
    groups.set(config.path, group)
  }
  for (const [configPath, { parsed, entries: sources }] of groups) {
    // Deliberately do not pass projectReferences: Vercel's per-function compiler
    // reads the discovered file's options, not tsconfig.api/node.json references.
    const program = ts.createProgram([...new Set([...parsed.fileNames, ...sources])], parsed.options)
    // Vercel asks for diagnostics on compiled source files; it does not compile
    // package declaration files. Keep configuration/global errors, but exclude
    // diagnostics inside dependency .d.ts files from this deployment-path test.
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(error => !ignoredDiagnostics.has(error.code) && !error.file?.isDeclarationFile)
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, formatHost))
    const emitted = new Set()
    const result = program.emit(undefined, (path, _text, _bom, _onError, sourceFiles) => {
      if (/\.(?:mjs|cjs|js)$/.test(path)) for (const source of sourceFiles ?? []) emitted.add(source.fileName)
    })
    assert.equal(result.emitSkipped, false, `${relative(root, configPath)} must permit function emission`)
    assert.equal(result.diagnostics.length, 0, ts.formatDiagnostics(result.diagnostics, formatHost))
    for (const source of sources) assert.ok(emitted.has(source), `Missing emitted JavaScript for ${relative(root, source)}`)
    context.diagnostic(`TypeScript ${ts.version}: ${sources.length} server sources checked and emitted in memory via ${relative(root, configPath)}.`)
  }
})
