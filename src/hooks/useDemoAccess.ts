import { useEffect, useState } from 'react'

/** Check HttpOnly demo sessions without changing the invitation or sign-in flow. */
export function useDemoAccess(): boolean {
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let controller: AbortController | undefined
    function refresh() {
      controller?.abort()
      const request = new AbortController()
      controller = request
      void fetch('/api/demo-access?status=1', { credentials: 'same-origin', cache: 'no-store', signal: request.signal })
        .then(response => response.ok ? response.json() : null)
        .then(result => {
          if (!request.signal.aborted) setAuthenticated(result?.ok === true && result.authenticated === true)
        })
        .catch(() => {
          if (!request.signal.aborted) setAuthenticated(false)
        })
    }
    refresh()
    // Pick up sign-in/sign-out in another tab and restored gallery pages.
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    return () => {
      controller?.abort()
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
    }
  }, [])

  return authenticated
}
