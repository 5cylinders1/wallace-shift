import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** False in the static HTML and during hydration, true afterwards. Lets a
 * component read browser-only values without a hydration mismatch. */
export const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false)
