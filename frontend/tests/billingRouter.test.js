import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// PAY-1 — El router lleva a /billing cuando el módulo no está en el plan.
const Stub = { default: { template: '<div />' } }
vi.mock('@/views/LandingPage.vue', () => Stub)
vi.mock('@/views/TeamsView.vue', () => Stub)
vi.mock('@/views/AgentView.vue', () => Stub)
vi.mock('@/views/MarketingPublicationsView.vue', () => Stub)
vi.mock('@/views/IntegrationsView.vue', () => Stub)
vi.mock('@/views/BillingView.vue', () => Stub)
vi.mock('@/views/DashboardView.vue', () => Stub)

const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

const { useAuthStore } = await import('@/stores/auth')
const { default: router } = await import('@/router/index.js')

const iniciarSesion = (plan) => {
  const store = useAuthStore()
  store.setToken('t')
  store.setUser({ id_usuario: 1, nombre_rol: 'usuario' })
  store.setEmpresas([{ id_empresa: 7, nombre: 'Skiot', rol: 'owner' }])
  store.setEmpresaActual({ id_empresa: 7, nombre: 'Skiot', rol: 'owner' })
  store.setAccessContext({ empresa: { id_empresa: 7 }, capabilities: {}, plan })
}

beforeEach(async () => {
  almacen.clear()
  setActivePinia(createPinia())
  await router.push('/')
})

describe('router — módulos según el plan', () => {
  it.each([
    ['/teams', 'teams'],
    ['/agent', 'ai_agent'],
    ['/marketing', 'marketing'],
    ['/integrations', 'integrations'],
  ])('sin el módulo, %s lleva a /billing', async (path, feature) => {
    iniciarSesion({ code: 'free', features: [] })
    await router.push(path)
    expect(router.currentRoute.value.name).toBe('billing')
    expect(router.currentRoute.value.query.feature).toBe(feature)
  })

  it('con el módulo en el plan entra normalmente', async () => {
    iniciarSesion({ code: 'business', features: ['teams', 'ai_agent', 'marketing', 'integrations'] })
    await router.push('/agent')
    expect(router.currentRoute.value.name).toBe('agent')
  })

  it('/billing existe para cualquier miembro con empresa', () => {
    const billing = router.getRoutes().find((route) => route.name === 'billing')
    expect(billing.meta).toMatchObject({ requiresAuth: true, requiresEmpresa: true })
    expect(billing.meta.requiresFeature).toBeUndefined()
  })
})

describe('store de auth — plan', () => {
  it('sin contexto la empresa se trata como gratuita', () => {
    const store = useAuthStore()
    expect(store.planCode).toBe('free')
    expect(store.hasFeature('teams')).toBe(false)
    expect(store.isAtLimit('projects')).toBe(false)
  })

  it('isAtLimit compara el uso con el tope y null es ilimitado', () => {
    const store = useAuthStore()
    store.setAccessContext({
      plan: {
        code: 'free',
        limits: { projects: 2, members: null },
        usage: { projects: 2, members: 40 },
      },
    })
    expect(store.isAtLimit('projects')).toBe(true)
    expect(store.isAtLimit('members')).toBe(false)
  })
})
