import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'node:http'
import {
  fetchWithTimeout,
  FetchTimeoutError,
  resolveTimeoutMs,
  DEFAULT_TIMEOUT_MS,
} from '../src/utils/fetchWithTimeout.js'

/**
 * DT-15 — servidor HTTP real en 127.0.0.1. `/hang` acepta la conexión y no
 * responde nunca, que es justo el caso que antes colgaba las integraciones.
 */
let server
let baseUrl

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/ok') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    }
    // `/hang`: no se responde.
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
})

describe('DT-15 · fetchWithTimeout', () => {
  it('aborta ante un endpoint que no responde', async () => {
    const start = Date.now()
    const err = await fetchWithTimeout(`${baseUrl}/hang`, {}, 150).catch((e) => e)

    expect(err).toBeInstanceOf(FetchTimeoutError)
    expect(err.code).toBe('ETIMEDOUT')
    expect(err.message).toContain('150 ms')
    expect(Date.now() - start).toBeLessThan(2_000)
  })

  it('devuelve la respuesta cuando el endpoint contesta a tiempo', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/ok`, {}, 1_000)
    expect(res.ok).toBe(true)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('respeta la señal de quien llama y no la confunde con un timeout', async () => {
    const controller = new AbortController()
    const pending = fetchWithTimeout(`${baseUrl}/hang`, { signal: controller.signal }, 5_000)
    controller.abort()

    const err = await pending.catch((e) => e)
    expect(err).not.toBeInstanceOf(FetchTimeoutError)
    expect(err.name).toBe('AbortError')
  })
})

describe('DT-15 · resolveTimeoutMs', () => {
  it('usa INTEGRATION_HTTP_TIMEOUT_MS cuando es un entero positivo', () => {
    expect(resolveTimeoutMs({ INTEGRATION_HTTP_TIMEOUT_MS: '2500' })).toBe(2500)
  })

  it.each([undefined, '', 'abc', '0', '-5'])('cae al valor por defecto con %j', (value) => {
    expect(resolveTimeoutMs({ INTEGRATION_HTTP_TIMEOUT_MS: value })).toBe(DEFAULT_TIMEOUT_MS)
  })
})
