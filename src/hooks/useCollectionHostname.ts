import { useCallback, useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const getHostname = () => window.location.hostname

/** Hydration starts with the canonical host used by the build. The browser
 * then restores local/alternate-host demo links without changing the first
 * rendered tree. Hostnames cannot change within the same document. */
export function useCollectionHostname(canonicalHostname: string): string {
  const getServerSnapshot = useCallback(() => canonicalHostname, [canonicalHostname])
  return useSyncExternalStore(subscribe, getHostname, getServerSnapshot)
}
