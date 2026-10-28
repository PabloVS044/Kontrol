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

import { createFakeBillingDb } from './helpers/fakeBillingDb.js'
import { createFakeBillingProvider, SIGNATURE_HEADER, VALID_SIGNATURE } from './helpers/fakeBillingProvider.js'
import { setBillingProvider } from '../src/billing/provider.js'
import { mountBillingWebhook, BILLING_WEBHOOK_PATH } from '../src/billing/webhook.js'
import { getCompanyPlan, handleBillingEvent } from '../src/services/billingService.js'
import { errorHandler } from '../src/middleware/errorHandler.js'

let provider

const buildApp = () => {
  const app = express()
  mountBillingWebhook(app)
  app.use(express.json())
  app.use(errorHandler)
  return app
}

const send = (event, signature = VALID_SIGNATURE) => {
  const req = request(buildApp()).post(BILLING_WEBHOOK_PATH).set('Content-Type', 'application/json')
  if (signature) req.set(SIGNATURE_HEADER, signature)
  return req.send(JSON.stringify(event))
}

const subscriptionEvent = (type, overrides = {}) =>
  provider.event(type, { subscriptionId: 'sub_1', customerId: 'cus_1', companyId: 7, ...overrides })

beforeEach(() => {
  db.current = createFakeBillingDb()
  provider = createFakeBillingProvider()
  provider.setSubscription({ id: 'sub_1', customerId: 'cus_1', companyId: 7, plan: 'pro', status: 'active' })
  setBillingProvider(provider)
})

afterEach(() => setBillingProvider(null))

describe('webhook de pagos: firma', () => {
  it('rechaza con 400 un evento sin firma y no toca la base', async () => {
    const res = await send(subscriptionEvent('customer.subscription.updated'), null)
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ success: false })
    expect(db.current.state.subscriptions.size).toBe(0)
    expect(provider.getSubscription).not.toHaveBeenCalled()
  })

  it('rechaza con 400 un evento con firma inválida (un "suscripción activa" falsificado)', async () => {
    const res = await send(subscriptionEvent('customer.subscription.updated'), 'forged')
    expect(res.status).toBe(400)
    await expect(getCompanyPlan(7)).resolves.toBe('free')
  })

  it('responde 503 si la pasarela no está configurada', async () => {
    setBillingProvider({
      name: 'stripe',
      parseEvent: () => {
        throw Object.assign(new Error('Billing is not configured on this server.'), { status: 503 })
      },
    })
    const res = await send(subscriptionEvent('customer.subscription.updated'))
    expect(res.status).toBe(503)
  })

  it('acepta un evento firmado y activa el plan', async () => {
    const res = await send(subscriptionEvent('checkout.session.completed'))
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ received: true, status: 'applied' })
    await expect(getCompanyPlan(7)).resolves.toBe('pro')
  })
})

describe('webhook de pagos: idempotencia', () => {
  it('reenviar el mismo evento no lo aplica dos veces', async () => {
    const event = subscriptionEvent('customer.subscription.updated')
    expect((await send(event)).body.data.status).toBe('applied')

    // Entre envíos cambia el estado en la pasarela: si el reenvío se aplicara,
    // la empresa quedaría cancelada.
    provider.subscriptions.get('sub_1').status = 'canceled'
    const replay = await send(event)

    expect(replay.status).toBe(200)
    expect(replay.body.data.status).toBe('duplicate')
    expect(db.current.state.events.size).toBe(1)
    await expect(getCompanyPlan(7)).resolves.toBe('pro')
  })

  it('si falla al aplicar, el evento no queda registrado y el reintento funciona', async () => {
    const event = subscriptionEvent('customer.subscription.updated')
    const original = db.current.client.query.getMockImplementation()
    db.current.client.query.mockImplementation(async (text, params) => {
      if (text.includes('INSERT INTO public.empresa_suscripcion')) throw new Error('db down')
      return original(text, params)
    })

    const failed = await send(event)
    expect(failed.status).toBe(500)
    expect(db.current.state.events.size).toBe(0)

    db.current.client.query.mockImplementation(original)
    const retry = await send(event)
    expect(retry.body.data.status).toBe('applied')
  })

  it('si la pasarela no responde, devuelve 500 para que reintente', async () => {
    provider.getSubscription.mockRejectedValueOnce(new Error('timeout'))
    const res = await send(subscriptionEvent('customer.subscription.updated'))
    expect(res.status).toBe(500)
    expect(db.current.state.events.size).toBe(0)
  })
})

