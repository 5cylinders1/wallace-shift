/** Execute the real metadata hook against a small DOM harness. This verifies
 * navigation does not leave a previous page's canonical, robots, or graph. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const data = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const hooks = data('export const useEffect = effect => effect();')
const modules = new Map()
async function compile(path) {
  if (modules.has(path)) return modules.get(path)
  let javascript = ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const match of [...javascript.matchAll(/from (['"])([^'"]+)\1/g)]) {
    const name = match[2]
    const url = name === 'react' ? hooks : name.startsWith('.')
      ? await compile(resolve(dirname(path), name + (extname(name) ? '' : '.ts')))
      : import.meta.resolve(name)
    javascript = javascript.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = data(`${javascript}\n//# sourceURL=${path}`)
  modules.set(path, url)
  return url
}
const { useRouteMeta } = await import(await compile(resolve(root, 'src/hooks/useDocumentMeta.ts')))

await test('navigation replaces page metadata and schema without carrying private robots state', () => {
  const previous = Object.fromEntries(['document', 'HTMLMetaElement', 'HTMLLinkElement'].map(name => [name, globalThis[name]]))
  const nodes = []
  class Element {
    constructor(tag) { this.tagName = tag; this.attributes = {}; this.textContent = '' }
    setAttribute(name, value) { this.attributes[name] = value }
    getAttribute(name) { return this.attributes[name] ?? this[name] }
    remove() { nodes.splice(nodes.indexOf(this), 1) }
  }
  class Meta extends Element {}
  class Link extends Element {}
  const document = {
    title: '',
    head: { appendChild(node) { nodes.push(node) } },
    createElement(tag) { return tag === 'meta' ? new Meta(tag) : tag === 'link' ? new Link(tag) : new Element(tag) },
    getElementById(id) { return nodes.find(node => node.id === id) ?? null },
    querySelector(selector) {
      const match = /^(meta|link)\[([^=]+)="([^"]+)"\]$/.exec(selector)
      assert.ok(match, `supported metadata selector: ${selector}`)
      return nodes.find(node => node.tagName === match[1] && node.getAttribute(match[2]) === match[3]) ?? null
    },
  }
  document.head.querySelector = selector => document.querySelector(selector)
  Object.assign(globalThis, { document, HTMLMetaElement: Meta, HTMLLinkElement: Link })
  try {
    for (const path of ['/services', '/contact', '/client-portal', '/services', '/about', '/']) {
      useRouteMeta(path)
      const url = `https://wallaceshift.com${path}`
      assert.equal(document.querySelector('link[rel="canonical"]').href, url)
      assert.equal(document.querySelector('meta[property="og:url"]').content, url)
      assert.equal(document.querySelector('meta[property="og:title"]').content, document.title)
      assert.equal(document.querySelector('meta[name="twitter:title"]').content, document.title)
      const robots = document.querySelector('meta[name="robots"]').content
      assert.equal(robots, path === '/client-portal' ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
      const scripts = nodes.filter(node => node.id === 'page-structured-data')
      assert.equal(scripts.length, 1, 'navigating replaces the graph instead of appending another')
      const graph = JSON.parse(scripts[0].textContent)['@graph']
      assert.ok(graph.some(node => node['@id'] === `${url}#webpage`), 'current page entity replaces the previous route')
      const breadcrumbs = graph.filter(node => node['@type'] === 'BreadcrumbList')
      assert.equal(breadcrumbs.length, path === '/' || path === '/client-portal' ? 0 : 1)
      if (breadcrumbs.length) assert.equal(breadcrumbs[0].itemListElement.at(-1).item, url)
    }
    assert.equal(nodes.filter(node => node.tagName === 'link' && node.rel === 'canonical').length, 1)
    assert.equal(nodes.filter(node => node.tagName === 'meta' && node.name === 'robots').length, 1)
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
  }
})
