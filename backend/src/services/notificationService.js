import pool from '../db/pool.js'
import { decryptCredentials } from './integrationService.js'
import { sendSlackNotification } from './slackService.js'
import { sendTeamsNotification } from './teamsService.js'
import { sendTelegramMessage } from './telegramService.js'
import { sendSms } from './twilioSmsService.js'
import { sendWebhookEvent } from './webhookService.js'

/**
 * Dispatches a notification to every active integration of a company.
 * Fire-and-forget: errors are logged but never bubble up to the caller.
 */
export async function notifyCompany(id_empresa, { title, text, event = 'alert', data = {} }) {
  let rows
  try {
    const result = await pool.query(
      `SELECT slug, credentials_enc FROM public.integracion
       WHERE id_empresa = $1 AND status = 'active'`,
      [id_empresa],
    )
    rows = result.rows
  } catch (err) {
    console.error('[notify] DB error:', err.message)
    return
  }

  const message = title ? `*${title}*\n${text}` : text

  await Promise.allSettled(
    rows.map(({ slug, credentials_enc }) => {
      const creds = decryptCredentials(credentials_enc)
      if (!creds) return Promise.resolve()
      return dispatch(slug, creds, { title, text, message, event, data })
    }),
  )
}

async function dispatch(slug, creds, { title, text, message, event, data }) {
  switch (slug) {
    case 'slack':
      return sendSlackNotification(creds, { text: message })

    case 'microsoft-teams':
      return sendTeamsNotification(creds, { title, text })

    case 'telegram':
      return sendTelegramMessage(creds, message)

    case 'twilio-sms':
      return sendSms(creds, text)

    case 'webhook':
      return sendWebhookEvent(creds, { event, data: { title, text, ...data } })

    default:
      return Promise.resolve()
  }
}
