const TWILIO_BASE = 'https://api.twilio.com/2010-04-01'

export async function testTwilioSmsConnection({ account_sid, auth_token, from_number, to_number }) {
  if (!account_sid)  throw new Error('account_sid es requerido.')
  if (!auth_token)   throw new Error('auth_token es requerido.')
  if (!from_number)  throw new Error('from_number es requerido.')
  if (!to_number)    throw new Error('to_number es requerido.')

  await sendSms({ account_sid, auth_token, from_number, to_number }, 'Kontrol conectado correctamente. Este es un mensaje de prueba.')
}

export async function sendSms({ account_sid, auth_token, from_number, to_number }, body) {
  if (!account_sid) throw new Error('account_sid es requerido.')

  const auth = Buffer.from(`${account_sid}:${auth_token}`).toString('base64')

  const params = new URLSearchParams({ From: from_number, To: to_number, Body: body })

  const res = await fetch(`${TWILIO_BASE}/Accounts/${account_sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.message ?? `Twilio error: ${res.status}`)
  }
}
