import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Tests run on the same Node versions as the existing test suite. No Vite
// server, repository environment files, or native TypeScript runtime is needed.
export async function loadBlogModules() {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const temporary = await mkdtemp(join(tmpdir(), 'wallace-blog-modules-'))
  const compiled = new Map()
  async function compile(relative) {
    if (compiled.has(relative)) return compiled.get(relative)
    const target = join(temporary, relative.replace(/\.ts$/, '.mjs'))
    compiled.set(relative, target)
    let source = ts.transpileModule(await readFile(join(root, relative), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }).outputText
    for (const match of [...source.matchAll(/(from\s+)(['"])([^'"]+)\2/g)]) {
      const specifier = match[3]
      const url = specifier.startsWith('.')
        ? pathToFileURL(await compile(join(dirname(relative), specifier))).href
        : import.meta.resolve(specifier)
      source = source.replace(match[0], `from ${JSON.stringify(url)}`)
    }
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, source)
    return target
  }
  try {
    return {
      content: await import(pathToFileURL(await compile('blog/content.ts')).href),
      publish: await import(pathToFileURL(await compile('blog/publish.ts')).href),
      plugin: await import(pathToFileURL(await compile('blog/vite-plugin.ts')).href),
      cleanup: () => rm(temporary, { recursive: true, force: true }),
    }
  } catch (error) {
    await rm(temporary, { recursive: true, force: true })
    throw error
  }
}
