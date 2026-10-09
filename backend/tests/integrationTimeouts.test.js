import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createServer } from 'node:http'

// Las funciones `test*` de webhook, Slack y Teams pasan por el guard SSRF,
// que resuelve DNS. Se mockea con una IP pública para no depender de la red.
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }))

import { lookup } from 'node:dns/promises'
import { FetchTimeoutError } from '../src/utils/fetchWithTimeout.js'
import { testWebhookConnection, sendWebhookEvent } from '../src/services/webhookService.js'
import { testSlackConnection, sendSlackNotification } from '../src/services/slackService.js'
import { testTeamsConnection, sendTeamsNotification } from '../src/services/teamsService.js'
import { testTelegramConnection, sendTelegramMessage } from '../src/services/telegramService.js'
import { testTwilioSmsConnection, sendSms } from '../src/services/twilioSmsService.js'
import { testSendGridConnection, sendEmail } from '../src/services/sendgridService.js'

/**
 * DT-15 — criterio de aceptación: las seis integraciones usan el envoltorio
 * con tiempo de espera y lo demuestran ante un endpoint que no responde.
 *
 * Telegram, Twilio y SendGrid llevan la URL fija en el código, así que el
 * `fetch` global se sustituye por uno que redirige cualquier URL a un
 * servidor real en 127.0.0.1 que acepta la conexión y no responde nunca. La
 * señal que pone el envoltorio llega intacta al `fetch` real.
 */
const TIMEOUT_MS = 100
const realFetch = globalThis.fetch
let server
let hangUrl
const previousTimeout = process.env.INTEGRATION_HTTP_TIMEOUT_MS

beforeAll(async () => {
  server = createServer(() => {})
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  hangUrl = `http://127.0.0.1:${server.address().port}/hang`
  process.env.INTEGRATION_HTTP_TIMEOUT_MS = String(TIMEOUT_MS)
  vi.stubGlobal('fetch', (_url, options) => realFetch(hangUrl, options))
})

afterAll(async () => {
  vi.unstubAllGlobals()
  if (previousTimeout === undefined) delete process.env.INTEGRATION_HTTP_TIMEOUT_MS
  else process.env.INTEGRATION_HTTP_TIMEOUT_MS = previousTimeout
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
})

beforeEach(() => {
  lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
})

const webhookUrl = 'https://hooks.example.com/kontrol'
const twilio = { account_sid: 'AC123', auth_token: 'tok', from_number: '+100', to_number: '+200' }
const telegram = { bot_token: '123:abc', chat_id: '42' }
const sendgrid = { api_key: 'SG.key', from_email: 'noreply@example.com' }

const casos = [
  ['webhook · test', () => testWebhookConnection({ url: webhookUrl, secret: 's' })],
  ['webhook · envío', () => sendWebhookEvent({ url: webhookUrl }, { event: 'e', data: {} })],
  ['Slack · test', () => testSlackConnection({ webhook_url: webhookUrl })],
  ['Slack · envío', () => sendSlackNotification({ webhook_url: webhookUrl }, { text: 'hola' })],
  ['Teams · test', () => testTeamsConnection({ webhook_url: webhookUrl })],
  ['Teams · envío', () => sendTeamsNotification({ webhook_url: webhookUrl }, { text: 'hola' })],
  ['Telegram · test', () => testTelegramConnection(telegram)],
  ['Telegram · envío', () => sendTelegramMessage(telegram, 'hola')],
  ['Twilio · test', () => testTwilioSmsConnection(twilio)],
  ['Twilio · envío', () => sendSms(twilio, 'hola')],
  ['SendGrid · test', () => testSendGridConnection(sendgrid)],
  ['SendGrid · envío', () => sendEmail(sendgrid, { to: 'a@example.com', subject: 's', text: 't' })],
]

describe('DT-15 · Integraciones ante un endpoint que no responde', () => {
  it.each(casos)('%s corta por timeout en lugar de quedarse colgada', async (_nombre, llamar) => {
    const start = Date.now()
    const err = await llamar().catch((e) => e)

    expect(err).toBeInstanceOf(FetchTimeoutError)
    expect(err.timeoutMs).toBe(TIMEOUT_MS)
    expect(Date.now() - start).toBeLessThan(2_000)
  })
})
