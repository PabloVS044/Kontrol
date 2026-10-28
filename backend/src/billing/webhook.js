import express from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getBillingProvider } from './provider.js'
import { handleBillingEvent } from '../services/billingService.js'
import { logger } from '../utils/logger.js'

export const BILLING_WEBHOOK_PATH = '/api/billing/webhook'

// PAY-1 — Recepción de eventos de la pasarela. Sin sesión: lo que autentica la
// petición es la firma, y para verificarla hace falta el cuerpo exacto que se
// firmó, sin parsear. Por eso se monta antes de express.json().
export const receiveBillingWebhook = async (req, res) => {
  const provider = getBillingProvider()

  let event
  try {
    event = provider.parseEvent(req.body, req.get(provider.signatureHeader ?? 'stripe-signature'))
  } catch (error) {
    const status = error.status === 503 ? 503 : 400
    logger.warn(`[billing] Rejected webhook: ${error.message}`)
    return res.status(status).json({ success: false, message: error.message })
  }

  const result = await handleBillingEvent(event, { provider })
  return res.json({ success: true, data: { received: true, status: result.status } })
}

export const mountBillingWebhook = (app) => {
  app.post(
    BILLING_WEBHOOK_PATH,
    express.raw({ type: 'application/json', limit: '256kb' }),
    asyncHandler(receiveBillingWebhook)
  )
}
