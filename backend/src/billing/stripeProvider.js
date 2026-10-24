import Stripe from 'stripe'
import { InvalidBillingEventError, BillingNotConfiguredError } from './errors.js'
import { BILLING_INTERVALS, CURRENCY, PAID_PLAN_CODES, PLANS, planFromLookupKey, priceLookupKey } from './plans.js'

// PAY-1 — Adaptador de Stripe. Es el único archivo del backend que importa el
// SDK. Kontrol solo usa Stripe en modo de prueba: Stripe no opera en Guatemala
// y no se debe cobrar nada real, así que cualquier clave o evento de modo
// productivo se rechaza aquí mismo.

const TEST_SECRET_KEY = /^(sk|rk)_test_/

export const assertTestModeKey = (secretKey) => {
  if (secretKey && !TEST_SECRET_KEY.test(secretKey)) {
    throw new Error('STRIPE_SECRET_KEY must be a test-mode key (sk_test_ or rk_test_). Live keys are not allowed.')
  }
}

const toDate = (seconds) => (Number.isFinite(seconds) ? new Date(seconds * 1000) : null)
const idOf = (value) => (typeof value === 'string' ? value : value?.id ?? null)
const companyIdFrom = (metadata) => {
  const id = Number.parseInt(metadata?.id_empresa, 10)
  return Number.isInteger(id) ? id : null
}

// Desde la API 2025-03-31 el fin de período vive en cada ítem, no en la
// suscripción. Se leen los dos para no depender de la versión de la cuenta.
export const normalizeSubscription = (subscription) => {
  const item = subscription.items?.data?.[0]
  const fromKey = planFromLookupKey(item?.price?.lookup_key)
  return {
    id: subscription.id,
    customerId: idOf(subscription.customer),
    companyId: companyIdFrom(subscription.metadata),
    plan: fromKey?.plan ?? null,
    interval: fromKey?.interval ?? item?.price?.recurring?.interval ?? null,
    status: subscription.status,
    currentPeriodEnd: toDate(item?.current_period_end ?? subscription.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  }
}

// Saca de cada tipo de evento lo único que el servicio necesita. El estado no
// se toma del evento: el servicio vuelve a leer la suscripción del proveedor.
export const summarizeEvent = (event) => {
  const object = event.data?.object ?? {}
  let subscriptionId = null
  let companyId = null

  if (event.type.startsWith('checkout.session.')) {
    subscriptionId = idOf(object.subscription)
    companyId = companyIdFrom(object.metadata) ?? companyIdFrom({ id_empresa: object.client_reference_id })
  } else if (event.type.startsWith('customer.subscription.')) {
    subscriptionId = object.id
    companyId = companyIdFrom(object.metadata)
  } else if (event.type.startsWith('invoice.')) {
    const details = object.parent?.subscription_details
    subscriptionId = idOf(details?.subscription ?? object.subscription)
    companyId = companyIdFrom(details?.metadata)
  }

  return {
    id: event.id,
    type: event.type,
    subscriptionId,
    customerId: idOf(object.customer),
    companyId,
  }
}

export const createStripeProvider = ({ secretKey, webhookSecret, client } = {}) => {
  if (!secretKey) return null
  assertTestModeKey(secretKey)

  const stripe = client ?? new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 10_000 })
  const priceIds = new Map()

  const resolvePriceId = async (plan, interval) => {
    const lookupKey = priceLookupKey(plan, interval)
    if (priceIds.has(lookupKey)) return priceIds.get(lookupKey)

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
    const price = prices.data[0]
    if (!price) {
      throw new BillingNotConfiguredError(`Price "${lookupKey}" is not configured. Run npm run stripe:seed.`)
    }
    priceIds.set(lookupKey, price.id)
    return price.id
  }

  const retrieve = async (subscriptionId) =>
    normalizeSubscription(await stripe.subscriptions.retrieve(subscriptionId))

  return {
    name: 'stripe',
    configured: true,

    // Al proveedor no se le manda nombre ni correo de la empresa: solo su id
    // interno. Los datos de la demostración son sintéticos (anexo de
    // proveedores, reglas de la demostración TEST).
    async ensureCustomer({ companyId }) {
      const customer = await stripe.customers.create(
        {
          description: `Kontrol company #${companyId} (test mode)`,
          metadata: { id_empresa: String(companyId) },
        },
        { idempotencyKey: `kontrol-customer-${companyId}` }
      )
      return customer.id
    },

    async createCheckoutSession({ customerId, companyId, plan, interval, successUrl, cancelUrl }) {
      const metadata = { id_empresa: String(companyId) }
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: String(companyId),
        line_items: [{ price: await resolvePriceId(plan, interval), quantity: 1 }],
        metadata,
        subscription_data: { metadata },
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
      return { id: session.id, url: session.url }
    },

    getSubscription: retrieve,

    async changeSubscriptionPlan(subscriptionId, { plan, interval }) {
      const current = await stripe.subscriptions.retrieve(subscriptionId)
      const item = current.items?.data?.[0]
      if (!item) throw new Error(`Subscription ${subscriptionId} has no items.`)

      const updated = await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: item.id, price: await resolvePriceId(plan, interval) }],
        proration_behavior: 'create_prorations',
        cancel_at_period_end: false,
      })
      return normalizeSubscription(updated)
    },

    async createPortalSession({ customerId, returnUrl }) {
      const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
      return { url: session.url }
    },

    async cancelSubscription(subscriptionId) {
      return normalizeSubscription(await stripe.subscriptions.cancel(subscriptionId))
    },

    parseEvent(rawBody, signature) {
      if (!webhookSecret) throw new BillingNotConfiguredError('STRIPE_WEBHOOK_SECRET is not configured.')
      if (!signature) throw new InvalidBillingEventError('Missing billing event signature.')

      let event
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
      } catch {
        throw new InvalidBillingEventError()
      }
      if (event.livemode) throw new InvalidBillingEventError('Live-mode events are not accepted.')
      return summarizeEvent(event)
    },
  }
}

