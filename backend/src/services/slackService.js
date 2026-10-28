// La validación SSRF va dentro de fetchPublicUrl: ningún envío puede saltársela.
import { fetchPublicUrl } from '../utils/httpTransport.js'

export async function testSlackConnection({ webhook_url, channel }) {
  if (!webhook_url) throw new Error('webhook_url es requerido.')

  const res = await fetchPublicUrl(webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `✅ Kontrol conectado correctamente${channel ? ` al canal *${channel}*` : ''}.`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Slack respondió con error: ${text}`)
  }
}

export async function sendSlackNotification({ webhook_url }, { text, blocks } = {}) {
  if (!webhook_url) throw new Error('webhook_url es requerido.')

  const res = await fetchPublicUrl(webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, blocks }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Slack error: ${body}`)
  }
}
