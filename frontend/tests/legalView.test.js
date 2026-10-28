import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import LegalView from '@/views/LegalView.vue'
import LegalDocumentView from '@/views/LegalDocumentView.vue'
import Footer from '@/components/Footer.vue'
import appRouter, { redirectLegacyLegalAnchor } from '@/router/index.js'
import {
  LEGAL_DOCUMENTS,
  SUPPORT_EMAIL,
  acceptanceVersions,
  formatLegalDate,
  legalDocumentPath,
} from '@/utils/legal.js'

const Stub = { template: '<div />' }
const published = LEGAL_DOCUMENTS.filter((doc) => doc.history.length)
const bySlug = (slug) => LEGAL_DOCUMENTS.find((doc) => doc.slug === slug)

const createTestI18n = (locale = 'es') =>
  createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } })

async function mountAt(path, component, locale = 'es') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/legal', component: LegalView },
      { path: '/legal/:document', component: LegalDocumentView },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, {
    global: { plugins: [router, createTestI18n(locale)], stubs: { Navbar: true, Footer: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('Catálogo de documentos legales (L-6)', () => {
  it('publica los cinco documentos del alcance, cada uno con su URL', () => {
    expect(LEGAL_DOCUMENTS.map((doc) => legalDocumentPath(doc.id))).toEqual([
      '/legal/terms',
      '/legal/privacy',
      '/legal/cookies',
      '/legal/data-processing',
      '/legal/ai-assistant',
    ])
  })

  it('cada versión publicada tiene fecha y resumen del cambio en los dos idiomas', () => {
    for (const doc of published) {
      for (const entry of doc.history) {
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        const key = `v${entry.version.replace(/\./g, '_')}`
        expect(es.legal[doc.id].history[key], `${doc.id} ${entry.version} es`).toEqual(expect.any(String))
        expect(en.legal[doc.id].history[key], `${doc.id} ${entry.version} en`).toEqual(expect.any(String))
      }
      // Del más reciente al más antiguo, y la primera versión es sustancial.
      const dates = doc.history.map((entry) => entry.date)
      expect([...dates].sort().reverse()).toEqual(dates)
      expect(doc.history.at(-1).substantial).toBe(true)
    }
  })

  it('solo se ofrecen los idiomas en que existe el texto', () => {
    for (const doc of published) {
      for (const lang of doc.languages) {
        const messages = { es, en }[lang].legal[doc.id]
        expect(messages.clauses.length, `${doc.id} ${lang}`).toBeGreaterThan(0)
      }
    }
    // La adenda (L-4) solo existe en español.
    expect(LEGAL_DOCUMENTS.find((doc) => doc.id === 'dataProcessing').languages).toEqual(['es'])
  })

  it('al aceptar se envían los Términos y la Privacidad en su versión vigente', () => {
    expect(acceptanceVersions()).toEqual({
      terms: bySlug('terms').history[0].version,
      privacy: bySlug('privacy').history[0].version,
    })
  })
})

describe('Rutas estables', () => {
  it.each(LEGAL_DOCUMENTS.map((doc) => doc.slug))('/legal/%s resuelve a la página del documento', (slug) => {
    const route = appRouter.resolve(`/legal/${slug}`)
    expect(route.name).toBe('legal-document')
    expect(route.params.document).toBe(slug)
  })

  it('un documento que no existe no cae en la página legal', () => {
    expect(appRouter.resolve('/legal/no-existe').name).not.toBe('legal-document')
  })

  it('los anclajes viejos de /legal llevan a la página del documento', () => {
    expect(redirectLegacyLegalAnchor({ hash: '#terms' })).toEqual({ path: '/legal/terms', replace: true })
    expect(redirectLegacyLegalAnchor({ hash: '#cookies' })).toEqual({ path: '/legal/cookies', replace: true })
    expect(redirectLegacyLegalAnchor({ hash: '#ai' })).toEqual({ path: '/legal/ai-assistant', replace: true })
    expect(redirectLegacyLegalAnchor({ hash: '#contact' })).toBe(true)
    expect(redirectLegacyLegalAnchor({ hash: '' })).toBe(true)
  })

  it('las páginas legales no exigen sesión', () => {
    expect(appRouter.resolve('/legal').meta.requiresAuth).toBeFalsy()
    expect(appRouter.resolve('/legal/terms').meta.requiresAuth).toBeFalsy()
  })
})

describe('LegalView — índice de documentos', () => {
  it('lista los cinco documentos con su enlace, versión y fecha', async () => {
    const wrapper = await mountAt('/legal', LegalView)

    expect(wrapper.find('.legal-title').text()).toBe(es.legal.title)
    const cards = wrapper.findAll('.legal-card')
    expect(cards).toHaveLength(LEGAL_DOCUMENTS.length)

    LEGAL_DOCUMENTS.forEach((doc, i) => {
      expect(cards[i].attributes('href')).toBe(legalDocumentPath(doc.id))
      expect(cards[i].text()).toContain(es.legal[doc.id].title)
      if (doc.history.length) {
        expect(cards[i].text()).toContain(`Versión ${doc.history[0].version}`)
        expect(cards[i].text()).toContain(formatLegalDate(doc.history[0].date, 'es'))
      } else {
        expect(cards[i].text()).toContain(es.legal.index.pending)
      }
    })
  })

  it('mantiene el contacto en #contact', async () => {
    const wrapper = await mountAt('/legal', LegalView)
    const email = wrapper.find('#contact .legal-contact-email')
    expect(email.attributes('href')).toBe(`mailto:${SUPPORT_EMAIL}`)
  })
})

describe('LegalDocumentView — página de cada documento', () => {
  it.each(published.map((doc) => doc.slug))('/legal/%s muestra el texto completo, la versión y la fecha', async (slug) => {
    const doc = bySlug(slug)
    const wrapper = await mountAt(`/legal/${slug}`, LegalDocumentView)

    const article = wrapper.find(`article#${doc.id}`)
    expect(article.find('h1').text()).toBe(es.legal[doc.id].title)
    expect(article.findAll('.legal-clause')).toHaveLength(es.legal[doc.id].clauses.length)

    const status = article.find('.legal-section-date').text()
    expect(status).toContain(`Versión ${doc.history[0].version}`)
    expect(status).toContain(formatLegalDate(doc.history[0].date, 'es'))

    expect(article.findAll('.legal-history-item')).toHaveLength(doc.history.length)
    expect(article.text()).not.toContain('{email}')
    expect(article.attributes('lang')).toBe('es')
  })

  it('el historial marca qué cambios fueron sustanciales', async () => {
    const wrapper = await mountAt('/legal/privacy', LegalDocumentView)
    const kinds = wrapper.findAll('.legal-history-kind').map((k) => k.attributes('data-substantial'))
    expect(kinds).toEqual(bySlug('privacy').history.map((entry) => String(entry.substantial)))
    expect(wrapper.find('.legal-history-item').text()).toContain(es.legal.privacy.history.v1_2)
  })

  it('los documentos que se aceptan lo dicen en la página; los informativos no', async () => {
    expect((await mountAt('/legal/terms', LegalDocumentView)).text()).toContain(es.legal.document.acceptanceNote)
    expect((await mountAt('/legal/ai-assistant', LegalDocumentView)).text()).not.toContain(es.legal.document.acceptanceNote)
  })

  it('la política de cookies permite cambiar la decisión de almacenamiento (L-3)', async () => {
    const wrapper = await mountAt('/legal/cookies', LegalDocumentView)
    const choice = wrapper.find('.legal-storage-choice')
    expect(choice.find('[data-action="accept"]').exists()).toBe(true)
    expect(choice.find('[data-action="reject"]').exists()).toBe(true)
  })

  it('el aviso del asistente IA se publica con su texto completo (L-5)', async () => {
    const wrapper = await mountAt('/legal/ai-assistant', LegalDocumentView)
    expect(wrapper.find('h1').text()).toBe(es.legal.ai.title)
    expect(wrapper.text()).toContain(SUPPORT_EMAIL)
  })

  it('un documento sin versión vigente muestra el marcador, no un texto inventado', async () => {
    const wrapper = await mountAt('/legal/data-processing', LegalDocumentView)

    expect(wrapper.find('h1').text()).toBe(es.legal.dataProcessing.title)
    const marker = wrapper.find('.legal-pending')
    expect(marker.attributes('role')).toBe('status')
    expect(marker.text()).toContain(es.legal.document.pendingTitle)
    expect(wrapper.find('.legal-section-date').text()).toBe(es.legal.document.pendingVersion)
    expect(wrapper.findAll('.legal-clause')).toHaveLength(0)
    expect(wrapper.find('.legal-history').exists()).toBe(false)
  })

  it('en inglés se muestra la traducción cuando existe', async () => {
    const wrapper = await mountAt('/legal/terms', LegalDocumentView, 'en')
    expect(wrapper.find('h1').text()).toBe(en.legal.terms.title)
    expect(wrapper.find('article').attributes('lang')).toBe('en')
    expect(wrapper.find('.legal-section-date').text()).toContain(`Version ${bySlug('terms').history[0].version}`)
    expect(wrapper.find('.legal-note').text()).not.toContain('only available')
  })

  it('en inglés, un documento que solo existe en español no ofrece una versión inglesa', async () => {
    const wrapper = await mountAt('/legal/data-processing', LegalDocumentView, 'en')

    const article = wrapper.find('article')
    expect(article.attributes('lang')).toBe('es')
    expect(article.find('h1').text()).toBe(es.legal.dataProcessing.title)
    expect(wrapper.text()).toContain('This document is only available in Spanish.')
  })
})

describe('Footer — enlaces legales', () => {
  it('enlaza a la página de cada documento y ninguno está roto', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes })
    await router.push('/legal')
    await router.isReady()
    const wrapper = mount(Footer, { global: { plugins: [router, createTestI18n('es')] } })
    await flushPromises()

    const legalTargets = wrapper
      .findAllComponents({ name: 'RouterLink' })
      .map((link) => link.props('to'))
      .filter((to) => typeof to === 'string' && to.startsWith('/legal'))

    expect(legalTargets).toEqual(expect.arrayContaining(LEGAL_DOCUMENTS.map((doc) => legalDocumentPath(doc.id))))
    for (const to of legalTargets) {
      expect(router.resolve(to).name, to).toBe('legal-document')
    }
  })
})
