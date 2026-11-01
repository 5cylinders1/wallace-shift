import type { BlogPost } from './content.ts'
import { footer as siteFooter } from '../src/content/siteConfig.ts'

const navigation = [
  ['/services', 'Services'],
  ['/pricing', 'Pricing'],
  ['/approach', 'Approach'],
  ['/about', 'About'],
  ['/blog', 'Blog'],
  ['/contact', 'Contact'],
] as const

const topics = [
  {
    id: 'ai-automation', label: 'AI & automation', heading: 'AI and workflow automation guides',
    categories: ['Workflow automation'],
    services: [
      ['/services/ai-integration', 'AI integration for small businesses'],
      ['/services/workflow-automation', 'Workflow automation services'],
    ],
  },
  {
    id: 'crm-systems', label: 'CRM systems', heading: 'CRM and business system guides',
    categories: ['Business systems', 'Contractor workflows', 'Custom CRMs'],
    services: [['/services/custom-crm-development', 'Custom CRM development']],
  },
  {
    id: 'business-websites', label: 'Business websites', heading: 'Business website guides',
    categories: ['Business websites', 'Websites'],
    services: [['/services/web-design', 'Small business web design']],
  },
] as const

function topicForPost(post: BlogPost) {
  return topics.find(topic => (topic.categories as readonly string[]).includes(post.category))
}

