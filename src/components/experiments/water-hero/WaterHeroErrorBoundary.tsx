import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Rendered in place of the scene. Receives the message for dev display. */
  fallback: (message: string) => ReactNode
}

interface State {
  message: string | null
}

/**
 * Catches anything the WebGL subtree throws — a missing GLB node, a
 * failed context, a shader that would not link — and hands the route a
 * static branded composition instead of a blank page.
 *
 * The message is passed through rather than swallowed because the most
 * likely failure here is a changed export contract, and "WS_Left not
 * found, discovered: ..." is the entire diagnosis.
 */
export class WaterHeroErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: unknown): State {
    return {
      message: error instanceof Error ? error.message : String(error),
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[water-hero] scene failed', error, info.componentStack)
    }
  }

  render() {
    if (this.state.message !== null) {
      return this.props.fallback(this.state.message)
    }
    return this.props.children
  }
}
