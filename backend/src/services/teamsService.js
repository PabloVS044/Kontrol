export async function testTeamsConnection({ webhook_url }) {
  if (!webhook_url) throw new Error('webhook_url es requerido.')

  const res = await fetch(webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: '✅ Kontrol conectado correctamente a Microsoft Teams.',
                wrap: true,
              },
            ],
          },
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Teams respondió con error: ${text}`)
  }
}

export async function sendTeamsNotification({ webhook_url }, { title, text }) {
  if (!webhook_url) throw new Error('webhook_url es requerido.')

  const body = title
    ? {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.4',
              body: [
                { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium' },
                { type: 'TextBlock', text, wrap: true },
              ],
            },
          },
        ],
      }
    : { type: 'message', text }

  const res = await fetch(webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Teams error: ${err}`)
  }
}
