import { z } from 'zod'
import { BILLING_INTERVALS, PAID_PLAN_CODES } from '../billing/plans.js'

// PAY-1 — El cliente solo elige plan e intervalo. Precio, importe y empresa
// los decide el servidor.
export const planSelectionSchema = z.object({
  plan: z.enum(PAID_PLAN_CODES, { message: `Plan must be one of: ${PAID_PLAN_CODES.join(', ')}.` }),
  interval: z.enum(BILLING_INTERVALS, { message: `Interval must be one of: ${BILLING_INTERVALS.join(', ')}.` }),
})
