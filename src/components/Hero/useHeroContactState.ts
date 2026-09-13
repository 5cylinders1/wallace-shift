import { createContext, useContext, useState, useSyncExternalStore } from 'react'
import { createHeroContactState, type HeroContactState } from './heroContactState'

export const HeroContactContext = createContext<HeroContactState | null>(null)

export function useHeroContactState() {
  const shared = useContext(HeroContactContext)
  // Standalone Hero instances retain their original independent form state.
  const [local] = useState(createHeroContactState)
  const controller = shared ?? local
  const state = useSyncExternalStore(controller.subscribe,
    controller.getSnapshot, controller.getSnapshot)
  return { ...state, ...controller }
}
