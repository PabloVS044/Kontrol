import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

// El guard resuelve nombres con node:dns/promises. Mockearlo mantiene las
// pruebas sin red y hace explícita la IP con la que se decide.
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }))

import request from 'supertest'
import pool from '../src/db/pool.js'
import { lookup } from 'node:dns/promises'
import { buildTestApp, signToken, companyMembership, dbRows } from './helpers/authTestApp.js'
import { encryptCredentials } from '../src/services/integrationService.js'

const app = buildTestApp()
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const auth = (req) => req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', '1')

// requireCompany, el SELECT de credenciales y el UPDATE de status.
const encolarIntegracion = (credentials) => {
  pool.query
    .mockResolvedValueOnce(companyMembership('owner'))
    .mockResolvedValueOnce(dbRows([{ credentials_enc: encryptCredentials(credentials) }]))
    .mockResolvedValueOnce(dbRows([]))
}

const probar = (slug) => auth(request(app).post(`/api/integrations/${slug}/test`))

beforeEach(() => {
  vi.resetAllMocks()
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' })
  lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
})

/**
 * El probador de integraciones hace fetch hacia una URL que guarda el propio
 * usuario. La aserción que importa en los casos bloqueados no es el 400 —el
 * endpoint ya respondía 400 cuando el destino fallaba— sino que el fetch no
 * llegue a ocurrir: es lo único que demuestra que no hubo salida a la red.
 */
describe('SSRF en el probador de integraciones (SCRUM-43 / DT-12)', () => {
  it('S1 · loopback: bloquea 127.0.0.1 sin hacer la petición', async () => {
    encolarIntegracion({ url: 'http://127.0.0.1:8080/' })

    const res = await probar('webhook')

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('S2 · privada: bloquea 10.0.0.5 sin hacer la petición', async () => {
    encolarIntegracion({ url: 'http://10.0.0.5/admin' })

    const res = await probar('webhook')

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('S3 · enlace local: bloquea 169.254.169.254 sin hacer la petición', async () => {
    encolarIntegracion({ url: 'http://169.254.169.254/latest/meta-data/' })

    const res = await probar('webhook')

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('S4 · pública: una URL legítima sí sale y responde 200', async () => {
    encolarIntegracion({ url: 'https://hooks.example.com/services/abc' })

    const res = await probar('webhook')

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://hooks.example.com/services/abc')
  })

  it('S5 · esquema: al guardar, una url que no es http/https se rechaza con 400', async () => {
    pool.query.mockResolvedValueOnce(companyMembership('owner'))

    const res = await auth(request(app).put('/api/integrations/webhook')).send({
      credentials: { url: 'javascript:alert(1)' },
    })

    expect(res.status).toBe(400)
    // Solo corrió la membresía: el esquema cortó antes del controlador.
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('S6a · slack: bloquea webhook_url hacia loopback sin hacer la petición', async () => {
    encolarIntegracion({ webhook_url: 'http://127.0.0.1/services/x' })

    const res = await probar('slack')

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('S6b · teams: bloquea webhook_url hacia una privada sin hacer la petición', async () => {
    encolarIntegracion({ webhook_url: 'http://192.168.1.10/webhook' })

    const res = await probar('microsoft-teams')

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
