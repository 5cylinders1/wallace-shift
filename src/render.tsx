import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { StaticLocationContext } from './lib/router'

/** Render the same public component tree that the browser hydrates. Effects
 * and interactive scenes start in the browser; readable content is present
 * in the HTML even when JavaScript is unavailable. */
export function renderPage(path: string): string {
  return renderToString(
    <StrictMode>
      <StaticLocationContext.Provider value={{ path, search: '' }}>
        <App />
      </StaticLocationContext.Provider>
    </StrictMode>,
  )
}
