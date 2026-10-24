/**
 * PAY-1 — Integración: suscripción por empresa contra PostgreSQL real.
 *
 * Componentes reales: webhook con cuerpo crudo (montado antes de express.json)
 * → billingService.handleBillingEvent (transacción, evento_pago_procesado,
 * empresa_suscripcion) → requirePlanFeature / requirePlanLimit en las rutas
 * reales → access-context. La pasarela es el proveedor simulado: Stripe no se
 * contacta en CI y la firma del adaptador real se prueba en
 * stripeProvider.test.js.
 *
 * Recorre el flujo del criterio de aceptación: alta, acceso desbloqueado,
 * cancelación al final del período y pérdida de acceso.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api, closeDb, createCompanyWithOwner, createProject, createUser, query, tokenFor } from '../db/fixtures.js'
import { setBillingProvider } from '../../src/billing/provider.js'
import { createFakeBillingProvider, SIGNATURE_HEADER, VALID_SIGNATURE } from '../helpers/fakeBillingProvider.js'

const WEBHOOK = '/api/billing/webhook'

describe('PAY-1 — suscripciones con la pasarela simulada', () => {
  let ctx
  let provider
  let companyId

  const asOwner = (method, path) =>
    api()[method](path).set('Authorization', `Bearer ${ctx.token}`).set('X-Company-ID', String(companyId))

  const deliver = (event, signature = VALID_SIGNATURE) => {
    const req = api().post(WEBHOOK).set('Content-Type', 'application/json')
    if (signature) req.set(SIGNATURE_HEADER, signature)
    return req.send(JSON.stringify(event))
  }

  const subscriptionRow = async () =>
    (await query('SELECT * FROM public.empresa_suscripcion WHERE id_empresa = $1', [companyId])).rows[0]

  beforeAll(async () => {
    provider = createFakeBillingProvider()
    setBillingProvider(provider)
    ctx = await createCompanyWithOwner()
    companyId = ctx.company.id_empresa
    await createProject({ id_empresa: companyId, id_encargado: ctx.owner.id_usuario })
    await createProject({ id_empresa: companyId, id_encargado: ctx.owner.id_usuario })
  })

  afterAll(async () => {
    setBillingProvider(null)
    await closeDb()
  })

  it('una empresa nueva está en el plan gratuito y no tiene módulos premium', async () => {
    const res = await asOwner('get', '/api/billing/subscription')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ plan: 'free', testMode: true, usage: { projects: 2, members: 1 } })

    expect((await asOwner('get', '/api/teams')).status).toBe(403)
  })

  it('con el tope de proyectos del plan gratuito no deja crear otro', async () => {
    const res = await asOwner('post', '/api/projects').send({ nombre: 'Tercero' })
    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ code: 'PLAN_LIMIT_REACHED', resource: 'projects', limit: 2 })
  })

  it('el checkout registra el cliente pero no cambia el plan', async () => {
    const res = await asOwner('post', '/api/billing/checkout').send({ plan: 'pro', interval: 'month' })
    expect(res.status).toBe(201)
    expect(res.body.data.url).toBe('https://checkout.fake/pro/month')

    expect(await subscriptionRow()).toMatchObject({
      id_cliente_proveedor: `cus_fake_${companyId}`,
      plan: 'free',
      estado: 'none',
    })
  })

  it('un evento sin firma válida se rechaza y no activa nada', async () => {
    provider.setSubscription({ id: 'sub_int', customerId: `cus_fake_${companyId}`, companyId, plan: 'business' })
    const forged = provider.event('customer.subscription.updated', { subscriptionId: 'sub_int', companyId })

    expect((await deliver(forged, null)).status).toBe(400)
    expect((await deliver(forged, 'forged')).status).toBe(400)
    expect((await subscriptionRow()).plan).toBe('free')
  })

  it('el pago completado activa el plan y desbloquea el acceso', async () => {
    provider.setSubscription({ id: 'sub_int', customerId: `cus_fake_${companyId}`, companyId, plan: 'pro' })
    const completed = provider.event('checkout.session.completed', { subscriptionId: 'sub_int', companyId })

    const res = await deliver(completed)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('applied')

    expect(await subscriptionRow()).toMatchObject({ plan: 'pro', estado: 'active', id_suscripcion_proveedor: 'sub_int' })
    expect((await asOwner('get', '/api/teams')).status).toBe(200)

    const context = await asOwner('get', '/api/companies/access-context')
    expect(context.body.data.plan).toMatchObject({ code: 'pro', limits: { projects: 20 } })
  })

  it('reenviar el mismo evento no lo procesa dos veces', async () => {
    const event = provider.event('customer.subscription.updated', { subscriptionId: 'sub_int', companyId })
    expect((await deliver(event)).body.data.status).toBe('applied')
    expect((await deliver(event)).body.data.status).toBe('duplicate')

    const { rows } = await query('SELECT COUNT(*)::int AS n FROM public.evento_pago_procesado WHERE id_evento = $1', [
      event.id,
    ])
    expect(rows[0].n).toBe(1)
  })

  it('cancelar al final del período mantiene el acceso hasta entonces', async () => {
    provider.subscriptions.get('sub_int').cancelAtPeriodEnd = true
    await deliver(provider.event('customer.subscription.updated', { subscriptionId: 'sub_int', companyId }))

    expect(await subscriptionRow()).toMatchObject({ plan: 'pro', cancelar_al_final: true })
    expect((await asOwner('get', '/api/teams')).status).toBe(200)
  })

  it('al terminar el período pierde el acceso y conserva sus datos', async () => {
    provider.subscriptions.get('sub_int').status = 'canceled'
    const res = await deliver(provider.event('customer.subscription.deleted', { subscriptionId: 'sub_int', companyId }))
    expect(res.body.data.status).toBe('applied')

    const summary = await asOwner('get', '/api/billing/subscription')
    expect(summary.body.data).toMatchObject({ plan: 'free', status: 'canceled' })
    expect((await asOwner('get', '/api/teams')).status).toBe(403)

    const { rows } = await query('SELECT COUNT(*)::int AS n FROM public.proyecto WHERE id_empresa = $1', [companyId])
    expect(rows[0].n).toBe(2)
  })

  it('con el cupo de miembros lleno, aceptar una invitación responde 403', async () => {
    const invitation = await asOwner('post', '/api/companies/invitation')
    expect(invitation.status).toBe(201)
    const { token } = invitation.body.data

    for (let i = 0; i < 2; i += 1) {
      const member = await createUser()
      const joined = await api()
        .post(`/api/companies/invitations/${token}/accept`)
        .set('Authorization', `Bearer ${tokenFor(member)}`)
      expect(joined.status).toBe(200)
    }

    const extra = await createUser()
    const rejected = await api()
      .post(`/api/companies/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${tokenFor(extra)}`)
    expect(rejected.status).toBe(403)
    expect(rejected.body.code).toBe('plan_limit_reached')

    const { rows } = await query('SELECT COUNT(*)::int AS n FROM public.empresa_usuario WHERE id_empresa = $1', [
      companyId,
    ])
    expect(rows[0].n).toBe(3)
  })
})
