export interface PostEntry {
  slug: string
  title: string
  description: string
  intro: string
  sections: [heading: string, copy: string][]
  related: string[]
}

export interface Post extends PostEntry {
  category: string
}
