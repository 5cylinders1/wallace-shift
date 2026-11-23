import type { MouseEvent } from 'react'
import { categories, getPost, postGroups } from './blog/posts'
import type { Post } from './blog/types'
import { business, href, quoteHref } from './content'
import { Icon } from './icons'
import { Breadcrumb, LinkRow, SiteFrame } from './Layout'
import { pushUrl, useLocationSearch } from './location'

const perPageOptions = [5, 10, 20]
const defaultPerPage = perPageOptions[0]

interface BlogSearch { category?: string; perPage?: number; page?: number }

/** The Base44 route's search validation: unknown values are dropped. */
function parseSearch(query: string): BlogSearch {
  const params = new URLSearchParams(query)
  const category = params.get('category') ?? ''
  const perPage = Number(params.get('perPage'))
  const page = Number(params.get('page'))
  return {
    ...(categories.includes(category) ? { category } : {}),
    ...(perPageOptions.includes(perPage) && perPage !== defaultPerPage ? { perPage } : {}),
    ...(Number.isSafeInteger(page) && page > 1 ? { page } : {}),
  }
}

function blogUrl(search: BlogSearch, hash = '') {
  const params = new URLSearchParams()
  if (search.category) params.set('category', search.category)
  if (search.perPage) params.set('perPage', String(search.perPage))
  if (search.page) params.set('page', String(search.page))
  const query = params.toString()
  return `${href('/blog')}${query ? `?${query}` : ''}${hash}`
}

/** Search state lives in the URL (see location.ts for hydration). */
function useBlogSearch() {
  const search = parseSearch(useLocationSearch())
  const navigate = (next: BlogSearch, hash = '') => pushUrl(blogUrl(next, hash))
  return [search, navigate] as const
}

export function BlogIndex() {
  const [search, navigate] = useBlogSearch()
  const matching = postGroups.filter(group => !search.category || group.category === search.category).flatMap(group => group.posts)
  const perPage = search.perPage ?? defaultPerPage
  const pageCount = Math.max(1, Math.ceil(matching.length / perPage))
  const page = Math.min(search.page ?? 1, pageCount)
  const start = (page - 1) * perPage
  const posts = matching.slice(start, start + perPage)
  const total = matching.length
  const update = (patch: BlogSearch) => navigate({ ...search, ...patch, page: undefined })
  const goToPage = (event: MouseEvent<HTMLAnchorElement>, number: number) => {
    event.preventDefault()
    navigate({ ...search, page: number === 1 ? undefined : number }, '#blog-posts')
    document.getElementById('blog-posts')?.scrollIntoView()
  }

  return <SiteFrame>
    <header className="am-hero am-detail-hero"><div className="am-shell">
      <Breadcrumb trail={[['Home', '/'], ['Blog']]} />
      <h1>Water heater advice</h1>
      <p className="am-intro">What to do when the hot water runs out, what to look for in a replacement, and what to ask before you book.</p>
    </div></header>
    <section className="am-shell am-section" aria-labelledby="blog-posts">
      <h2 id="blog-posts" className="am-blog-heading">Browse articles</h2>
      <div className="am-card am-blog-controls">
        <label className="am-blog-field am-blog-field-grow" htmlFor="blog-category">Category
          <select id="blog-category" className="am-blog-select" value={search.category ?? ''} onChange={event => update({ category: event.target.value || undefined })}>
            <option value="">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="am-blog-field" htmlFor="blog-per-page">Posts per page
          <select id="blog-per-page" className="am-blog-select" value={perPage} onChange={event => { const size = Number(event.target.value); update({ perPage: size === defaultPerPage ? undefined : size }) }}>
            {perPageOptions.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <p className="am-section-intro" role="status">{total ? `Showing ${start + 1}–${start + posts.length} of ${total} ${total === 1 ? 'article' : 'articles'}` : 'No articles in this category.'}</p>
      <ul className="am-blog-list">{posts.map(post => <li key={post.slug}><article className="am-card am-detail-card">
        <p className="am-kicker am-post-category">{post.category}</p>
        <h3><a href={href(`/blog/${post.slug}`)} className="am-post-title">{post.title}</a></h3>
        <p className="am-post-summary">{post.description}</p>
        <a href={href(`/blog/${post.slug}`)} aria-label={`Read: ${post.title}`}>Read article <Icon name="arrow-right" size={16} /></a>
      </article></li>)}</ul>
      {pageCount > 1 && <nav aria-label="Blog pagination" className="am-pagination">
        {page > 1 && <a href={blogUrl({ ...search, page: page - 1 === 1 ? undefined : page - 1 }, '#blog-posts')} onClick={event => goToPage(event, page - 1)} className="am-page-link"><Icon name="chevron-left" size={16} /> Previous</a>}
        {Array.from({ length: pageCount }, (_, i) => i + 1).map(number => number === page
          ? <span key={number} aria-current="page" aria-label={`Page ${number}`} className="am-page-link am-page-current">{number}</span>
          : <a key={number} href={blogUrl({ ...search, page: number === 1 ? undefined : number }, '#blog-posts')} onClick={event => goToPage(event, number)} className="am-page-link" aria-label={`Page ${number}`}>{number}</a>)}
        {page < pageCount && <a href={blogUrl({ ...search, page: page + 1 }, '#blog-posts')} onClick={event => goToPage(event, page + 1)} className="am-page-link">Next <Icon name="chevron-right" size={16} /></a>}
      </nav>}
    </section>
  </SiteFrame>
}

export function BlogArticle({ post }: { post: Post }) {
  const related = post.related.map(getPost).filter((item): item is Post => Boolean(item))
  return <SiteFrame>
    <article aria-labelledby="article-title">
      <header className="am-hero am-detail-hero"><div className="am-shell">
        <Breadcrumb trail={[['Home', '/'], ['Blog', '/blog'], [post.category]]} />
        <h1 id="article-title">{post.title}</h1><p className="am-intro">{business.name}</p>
      </div></header>
      <div className="am-shell am-section"><div className="am-article-body">
        <p className="am-article-lead">{post.intro}</p>
        {post.sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}
        <aside aria-label="Water heater service" className="am-card">
          <h3>Need help with your water heater?</h3>
          <p>{business.name} serves homes and businesses across Greater Kansas City.</p>
          <div className="am-article-ctas">
            <a href={href('/water-heater-installation')}>Explore Water Heater Services <Icon name="arrow-right" size={16} /></a>
            <a href={quoteHref('Water Heaters')}>Request a Quote <Icon name="arrow-right" size={16} /></a>
          </div>
        </aside>
      </div></div>
    </article>
    <LinkRow title="Keep reading" links={related.map(item => [`/blog/${item.slug}`, item.title])} />
  </SiteFrame>
}
