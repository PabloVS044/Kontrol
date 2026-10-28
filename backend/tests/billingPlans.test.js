import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => ({ default: { query: vi.fn() } }))

import pool from '../src/db/pool.js'
import {
  FEATURES,
  getPlan,
  minimumPlanFor,
  planAllows,
  planFromLookupKey,
  planLimit,
  priceLookupKey,
  publicCatalog,
} from '../src/billing/plans.js'
import {
  getCompanyPlan,
  getUsage,
  isWithinLimit,
  resolveEffectivePlan,
} from '../src/services/billingService.js'

describe('catálogo de planes (PAY-1)', () => {
  it('el plan gratuito no desbloquea módulos premium', () => {
    for (const feature of Object.values(FEATURES)) {
      expect(planAllows('free', feature)).toBe(false)
    }
  })

  it('Pro desbloquea exportación, equipos, integraciones y marketing, pero no la IA', () => {
    expect(planAllows('pro', FEATURES.REPORT_EXPORT)).toBe(true)
    expect(planAllows('pro', FEATURES.TEAMS)).toBe(true)
    expect(planAllows('pro', FEATURES.INTEGRATIONS)).toBe(true)
    expect(planAllows('pro', FEATURES.MARKETING)).toBe(true)
    expect(planAllows('pro', FEATURES.AI_AGENT)).toBe(false)
    expect(planAllows('pro', FEATURES.MARKETING_AI)).toBe(false)
  })

  it('Business incluye todo', () => {
    for (const feature of Object.values(FEATURES)) {
      expect(planAllows('business', feature)).toBe(true)
    }
  })

  it('aplica los topes acordados y null es ilimitado', () => {
    expect(planLimit('free', 'members')).toBe(3)
    expect(planLimit('free', 'projects')).toBe(2)
    expect(planLimit('free', 'products')).toBe(100)
    expect(planLimit('pro', 'members')).toBe(15)
    expect(planLimit('pro', 'projects')).toBe(20)
    expect(planLimit('pro', 'products')).toBe(2000)
    expect(planLimit('business', 'members')).toBeNull()
  })

  it('un código desconocido se trata como gratuito', () => {
    expect(getPlan('enterprise').code).toBe('free')
  })

  it('indica el plan mínimo que incluye cada módulo', () => {
    expect(minimumPlanFor(FEATURES.TEAMS)).toBe('pro')
    expect(minimumPlanFor(FEATURES.AI_AGENT)).toBe('business')
    expect(minimumPlanFor('unknown')).toBeNull()
  })

  it('la clave de precio va y vuelve sin perder plan ni intervalo', () => {
    expect(priceLookupKey('pro', 'month')).toBe('kontrol_pro_monthly')
    expect(planFromLookupKey('kontrol_business_yearly')).toEqual({ plan: 'business', interval: 'year' })
    expect(planFromLookupKey('kontrol_free_monthly')).toBeNull()
    expect(planFromLookupKey(undefined)).toBeNull()
  })

  it('el catálogo público lista los tres planes en USD', () => {
    const catalog = publicCatalog()
    expect(catalog.map((plan) => plan.code)).toEqual(['free', 'pro', 'business'])
    expect(catalog[1]).toMatchObject({ currency: 'usd', prices: { month: 1900, year: 19000 } })
  })
})

describe('plan efectivo de la empresa', () => {
  it('sin suscripción es gratuito', () => {
    expect(resolveEffectivePlan(null)).toBe('free')
  })

  it.each(['active', 'trialing', 'past_due'])('con estado %s conserva el plan pagado', (estado) => {
    expect(resolveEffectivePlan({ plan: 'pro', estado })).toBe('pro')
  })

  it.each(['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'none'])(
    'con estado %s vuelve al gratuito',
    (estado) => {
      expect(resolveEffectivePlan({ plan: 'business', estado })).toBe('free')
    }
  )

  it('lee el plan de la base de datos', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ plan: 'business', estado: 'active' }] })
    await expect(getCompanyPlan(7)).resolves.toBe('business')
    expect(pool.query.mock.calls.at(-1)[1]).toEqual([7])
  })
})

describe('uso y topes', () => {
  it('devuelve los contadores como números', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ members: '2', projects: 1, products: 40 }] })
    await expect(getUsage(3)).resolves.toEqual({ members: 2, projects: 1, products: 40 })
  })

  it('bloquea al llegar al tope y deja pasar por debajo', () => {
    expect(isWithinLimit('free', 'projects', 1)).toBe(true)
    expect(isWithinLimit('free', 'projects', 2)).toBe(false)
    expect(isWithinLimit('free', 'members', 10)).toBe(false)
  })

  it('Business no tiene tope', () => {
    expect(isWithinLimit('business', 'products', 1_000_000)).toBe(true)
  })
})