// Crea en la cuenta de prueba los productos y precios del catálogo. Es
// idempotente: un precio que ya existe con el mismo importe se deja como está;
// si el importe cambió en plans.js se crea uno nuevo y se le pasa la
// lookup_key. Lo usa `npm run stripe:seed`.
export const seedStripeCatalog = async ({ secretKey, client, log = () => {} }) => {
  assertTestModeKey(secretKey)
  if (!secretKey && !client) throw new BillingNotConfiguredError('STRIPE_SECRET_KEY is not set.')
  const stripe = client ?? new Stripe(secretKey)
  const summary = []

  for (const code of PAID_PLAN_CODES) {
    const productId = `kontrol_${code}`
    let product
    try {
      product = await stripe.products.retrieve(productId)
    } catch (error) {
      if (error?.statusCode !== 404 && error?.code !== 'resource_missing') throw error
      product = await stripe.products.create({
        id: productId,
        name: `Kontrol ${code === 'pro' ? 'Pro' : 'Business'} (test mode)`,
        metadata: { kontrol_plan: code },
      })
      log(`Created product ${productId}`)
    }

    for (const interval of BILLING_INTERVALS) {
      const lookupKey = priceLookupKey(code, interval)
      const amount = PLANS[code].prices[interval]
      const existing = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0]

      if (existing && existing.unit_amount === amount && existing.currency === CURRENCY) {
        summary.push({ lookupKey, priceId: existing.id, created: false })
        continue
      }

      const price = await stripe.prices.create({
        product: product.id,
        currency: CURRENCY,
        unit_amount: amount,
        recurring: { interval },
        lookup_key: lookupKey,
        transfer_lookup_key: Boolean(existing),
        metadata: { kontrol_plan: code, kontrol_interval: interval },
      })
      log(`Created price ${lookupKey} (${price.id})`)
      summary.push({ lookupKey, priceId: price.id, created: true })
    }
  }

  return summary
}
