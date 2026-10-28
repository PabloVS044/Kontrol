import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// PAY-1 — Control de acceso por plan. La base es la simulada en memoria; el
// plan de la empresa 7 se fija escribiendo su fila de suscripción, como lo
// haría un evento verificado de la pasarela.
const db = vi.hoisted(() => ({ current: null }))
vi.mock('../src/db/pool.js', () => ({
  default: {
    query: (...args) => db.current.query(...args),
    connect: (...args) => db.current.connect(...args),
  },
}))

import { buildTestApp, signToken } from './helpers/authTestApp.js'
import { createFakeBillingDb } from './helpers/fakeBillingDb.js'
import requirePlanFeature from '../src/middleware/requirePlanFeature.js'
import requirePlanLimit from '../src/middleware/requirePlanLimit.js'
import { FEATURES } from '../src/billing/plans.js'
import { checkPlanCapacity } from '../src/services/billingService.js'

const setPlan = (plan, estado = 'active') => {
  db.current.state.subscriptions.set(7, {
    id_empresa: 7,
    proveedor: 'fake',
    id_cliente_proveedor: 'cus_7',
    id_suscripcion_proveedor: 'sub_7',
    plan,
    intervalo: 'month',
    estado,
    fin_periodo_actual: null,
    cancelar_al_final: false,
  })
}

const buildRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const reqFor = (overrides = {}) => ({
  user: { id_usuario: 1, nombre_rol: 'user' },
  company: { id_empresa: 7, rol_empresa: 'owner' },
  ...overrides,
})

beforeEach(() => {
  db.current = createFakeBillingDb({ usage: { members: 1, projects: 0, products: 0 } })
})

describe('requirePlanFeature', () => {
  it('bloquea un módulo Pro en el plan gratuito con 403 y el plan requerido', async () => {
    const res = buildRes()
    const next = vi.fn()
    await requirePlanFeature(FEATURES.TEAMS)(reqFor(), res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'PLAN_FEATURE_REQUIRED',
        feature: 'teams',
        currentPlan: 'free',
        requiredPlan: 'pro',
      })
    )
  })

  it('deja pasar un módulo Pro con plan Pro y guarda el plan en la request', async () => {
    setPlan('pro')
    const req = reqFor()
    const next = vi.fn()
    await requirePlanFeature(FEATURES.INTEGRATIONS)(req, buildRes(), next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.company.plan).toBe('pro')
  })

  it('la IA exige Business aunque la empresa tenga Pro', async () => {
    setPlan('pro')
    const res = buildRes()
    await requirePlanFeature(FEATURES.AI_AGENT)(reqFor(), res, vi.fn())
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requiredPlan: 'business' }))
  })

  it('en past_due conserva el acceso', async () => {
    setPlan('business', 'past_due')
    const next = vi.fn()
    await requirePlanFeature(FEATURES.AI_AGENT)(reqFor(), buildRes(), next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('con la suscripción cancelada pierde el acceso', async () => {
    setPlan('business', 'canceled')
    const res = buildRes()
    await requirePlanFeature(FEATURES.MARKETING)(reqFor(), res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('el plan nunca se lee de lo que manda el cliente', async () => {
    const req = reqFor({ body: { plan: 'business' }, headers: { 'x-plan': 'business' } })
    const res = buildRes()
    await requirePlanFeature(FEATURES.AI_AGENT)(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('super_user pasa sin consultar el plan', async () => {
    const next = vi.fn()
    await requirePlanFeature(FEATURES.AI_AGENT)(reqFor({ user: { nombre_rol: 'super_user' } }), buildRes(), next)
    expect(next).toHaveBeenCalledOnce()
    expect(db.current.query).not.toHaveBeenCalled()
  })

  it('resuelve el plan una sola vez por petición', async () => {
    const req = reqFor()
    await requirePlanFeature(FEATURES.TEAMS)(req, buildRes(), vi.fn())
    await requirePlanFeature(FEATURES.MARKETING)(req, buildRes(), vi.fn())
    expect(db.current.query).toHaveBeenCalledTimes(1)
  })
})

describe('requirePlanLimit', () => {
  it('deja crear por debajo del tope', async () => {
    db.current.counts.projects = 1
    const next = vi.fn()
    await requirePlanLimit('projects')(reqFor(), buildRes(), next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('bloquea al llegar al tope con PLAN_LIMIT_REACHED', async () => {
    db.current.counts.projects = 2
    const res = buildRes()
    const next = vi.fn()
    await requirePlanLimit('projects')(reqFor(), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PLAN_LIMIT_REACHED', resource: 'projects', limit: 2, current: 2 })
    )
  })

  it('tras bajar de plan, con exceso, no borra nada pero impide crear más', async () => {
    db.current.counts.members = 10
    const res = buildRes()
    await requirePlanLimit('members')(reqFor(), res, vi.fn())
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ limit: 3, current: 10 }))
  })

  it('Pro sube el tope', async () => {
    setPlan('pro')
    db.current.counts.products = 1500
    const next = vi.fn()
    await requirePlanLimit('products')(reqFor(), buildRes(), next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('Business no tiene tope y ni siquiera cuenta', async () => {
    setPlan('business')
    await expect(checkPlanCapacity(7, 'members', db.current)).resolves.toEqual({
      allowed: true,
      plan: 'business',
      limit: null,
      current: null,
    })
  })

  it('super_user no tiene tope', async () => {
    db.current.counts.projects = 99
    const next = vi.fn()
    await requirePlanLimit('projects')(reqFor({ user: { nombre_rol: 'super_user' } }), buildRes(), next)
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('módulos protegidos en las rutas reales', () => {
  const token = signToken()
  const call = (method, path) =>
    request(buildTestApp())[method](path).set('Authorization', `Bearer ${token}`).set('X-Company-ID', '7')

  it('exportar reportes en plan gratuito → 403 PLAN_FEATURE_REQUIRED', async () => {
    const res = await call('post', '/api/reports/exports').send({ titulo: 'Export' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('PLAN_FEATURE_REQUIRED')
  })

  it('integraciones en plan gratuito → 403', async () => {
    const res = await call('get', '/api/integrations')
    expect(res.status).toBe(403)
    expect(res.body.requiredPlan).toBe('pro')
  })

  it('marketing en plan gratuito → 403', async () => {
    const res = await call('get', '/api/marketing/campaigns')
    expect(res.status).toBe(403)
  })

  it('generar con IA en marketing con plan Pro → 403, pide Business', async () => {
    setPlan('pro')
    const res = await call('post', '/api/marketing/generate').send({})
    expect(res.status).toBe(403)
    expect(res.body.requiredPlan).toBe('business')
  })

  it('crear un tercer proyecto en plan gratuito → 403 PLAN_LIMIT_REACHED', async () => {
    db.current.counts.projects = 2
    const res = await call('post', '/api/projects').send({})
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('PLAN_LIMIT_REACHED')
  })

  it('generar enlace de invitación con el cupo de miembros lleno → 403', async () => {
    db.current.counts.members = 3
    const res = await call('post', '/api/companies/invitation')
    expect(res.status).toBe(403)
    expect(res.body.resource).toBe('members')
  })
})
