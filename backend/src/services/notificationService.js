import pool from '../db/pool.js'
import { decryptCredentials } from './integrationService.js'
import { sendSlackNotification } from './slackService.js'
import { sendTeamsNotification } from './teamsService.js'
import { sendTelegramMessage } from './telegramService.js'
import { sendSms } from './twilioSmsService.js'
import { sendEmail } from './sendgridService.js'
import { sendWebhookEvent } from './webhookService.js'

/**
 * Dispatches a notification to every active integration of a company.
 * Fire-and-forget: errors are logged but never bubble up to the caller.
 * Failed dispatches flip the integration status to 'error' so the UI reflects it.
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

  const results = await Promise.allSettled(
    rows.map(({ slug, credentials_enc }) => {
      const creds = decryptCredentials(credentials_enc)
      if (!creds) return Promise.resolve()
      return dispatch(slug, creds, { title, text, message, event, data })
    }),
  )

  // Persist outcome for each integration: flip broken ones to 'error'
  await Promise.allSettled(
    rows.map(async ({ slug }, i) => {
      const result = results[i]
      const status = result.status === 'fulfilled' ? 'success' : 'error'
      const error_msg = result.status === 'rejected' ? (result.reason?.message ?? String(result.reason)) : null

      if (status === 'error') {
        console.error(`[notify] dispatch failed for ${slug}:`, error_msg)
        try {
          await pool.query(
            `UPDATE public.integracion SET status = 'error', updated_at = NOW()
             WHERE id_empresa = $1 AND slug = $2`,
            [id_empresa, slug],
          )
        } catch (dbErr) {
          console.error(`[notify] failed to update status for ${slug}:`, dbErr.message)
        }
      }

      try {
        await pool.query(
          `INSERT INTO public.integracion_log (id_empresa, slug, event, status, error_msg)
           VALUES ($1, $2, $3, $4, $5)`,
          [id_empresa, slug, event, status, error_msg],
        )
      } catch (logErr) {
        console.error(`[notify] failed to write log for ${slug}:`, logErr.message)
      }
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

    case 'sendgrid':
      return sendEmail(creds, {
        to: creds.to_email,
        subject: title ?? 'Notificación de Kontrol',
        text,
      })

    case 'webhook':
      return sendWebhookEvent(creds, { event, data: { title, text, ...data } })

    default:
      return Promise.resolve()
  }
}
