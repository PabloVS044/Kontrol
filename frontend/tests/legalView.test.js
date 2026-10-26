import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import LegalView from '@/views/LegalView.vue'
import Footer from '@/components/Footer.vue'
import { LEGAL_VERSION, SUPPORT_EMAIL } from '@/utils/legal.js'

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
  it('renderiza el encabezado y el título', async () => {
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
  })

  it('incluye los accesos directos (#terms, #privacy, #cookies, #ai, #contact)', async () => {
    const router = await createTestRouter()
    const wrapper = mount(LegalView, {
      global: {
        plugins: [router, createTestI18n('es')],
        stubs: { Navbar: true, Footer: true },
      },
    })
    await flushPromises()

    const pills = wrapper.findAll('.legal-nav-pill')
    expect(pills.length).toBe(5)
    const hrefs = pills.map((p) => p.attributes('href'))
    expect(hrefs).toContain('#terms')
    expect(hrefs).toContain('#privacy')
    expect(hrefs).toContain('#cookies')
    expect(hrefs).toContain('#ai')
    expect(hrefs).toContain('#contact')
  })

  it('muestra todas las cláusulas, la versión y el correo de contacto', async () => {
    const router = await createTestRouter()
    const wrapper = mount(LegalView, {
      global: {
        plugins: [router, createTestI18n('es')],
        stubs: { Navbar: true, Footer: true },
      },
    })
    await flushPromises()

    expect(wrapper.findAll('#terms .legal-clause').length).toBe(es.legal.terms.clauses.length)
    expect(wrapper.findAll('#privacy .legal-clause').length).toBe(es.legal.privacy.clauses.length)
    expect(wrapper.findAll('#cookies .legal-clause').length).toBe(es.legal.cookies.clauses.length)
    expect(wrapper.find('#terms .legal-clause-title').text()).toBe(es.legal.terms.clauses[0].title)

    // El correo se interpola en las cláusulas: no puede quedar «{email}» suelto.
    expect(wrapper.find('#terms').text()).toContain(SUPPORT_EMAIL)
    expect(wrapper.text()).not.toContain('{email}')
    expect(wrapper.find('#terms .legal-section-date').text()).toContain(LEGAL_VERSION)

    const email = wrapper.find('#contact .legal-contact-email')
    expect(email.attributes('href')).toBe(`mailto:${SUPPORT_EMAIL}`)
    expect(email.text()).toBe(SUPPORT_EMAIL)
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

  it('publica el aviso del asistente IA con su propia versión (L-5)', async () => {
    const router = await createTestRouter()
    const wrapper = mount(LegalView, {
      global: {
        plugins: [router, createTestI18n('es')],
        stubs: { Navbar: true, Footer: true },
      },
    })
    await flushPromises()

    const ai = wrapper.find('#ai')
    expect(ai.exists()).toBe(true)
    expect(ai.find('.legal-section-title').text()).toBe(es.legal.ai.title)
    expect(ai.findAll('.legal-clause').length).toBe(es.legal.ai.clauses.length)
    expect(ai.find('.legal-section-date').text()).toBe(es.legal.ai.updated)
    expect(ai.text()).toContain(SUPPORT_EMAIL)
    // La advertencia de fiabilidad va antes que el detalle técnico.
    expect(ai.findAll('.legal-clause-title')[1].text()).toBe(es.legal.ai.clauses[1].title)
  })

  it('la sección de cookies permite cambiar la decisión de almacenamiento (L-3)', async () => {
    const router = await createTestRouter()
    const wrapper = mount(LegalView, {
      global: {
        plugins: [router, createTestI18n('es')],
        stubs: { Navbar: true, Footer: true },
      },
    })
    await flushPromises()

    const eleccion = wrapper.find('#cookies .legal-storage-choice')
    expect(eleccion.exists()).toBe(true)
    expect(eleccion.find('[data-action="accept"]').exists()).toBe(true)
    expect(eleccion.find('[data-action="reject"]').exists()).toBe(true)
    // Solo en cookies: las otras secciones no llevan el control.
    expect(wrapper.find('#terms .legal-storage-choice').exists()).toBe(false)
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
    expect(wrapper.find('#ai .legal-section-title').text()).toBe(en.legal.ai.title)
  })
})

describe('Footer — Enlaces a la sección legal', () => {
  it('enlaza hacia /legal#privacy, /legal#terms, /legal#cookies y /legal#ai', async () => {
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
    expect(legalTargets).toContain('/legal#ai')
  })
})
