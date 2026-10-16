#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Run only after authorization to verify the configured production Redis.
// Reads process.env only: never loads .env files, sends email, or touches app keys.
const SAFETY_TTL = 120
const FALLBACK_PAIRS = [
  ['RATE_LIMIT_REDIS_URL', 'RATE_LIMIT_REDIS_TOKEN'],
  ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
  ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
]

class ProbeFailure extends Error {}
const check = (condition, message) => { if (!condition) throw new ProbeFailure(message) }

function configuration() {
  const dedicated = ['DEMO_AUDIT_REDIS_URL', 'DEMO_AUDIT_REDIS_TOKEN']
  const usesDedicated = dedicated.some(name => process.env[name]?.trim())
  let pair
  if (usesDedicated) {
    check(dedicated.every(name => process.env[name]?.trim()), 'Both dedicated audit Redis variables are required.')
    pair = dedicated
  } else pair = FALLBACK_PAIRS.find(candidate => candidate.every(name => process.env[name]?.trim()))
  check(pair, 'No supported Redis REST URL and token pair is configured in process.env.')
  const url = process.env[pair[0]].trim().replace(/\/+$/, '')
  const token = process.env[pair[1]].trim()
  // Match limiterStore's raw prefix check before the agreement store URL parser.
  check(usesDedicated || url.startsWith('https://'), 'Fallback Redis variables require an https:// REST endpoint.')
  let parsed
  try { parsed = new URL(url) } catch { throw new ProbeFailure('Redis requires an HTTPS REST endpoint.') }
  check(parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.pathname === '/' && !parsed.search && !parsed.hash, 'Redis requires an HTTPS REST endpoint without a path, credentials, query, or fragment.')
  return { url, token }
}

async function loadScripts() {
  const source = await readFile(new URL('../api/_lib/demo-agreement-store.ts', import.meta.url), 'utf8')
  const extracted = {}
  for (const name of ['RESERVE_CODE', 'VERIFY_CODE', 'SAVE_ACCEPTANCE']) {
    const match = source.match(new RegExp('const ' + name + ' = `([^`]*)`'))
    check(match && !match[1].includes('${'), `Could not safely extract the current ${name} Lua source.`)
    extracted[name] = match[1]
  }
  return extracted
}

/** Even an operation error reaches the safety-expiry step before the response.
 * Acceptance probes observe TTL=-1 inside this atomic EVAL, then receive a TTL.
 */
function guarded(source, simulateExistingPermanentRecord = false) {
  return `local ok, result = pcall(function()
${simulateExistingPermanentRecord ? "if redis.call('EXISTS', KEYS[1]) == 1 then redis.call('PERSIST', KEYS[1]) end" : ''}
${source}
end)
local ttls = {}
local protected = true
for index, key in ipairs(KEYS) do
  local ttl = redis.pcall('TTL', key)
  if type(ttl) == 'number' then ttls[index] = ttl else ttls[index] = -3; protected = false end
  local expiry = redis.pcall('EXPIRE', key, ${SAFETY_TTL})
  if type(expiry) ~= 'number' then protected = false end
end
if not ok or not protected then return redis.error_reply('temporary verification operation failed') end
return {result, ttls}`
}

