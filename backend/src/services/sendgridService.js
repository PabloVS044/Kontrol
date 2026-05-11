export async function testSendGridConnection({ api_key }) {
  if (!api_key) throw new Error('api_key es requerido.')

  const res = await fetch('https://api.sendgrid.com/v3/user/account', {
    headers: { Authorization: `Bearer ${api_key}` },
  })

  if (res.status === 401) throw new Error('API Key inválida.')
  if (!res.ok) throw new Error(`SendGrid respondió con error: ${res.status}`)
}

export async function sendEmail({ api_key, from_email, from_name }, { to, subject, text, html }) {
  if (!api_key) throw new Error('api_key es requerido.')

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from_email, name: from_name ?? 'Kontrol' },
      subject,
      content: [{ type: html ? 'text/html' : 'text/plain', value: html ?? text }],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.errors?.[0]?.message ?? `SendGrid error: ${res.status}`)
  }
}
