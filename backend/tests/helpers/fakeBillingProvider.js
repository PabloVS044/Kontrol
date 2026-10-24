import { vi } from 'vitest'
import { InvalidBillingEventError } from '../../src/billing/errors.js'

// PAY-1 — Proveedor de pagos simulado. Cumple el mismo puerto que el adaptador
// de Stripe (src/billing/provider.js) sin salir a la red. Las suscripciones
// viven en memoria y los eventos se "firman" con VALID_SIGNATURE.

export const VALID_SIGNATURE = 'fake-valid-signature'

export const createFakeBillingProvider = () => {
  const subscriptions = new Map()
  let sequence = 0

  const provider = {
    name: 'fake',
    configured: true,
    subscriptions,

    // Deja una suscripción en el "proveedor" para que el servicio la relea.
    setSubscription(subscription) {
      const value = {
        customerId: 'cus_fake',
        interval: 'month',
        status: 'active',
        currentPeriodEnd: new Date('2030-01-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
        ...subscription,
      }
      subscriptions.set(value.id, value)
      return value
    },

    // Evento con la forma que devuelve parseEvent, listo para mandarlo al
    // webhook como cuerpo JSON.
    event(type, fields = {}) {
      sequence += 1
      return { id: `evt_fake_${sequence}`, type, ...fields }
    },

    ensureCustomer: vi.fn(async ({ companyId }) => `cus_fake_${companyId}`),

    createCheckoutSession: vi.fn(async ({ plan, interval }) => ({
      id: 'cs_fake',
      url: `https://checkout.fake/${plan}/${interval}`,
    })),

    getSubscription: vi.fn(async (id) => {
      const subscription = subscriptions.get(id)
      if (!subscription) throw new Error(`No such subscription: ${id}`)
      return { ...subscription }
    }),

    changeSubscriptionPlan: vi.fn(async (id, { plan, interval }) => {
      const subscription = subscriptions.get(id)
      if (!subscription) throw new Error(`No such subscription: ${id}`)
      Object.assign(subscription, { plan, interval, cancelAtPeriodEnd: false })
      return { ...subscription }
    }),

    createPortalSession: vi.fn(async ({ customerId }) => ({ url: `https://portal.fake/${customerId}` })),

    cancelSubscription: vi.fn(async (id) => {
      const subscription = subscriptions.get(id)
      if (!subscription) throw new Error(`No such subscription: ${id}`)
      subscription.status = 'canceled'
      return { ...subscription }
    }),

    parseEvent: vi.fn((rawBody, signature) => {
      if (signature !== VALID_SIGNATURE) throw new InvalidBillingEventError()
      return JSON.parse(Buffer.from(rawBody).toString('utf8'))
    }),
  }

  return provider
}
