import { describe, it, expect, vi, afterEach } from 'vitest'
import Stripe from 'stripe'
import {
  assertTestModeKey,
  createStripeProvider,
  normalizeSubscription,
  seedStripeCatalog,
  summarizeEvent,
} from '../src/billing/stripeProvider.js'
import { getBillingProvider, setBillingProvider } from '../src/billing/provider.js'

const WEBHOOK_SECRET = 'whsec_test_kontrol'
const realStripe = new Stripe('sk_test_kontrol')

const signed = (event, secret = WEBHOOK_SECRET) => {
  const payload = JSON.stringify(event)
  return {
    payload: Buffer.from(payload),
    signature: realStripe.webhooks.generateTestHeaderString({ payload, secret }),
  }
}

const subscriptionEvent = (overrides = {}) => ({
  id: 'evt_1',
  object: 'event',
  type: 'customer.subscription.updated',
  livemode: false,
  data: { object: { id: 'sub_1', customer: 'cus_1', metadata: { id_empresa: '7' } } },
  ...overrides,
})

describe('adaptador de Stripe: solo modo de prueba', () => {
  it('rechaza claves de producción', () => {
    expect(() => assertTestModeKey('sk_live_123')).toThrow(/test-mode key/)
    expect(() => createStripeProvider({ secretKey: 'rk_live_123' })).toThrow(/Live keys are not allowed/)
  })

  it('acepta claves de prueba', () => {
    expect(() => assertTestModeKey('sk_test_123')).not.toThrow()
    expect(() => assertTestModeKey('rk_test_123')).not.toThrow()
  })

  it('sin clave no hay adaptador y el puerto queda sin configurar', () => {
    expect(createStripeProvider({})).toBeNull()
  })
})

describe('verificación de la firma de eventos', () => {
  const provider = createStripeProvider({
    secretKey: 'sk_test_kontrol',
    webhookSecret: WEBHOOK_SECRET,
    client: realStripe,
  })

  it('acepta un evento firmado con el secreto del webhook', () => {
    const { payload, signature } = signed(subscriptionEvent())
    expect(provider.parseEvent(payload, signature)).toEqual({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      subscriptionId: 'sub_1',
      customerId: 'cus_1',
      companyId: 7,
    })
  })

  it('rechaza un evento sin firma', () => {
    const { payload } = signed(subscriptionEvent())
    expect(() => provider.parseEvent(payload, undefined)).toThrow(/Missing billing event signature/)
  })

  it('rechaza un evento firmado con otro secreto', () => {
    const { payload, signature } = signed(subscriptionEvent(), 'whsec_attacker')
    expect(() => provider.parseEvent(payload, signature)).toThrow(/Invalid billing event signature/)
  })

  it('rechaza un cuerpo alterado después de firmarlo', () => {
    const { signature } = signed(subscriptionEvent())
    const tampered = Buffer.from(JSON.stringify(subscriptionEvent({ id: 'evt_forged' })))
    expect(() => provider.parseEvent(tampered, signature)).toThrow(/Invalid billing event signature/)
  })

  it('rechaza eventos de modo productivo aunque la firma sea válida', () => {
    const { payload, signature } = signed(subscriptionEvent({ livemode: true }))
    expect(() => provider.parseEvent(payload, signature)).toThrow(/Live-mode events/)
  })

  it('sin secreto de webhook responde que no está configurado', () => {
    const noSecret = createStripeProvider({ secretKey: 'sk_test_x', client: realStripe })
    expect(() => noSecret.parseEvent(Buffer.from('{}'), 't=1,v1=x')).toThrow(/STRIPE_WEBHOOK_SECRET/)
  })
})

