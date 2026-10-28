import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'

const db = vi.hoisted(() => ({ current: null }))
vi.mock('../src/db/pool.js', () => ({
  default: {
    query: (...args) => db.current.query(...args),
    connect: (...args) => db.current.connect(...args),
  },
}))

import { signToken } from './helpers/authTestApp.js'
import { createFakeBillingDb } from './helpers/fakeBillingDb.js'
import { createFakeBillingProvider } from './helpers/fakeBillingProvider.js'
import { setBillingProvider } from '../src/billing/provider.js'
import billingRoutes from '../src/routes/billingRoutes.js'
import { errorHandler } from '../src/middleware/errorHandler.js'

let provider

const app = () => {
  const instance = express()
  instance.use(express.json())
  instance.use('/api/billing', billingRoutes)
  instance.use(errorHandler)
  return instance
}

const as = (method, path, { role = 'owner', token = signToken(), company = '7' } = {}) => {
  db.current.state.role = role
  const req = request(app())[method](path)
  if (token) req.set('Authorization', `Bearer ${token}`)
  if (company) req.set('X-Company-ID', company)
  return req
}

const activeSubscription = (overrides = {}) => {
  db.current.state.subscriptions.set(7, {
    id_empresa: 7,
    proveedor: 'fake',
    id_cliente_proveedor: 'cus_7',
    id_suscripcion_proveedor: 'sub_7',
    plan: 'pro',
    intervalo: 'month',
    estado: 'active',
    fin_periodo_actual: '2030-01-01T00:00:00.000Z',
    cancelar_al_final: false,
    ...overrides,
  })
}

beforeEach(() => {
  // El límite de peticiones tiene su propia prueba (rateLimit.test.js).
  process.env.RATE_LIMIT_ENABLED = 'false'
  process.env.FRONTEND_URL = 'https://app.kontrol.test'
  db.current = createFakeBillingDb({ usage: { members: 2, projects: 1, products: 30 } })
  provider = createFakeBillingProvider()
  setBillingProvider(provider)
})

afterEach(() => {
  setBillingProvider(null)
  delete process.env.FRONTEND_URL
  delete process.env.RATE_LIMIT_ENABLED
})

describe('GET /api/billing/plans', () => {
  it('es público y declara el modo de prueba', async () => {
    const res = await request(app()).get('/api/billing/plans')
    expect(res.status).toBe(200)
    expect(res.body.data.testMode).toBe(true)
    expect(res.body.data.plans.map((plan) => plan.code)).toEqual(['free', 'pro', 'business'])
  })
})

describe('GET /api/billing/subscription', () => {
  it('sin token responde 401', async () => {
    const res = await as('get', '/api/billing/subscription', { token: null })
    expect(res.status).toBe(401)
  })

  it('un usuario ajeno a la empresa recibe 403', async () => {
    const res = await as('get', '/api/billing/subscription', { role: null })
    expect(res.status).toBe(403)
  })

  it('una empresa sin suscripción está en el plan gratuito, con su uso', async () => {
    const res = await as('get', '/api/billing/subscription', { role: 'collaborator' })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      plan: 'free',
      status: 'none',
      testMode: true,
      billingConfigured: true,
      canManage: false,
      limits: { members: 3, projects: 2, products: 100 },
      usage: { members: 2, projects: 1, products: 30 },
    })
  })

  it('el owner puede gestionar y ve el plan pagado vigente', async () => {
    activeSubscription({ cancelar_al_final: true })
    const res = await as('get', '/api/billing/subscription')
    expect(res.body.data).toMatchObject({
      plan: 'pro',
      status: 'active',
      interval: 'month',
      cancelAtPeriodEnd: true,
      canManage: true,
      hasBillingAccount: true,
    })
  })
})

