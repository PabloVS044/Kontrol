import { describe, it, expect, beforeEach, vi } from 'vitest'

// PAY-1 — Estas pruebas no son del control por plan (billingPlanAccess.test.js):
// la empresa tiene el plan Business para que el módulo esté disponible.
vi.mock('../src/services/billingService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getCompanyPlan: vi.fn(async () => 'business'),
}))

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
import { transport } from '../src/utils/httpTransport.js'
import { sendWebhookEvent } from '../src/services/webhookService.js'
import { sendSlackNotification } from '../src/services/slackService.js'
import { sendTeamsNotification } from '../src/services/teamsService.js'

const app = buildTestApp()
// Webhook, Slack y Teams salen por `fetchPublicUrl` (DT-18): la validación es
// la real y solo se sustituye el socket. Que `send` no se llame es lo que
// demuestra que no hubo salida a la red.
const sendMock = vi.fn()
transport.send = sendMock

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
  sendMock.mockResolvedValue(new Response('', { status: 200 }))
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
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('S2 · privada: bloquea 10.0.0.5 sin hacer la petición', async () => {
    encolarIntegracion({ url: 'http://10.0.0.5/admin' })

    const res = await probar('webhook')

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('S3 · enlace local: bloquea 169.254.169.254 sin hacer la petición', async () => {
    encolarIntegracion({ url: 'http://169.254.169.254/latest/meta-data/' })

    const res = await probar('webhook')

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('S4 · pública: una URL legítima sí sale y responde 200', async () => {
    encolarIntegracion({ url: 'https://hooks.example.com/services/abc' })

    const res = await probar('webhook')

    expect(res.status).toBe(200)
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toBe('https://hooks.example.com/services/abc')
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
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('S6b · teams: bloquea webhook_url hacia una privada sin hacer la petición', async () => {
    encolarIntegracion({ webhook_url: 'http://192.168.1.10/webhook' })

    const res = await probar('microsoft-teams')

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })
})

/**
 * RTF 2, hallazgos 3.1 a 3.3 (SEC-01). Los tres caminos que el guard de DT-12
 * dejaba abiertos, verificados en SCRUM-52 sobre el ambiente desplegado.
 */
describe('SSRF · caminos abiertos de DT-18', () => {
  it.each([
    ['0.0.0.0', 'http://0.0.0.0:3000/api/health'],
    ['0 abreviado', 'http://0:3000/api/health'],
    ['IPv6 sin especificar', 'http://[::]:3000/api/health'],
    ['IPv6 mapeada a IPv4', 'http://[::ffff:127.0.0.1]:3000/api/health'],
    ['IPv6 mapeada, en hexadecimal', 'http://[::ffff:7f00:1]:3000/api/health'],
    ['IPv4 compatible', 'http://[::127.0.0.1]:3000/api/health'],
    ['NAT64 hacia loopback', 'http://[64:ff9b::7f00:1]/'],
    ['6to4 hacia una privada', 'http://[2002:a00:1::]/'],
    ['CGNAT (metadatos de algunas nubes)', 'http://100.100.100.200/latest/meta-data/'],
    ['decimal', 'http://2130706433:3000/api/health'],
    ['abreviada', 'http://127.1:3000/api/health'],
  ])('S7 · %s: el probador bloquea sin hacer la petición', async (_caso, url) => {
    encolarIntegracion({ url })

    const res = await probar('webhook')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('La URL debe apuntar a un host público.')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('S8 · un host cuyo DNS resuelve a loopback se bloquea antes de conectar', async () => {
    lookup.mockResolvedValue([{ address: '::ffff:127.0.0.1', family: 6 }])
    encolarIntegracion({ url: 'https://rebind.example.com/hook' })

    const res = await probar('webhook')

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('S9 · una redirección no se sigue: el probador informa el 302 y no hay segunda salida', async () => {
    sendMock.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: 'http://127.0.0.1:3000/api/health' } })
    )
    encolarIntegracion({ url: 'https://httpbin.example.com/redirect-to' })

    const res = await probar('webhook')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('El webhook respondió con status 302.')
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toBe('https://httpbin.example.com/redirect-to')
  })

  it.each([
    ['sendWebhookEvent', () => sendWebhookEvent({ url: 'http://127.0.0.1:3000/' }, { event: 'e', data: {} })],
    ['sendSlackNotification', () => sendSlackNotification({ webhook_url: 'http://[::ffff:7f00:1]/' }, { text: 'x' })],
    ['sendTeamsNotification', () => sendTeamsNotification({ webhook_url: 'http://0.0.0.0/' }, { text: 'x' })],
  ])('S10 · %s aplica el guard antes de enviar', async (_nombre, enviar) => {
    await expect(enviar()).rejects.toThrow('La URL debe apuntar a un host público.')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('S11 · al guardar, una url interna se rechaza con 400 y no se persiste', async () => {
    pool.query
      .mockResolvedValueOnce(companyMembership('owner'))
      .mockResolvedValueOnce(dbRows([]))

    const res = await auth(request(app).put('/api/integrations/webhook')).send({
      credentials: { url: 'http://169.254.169.254/latest/meta-data/' },
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('La URL debe apuntar a un host público.')
    // Membresía y lectura de la configuración previa; ningún INSERT.
    expect(pool.query).toHaveBeenCalledTimes(2)
  })

  it('S12 · al guardar, una url pública se acepta', async () => {
    pool.query
      .mockResolvedValueOnce(companyMembership('owner'))
      .mockResolvedValueOnce(dbRows([]))
      .mockResolvedValueOnce(dbRows([]))

    const res = await auth(request(app).put('/api/integrations/webhook')).send({
      credentials: { url: 'https://hooks.example.com/services/abc' },
    })

    expect(res.status).toBe(200)
    expect(pool.query).toHaveBeenCalledTimes(3)
  })
})
