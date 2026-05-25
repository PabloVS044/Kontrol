const GRAPH_BASE = 'https://graph.facebook.com/v25.0'

export async function testWhatsAppConnection({ access_token, phone_number_id, to_number }) {
  if (!access_token)    throw new Error('access_token es requerido.')
  if (!phone_number_id) throw new Error('phone_number_id es requerido.')

  const res = await fetch(`${GRAPH_BASE}/${phone_number_id}?fields=display_phone_number,verified_name`, {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  const data = await res.json()

  if (res.status === 401 || data?.error?.code === 190) {
    throw new Error('Token de acceso inválido o expirado.')
  }
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Meta API respondió con error: ${res.status}`)
  }

  if (to_number) {
    const normalized = to_number.replace(/\D/g, '')
    const msgRes = await fetch(`${GRAPH_BASE}/${phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalized,
        type: 'template',
        template: { name: 'hello_world', language: { code: 'en_US' } },
      }),
    })
    const msgData = await msgRes.json()
    if (!msgRes.ok) {
      throw new Error(msgData?.error?.message ?? `WhatsApp API error: ${msgRes.status}`)
    }
  }
}

export async function sendWhatsAppMessage({ access_token, phone_number_id, to_number }, text) {
  if (!access_token)    throw new Error('access_token es requerido.')
  if (!phone_number_id) throw new Error('phone_number_id es requerido.')
  if (!to_number)       throw new Error('to_number es requerido.')

  const normalizedNumber = to_number.replace(/\D/g, '')

  const res = await fetch(`${GRAPH_BASE}/${phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedNumber,
      type: 'text',
      text: { body: text },
    }),
  })

  const data = await res.json()

  console.log('[WhatsApp API response]', JSON.stringify(data, null, 2))

  if (!res.ok) {
    throw new Error(data?.error?.message ?? `WhatsApp API error: ${res.status}`)
  }
}