describe('POST /api/billing/checkout', () => {
  it('el owner obtiene la URL del Checkout hospedado', async () => {
    const res = await as('post', '/api/billing/checkout').send({ plan: 'pro', interval: 'year' })
    expect(res.status).toBe(201)
    expect(res.body.data.url).toBe('https://checkout.fake/pro/year')

    const args = provider.createCheckoutSession.mock.calls[0][0]
    expect(args).toMatchObject({
      companyId: 7,
      customerId: 'cus_fake_7',
      successUrl: 'https://app.kontrol.test/billing?checkout=success',
      cancelUrl: 'https://app.kontrol.test/billing?checkout=cancel',
    })
    // El cliente queda registrado, pero el plan no cambia hasta el evento.
    expect(db.current.state.subscriptions.get(7)).toMatchObject({ id_cliente_proveedor: 'cus_fake_7', plan: 'free' })
  })

  it('reutiliza el cliente ya registrado', async () => {
    activeSubscription({ estado: 'canceled', id_cliente_proveedor: 'cus_existing' })
    await as('post', '/api/billing/checkout').send({ plan: 'business', interval: 'month' })
    expect(provider.ensureCustomer).not.toHaveBeenCalled()
    expect(provider.createCheckoutSession.mock.calls[0][0].customerId).toBe('cus_existing')
  })

  it.each(['admin', 'manager', 'collaborator'])('%s no puede contratar (403)', async (role) => {
    const res = await as('post', '/api/billing/checkout', { role }).send({ plan: 'pro', interval: 'month' })
    expect(res.status).toBe(403)
    expect(provider.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('super_user puede operar sin ser miembro', async () => {
    const res = await as('post', '/api/billing/checkout', {
      role: null,
      token: signToken({ nombre_rol: 'super_user' }),
    }).send({ plan: 'pro', interval: 'month' })
    expect(res.status).toBe(201)
  })

  it.each([
    [{ plan: 'free', interval: 'month' }],
    [{ plan: 'enterprise', interval: 'month' }],
    [{ plan: 'pro', interval: 'week' }],
    [{ plan: 'pro' }],
  ])('rechaza una selección inválida %j', async (body) => {
    const res = await as('post', '/api/billing/checkout').send(body)
    expect(res.status).toBe(400)
  })

  it('el precio no viaja desde el cliente', async () => {
    await as('post', '/api/billing/checkout').send({ plan: 'pro', interval: 'month', price: 1, amount: 0 })
    const args = provider.createCheckoutSession.mock.calls[0][0]
    expect(args).not.toHaveProperty('price')
    expect(args).not.toHaveProperty('amount')
  })

  it('con una suscripción pagada vigente responde 409', async () => {
    activeSubscription()
    const res = await as('post', '/api/billing/checkout').send({ plan: 'business', interval: 'month' })
    expect(res.status).toBe(409)
  })

  it('sin pasarela configurada responde 503 con un mensaje claro', async () => {
    setBillingProvider(null)
    const previous = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    const res = await as('post', '/api/billing/checkout').send({ plan: 'pro', interval: 'month' })
    if (previous) process.env.STRIPE_SECRET_KEY = previous
    expect(res.status).toBe(503)
    expect(res.body.message).toMatch(/not configured/)
  })
})

describe('POST /api/billing/subscription/change', () => {
  it('cambia el plan en la pasarela sin escribir la base', async () => {
    activeSubscription()
    provider.setSubscription({ id: 'sub_7', companyId: 7, plan: 'pro' })

    const res = await as('post', '/api/billing/subscription/change').send({ plan: 'business', interval: 'year' })

    expect(res.status).toBe(202)
    expect(res.body.data).toMatchObject({ plan: 'business', interval: 'year' })
    expect(provider.changeSubscriptionPlan).toHaveBeenCalledWith('sub_7', { plan: 'business', interval: 'year' })
    expect(db.current.state.subscriptions.get(7).plan).toBe('pro')
  })

  it('sin suscripción pagada responde 409', async () => {
    const res = await as('post', '/api/billing/subscription/change').send({ plan: 'business', interval: 'year' })
    expect(res.status).toBe(409)
  })

  it('al mismo plan responde 409', async () => {
    activeSubscription()
    const res = await as('post', '/api/billing/subscription/change').send({ plan: 'pro', interval: 'month' })
    expect(res.status).toBe(409)
  })

  it('en past_due pide actualizar el pago primero', async () => {
    activeSubscription({ estado: 'past_due' })
    const res = await as('post', '/api/billing/subscription/change').send({ plan: 'business', interval: 'month' })
    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/payment method/)
  })

  it('un admin no puede cambiar el plan', async () => {
    activeSubscription()
    const res = await as('post', '/api/billing/subscription/change', { role: 'admin' }).send({
      plan: 'business',
      interval: 'month',
    })
    expect(res.status).toBe(403)
  })
})

describe('POST /api/billing/portal', () => {
  it('abre el portal con el cliente de la empresa', async () => {
    activeSubscription()
    const res = await as('post', '/api/billing/portal')
    expect(res.status).toBe(201)
    expect(res.body.data.url).toBe('https://portal.fake/cus_7')
    expect(provider.createPortalSession).toHaveBeenCalledWith({
      customerId: 'cus_7',
      returnUrl: 'https://app.kontrol.test/billing',
    })
  })

  it('sin cuenta de pago responde 409', async () => {
    const res = await as('post', '/api/billing/portal')
    expect(res.status).toBe(409)
  })

  it('un colaborador no puede abrir el portal', async () => {
    activeSubscription()
    const res = await as('post', '/api/billing/portal', { role: 'collaborator' })
    expect(res.status).toBe(403)
  })
})
