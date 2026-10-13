import { MODEL, RenderError, imageDimensions } from './validation.js'
import type { RenderRequest } from './validation.js'

export type RenderUsage = {
  input_tokens: number
  input_tokens_details: { image_tokens: number; text_tokens: number }
  output_tokens: number
  total_tokens: number
}
export type RenderResult = {
  ok: true
  image: string
  model: typeof MODEL
  quality: RenderRequest['quality']
  usage: RenderUsage | null
  /** Token-rate calculation; not an invoice, and null if usage is absent. */
  costUsd: number | null
  cached: boolean
  width: number
  height: number
}

// Standard direct Images API rates, checked against official OpenAI docs on
// 2026-10-12. Direct image edits do not receive cached-input token discounts.
// https://developers.openai.com/api/docs/pricing
const TOKEN_RATES_PER_MILLION = { imageInput: 8, textInput: 5, imageOutput: 30 }
const nonnegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

export function parseUsage(value: unknown): RenderUsage | null {
  const usage = record(value)
  const detail = record(usage.input_tokens_details)
  if (![usage.input_tokens, usage.output_tokens, usage.total_tokens, detail.image_tokens, detail.text_tokens].every(nonnegativeInteger)) return null
  const input = usage.input_tokens as number
  const output = usage.output_tokens as number
  const total = usage.total_tokens as number
  const images = detail.image_tokens as number
  const text = detail.text_tokens as number
  if (images + text !== input || input + output !== total) return null
  // This route requests an image only. Do not silently price any future mixed
  // text/image output format with the image-output rate.
  const outputDetails = record(usage.output_tokens_details)
  if (Object.keys(outputDetails).length && (outputDetails.image_tokens !== output || outputDetails.text_tokens !== 0)) return null
  return { input_tokens: input, input_tokens_details: { image_tokens: images, text_tokens: text }, output_tokens: output, total_tokens: total }
}

export function usageCostUsd(usage: RenderUsage | null): number | null {
  if (!usage) return null
  return Number(((usage.input_tokens_details.image_tokens * TOKEN_RATES_PER_MILLION.imageInput + usage.input_tokens_details.text_tokens * TOKEN_RATES_PER_MILLION.textInput + usage.output_tokens * TOKEN_RATES_PER_MILLION.imageOutput) / 1_000_000).toFixed(6))
}

async function boundedJson(response: Response): Promise<unknown> {
  const maximum = 7 * 1024 * 1024
  if (!response.body) throw new RenderError('upstream', 'The image service returned an empty response.', 502)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      length += next.value.length
      if (length > maximum) throw new RenderError('upstream', 'The image service returned an oversized response.', 502)
      chunks.push(next.value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}

export async function renderRoof(request: RenderRequest, apiKey: string): Promise<RenderResult> {
  const signal = AbortSignal.timeout(160_000)
  try {
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
      signal,
      body: JSON.stringify({
        model: MODEL,
        images: [{ image_url: request.photo }],
        prompt: request.prompt,
        quality: request.quality,
        size: `${request.output.width}x${request.output.height}`,
        n: 1,
        output_format: 'jpeg',
        output_compression: 90,
        background: 'opaque',
      }),
    })
    const body = record(await boundedJson(response))
    if (!response.ok) {
      const error = record(body.error)
      if (response.status === 401 || response.status === 403) throw new RenderError('provider_auth', 'The image service is not accessible with the configured key. Ask the studio administrator to check OpenAI model access.', 503)
      if (error.code === 'insufficient_quota' || error.code === 'billing_hard_limit_reached') throw new RenderError('provider_quota', 'The image service has reached its spending limit. Please ask the studio administrator to check OpenAI billing.', 503)
      if (error.code === 'moderation_blocked' || error.type === 'image_generation_user_error') throw new RenderError('photo_rejected', 'The image service could not use this photograph. Try a clear exterior photo of the house.', 422)
      if (response.status === 429 || response.status === 503) throw new RenderError('busy', 'The image service is busy. Wait a few minutes before trying again.', 503)
      throw new RenderError('upstream', 'The image service could not complete this study. Please try again later.', 502)
    }
    const images = Array.isArray(body.data) ? body.data : []
    const base64 = record(images[0]).b64_json
    if (images.length !== 1 || typeof base64 !== 'string' || base64.length > 6 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) throw new RenderError('upstream', 'The image service did not return a usable study.', 502)
    const bytes = Buffer.from(base64, 'base64')
    if (bytes.toString('base64') !== base64) throw new RenderError('upstream', 'The image service returned an invalid study.', 502)
    let dimensions
    try { dimensions = imageDimensions(bytes, 'image/jpeg') } catch { throw new RenderError('upstream', 'The image service returned an invalid photograph.', 502) }
    if (dimensions.width !== request.output.width || dimensions.height !== request.output.height) throw new RenderError('upstream', 'The image service returned an unexpected image size.', 502)
    const usage = parseUsage(body.usage)
    return { ok: true, image: `data:image/jpeg;base64,${base64}`, model: MODEL, quality: request.quality, usage, costUsd: usageCostUsd(usage), cached: false, ...dimensions }
  } catch (error) {
    if (error instanceof RenderError) throw error
    if (signal.aborted || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))) throw new RenderError('timed_out', 'This study took too long. Wait a few minutes before requesting it again.', 504)
    throw new RenderError('upstream', 'The image service could not be reached. Please try again later.', 502)
  }
}
