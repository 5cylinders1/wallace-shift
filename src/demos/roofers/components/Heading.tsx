import { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react'

/**
 * Sections are written for the home page's outline: their title an h2, their
 * parts h3, steps within a part h4. On its own page a section leads, and the
 * whole outline moves up a level, so each page has one h1 and no gaps.
 */
const Base = createContext<1 | 2>(2)

export function HeadingBase({ level, children }: { level: 1 | 2; children: ReactNode }) {
  return <Base.Provider value={level}>{children}</Base.Provider>
}

/** `rank` 0 is the section title, 1 a part of it, 2 a step within a part. */
export function Heading({ rank = 0, ...props }: HTMLAttributes<HTMLHeadingElement> & { rank?: 0 | 1 | 2 }) {
  const Tag = `h${useContext(Base) + rank}` as 'h1' | 'h2' | 'h3' | 'h4'
  return <Tag {...props} />
}