describe('normalización', () => {
  it('lee plan e intervalo de la lookup_key y el fin de período del ítem', () => {
    const result = normalizeSubscription({
      id: 'sub_1',
      customer: { id: 'cus_1' },
      metadata: { id_empresa: '3' },
      status: 'active',
      cancel_at_period_end: true,
      items: {
        data: [{ id: 'si_1', current_period_end: 1893456000, price: { lookup_key: 'kontrol_pro_yearly' } }],
      },
    })
    expect(result).toEqual({
      id: 'sub_1',
      customerId: 'cus_1',
      companyId: 3,
      plan: 'pro',
      interval: 'year',
      status: 'active',
      currentPeriodEnd: new Date(1893456000 * 1000),
      cancelAtPeriodEnd: true,
    })
  })

  it('un precio ajeno a Kontrol no da plan', () => {
    const result = normalizeSubscription({
      id: 'sub_2',
      customer: 'cus_2',
      metadata: {},
      status: 'active',
      items: { data: [{ price: { lookup_key: 'other', recurring: { interval: 'month' } } }] },
    })
    expect(result).toMatchObject({ plan: null, interval: 'month', companyId: null, currentPeriodEnd: null })
  })

  it('extrae la suscripción de checkout e invoice', () => {
    expect(
      summarizeEvent({
        id: 'evt_c',
        type: 'checkout.session.completed',
        data: { object: { subscription: 'sub_9', customer: 'cus_9', client_reference_id: '12', metadata: {} } },
      })
    ).toMatchObject({ subscriptionId: 'sub_9', companyId: 12 })

    expect(
      summarizeEvent({
        id: 'evt_i',
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_9',
            parent: { subscription_details: { subscription: 'sub_9', metadata: { id_empresa: '12' } } },
          },
        },
      })
    ).toMatchObject({ subscriptionId: 'sub_9', companyId: 12 })
  })

  it('un evento de otro tipo no trae suscripción', () => {
    expect(summarizeEvent({ id: 'evt_x', type: 'charge.succeeded', data: { object: {} } })).toMatchObject({
      subscriptionId: null,
      companyId: null,
    })
  })
})

describe('operaciones contra la API (cliente simulado)', () => {
  const buildClient = () => ({
    prices: { list: vi.fn().mockResolvedValue({ data: [{ id: 'price_pro_m' }] }) },
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_new' }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' }) } },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.test/p' }) } },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: 'sub_1',
        customer: 'cus_1',
        metadata: { id_empresa: '7' },
        status: 'active',
        items: { data: [{ id: 'si_1', price: { lookup_key: 'kontrol_pro_monthly' } }] },
      }),
      update: vi.fn().mockResolvedValue({
        id: 'sub_1',
        customer: 'cus_1',
        metadata: { id_empresa: '7' },
        status: 'active',
        items: { data: [{ id: 'si_1', price: { lookup_key: 'kontrol_business_yearly' } }] },
      }),
      cancel: vi.fn().mockResolvedValue({ id: 'sub_1', customer: 'cus_1', metadata: {}, status: 'canceled', items: { data: [] } }),
    },
  })

  it('crea el cliente sin datos personales, solo con el id de la empresa', async () => {
    const client = buildClient()
    const provider = createStripeProvider({ secretKey: 'sk_test_x', client })
    await expect(provider.ensureCustomer({ companyId: 7 })).resolves.toBe('cus_new')
    const [params, options] = client.customers.create.mock.calls[0]
    expect(params).toEqual({ description: 'Kontrol company #7 (test mode)', metadata: { id_empresa: '7' } })
    expect(options).toEqual({ idempotencyKey: 'kontrol-customer-7' })
  })

  it('abre un Checkout hospedado con el precio resuelto por lookup_key', async () => {
    const client = buildClient()
    const provider = createStripeProvider({ secretKey: 'sk_test_x', client })
    const session = await provider.createCheckoutSession({
      customerId: 'cus_1',
      companyId: 7,
      plan: 'pro',
      interval: 'month',
      successUrl: 'https://app/billing?checkout=success',
      cancelUrl: 'https://app/billing?checkout=cancel',
    })
    expect(session).toEqual({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' })
    expect(client.prices.list).toHaveBeenCalledWith({ lookup_keys: ['kontrol_pro_monthly'], active: true, limit: 1 })
    expect(client.checkout.sessions.create.mock.calls[0][0]).toMatchObject({
      mode: 'subscription',
      line_items: [{ price: 'price_pro_m', quantity: 1 }],
      subscription_data: { metadata: { id_empresa: '7' } },
    })
  })

  it('guarda en caché el id del precio', async () => {
    const client = buildClient()
    const provider = createStripeProvider({ secretKey: 'sk_test_x', client })
    const args = { customerId: 'c', companyId: 1, plan: 'pro', interval: 'month', successUrl: 's', cancelUrl: 'c' }
    await provider.createCheckoutSession(args)
    await provider.createCheckoutSession(args)
    expect(client.prices.list).toHaveBeenCalledTimes(1)
  })

  it('si el precio no existe pide correr el seed', async () => {
    const client = buildClient()
    client.prices.list.mockResolvedValue({ data: [] })
    const provider = createStripeProvider({ secretKey: 'sk_test_x', client })
    await expect(
      provider.createCheckoutSession({ customerId: 'c', companyId: 1, plan: 'business', interval: 'year' })
    ).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/stripe:seed/) })
  })

  it('cambia de plan sobre el mismo ítem, con prorrateo', async () => {
    const client = buildClient()
    const provider = createStripeProvider({ secretKey: 'sk_test_x', client })
    const result = await provider.changeSubscriptionPlan('sub_1', { plan: 'business', interval: 'year' })
    expect(client.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      items: [{ id: 'si_1', price: 'price_pro_m' }],
      proration_behavior: 'create_prorations',
      cancel_at_period_end: false,
    })
    expect(result).toMatchObject({ plan: 'business', interval: 'year' })
  })

  it('abre el portal y cancela', async () => {
    const client = buildClient()
    const provider = createStripeProvider({ secretKey: 'sk_test_x', client })
    await expect(provider.createPortalSession({ customerId: 'cus_1', returnUrl: 'https://app' })).resolves.toEqual({
      url: 'https://billing.stripe.test/p',
    })
    await expect(provider.cancelSubscription('sub_1')).resolves.toMatchObject({ status: 'canceled' })
    await expect(provider.getSubscription('sub_1')).resolves.toMatchObject({ plan: 'pro', companyId: 7 })
  })
})

