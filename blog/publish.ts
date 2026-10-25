import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BLOG_DESCRIPTION, BLOG_ORIGIN, BLOG_TITLE, escapeHtml, loadPosts, type BlogPost } from './content.ts'
import { renderIndex, renderNotFound, renderPost } from './render.ts'

const absolute = (path: string) => new URL(path, BLOG_ORIGIN).href
const postUrl = (post: BlogPost) => `${BLOG_ORIGIN}/blog/${post.slug}`
const json = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
const organization = { '@type': 'Organization', name: 'Wallace Shift', url: BLOG_ORIGIN, logo: `${BLOG_ORIGIN}/brand/wallace-shift-logo-black.svg` }

interface DocumentOptions {
  title: string
  description: string
  path: string
  cssPath: string
  body: string
  noindex?: boolean
  post?: BlogPost
  schema?: unknown[]
}

function documentHtml({ title, description, path, cssPath, body, noindex = false, post, schema = [] }: DocumentOptions): string {
  const canonical = `${BLOG_ORIGIN}${path}`
  const image = absolute(post?.image?.src ?? '/media/wallace-shift-hero-poster.webp')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="#080d12" />
  <meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="alternate" type="application/rss+xml" title="Wallace Shift Blog" href="${BLOG_ORIGIN}/blog/feed.xml" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/favicon-512.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&amp;family=Instrument+Serif:ital@0;1&amp;display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${escapeHtml(cssPath)}" />
  <meta property="og:site_name" content="Wallace Shift" />
  <meta property="og:type" content="${post ? 'article' : 'website'}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:alt" content="${escapeHtml(post?.image?.alt ?? 'Wallace Shift')}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  ${post ? `<meta property="article:published_time" content="${post.publishedAt}" />\n  ${post.updatedAt ? `<meta property="article:modified_time" content="${post.updatedAt}" />` : ''}` : ''}
  ${schema.length ? `<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': schema })}</script>` : ''}
</head>
<body>${body}</body>
</html>
`
}

export function indexDocument(posts: BlogPost[], cssPath: string): string {
  return documentHtml({ title: BLOG_TITLE, description: BLOG_DESCRIPTION, path: '/blog', cssPath, body: renderIndex(posts), noindex: posts.length === 0,
    schema: [{ '@type': 'Blog', '@id': `${BLOG_ORIGIN}/blog#blog`, url: `${BLOG_ORIGIN}/blog`, name: 'Wallace Shift Blog', description: BLOG_DESCRIPTION, publisher: organization,
      blogPost: posts.map(post => ({ '@type': 'BlogPosting', '@id': `${postUrl(post)}#article`, url: postUrl(post), headline: post.title })) }],
  })
}

export function postDocument(post: BlogPost, posts: BlogPost[], cssPath: string): string {
  const url = postUrl(post)
  return documentHtml({ title: `${post.title} | Wallace Shift`, description: post.description, path: `/blog/${post.slug}`, cssPath, body: renderPost(post, posts), post,
    schema: [
      { '@type': 'BlogPosting', '@id': `${url}#article`, url, mainEntityOfPage: { '@type': 'WebPage', '@id': url }, headline: post.title, description: post.description,
        abstract: post.answer, articleSection: post.category, inLanguage: 'en', datePublished: post.publishedAt, ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
        ...(post.image ? { image: [absolute(post.image.src)] } : {}), author: { '@type': 'Person', name: post.author.name, url: absolute(post.author.url) }, publisher: organization,
        isPartOf: { '@type': 'Blog', '@id': `${BLOG_ORIGIN}/blog#blog` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BLOG_ORIGIN },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BLOG_ORIGIN}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ] },
    ],
  })
}

export function notFoundDocument(cssPath: string): string {
  return documentHtml({ title: 'Article not found | Wallace Shift', description: 'This article is not available. Explore the Wallace Shift blog.', path: '/404', cssPath, noindex: true,
    body: renderNotFound(),
  })
}

export function rssFeed(posts: BlogPost[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Wallace Shift Blog</title><link>${BLOG_ORIGIN}/blog</link><description>${escapeHtml(BLOG_DESCRIPTION)}</description><language>en-us</language>
<atom:link href="${BLOG_ORIGIN}/blog/feed.xml" rel="self" type="application/rss+xml" />
${posts.map(post => `<item><title>${escapeHtml(post.title)}</title><link>${postUrl(post)}</link><guid isPermaLink="true">${postUrl(post)}</guid><description>${escapeHtml(post.description)}</description><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate><category>${escapeHtml(post.category)}</category></item>`).join('\n')}
</channel></rss>
`
}

export function blogSitemapEntries(posts: BlogPost[]): string {
  if (!posts.length) return ''
  const latest = posts.map(post => post.updatedAt ?? post.publishedAt).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
  return [
    `  <url><loc>${BLOG_ORIGIN}/blog</loc><lastmod>${latest}</lastmod></url>`,
    ...posts.map(post => `  <url><loc>${postUrl(post)}</loc><lastmod>${post.updatedAt ?? post.publishedAt}</lastmod></url>`),
  ].join('\n')
}

export async function buildBlog(root: string, outDir: string, now = new Date()): Promise<{ posts: BlogPost[]; cssPath: string }> {
  const posts = await loadPosts(join(root, 'content/blog/posts'), now)
  const css = await readFile(join(root, 'blog/blog.css'), 'utf8')
  const cssName = `blog-${createHash('sha256').update(css).digest('hex').slice(0, 12)}.css`
  const cssPath = `/blog/assets/${cssName}`
  // This directory is exclusively generated. Removing it prevents a newly
  // drafted/deleted article from surviving a rebuild in the output directory.
  await rm(join(outDir, 'blog'), { recursive: true, force: true })
  await mkdir(join(outDir, 'blog/assets'), { recursive: true })
  await writeFile(join(outDir, 'blog/assets', cssName), css)
  await writeFile(join(outDir, 'blog/index.html'), indexDocument(posts, cssPath))
  await writeFile(join(outDir, 'blog/feed.xml'), rssFeed(posts))
  for (const post of posts) {
    await mkdir(join(outDir, 'blog', post.slug), { recursive: true })
    await writeFile(join(outDir, 'blog', post.slug, 'index.html'), postDocument(post, posts, cssPath))
  }
  const sitemapPath = join(outDir, 'sitemap.xml')
  const sitemap = await readFile(sitemapPath, 'utf8')
  if (!sitemap.includes('</urlset>')) throw new Error('The site sitemap must be generated before the blog')
  const withoutPreviousBlog = sitemap.replace(/\s*<url>\s*<loc>https:\/\/wallaceshift\.com\/blog(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/g, '')
  await writeFile(sitemapPath, withoutPreviousBlog.replace('</urlset>', `${blogSitemapEntries(posts)}\n</urlset>`))
  return { posts, cssPath }
}
