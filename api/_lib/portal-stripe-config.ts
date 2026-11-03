import { DemoError } from './demo-access.js'

/** Readiness checks key format and deployment mode; Stripe verifies actual credentials and permissions. */
export function portalStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? ''
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? ''
  const mode = process.env.VERCEL_ENV === 'production' ? 'live' : 'test'
  const serverMode = /^(?:sk|rk)_(live|test)_[A-Za-z0-9][A-Za-z0-9_-]*$/.exec(secretKey)?.[1]
  const clientMode = /^pk_(live|test)_[A-Za-z0-9][A-Za-z0-9_-]*$/.exec(publishableKey)?.[1]
  if (serverMode !== mode || clientMode !== mode || !/^whsec_[A-Za-z0-9+/=_-]+$/.test(webhookSecret)) return null
  return { secretKey, publishableKey, webhookSecret, livemode: mode === 'live' }
}

export function requirePortalStripeConfig() {
  const config = portalStripeConfig()
  if (!config) throw new DemoError('stripe_not_configured', 503)
  return config
}
