import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import BillingView from '@/views/BillingView.vue'
import { useAuthStore } from '@/stores/auth'

// PAY-1 — Página de planes. El backend se simula con fetch.

const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

const PLANS = [
  { code: 'free', rank: 0, currency: 'usd', prices: { month: 0, year: 0 }, limits: { members: 3, projects: 2, products: 100 }, features: [] },
  {
    code: 'pro',
    rank: 1,
    currency: 'usd',
    prices: { month: 1900, year: 19000 },
    limits: { members: 15, projects: 20, products: 2000 },
    features: ['report_export', 'teams', 'integrations', 'marketing'],
  },
  {
    code: 'business',
    rank: 2,
    currency: 'usd',
    prices: { month: 4900, year: 49000 },
    limits: { members: null, projects: null, products: null },
    features: ['report_export', 'teams', 'integrations', 'marketing', 'ai_agent', 'marketing_ai'],
  },
]

const subscription = (overrides = {}) => ({
  plan: 'free',
  status: 'none',
  interval: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasBillingAccount: false,
  limits: { members: 3, projects: 2, products: 100 },
  features: [],
  usage: { members: 2, projects: 2, products: 10 },
  testMode: true,
  billingConfigured: true,
  canManage: true,
  ...overrides,
})

const respond = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, clone: () => ({ json: async () => body }) })

let fetchMock

const backend = (sub, extra = {}) => {
  fetchMock = vi.fn(async (url, init = {}) => {
    if (url.endsWith('/api/billing/plans')) return respond({ data: { testMode: true, plans: PLANS } })
    if (url.endsWith('/api/billing/subscription')) return respond({ data: typeof sub === 'function' ? sub() : sub })
    if (url.endsWith('/api/billing/checkout')) return extra.checkout ?? respond({ data: { url: 'https://checkout.test/s' } }, 201)
    if (url.endsWith('/api/billing/subscription/change')) return respond({ data: JSON.parse(init.body) }, 202)
    if (url.endsWith('/api/billing/portal')) return respond({ data: { url: 'https://portal.test/p' } }, 201)
    if (url.endsWith('/api/companies/access-context')) return respond({ data: { plan: { code: 'pro' } } })
    throw new Error(`unexpected ${url}`)
  })
  globalThis.fetch = fetchMock
}

