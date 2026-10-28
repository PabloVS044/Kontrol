import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createServer } from 'node:http'

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }))

import { lookup } from 'node:dns/promises'
import { FetchTimeoutError } from '../src/utils/fetchWithTimeout.js'
import { MAX_BODY_BYTES, fetchPublicUrl, sendHttpRequest } from '../src/utils/httpTransport.js'

/**
 * DT-18 (RTF 2, SEC-01). Servidores HTTP reales en 127.0.0.1: el socket es el
 * de verdad y lo único simulado es el DNS. Cada servidor cuenta las peticiones
 * que recibe, que es lo que demuestra si hubo salida o no.
 *
 * Para llegar a 127.0.0.1 hay que pasar `isBlocked: () => false`; las pruebas
 * que no lo pasan usan el guard real.
 */
const servidores = []
const permitirLoopback = { isBlocked: () => false }

function levantar(handler) {
  const server = createServer((req, res) => {
    server.peticiones += 1
    handler(req, res)
  })
  server.peticiones = 0
  servidores.push(server)
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const puerto = (server) => server.address().port

let destino
let redirector
let colgado

beforeAll(async () => {
  destino = await levantar((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ method: req.method, body, length: req.headers['content-length'] }))
    })
  })
  redirector = await levantar((_req, res) => {
    res.writeHead(302, { Location: `http://127.0.0.1:${puerto(destino)}/interno` })
    res.end()
  })
  colgado = await levantar(() => {})
})

afterAll(async () => {
  for (const server of servidores) {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})

beforeEach(() => {
  vi.resetAllMocks()
  destino.peticiones = 0
})

describe('fetchPublicUrl · DNS rebinding', () => {
  it('valida la IP al conectar: si el DNS cambia a loopback no hay conexión', async () => {
    // El primer lookup (la comprobación previa) ve una IP pública; el del
    // socket, 127.0.0.1. Es exactamente el ataque de rebinding.
    lookup
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
      .mockResolvedValue([{ address: '127.0.0.1', family: 4 }])

    const err = await fetchPublicUrl(`http://rebind.example.com:${puerto(destino)}/`).catch((e) => e)

    expect(err.message).toBe('La URL debe apuntar a un host público.')
    expect(lookup).toHaveBeenCalledTimes(2)
    expect(destino.peticiones).toBe(0)
  })
})

describe('sendHttpRequest', () => {
  beforeEach(() => {
    lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
  })

  it('conecta a la IP que dio el lookup y devuelve un Response', async () => {
    const res = await sendHttpRequest(
      `http://hooks.example.com:${puerto(destino)}/x`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' },
      permitirLoopback
    )

    expect(res).toBeInstanceOf(Response)
    expect(res.ok).toBe(true)
    expect(await res.json()).toEqual({ method: 'POST', body: '{"a":1}', length: '7' })
    expect(destino.peticiones).toBe(1)
  })

  it('no sigue redirecciones: devuelve el 302 y el destino no recibe nada', async () => {
    const res = await sendHttpRequest(`http://redirect.example.com:${puerto(redirector)}/`, {}, permitirLoopback)

    expect(res.status).toBe(302)
    expect(res.ok).toBe(false)
    expect(res.headers.get('location')).toContain('/interno')
    expect(destino.peticiones).toBe(0)
  })

  it('corta con FetchTimeoutError ante un servidor que no responde', async () => {
    const start = Date.now()
    const err = await sendHttpRequest(
      `http://hang.example.com:${puerto(colgado)}/`,
      {},
      { ...permitirLoopback, timeoutMs: 100 }
    ).catch((e) => e)

    expect(err).toBeInstanceOf(FetchTimeoutError)
    expect(err.timeoutMs).toBe(100)
    expect(Date.now() - start).toBeLessThan(2_000)
  })

  it(`limita el cuerpo leído a ${MAX_BODY_BYTES} bytes`, async () => {
    const grande = await levantar((_req, res) => {
      res.writeHead(500)
      res.end('x'.repeat(MAX_BODY_BYTES * 4))
    })

    const res = await sendHttpRequest(`http://big.example.com:${puerto(grande)}/`, {}, permitirLoopback)

    expect(res.status).toBe(500)
    expect((await res.text()).length).toBe(MAX_BODY_BYTES)
  })

  it('con el guard real, un lookup a loopback no conecta', async () => {
    const err = await sendHttpRequest(`http://interno.example.com:${puerto(destino)}/`).catch((e) => e)

    expect(err.code).toBe('ESSRFBLOCKED')
    expect(destino.peticiones).toBe(0)
  })
})
