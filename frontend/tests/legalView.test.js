import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import LegalView from '@/views/LegalView.vue'
import Footer from '@/components/Footer.vue'

const Stub = { template: '<div />' }

const createTestI18n = (locale = 'es') =>
  createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { es, en },
  })

const createTestRouter = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/legal', component: LegalView },
    ],
  })
  await router.push('/legal')
  await router.isReady()
  return router
}

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LegalView — Vista legal de Kontrol', () => {
  it('renderiza el encabezado, título y estado del documento', async () => {
    const router = await createTestRouter()
    const wrapper = mount(LegalView, {
      global: {
        plugins: [router, createTestI18n('es')],
        stubs: { Navbar: true, Footer: true },
      },
    })
    await flushPromises()

    expect(wrapper.find('.legal-title').text()).toBe(es.legal.title)
    expect(wrapper.find('.legal-subtitle').text()).toBe(es.legal.subtitle)
    expect(wrapper.find('.legal-status-tag').text()).toBe(es.legal.status.value)
  })

  it('incluye los tres accesos directos (#terms, #privacy, #cookies)', async () => {
    const router = await createTestRouter()
    const wrapper = mount(LegalView, {
      global: {
        plugins: [router, createTestI18n('es')],
        stubs: { Navbar: true, Footer: true },
      },
    })
    await flushPromises()

    const pills = wrapper.findAll('.legal-nav-pill')
    expect(pills.length).toBe(3)
    const hrefs = pills.map((p) => p.attributes('href'))
    expect(hrefs).toContain('#terms')
    expect(hrefs).toContain('#privacy')
    expect(hrefs).toContain('#cookies')
  })

  it('renderiza las tres secciones con sus respectivos identificadores para anclaje', async () => {
    const router = await createTestRouter()
    const wrapper = mount(LegalView, {
      global: {
        plugins: [router, createTestI18n('es')],
        stubs: { Navbar: true, Footer: true },
      },
    })
    await flushPromises()

    const termsSec = wrapper.find('#terms')
    const privacySec = wrapper.find('#privacy')
    const cookiesSec = wrapper.find('#cookies')

    expect(termsSec.exists()).toBe(true)
    expect(privacySec.exists()).toBe(true)
    expect(cookiesSec.exists()).toBe(true)

    expect(termsSec.find('.legal-section-title').text()).toBe(es.legal.terms.title)
    expect(privacySec.find('.legal-section-title').text()).toBe(es.legal.privacy.title)
    expect(cookiesSec.find('.legal-section-title').text()).toBe(es.legal.cookies.title)
  })

  it('funciona correctamente en inglés', async () => {
    const router = await createTestRouter()
    const wrapper = mount(LegalView, {
      global: {
        plugins: [router, createTestI18n('en')],
        stubs: { Navbar: true, Footer: true },
      },
    })
    await flushPromises()

    expect(wrapper.find('.legal-title').text()).toBe(en.legal.title)
    expect(wrapper.find('#terms .legal-section-title').text()).toBe(en.legal.terms.title)
    expect(wrapper.find('#privacy .legal-section-title').text()).toBe(en.legal.privacy.title)
    expect(wrapper.find('#cookies .legal-section-title').text()).toBe(en.legal.cookies.title)
  })
})

describe('Footer — Enlaces a la sección legal', () => {
  it('enlaza hacia /legal#privacy, /legal#terms y /legal#cookies', async () => {
    const router = await createTestRouter()
    const wrapper = mount(Footer, {
      global: {
        plugins: [router, createTestI18n('es')],
      },
    })
    await flushPromises()

    const routerLinks = wrapper.findAllComponents({ name: 'RouterLink' })
    const legalTargets = routerLinks
      .map((r) => r.props('to'))
      .filter((to) => typeof to === 'string' && to.startsWith('/legal'))

    expect(legalTargets).toContain('/legal#privacy')
    expect(legalTargets).toContain('/legal#terms')
    expect(legalTargets).toContain('/legal#cookies')
  })
})
