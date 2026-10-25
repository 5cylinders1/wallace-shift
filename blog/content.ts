import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { Marked } from 'marked'

export const BLOG_ORIGIN = 'https://wallaceshift.com'
export const BLOG_TITLE = 'Business systems, explained | Wallace Shift Blog'
export const BLOG_DESCRIPTION = 'Practical answers to business owners’ questions about custom CRMs, AI, workflow automation, and websites that connect to their business.'

export interface BlogPost {
  slug: string
  title: string
  description: string
  question: string
  answer: string
  category: string
  author: { name: string; url: string }
  publishedAt: string
  updatedAt?: string
  html: string
  readingMinutes: number
  toc: { id: string; text: string }[]
  image?: { src: string; alt: string }
}

export function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function requiredString(data: Record<string, unknown>, key: string, file: string): string {
  const value = data[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${file}: ${key} must be a nonempty string`)
  return value.trim()
}

function timestamp(value: string, key: string, file: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/)
  const date = new Date(value)
  if (!match || Number.isNaN(date.getTime())) throw new Error(`${file}: ${key} must be an ISO timestamp with a timezone`)
  const calendar = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (calendar.getUTCFullYear() !== Number(match[1]) || calendar.getUTCMonth() + 1 !== Number(match[2]) || calendar.getUTCDate() !== Number(match[3]) || Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59) {
    throw new Error(`${file}: ${key} is not a valid calendar date`)
  }
  return value
}

function safeUrl(value: string, image = false): boolean {
  if (/[\s\\]/.test(value) || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false
  if (/^\/(?!\/)/.test(value)) return true
  if (!image && /^#[a-zA-Z0-9_-]+$/.test(value)) return true
  if (!image && /^mailto:[^@<>]+@[^@<>]+$/.test(value)) return true
  if (!/^https?:\/\//.test(value)) return false
  try {
    const url = new URL(value)
    return Boolean(url.hostname) && !url.username && !url.password
  } catch { return false }
}

function plainHeading(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, number: string) => String.fromCodePoint(number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number)))
    .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
}

export function renderMarkdown(markdown: string, file: string): { html: string; toc: BlogPost['toc']; readingMinutes: number } {
  const toc: BlogPost['toc'] = []
  const ids = new Set<string>()
  const parser = new Marked({
    gfm: true,
    async: false,
    walkTokens(token) {
      if (token.type === 'html') throw new Error(`${file}: raw HTML is not supported; use Markdown`)
      if (token.type === 'heading' && token.depth === 1) throw new Error(`${file}: start body headings at ##; the title supplies the H1`)
      if ((token.type === 'link' || token.type === 'image') && !safeUrl(token.href, token.type === 'image')) throw new Error(`${file}: unsafe or unsupported URL ${JSON.stringify(token.href)}`)
      if (token.type === 'image' && !token.text.trim()) throw new Error(`${file}: images require descriptive alt text`)
    },
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        const plain = plainHeading(text)
        const base = `section-${plain.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'heading'}`
        let id = base
        let count = 2
        while (ids.has(id)) id = `${base}-${count++}`
        ids.add(id)
        if (depth <= 3) toc.push({ id, text: plain })
        return `<h${depth} id="${id}">${text}</h${depth}>\n`
      },
      image({ href, title, text }) {
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy" decoding="async" />`
      },
    },
  })
  const html = parser.parse(markdown) as string
  const words = markdown.split(/\s+/).filter(Boolean).length
  return { html, toc, readingMinutes: Math.max(1, Math.ceil(words / 220)) }
}

/** Only reviewed, published articles whose publication time has arrived are returned. */
export async function loadPosts(directory: string, now = new Date()): Promise<BlogPost[]> {
  const files = (await readdir(directory)).filter(file => file.endsWith('.md')).sort()
  const posts: BlogPost[] = []
  const slugs = new Set<string>()
  for (const file of files) {
    const source = await readFile(join(directory, file), 'utf8')
    // YAML only. gray-matter's optional JavaScript engine is never selected by content.
    const { data, content } = matter(source, { language: 'yaml', engines: { js: () => { throw new Error(`${file}: JavaScript front matter is not supported`) }, javascript: () => { throw new Error(`${file}: JavaScript front matter is not supported`) } } })
    if (data.status === 'draft') continue
    if (data.status !== 'published') throw new Error(`${file}: status must be draft or published`)
    const slug = requiredString(data, 'slug', file)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || ['assets', 'index', 'feed'].includes(slug)) throw new Error(`${file}: slug must be a unique, lowercase, hyphenated URL segment`)
    if (slugs.has(slug)) throw new Error(`${file}: duplicate slug ${slug}`)
    slugs.add(slug)
    const publishedAt = timestamp(requiredString(data, 'publishedAt', file), 'publishedAt', file)
    const updatedAt = data.updatedAt === undefined ? undefined : timestamp(requiredString(data, 'updatedAt', file), 'updatedAt', file)
    if (updatedAt && new Date(updatedAt) < new Date(publishedAt)) throw new Error(`${file}: updatedAt cannot precede publishedAt`)
    if (updatedAt && new Date(updatedAt) > now) throw new Error(`${file}: updatedAt cannot be in the future`)
    const author = data.author as Record<string, unknown> | undefined
    if (!author || typeof author !== 'object') throw new Error(`${file}: author must include name and url`)
    const authorName = requiredString(author, 'name', file)
    const authorUrl = requiredString(author, 'url', file)
    if (!safeUrl(authorUrl) || !/^(https?:\/\/|\/)/.test(authorUrl)) throw new Error(`${file}: author.url must be a profile URL`)
    let image: BlogPost['image']
    if (data.image !== undefined) {
      if (!data.image || typeof data.image !== 'object') throw new Error(`${file}: image must include src and alt`)
      const imageData = data.image as Record<string, unknown>
      image = { src: requiredString(imageData, 'src', file), alt: requiredString(imageData, 'alt', file) }
      if (!safeUrl(image.src, true)) throw new Error(`${file}: image.src must be a public HTTP(S) URL or root-relative path`)
    }
    const metadata = {
      slug, title: requiredString(data, 'title', file), description: requiredString(data, 'description', file),
      question: requiredString(data, 'question', file), answer: requiredString(data, 'answer', file), category: requiredString(data, 'category', file),
      author: { name: authorName, url: authorUrl }, publishedAt, updatedAt, image,
    }
    if (!content.trim()) throw new Error(`${file}: published articles require a Markdown body`)
    const rendered = renderMarkdown(content, file)
    if (new Date(publishedAt) <= now) posts.push({ ...metadata, ...rendered })
  }
  return posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() || a.slug.localeCompare(b.slug))
}
