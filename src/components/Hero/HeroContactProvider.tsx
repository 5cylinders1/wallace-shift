import { useState, type ReactNode } from 'react'
import { createHeroContactState } from './heroContactState'
import { HeroContactContext } from './useHeroContactState'

export function HeroContactProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(createHeroContactState)
  return <HeroContactContext.Provider value={controller}>{children}</HeroContactContext.Provider>
}
