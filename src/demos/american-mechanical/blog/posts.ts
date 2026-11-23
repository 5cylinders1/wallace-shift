import { choosing } from './choosing'
import { efficiency } from './efficiency'
import { installation } from './installation'
import { repair } from './repair'
import { troubleshooting } from './troubleshooting'
import type { Post, PostEntry } from './types'

export const postGroups = ([
  ['Choosing & Sizing', choosing],
  ['Repair, Replacement & Lifespan', repair],
  ['Troubleshooting & Maintenance', troubleshooting],
  ['Installation & Costs', installation],
  ['Energy Efficiency', efficiency],
] as [string, PostEntry[]][]).map(([category, entries]) => ({
  category,
  posts: entries.map((post): Post => ({ ...post, category })),
}))

export const allPosts = postGroups.flatMap(group => group.posts)
export const categories = postGroups.map(group => group.category)

export function getPost(slug: string): Post | undefined {
  return allPosts.find(post => post.slug === slug)
}