describe('manejo de cada evento', () => {
  it('pago completado: guarda cliente, suscripción, plan y fin de período', async () => {
    await handleBillingEvent(subscriptionEvent('checkout.session.completed'), { provider, db: db.current })
    expect(db.current.state.subscriptions.get(7)).toMatchObject({
      proveedor: 'fake',
      id_cliente_proveedor: 'cus_1',
      id_suscripcion_proveedor: 'sub_1',
      plan: 'pro',
      intervalo: 'month',
      estado: 'active',
      cancelar_al_final: false,
    })
  })

  it('suscripción actualizada: refleja el cambio de plan y la cancelación programada', async () => {
    await handleBillingEvent(subscriptionEvent('checkout.session.completed'), { provider, db: db.current })
    Object.assign(provider.subscriptions.get('sub_1'), { plan: 'business', interval: 'year', cancelAtPeriodEnd: true })

    await handleBillingEvent(subscriptionEvent('customer.subscription.updated'), { provider, db: db.current })

    expect(db.current.state.subscriptions.get(7)).toMatchObject({
      plan: 'business',
      intervalo: 'year',
      cancelar_al_final: true,
    })
    // Cancelar al final del período no quita el acceso antes de tiempo.
    await expect(getCompanyPlan(7, db.current)).resolves.toBe('business')
  })

  it('suscripción cancelada: la empresa pierde el plan al terminar el período', async () => {
    await handleBillingEvent(subscriptionEvent('checkout.session.completed'), { provider, db: db.current })
    provider.subscriptions.get('sub_1').status = 'canceled'

    const result = await handleBillingEvent(subscriptionEvent('customer.subscription.deleted'), {
      provider,
      db: db.current,
    })

    expect(result).toMatchObject({ status: 'applied', plan: 'free' })
    await expect(getCompanyPlan(7, db.current)).resolves.toBe('free')
  })

  it('pago fallido: queda en past_due y conserva el plan durante la gracia', async () => {
    await handleBillingEvent(subscriptionEvent('checkout.session.completed'), { provider, db: db.current })
    provider.subscriptions.get('sub_1').status = 'past_due'

    await handleBillingEvent(subscriptionEvent('invoice.payment_failed'), { provider, db: db.current })

    expect(db.current.state.subscriptions.get(7).estado).toBe('past_due')
    await expect(getCompanyPlan(7, db.current)).resolves.toBe('pro')
  })

  it('factura pagada: sale de past_due', async () => {
    provider.subscriptions.get('sub_1').status = 'past_due'
    await handleBillingEvent(subscriptionEvent('invoice.payment_failed'), { provider, db: db.current })
    provider.subscriptions.get('sub_1').status = 'active'

    await handleBillingEvent(subscriptionEvent('invoice.paid'), { provider, db: db.current })

    expect(db.current.state.subscriptions.get(7).estado).toBe('active')
  })

  it('un evento atrasado de una suscripción vieja no pisa la vigente', async () => {
    provider.setSubscription({ id: 'sub_old', customerId: 'cus_1', companyId: 7, plan: 'pro', status: 'canceled' })
    provider.setSubscription({ id: 'sub_new', customerId: 'cus_1', companyId: 7, plan: 'business', status: 'active' })
    await handleBillingEvent(subscriptionEvent('checkout.session.completed', { subscriptionId: 'sub_new' }), {
      provider,
      db: db.current,
    })

    const result = await handleBillingEvent(
      subscriptionEvent('customer.subscription.deleted', { subscriptionId: 'sub_old' }),
      { provider, db: db.current }
    )

    expect(result.status).toBe('stale')
    await expect(getCompanyPlan(7, db.current)).resolves.toBe('business')
  })

  it('sin metadata, encuentra la empresa por el cliente ya registrado', async () => {
    await handleBillingEvent(subscriptionEvent('checkout.session.completed'), { provider, db: db.current })
    Object.assign(provider.subscriptions.get('sub_1'), { companyId: null, status: 'past_due' })

    const result = await handleBillingEvent(subscriptionEvent('invoice.payment_failed', { companyId: null }), {
      provider,
      db: db.current,
    })

    expect(result).toMatchObject({ status: 'applied', companyId: 7 })
  })

  it('ignora un evento de una empresa desconocida', async () => {
    provider.setSubscription({ id: 'sub_x', customerId: 'cus_x', companyId: null })
    const result = await handleBillingEvent(
      subscriptionEvent('customer.subscription.updated', { subscriptionId: 'sub_x', companyId: null }),
      { provider, db: db.current }
    )
    expect(result.status).toBe('ignored')
    expect(db.current.state.subscriptions.size).toBe(0)
  })

  it('ignora un evento cuyo cliente no es el de la empresa', async () => {
    await handleBillingEvent(subscriptionEvent('checkout.session.completed'), { provider, db: db.current })
    provider.setSubscription({ id: 'sub_2', customerId: 'cus_other', companyId: 7, plan: 'business' })

    const result = await handleBillingEvent(
      subscriptionEvent('customer.subscription.updated', { subscriptionId: 'sub_2' }),
      { provider, db: db.current }
    )

    expect(result.status).toBe('ignored')
    await expect(getCompanyPlan(7, db.current)).resolves.toBe('pro')
  })

  it('ignora tipos de evento que no maneja, sin consultar la pasarela', async () => {
    const result = await handleBillingEvent(provider.event('charge.refunded', { subscriptionId: 'sub_1' }), {
      provider,
      db: db.current,
    })
    expect(result.status).toBe('ignored')
    expect(provider.getSubscription).not.toHaveBeenCalled()
  })
})
