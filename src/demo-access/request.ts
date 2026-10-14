export type DemoRequestPayload = {
  name: string
  businessName: string
  email: string
  website: string
  message: string
  company: string
  demo: string
}

export type DemoRequestResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'invalid' | 'rate_limited' | 'error' }

export async function submitDemoRequest(payload: DemoRequestPayload): Promise<DemoRequestResult> {
  try {
    const response = await fetch('/api/demo-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body: unknown = await response.json().catch(() => null)

    // A static development server may return HTML with a 200 status.
    // Only an explicit response from the API confirms receipt.
    if (!body || typeof body !== 'object' || !('ok' in body) || typeof body.ok !== 'boolean') {
      return { ok: false, reason: 'not_configured' }
    }
    if (response.ok && body.ok) return { ok: true }
    if ('error' in body && (body.error === 'not_configured' || body.error === 'invalid' || body.error === 'rate_limited')) {
      return { ok: false, reason: body.error }
    }
    return { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
