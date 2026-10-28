import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

/**
 * L-6 — aviso de aceptación de los documentos legales. Lo pendiente lo decide
 * el servidor (`/api/legal/acceptances`); aquí se simula ese servicio.
 */

const mocks = vi.hoisted(() => ({ fetchLegalStatus: vi.fn(), acceptLegalDocuments: vi.fn() }))
vi.mock('@/services/legal.js', () => mocks)

const PENDING = [
  { document: 'terms', version: '1.0' },
  { document: 'privacy', version: '1.2' },
]
const Stub = { template: '<div />' }

let wrapper
let mods

// El estado de lo pendiente vive en el módulo: cada prueba lo carga de nuevo.
async function loadModules() {
  vi.resetModules()
  const [{ default: LegalConsentModal }, { useAuthStore }] = await Promise.all([
    import('@/components/LegalConsentModal.vue'),
    import('@/stores/auth.js'),
  ])
  setActivePinia(createPinia())
  mods = { LegalConsentModal, useAuthStore }
  return mods
}

function logIn(id) {
  const auth = mods.useAuthStore()
  auth.setToken(`jwt-${id}`)
  auth.setUser({ id_usuario: id })
  return auth
}

async function mountAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'landing', component: Stub },
      { path: '/legal', name: 'legal', component: Stub },
      { path: '/legal/:document', name: 'legal-document', component: Stub },
      { path: '/login', name: 'login', component: Stub },
      { path: '/dashboard', name: 'dashboard', component: Stub },
      { path: '/projects', name: 'projects', component: Stub },
    ],
  })
  await router.push(path)
  await router.isReady()

  wrapper = mount(mods.LegalConsentModal, {
    attachTo: document.body,
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
    },
  })
  await flushPromises()
  return router
}

// El aviso se teletransporta a <body>, fuera del árbol del wrapper.
const dialog = () => document.body.querySelector('[role="dialog"]')
const button = () => dialog().querySelector('button')
const checkbox = () => dialog().querySelector('input[type="checkbox"]')

async function check() {
  checkbox().checked = true
  checkbox().dispatchEvent(new Event('change'))
  await flushPromises()
}

