import assert from 'node:assert/strict'

// Isolated model of the Redis REST operations used by the handlers. This checks
// application behavior and stored evidence, not execution of Lua in Redis.
export function createAgreementTestStore() {
  const values = new Map()
  const expirations = new Map()
  const calls = []
  let now = () => Date.now()
  const read = key => {
    if (expirations.has(key) && expirations.get(key) <= now()) {
      values.delete(key)
      expirations.delete(key)
    }
    return values.get(key)
  }
  const set = (key, value, seconds) => {
    values.set(key, value)
    if (seconds === undefined) expirations.delete(key)
    else expirations.set(key, now() + seconds * 1000)
  }
  const increase = (key, ttl) => {
    const previous = read(key)
    values.set(key, Number(previous ?? 0) + 1)
    if (previous === undefined) expirations.set(key, now() + ttl * 1000)
  }
  function evaluate(command) {
    assert.equal(command[0], 'EVAL')
    const count = Number(command[2])
    const keys = command.slice(3, 3 + count)
    const args = command.slice(3 + count)
    const operation = command[1].split('\n')[0]
    if (operation === '-- demo-agreement:reserve-code') {
      assert.equal(count, 4)
      if (read(keys[1]) !== undefined || Number(read(keys[2]) ?? 0) >= 3 || Number(read(keys[3]) ?? 0) >= 200) return 'rate_limited'
      increase(keys[2], 3600)
      increase(keys[3], 86400)
      set(keys[1], '1', 60)
      set(keys[0], args[0], Number(args[1]))
      return 'ok'
    }
    if (operation === '-- demo-agreement:verify-code') {
      assert.equal(count, 1)
      const value = read(keys[0])
      if (!value) return ['code_expired']
      const code = JSON.parse(value)
      if (code.expiresAt <= Number(args[2])) { values.delete(keys[0]); return ['code_expired'] }
      if (code.recipientHash !== args[1]) return ['code_invalid']
      if (code.attempts >= 5) return ['rate_limited']
      code.attempts++
      if (code.codeHash !== args[0]) { values.set(keys[0], JSON.stringify(code)); return ['code_invalid'] }
      values.delete(keys[0])
      return ['ok', code.email]
    }
    if (operation === '-- demo-agreement:save-acceptance') {
      assert.equal(count, 1)
      if (read(keys[0]) === undefined) set(keys[0], args[0])
      return read(keys[0])
    }
    throw new Error(`Unexpected Redis script ${operation}`)
  }
  return {
    values,
    expirations,
    calls,
    setClock(callback) { now = callback },
    records() { return [...values].filter(([key]) => key.startsWith('demo-agreement:acceptance:')).map(([, value]) => JSON.parse(value)) },
    async fetch(url, init) {
      assert.equal(new URL(url).pathname, '/pipeline')
      const commands = JSON.parse(init.body)
      calls.push(commands)
      return Response.json(commands.map(command => {
        if (command[0] === 'EVAL') return { result: evaluate(command) }
        if (command[0] === 'INCR') { increase(command[1], 3600); return { result: read(command[1]) } }
        if (command[0] === 'EXPIRE') return { result: 1 }
        throw new Error(`Unexpected Redis command ${command[0]}`)
      }))
    },
  }
}