function groupedPosts(posts: BlogPost[]) {
  const groups = topics.map(topic => ({
    ...topic, posts: posts.filter(post => topicForPost(post) === topic),
  }))
  const other = posts.filter(post => !topicForPost(post))
  return [...groups, { id: 'more-guides', label: 'More guides', heading: 'More small business guides', categories: [], services: [], posts: other }]
    .filter(group => group.posts.length)
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

function safeUrl(value: string): string {
  const hasUnsafeCharacters = [...value].some(character => character.charCodeAt(0) <= 32 || character === '\\')
  if (/^(?:\/(?!\/)|#[\w-]|https?:\/\/)/i.test(value) && !hasUnsafeCharacters) return escape(value)
  return '#'
}

function dateLabel(value: string): string {
  return escape(new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago',
  }).format(new Date(value)))
}

function articleUrl(post: BlogPost): string {
  return `/blog/${encodeURIComponent(post.slug)}`
}

function navLinks(): string {
  return navigation.map(([href, label]) => `<li><a href="${href}"${href === '/blog' ? ' aria-current="location"' : ''}>${label}</a></li>`).join('')
}

function header(): string {
  return `<a class="blog-skip" href="#main">Skip to content</a>
<header class="blog-header">
  <div class="blog-container blog-header__inner">
    <a class="blog-brand" href="/" aria-label="Wallace Shift home"><img src="/brand/wallace-shift-logo-white.svg" width="22" height="14" alt="" /><span>Wallace Shift</span></a>
    <nav class="blog-nav" aria-label="Primary"><ul>${navLinks()}</ul></nav>
    <a class="blog-header__cta" href="/contact">Discuss your system <span aria-hidden="true">↗</span></a>
    <details class="blog-menu">
      <summary><span class="blog-menu__closed">Menu <span aria-hidden="true">+</span></span><span class="blog-menu__opened">Close <span aria-hidden="true">−</span></span></summary>
      <nav aria-label="Mobile primary"><ul>${navLinks()}</ul><a class="blog-button" href="/contact">Discuss your system <span aria-hidden="true">↗</span></a></nav>
    </details>
  </div>
</header>`
}

function footer(): string {
  return `<footer class="blog-footer"><div class="blog-container">
    <div class="blog-footer__top"><div><a class="blog-brand" href="/"><img src="/brand/wallace-shift-logo-white.svg" width="22" height="14" alt="" /><span>Wallace Shift</span></a><p>Software. Workflows. Progress.</p></div><nav aria-label="Footer"><ul>${navLinks()}</ul></nav></div>
    <div class="blog-footer__bottom">
      <p>© ${new Date().getFullYear()} Wallace Shift</p>
      <a class="blog-footer__preferred-source" href="${safeUrl(siteFooter.preferredSource.href)}" aria-label="${escape(siteFooter.preferredSource.label)}" target="_blank" rel="noopener noreferrer">
        <img src="${safeUrl(siteFooter.preferredSource.icon)}" alt="" width="18" height="18" loading="lazy" decoding="async" />
        <span>${escape(siteFooter.preferredSource.text)}</span><span class="blog-footer__preferred-arrow" aria-hidden="true">↗</span>
      </a>
      <a class="blog-footer__privacy" href="/privacy">Privacy</a>
    </div>
  </div></footer>`
}

function card(post: BlogPost, number: number, headingLevel: 3 | 4 = 3): string {
  return `<article class="blog-card">
    <div class="blog-card__number" aria-hidden="true">${String(number).padStart(2, '0')}</div>
    <div class="blog-card__copy"><p class="blog-label">${escape(post.category)}</p><h${headingLevel} class="blog-card__title"><a href="${articleUrl(post)}">${escape(post.title)}<span class="blog-card__arrow" aria-hidden="true">↗</span></a></h${headingLevel}><p class="blog-card__description">${escape(post.description)}</p><p class="blog-card__meta"><time datetime="${escape(post.publishedAt)}">${dateLabel(post.publishedAt)}</time><span aria-hidden="true">·</span>${post.readingMinutes} min read</p></div>
  </article>`
}

function conversation(): string {
  return `<section class="blog-conversation" aria-labelledby="conversation-heading"><div class="blog-container blog-conversation__inner"><div><p class="blog-label">From the question to the work</p><h2 id="conversation-heading">Make it work <br /><em>for your business.</em></h2></div><div><p>Have a workflow that needs a closer look? Tell us what your team does today and where things get stuck.</p><a class="blog-button" href="/contact">Discuss your system <span aria-hidden="true">↗</span></a></div></div></section>`
}

export function renderIndex(posts: BlogPost[]): string {
  const groups = groupedPosts(posts)
  return `${header()}
<main id="main">
  <section class="blog-hero"><div class="blog-container">
    <div class="blog-hero__eyebrow"><p class="blog-label"><span class="blog-dot" aria-hidden="true"></span>The Wallace Shift blog</p><span class="blog-hero__note">Ideas for the work ahead</span></div>
    <div class="blog-hero__grid"><div><h1>AI, CRM and <br /><em>automation guides.</em></h1><p class="blog-hero__intro">Practical guides for small businesses choosing AI integrations, custom CRMs, workflow automation, and websites. Compare the options and plan a useful next step.</p></div>
      <aside class="blog-hero__aside" aria-label="Our focus"><p class="blog-label">Less guesswork. More clarity.</p><p>Understand the options.<br />Know what to ask.<br />Choose your next step.</p><span class="blog-hero__rule" aria-hidden="true"></span><span>From the team building<br />connected business systems.</span></aside>
    </div>
    ${groups.length ? `<nav class="blog-topics" aria-label="Browse articles by topic"><span>Explore</span>${groups.map(group => `<a href="#${group.id}">${escape(group.label)}</a>`).join('')}</nav>` : ''}
  </div></section>
  <section class="blog-library" aria-labelledby="library-heading"><div class="blog-container">
    <div class="blog-section-heading"><h2 id="library-heading">${posts.length ? 'Browse by topic' : 'Good questions deserve useful answers.'}</h2>${posts.length ? `<a class="blog-text-link" href="/blog/feed.xml">RSS feed <span aria-hidden="true">↗</span></a>` : '<span class="blog-label">The first chapter</span>'}</div>
    ${posts.length ? groups.map(group => `<section class="blog-topic-group" id="${group.id}" aria-labelledby="${group.id}-heading"><h3 id="${group.id}-heading">${escape(group.heading)}</h3><div class="blog-post-list">${group.posts.map((post, index) => card(post, index + 1, 4)).join('')}</div></section>`).join('') : `<div class="blog-empty"><div class="blog-empty__mark" aria-hidden="true">Q<span>.</span></div><div><h3>Our first articles are on the way.</h3><p>We’re starting with the questions that come up in real conversations: how to connect your tools, simplify follow-up, and decide what is worth building.</p><p>Have a question about your own business? We’d like to hear it.</p><a class="blog-text-link" href="/contact">Bring us your question <span aria-hidden="true">↗</span></a></div><a class="blog-empty__services" href="/services"><span class="blog-label">While you’re here</span><strong>See what we build.</strong><span>Explore our services <span aria-hidden="true">↗</span></span></a></div>`}
  </div></section>
  ${posts.length ? conversation() : ''}
</main>${footer()}`
}

export function renderPost(post: BlogPost, posts: BlogPost[]): string {
  const topic = topicForPost(post)
  const related = posts.filter((candidate) => candidate.slug !== post.slug)
    .sort((left, right) => Number(right.category === post.category) - Number(left.category === post.category)).slice(0, 3)
  return `${header()}
<main id="main">
  <article>
    <header class="blog-article-hero"><div class="blog-container">
      <nav class="blog-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/blog">Blog</a></li><li aria-current="page">${escape(post.title)}</li></ol></nav>
      <p class="blog-label"><span class="blog-dot" aria-hidden="true"></span>${escape(post.category)}</p>
      <h1>${escape(post.title)}</h1><p class="blog-article-hero__description">${escape(post.description)}</p>
      <div class="blog-byline"><a href="${safeUrl(post.author.url)}">By ${escape(post.author.name)}</a><span>Published <time datetime="${escape(post.publishedAt)}">${dateLabel(post.publishedAt)}</time></span>${post.updatedAt && post.updatedAt !== post.publishedAt ? `<span>Updated <time datetime="${escape(post.updatedAt)}">${dateLabel(post.updatedAt)}</time></span>` : ''}<span>${post.readingMinutes} min read</span></div>
    </div></header>
    <div class="blog-reading"><div class="blog-container blog-reading__grid">
      <aside class="blog-reading__aside">${post.toc.length ? `<nav class="blog-toc" aria-label="In this article"><p class="blog-label">In this article</p><ol><li><a href="#short-answer">The short answer</a></li>${post.toc.map((heading) => `<li><a href="#${escape(heading.id)}">${escape(heading.text)}</a></li>`).join('')}</ol></nav>` : ''}<a class="blog-back" href="/blog"><span aria-hidden="true">←</span> All articles</a></aside>
      <div class="blog-reading__main">
        <section class="blog-answer" id="short-answer" aria-labelledby="answer-heading"><p class="blog-label">The short answer</p><h2 id="answer-heading">${escape(post.question)}</h2><p>${escape(post.answer)}</p></section>
        ${post.image ? `<figure class="blog-article-image"><img src="${safeUrl(post.image.src)}" alt="${escape(post.image.alt)}" decoding="async" /></figure>` : ''}
        <div class="blog-prose">${post.html}</div>
        <aside class="blog-service-links" aria-labelledby="service-heading"><h2 id="service-heading">Help putting this into practice</h2><p>Explore how Wallace Shift scopes and builds this work for small businesses.</p><ul>${(topic?.services ?? [['/services', 'Explore our services']]).map(([href, label]) => `<li><a href="${href}">${escape(label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></aside>
        <div class="blog-author"><span class="blog-author__mark" aria-hidden="true">WS</span><div><p class="blog-label">Written by</p><a href="${safeUrl(post.author.url)}">${escape(post.author.name)}</a><p>Wallace Shift · Custom CRMs, AI integrations, and connected workflows.</p></div></div>
      </div>
    </div></div>
  </article>
  ${related.length ? `<section class="blog-library blog-library--related" aria-labelledby="related-heading"><div class="blog-container"><div class="blog-section-heading"><h2 id="related-heading">Keep exploring</h2><a class="blog-text-link" href="/blog">All articles <span aria-hidden="true">↗</span></a></div><div class="blog-post-list">${related.map((article, index) => card(article, index + 1)).join('')}</div></div></section>` : ''}
  ${conversation()}
</main>${footer()}`
}

export function renderNotFound(): string {
  return `${header()}<main id="main"><section class="blog-hero blog-not-found"><div class="blog-container"><p class="blog-label">404 · Page not found</p><h1>Let’s find<br /><em>a better starting point.</em></h1><p class="blog-hero__intro">This article isn’t available. Visit the blog to see our published answers.</p><a class="blog-button" href="/blog">Back to the blog <span aria-hidden="true">↗</span></a></div></section></main>${footer()}`
}