beforeEach(async () => {
  vi.resetAllMocks()
  localStorage.clear()
  mocks.fetchLegalStatus.mockResolvedValue({ pending: PENDING, acceptances: [] })
  mocks.acceptLegalDocuments.mockResolvedValue({ pending: [], accepted: PENDING })
  await loadModules()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('LegalConsentModal — aceptación registrada en el servidor', () => {
  it('aparece cuando el servidor dice que hay documentos pendientes', async () => {
    logIn(7)
    await mountAt('/dashboard')

    expect(mocks.fetchLegalStatus).toHaveBeenCalledOnce()
    expect(dialog()).not.toBeNull()
    expect(dialog().getAttribute('aria-modal')).toBe('true')
  })

  it('no aparece si el usuario ya aceptó las versiones vigentes', async () => {
    mocks.fetchLegalStatus.mockResolvedValue({ pending: [], acceptances: [] })
    logIn(7)
    await mountAt('/dashboard')
    expect(dialog()).toBeNull()
  })

  it('enlaza cada documento pendiente a su página, con la versión que se acepta', async () => {
    logIn(7)
    await mountAt('/dashboard')

    const items = [...dialog().querySelectorAll('.consent-docs li')]
    expect(items).toHaveLength(2)
    expect(items[0].querySelector('a').getAttribute('href')).toBe('/legal/terms')
    expect(items[0].querySelector('a').getAttribute('target')).toBe('_blank')
    expect(items[0].textContent).toContain(es.legal.terms.title)
    expect(items[1].querySelector('a').getAttribute('href')).toBe('/legal/privacy')
    expect(items[1].textContent).toContain('Versión 1.2')
  })

  it('la casilla no viene marcada y sin marcarla no se registra nada', async () => {
    logIn(7)
    await mountAt('/dashboard')

    expect(checkbox().checked).toBe(false)
    expect(button().disabled).toBe(true)
    button().click()
    await flushPromises()

    expect(mocks.acceptLegalDocuments).not.toHaveBeenCalled()
    expect(dialog()).not.toBeNull()
    // Un único botón: no hay «cerrar» ni «no acepto».
    expect(dialog().querySelectorAll('button')).toHaveLength(1)
  })

  it('al marcar y aceptar registra la aceptación en el servidor y libera la plataforma', async () => {
    logIn(7)
    await mountAt('/dashboard')

    await check()
    expect(button().disabled).toBe(false)
    button().click()
    await flushPromises()

    expect(mocks.acceptLegalDocuments).toHaveBeenCalledOnce()
    expect(dialog()).toBeNull()
    // Ya no queda nada de la aceptación en el navegador.
    expect(localStorage.getItem('kontrol:legal-consent')).toBeNull()
  })

  it('si los documentos cambiaron mientras leía, lo dice y no se cierra', async () => {
    const outdated = Object.assign(new Error('changed'), { serverCode: 'legal_version_outdated' })
    mocks.acceptLegalDocuments.mockRejectedValue(outdated)
    logIn(7)
    await mountAt('/dashboard')

    await check()
    button().click()
    await flushPromises()

    expect(dialog()).not.toBeNull()
    expect(dialog().querySelector('[role="alert"]').textContent).toBe(es.legalConsent.errors.outdated)
    // Vuelve a preguntar qué está pendiente.
    expect(mocks.fetchLegalStatus).toHaveBeenCalledTimes(2)
  })

  it('no aparece ni consulta sin sesión; tampoco en la portada ni en los textos legales', async () => {
    const router = await mountAt('/login')
    expect(dialog()).toBeNull()
    expect(mocks.fetchLegalStatus).not.toHaveBeenCalled()

    logIn(7)
    for (const path of ['/', '/legal', '/legal/terms']) {
      await router.push(path)
      await flushPromises()
      expect(dialog(), path).toBeNull()
    }

    await router.push('/dashboard')
    await flushPromises()
    expect(dialog()).not.toBeNull()
  })

  it('no se cierra con Escape ni con un clic fuera del aviso', async () => {
    logIn(7)
    await mountAt('/dashboard')

    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.body.querySelector('.consent-overlay').click()
    await flushPromises()

    expect(dialog()).not.toBeNull()
  })

  it('deja inerte el resto de la app mientras está abierto', async () => {
    const app = document.createElement('div')
    app.id = 'app'
    document.body.appendChild(app)

    logIn(7)
    await mountAt('/dashboard')
    expect(app.hasAttribute('inert')).toBe(true)

    await check()
    button().click()
    await flushPromises()
    expect(app.hasAttribute('inert')).toBe(false)
  })

  it('consulta una vez por usuario, no en cada navegación; otro usuario se consulta aparte', async () => {
    const auth = logIn(7)
    const router = await mountAt('/dashboard')
    await router.push('/projects')
    await flushPromises()
    expect(mocks.fetchLegalStatus).toHaveBeenCalledOnce()

    auth.logout()
    logIn(8)
    await router.push('/dashboard')
    await flushPromises()
    expect(mocks.fetchLegalStatus).toHaveBeenCalledTimes(2)
  })

  it('si la consulta falla no bloquea la plataforma y se reintenta al navegar', async () => {
    mocks.fetchLegalStatus.mockRejectedValueOnce(new Error('offline'))
    logIn(7)
    const router = await mountAt('/dashboard')
    expect(dialog()).toBeNull()

    await router.push('/projects')
    await flushPromises()
    expect(mocks.fetchLegalStatus).toHaveBeenCalledTimes(2)
    expect(dialog()).not.toBeNull()
  })

  it('borra la aceptación que guardaban las versiones anteriores en el navegador', async () => {
    localStorage.setItem('kontrol:legal-consent', JSON.stringify({ version: '1.0', users: ['7'] }))
    await loadModules()
    expect(localStorage.getItem('kontrol:legal-consent')).toBeNull()
  })
})