async function main() {
  const store = configuration()
  const scripts = await loadScripts()
  const namespace = `demo-agreement:probe:${randomBytes(24).toString('hex')}`
  const keys = Object.fromEntries(['counter', 'code', 'cooldown', 'recipient-hour', 'global-day', 'acceptance'].map(name => [name, `${namespace}:${name}`]))
  const allKeys = Object.values(keys)
  let cleanupConfirmed = false
  let passed = 0

  async function commands(values) {
    let response
    try {
      response = await fetch(`${store.url}/pipeline`, {
        method: 'POST',
        headers: { authorization: `Bearer ${store.token}`, 'content-type': 'application/json' },
        body: JSON.stringify(values), signal: AbortSignal.timeout(3000),
      })
    } catch { throw new ProbeFailure('Redis REST request failed or timed out.') }
    check(response.ok, `Redis REST request returned HTTP ${response.status}.`)
    let results
    try { results = await response.json() } catch { throw new ProbeFailure('Redis returned an invalid response.') }
    check(Array.isArray(results) && results.length === values.length, 'Redis returned an unexpected response shape.')
    for (const result of results) check(result && !result.error && Object.hasOwn(result, 'result'), 'Redis refused a required command or Lua operation.')
    return results.map(result => result.result)
  }

  async function evaluate(source, probeKeys, args = [], permanent = false) {
    const [result] = await commands([['EVAL', guarded(source, permanent), String(probeKeys.length), ...probeKeys, ...args]])
    check(Array.isArray(result) && result.length === 2 && Array.isArray(result[1]), 'Redis returned an unexpected Lua result.')
    return result
  }
  function pass(label) { passed++; console.log(`PASS ${label}`) }

  const reserveKeys = [keys.code, keys.cooldown, keys['recipient-hour'], keys['global-day']]
  const recipientHash = 'fixture-recipient-hash'
  const codeHash = 'fixture-code-hash'
  const email = 'redis-probe@example.invalid'
  const challenge = () => JSON.stringify({ email, recipientHash, codeHash, attempts: 0, expiresAt: Math.floor(Date.now() / 1000) + SAFETY_TTL })
  const verifyArgs = candidate => [candidate, recipientHash, String(Math.floor(Date.now() / 1000))]

  try {
    const [pong] = await commands([['PING']])
    check(pong === 'PONG', 'Redis PING did not return PONG.')
    pass('authenticated REST connectivity')

    const [basic, basicTtls] = await evaluate(`local created = redis.call('SET', KEYS[1], '1', 'NX', 'EX', ${SAFETY_TTL})
local duplicate = redis.call('SET', KEYS[1], '2', 'NX')
local existingExpiry = redis.call('EXPIRE', KEYS[1], ${SAFETY_TTL}, 'NX')
redis.call('PERSIST', KEYS[1])
local firstExpiry = redis.call('EXPIRE', KEYS[1], ${SAFETY_TTL}, 'NX')
local incremented = redis.call('INCR', KEYS[1])
local before = redis.call('PTTL', KEYS[1])
redis.call('SET', KEYS[1], '3', 'KEEPTTL')
local after = redis.call('PTTL', KEYS[1])
return {created, duplicate == false and 1 or 0, existingExpiry, firstExpiry, incremented, before, after, redis.call('GET', KEYS[1])}`, [keys.counter])
    check(Array.isArray(basic) && basic[0] === 'OK' && basic[1] === 1 && basic[2] === 0 && basic[3] === 1 && basic[4] === 2 && basic[5] > 0 && basic[6] > 0 && basic[6] <= basic[5] && basic[7] === '3' && basicTtls[0] > 0, 'Required write, NX, increment, or TTL behavior failed.')
    pass('writable Lua, SET NX, INCR, EXPIRE NX, and SET KEEPTTL')

    const [reserved, reserveTtls] = await evaluate(scripts.RESERVE_CODE, reserveKeys, [challenge(), String(SAFETY_TTL)])
    check(reserved === 'ok' && reserveTtls.every(ttl => ttl > 0), 'Current OTP reservation Lua failed.')
    const [cooldown] = await evaluate(scripts.RESERVE_CODE, reserveKeys, [challenge(), String(SAFETY_TTL)])
    check(cooldown === 'rate_limited', 'Current OTP resend cooldown failed.')
    pass('current multi-key OTP reservation and cooldown Lua')

    for (let attempt = 0; attempt < 5; attempt++) {
      const [rejected, ttls] = await evaluate(scripts.VERIFY_CODE, [keys.code], verifyArgs('fixture-wrong-code'))
      check(Array.isArray(rejected) && rejected[0] === 'code_invalid' && ttls[0] > 0, 'Current OTP invalid-code or TTL behavior failed.')
    }
    const [capped] = await evaluate(scripts.VERIFY_CODE, [keys.code], verifyArgs(codeHash))
    check(Array.isArray(capped) && capped[0] === 'rate_limited', 'Current OTP five-attempt cap failed.')
    pass('current OTP five-attempt cap and preserved expiry')

    await commands([['DEL', keys.code, keys.cooldown]])
    const [reissued] = await evaluate(scripts.RESERVE_CODE, reserveKeys, [challenge(), String(SAFETY_TTL)])
    check(reissued === 'ok', 'Current OTP reissue failed.')
    const [verified, consumedTtls] = await evaluate(scripts.VERIFY_CODE, [keys.code], verifyArgs(codeHash))
    check(Array.isArray(verified) && verified[0] === 'ok' && verified[1] === email && consumedTtls[0] === -2, 'Current OTP consumption failed.')
    const [replayed] = await evaluate(scripts.VERIFY_CODE, [keys.code], verifyArgs(codeHash))
    check(Array.isArray(replayed) && replayed[0] === 'code_expired', 'Current OTP replay protection failed.')
    pass('current OTP single-use verification and replay rejection')

    const fixture = JSON.stringify({ id: 'synthetic-live-probe', person: 'Synthetic verification fixture', accepted: true })
    const [saved, firstTtls] = await evaluate(scripts.SAVE_ACCEPTANCE, [keys.acceptance], [fixture])
    check(saved === fixture && firstTtls[0] === -1, 'Current acceptance creation did not retain an unexpired record inside Lua.')
    const changedFixture = JSON.stringify({ id: 'synthetic-live-probe', person: 'Must not replace original', accepted: true })
    const [retried, secondTtls] = await evaluate(scripts.SAVE_ACCEPTANCE, [keys.acceptance], [changedFixture], true)
    check(retried === fixture && secondTtls[0] === -1, 'Current acceptance idempotency or immutable-record behavior failed.')
    const [safeTtl] = await commands([['TTL', keys.acceptance]])
    check(typeof safeTtl === 'number' && safeTtl > 0 && safeTtl <= SAFETY_TTL, 'Acceptance probe safety expiry was not attached.')
    pass('current immutable acceptance Lua and no-TTL semantics; probe safety TTL restored')
  } finally {
    try {
      const [, remaining] = await commands([['DEL', ...allKeys], ['EXISTS', ...allKeys]])
      cleanupConfirmed = remaining === 0
    } catch { /* Never print raw provider errors or request details. */ }
    if (cleanupConfirmed) console.log('PASS temporary probe keys deleted; absence verified')
    else console.error(`Cleanup could not be confirmed; guarded operations attach a ${SAFETY_TTL}-second fallback TTL to temporary keys.`)
  }
  check(cleanupConfirmed, 'Probe checks completed, but cleanup could not be confirmed.')
  console.log(`Verified ${passed} groups of connectivity and application-command checks.`)
  console.log('Provider durability, backups, eviction policy, and deployed application credentials remain separate checks.')
}

main().catch(error => {
  console.error(error instanceof ProbeFailure ? error.message : 'Probe failed due to an unexpected local or transport error.')
  process.exitCode = 1
})