describe('puerto del proveedor', () => {
  afterEach(() => {
    setBillingProvider(null)
    vi.unstubAllEnvs()
  })

  it('sin credenciales responde 503 en cada operación', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    setBillingProvider(null)
    const provider = getBillingProvider()
    expect(provider.configured).toBe(false)
    await expect(provider.ensureCustomer({ companyId: 1 })).rejects.toMatchObject({ status: 503 })
    expect(() => provider.parseEvent(Buffer.from('{}'), 'x')).toThrow(/not configured/)
  })

  it('un proveedor desconocido es un error de configuración', () => {
    vi.stubEnv('BILLING_PROVIDER', 'paypal')
    setBillingProvider(null)
    expect(() => getBillingProvider()).toThrow(/Unknown BILLING_PROVIDER/)
  })

  it('permite inyectar un proveedor en pruebas', () => {
    const fake = { name: 'fake' }
    setBillingProvider(fake)
    expect(getBillingProvider()).toBe(fake)
  })
})

describe('seed del catálogo en la cuenta de prueba', () => {
  const buildClient = (existing = {}) => ({
    products: {
      retrieve: vi.fn(async (id) => {
        if (existing.products?.includes(id)) return { id }
        throw Object.assign(new Error('No such product'), { statusCode: 404 })
      }),
      create: vi.fn(async ({ id }) => ({ id })),
    },
    prices: {
      list: vi.fn(async ({ lookup_keys: [key] }) => ({ data: existing.prices?.[key] ? [existing.prices[key]] : [] })),
      create: vi.fn(async ({ lookup_key }) => ({ id: `price_${lookup_key}` })),
    },
  })

  it('crea dos productos y cuatro precios en una cuenta vacía', async () => {
    const client = buildClient()
    const summary = await seedStripeCatalog({ secretKey: 'sk_test_x', client })
    expect(client.products.create).toHaveBeenCalledTimes(2)
    expect(client.prices.create).toHaveBeenCalledTimes(4)
    expect(client.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({ lookup_key: 'kontrol_business_yearly', unit_amount: 49000, currency: 'usd' })
    )
    expect(summary.every((row) => row.created)).toBe(true)
  })

  it('no duplica lo que ya existe con el mismo importe', async () => {
    const prices = {
      kontrol_pro_monthly: { id: 'p1', unit_amount: 1900, currency: 'usd' },
      kontrol_pro_yearly: { id: 'p2', unit_amount: 19000, currency: 'usd' },
      kontrol_business_monthly: { id: 'p3', unit_amount: 4900, currency: 'usd' },
      kontrol_business_yearly: { id: 'p4', unit_amount: 1, currency: 'usd' },
    }
    const client = buildClient({ products: ['kontrol_pro', 'kontrol_business'], prices })
    await seedStripeCatalog({ secretKey: 'sk_test_x', client })
    expect(client.products.create).not.toHaveBeenCalled()
    expect(client.prices.create).toHaveBeenCalledTimes(1)
    expect(client.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({ lookup_key: 'kontrol_business_yearly', transfer_lookup_key: true })
    )
  })

  it('se niega a sembrar con una clave de producción', async () => {
    await expect(seedStripeCatalog({ secretKey: 'sk_live_x', client: buildClient() })).rejects.toThrow(/test-mode/)
  })
})