const montar = async ({ query = {} } = {}) => {
  const store = useAuthStore()
  store.setToken('t')
  store.setEmpresaActual({ id_empresa: 7, nombre: 'Skiot', rol: 'owner' })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/billing', name: 'billing', component: BillingView }],
  })
  await router.push({ path: '/billing', query })
  await router.isReady()

  const wrapper = mount(BillingView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

const calls = (suffix) => fetchMock.mock.calls.filter(([url]) => url.endsWith(suffix))

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
  Object.defineProperty(window, 'location', { value: { assign: vi.fn() }, writable: true, configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('BillingView.vue', () => {
  it('muestra siempre el aviso de modo de prueba', async () => {
    backend(subscription())
    const { wrapper } = await montar()
    expect(wrapper.text()).toContain('Modo de prueba — sin cobros reales')
    expect(wrapper.text()).toContain('4242 4242 4242 4242')
  })

  it('pinta los tres planes con precio mensual y cambia a anual', async () => {
    backend(subscription())
    const { wrapper } = await montar()
    expect(wrapper.find('[data-test="plan-pro"]').text()).toContain('19')
    expect(wrapper.find('[data-test="plan-pro"]').text()).toContain('/ mes')

    await wrapper.findAll('.bl-interval-btn')[1].trigger('click')
    expect(wrapper.find('[data-test="plan-business"]').text()).toContain('490')
    expect(wrapper.find('[data-test="plan-business"]').text()).toContain('/ año')
  })

  it('muestra el uso contra los topes del plan', async () => {
    backend(subscription())
    const { wrapper } = await montar()
    const current = wrapper.find('[data-test="current-plan"]').text()
    expect(current).toContain('Gratis')
    expect(current).toContain('2 de 2')
    expect(wrapper.find('.bl-usage-bar.is-full').exists()).toBe(true)
  })

  it('desde Gratis, suscribirse redirige al Checkout hospedado', async () => {
    backend(subscription())
    const { wrapper } = await montar()
    await wrapper.find('[data-test="plan-pro"] .bl-btn').trigger('click')
    await flushPromises()

    expect(JSON.parse(calls('/api/billing/checkout')[0][1].body)).toEqual({ plan: 'pro', interval: 'month' })
    expect(window.location.assign).toHaveBeenCalledWith('https://checkout.test/s')
  })

  it('con un plan pagado, cambia de plan desde Kontrol sin pasar por Checkout', async () => {
    backend(subscription({ plan: 'pro', status: 'active', interval: 'month', hasBillingAccount: true, currentPeriodEnd: '2030-01-01T00:00:00Z' }))
    const { wrapper } = await montar()

    expect(wrapper.find('[data-test="plan-pro"]').text()).toContain('Es tu plan actual')
    await wrapper.find('[data-test="plan-business"] .bl-btn').trigger('click')
    await flushPromises()

    expect(calls('/api/billing/checkout')).toHaveLength(0)
    expect(JSON.parse(calls('/api/billing/subscription/change')[0][1].body)).toEqual({ plan: 'business', interval: 'month' })
    expect(wrapper.text()).toContain('Cambio solicitado')
  })

  it('gestionar pago abre el portal hospedado', async () => {
    backend(subscription({ plan: 'pro', status: 'active', interval: 'month', hasBillingAccount: true }))
    const { wrapper } = await montar()
    await wrapper.find('.bl-btn--ghost').trigger('click')
    await flushPromises()
    expect(window.location.assign).toHaveBeenCalledWith('https://portal.test/p')
  })

  it('un miembro que no es owner solo ve el plan, sin botones', async () => {
    backend(subscription({ canManage: false }))
    const { wrapper } = await montar()
    expect(wrapper.findAll('.bl-btn')).toHaveLength(0)
    expect(wrapper.text()).toContain('Solo el dueño de la empresa')
  })

  it('cancelado al final del período, avisa hasta cuándo dura', async () => {
    backend(subscription({ plan: 'pro', status: 'active', interval: 'month', cancelAtPeriodEnd: true, currentPeriodEnd: '2030-01-01T12:00:00Z' }))
    const { wrapper } = await montar()
    expect(wrapper.text()).toContain('vuelve al plan Gratis')
  })

  it('en past_due avisa que conserva el plan mientras se reintenta', async () => {
    backend(subscription({ plan: 'pro', status: 'past_due', interval: 'month' }))
    const { wrapper } = await montar()
    expect(wrapper.find('.bl-warning').text()).toContain('conservas el plan')
  })

  it('sin pasarela configurada lo dice y desactiva los botones', async () => {
    backend(subscription({ billingConfigured: false }))
    const { wrapper } = await montar()
    expect(wrapper.text()).toContain('no está configurada')
    expect(wrapper.find('[data-test="plan-pro"] .bl-btn').attributes('disabled')).toBeDefined()
  })

  it('muestra el error del backend sin redirigir', async () => {
    backend(subscription(), { checkout: respond({ success: false, message: 'Price not configured.' }, 503) })
    const { wrapper } = await montar()
    await wrapper.find('[data-test="plan-pro"] .bl-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Price not configured.')
    expect(window.location.assign).not.toHaveBeenCalled()
  })

  it('al venir de un módulo bloqueado explica qué plan lo incluye', async () => {
    backend(subscription())
    const { wrapper } = await montar({ query: { feature: 'ai_agent' } })
    expect(wrapper.text()).toContain('Birdie, el asistente de IA está incluido desde el plan Business')
  })

  it('al volver del Checkout espera el evento y refresca el plan', async () => {
    vi.useFakeTimers()
    let current = subscription()
    backend(() => current)
    const { wrapper, router } = await montar({ query: { checkout: 'success' } })

    expect(wrapper.text()).toContain('Pago de prueba recibido')
    expect(router.currentRoute.value.query.checkout).toBeUndefined()

    current = subscription({ plan: 'pro', status: 'active', interval: 'month' })
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(wrapper.find('[data-test="current-plan"] .bl-badge').text()).toBe('Pro')
    expect(calls('/api/companies/access-context')).toHaveLength(1)
  })
})
