const BASE = 'https://api.telegram.org/bot'

export async function testTelegramConnection({ bot_token, chat_id }) {
  if (!bot_token) throw new Error('bot_token es requerido.')
  if (!chat_id)   throw new Error('chat_id es requerido.')

  // Verify the token is valid first
  const meRes = await fetch(`${BASE}${bot_token}/getMe`)
  const me = await meRes.json()
  if (!me.ok) throw new Error('Bot token inválido.')

  // Send a test message
  await sendTelegramMessage({ bot_token, chat_id }, '✅ Kontrol conectado correctamente a Telegram.')
}

export async function sendTelegramMessage({ bot_token, chat_id }, text) {
  if (!bot_token) throw new Error('bot_token es requerido.')
  if (!chat_id)   throw new Error('chat_id es requerido.')

  const res = await fetch(`${BASE}${bot_token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' }),
  })

  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Telegram error: ${data.description ?? res.status}`)
  }
}
