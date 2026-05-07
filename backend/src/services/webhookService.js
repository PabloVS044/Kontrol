import crypto from 'crypto'

export async function testWebhookConnection({ url, secret }) {
  if (!url) throw new Error('url es requerido.')

  const payload = {
    event: 'test',
    source: 'kontrol',
    timestamp: new Date().toISOString(),
    data: { message: 'Webhook conectado correctamente desde Kontrol.' },
  }

  const headers = { 'Content-Type': 'application/json' }
  if (secret) {
    headers['X-Kontrol-Signature'] = sign(payload, secret)
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  // 2xx = ok; anything else is a failure
  if (!res.ok) {
    throw new Error(`El webhook respondió con status ${res.status}.`)
  }
}

export async function sendWebhookEvent({ url, secret }, { event, data }) {
  if (!url) throw new Error('url es requerido.')

  const payload = {
    event,
    source: 'kontrol',
    timestamp: new Date().toISOString(),
    data,
  }

  const headers = { 'Content-Type': 'application/json' }
  if (secret) {
    headers['X-Kontrol-Signature'] = sign(payload, secret)
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Webhook error: ${res.status}`)
  }
}

function sign(payload, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
}
