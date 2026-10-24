import { createStripeProvider } from './stripeProvider.js'
import { BillingNotConfiguredError } from './errors.js'

export { BillingNotConfiguredError, InvalidBillingEventError } from './errors.js'

// PAY-1 — Puerto de la pasarela de pago. El resto del backend habla con este
// contrato y nunca importa el SDK de un proveedor: cambiar Stripe por una
// pasarela que opere en Guatemala es escribir otro adaptador con estas mismas
// operaciones y elegirlo con BILLING_PROVIDER.
//
// Operaciones del adaptador:
//   name                                    nombre guardado en empresa_suscripcion.proveedor
//   ensureCustomer({ companyId })           -> customerId
//   createCheckoutSession({ customerId, companyId, plan, interval, successUrl, cancelUrl })
//                                           -> { id, url }   (página de pago hospedada)
//   getSubscription(subscriptionId)         -> suscripción normalizada (ver abajo)
//   changeSubscriptionPlan(subscriptionId, { plan, interval }) -> suscripción normalizada
//   createPortalSession({ customerId, returnUrl }) -> { url } (portal hospedado)
//   cancelSubscription(subscriptionId)      -> suscripción normalizada
//   parseEvent(rawBody, signature)          -> { id, type, subscriptionId, customerId, companyId }
//                                              Verifica la firma; lanza InvalidBillingEventError si no vale.
//
// Suscripción normalizada:
//   { id, customerId, companyId, plan, interval, status, currentPeriodEnd: Date|null, cancelAtPeriodEnd }

const ADAPTERS = {
  stripe: () =>
    createStripeProvider({
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    }),
}

let cached = null
let override = null

// Sin credenciales el módulo no se cae: responde 503 en las operaciones de pago
// y todas las empresas quedan en el plan gratuito.
const unconfiguredProvider = (name) => {
  const fail = async () => {
    throw new BillingNotConfiguredError()
  }
  return {
    name,
    configured: false,
    ensureCustomer: fail,
    createCheckoutSession: fail,
    getSubscription: fail,
    changeSubscriptionPlan: fail,
    createPortalSession: fail,
    cancelSubscription: fail,
    parseEvent: () => {
      throw new BillingNotConfiguredError()
    },
  }
}

export const getBillingProvider = () => {
  if (override) return override
  if (cached) return cached

  const name = (process.env.BILLING_PROVIDER || 'stripe').trim().toLowerCase()
  const build = ADAPTERS[name]
  if (!build) throw new Error(`Unknown BILLING_PROVIDER "${name}".`)

  cached = build() ?? unconfiguredProvider(name)
  return cached
}

// Solo para pruebas: inyecta un proveedor simulado. `null` lo quita.
export const setBillingProvider = (provider) => {
  override = provider
  cached = null
}
