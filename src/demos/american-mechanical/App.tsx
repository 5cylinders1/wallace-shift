import { BlogArticle, BlogIndex } from './BlogPages'
import { getPost } from './blog/posts'
import { detailPages } from './content'
import DetailPage from './DetailPage'
import HomePage from './HomePage'
import './site.css'

/** One component tree for every page; `slug` is the path below BASE. */
export default function App({ slug }: { slug: string }) {
  if (slug === '') return <HomePage />
  if (slug === 'blog') return <BlogIndex />
  const post = slug.startsWith('blog/') ? getPost(slug.slice('blog/'.length)) : undefined
  if (post) return <BlogArticle post={post} />
  const detail = detailPages.find(page => page.slug === slug)
  if (detail) return <DetailPage page={detail} />
  return <HomePage />
}
