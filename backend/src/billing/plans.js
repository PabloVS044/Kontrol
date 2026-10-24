// PAY-1 — Catálogo de planes. Es la única fuente de verdad de qué desbloquea
// cada plan: el backend lo usa para autorizar, el frontend lo recibe por
// GET /api/billing/plans para pintar las tarjetas. Los precios son de modo de
// prueba: Kontrol no cobra nada real (Stripe no opera en Guatemala).
//
// `null` en un límite significa ilimitado. Los importes van en centavos de USD,
// que es como los espera el proveedor.

export const PLAN_CODES = ['free', 'pro', 'business']
export const BILLING_INTERVALS = ['month', 'year']
export const PAID_PLAN_CODES = ['pro', 'business']

// Módulos que no están en el plan gratuito.
export const FEATURES = {
  REPORT_EXPORT: 'report_export',
  TEAMS: 'teams',
  INTEGRATIONS: 'integrations',
  MARKETING: 'marketing',
  AI_AGENT: 'ai_agent',
  MARKETING_AI: 'marketing_ai',
}

// Recursos con tope por plan.
export const RESOURCES = ['members', 'projects', 'products']

const PRO_FEATURES = [
  FEATURES.REPORT_EXPORT,
  FEATURES.TEAMS,
  FEATURES.INTEGRATIONS,
  FEATURES.MARKETING,
]

export const PLANS = {
  free: {
    code: 'free',
    rank: 0,
    prices: { month: 0, year: 0 },
    limits: { members: 3, projects: 2, products: 100 },
    features: [],
  },
  pro: {
    code: 'pro',
    rank: 1,
    prices: { month: 1900, year: 19000 },
    limits: { members: 15, projects: 20, products: 2000 },
    features: PRO_FEATURES,
  },
  business: {
    code: 'business',
    rank: 2,
    prices: { month: 4900, year: 49000 },
    limits: { members: null, projects: null, products: null },
    features: [...PRO_FEATURES, FEATURES.AI_AGENT, FEATURES.MARKETING_AI],
  },
}

export const CURRENCY = 'usd'

export const getPlan = (code) => PLANS[code] ?? PLANS.free

export const planAllows = (code, feature) => getPlan(code).features.includes(feature)

export const planLimit = (code, resource) => getPlan(code).limits[resource] ?? null

// El plan más barato que incluye el módulo, para decirle al usuario a cuál subir.
export const minimumPlanFor = (feature) =>
  PLAN_CODES.map(getPlan).find((plan) => plan.features.includes(feature))?.code ?? null

// El precio se busca en el proveedor por esta clave, no por su ID: así el
// mismo código sirve con cualquier cuenta de prueba sin copiar IDs al .env.
export const priceLookupKey = (code, interval) => `kontrol_${code}_${interval}ly`

export const planFromLookupKey = (lookupKey) => {
  const match = /^kontrol_(pro|business)_(month|year)ly$/.exec(lookupKey ?? '')
  return match ? { plan: match[1], interval: match[2] } : null
}

export const publicCatalog = () =>
  PLAN_CODES.map((code) => {
    const { rank, prices, limits, features } = PLANS[code]
    return { code, rank, currency: CURRENCY, prices, limits, features }
  })
