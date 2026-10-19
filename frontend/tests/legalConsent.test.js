import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import { LEGAL_VERSION } from '@/utils/legal.js'

const STORAGE_KEY = 'kontrol:legal-consent'
const Stub = { template: '<div />' }

let wrapper
let mods

// La aceptación se lee de localStorage al importar el módulo: cada prueba
// arranca con módulos nuevos para no heredar la de la anterior.
async function loadModules() {
  vi.resetModules()
  const [{ default: LegalConsentModal }, { useAuthStore }, { useLegalConsent }] = await Promise.all([
    import('@/components/LegalConsentModal.vue'),
    import('@/stores/auth.js'),
    import('@/composables/useLegalConsent.js'),
  ])
  setActivePinia(createPinia())
  mods = { LegalConsentModal, useAuthStore, useLegalConsent }
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
      { path: '/login', name: 'login', component: Stub },
      { path: '/dashboard', name: 'dashboard', component: Stub },
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

async function check() {
  const checkbox = dialog().querySelector('input[type="checkbox"]')
  checkbox.checked = true
  checkbox.dispatchEvent(new Event('change'))
  await flushPromises()
}

beforeEach(async () => {
  localStorage.clear()
  await loadModules()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('LegalConsentModal — aceptación de los Términos', () => {
  it('aparece cuando un usuario que no ha aceptado entra a la plataforma', async () => {
    logIn(7)
    await mountAt('/dashboard')

    expect(dialog()).not.toBeNull()
    expect(dialog().getAttribute('aria-modal')).toBe('true')
  })

  it('solo pide marcar la casilla, con el enlace a los Términos', async () => {
    logIn(7)
    await mountAt('/dashboard')

    const label = dialog().querySelector('label')
    expect(label.querySelector('input[type="checkbox"]')).not.toBeNull()
    expect(label.textContent).toContain(es.legalConsent.termsLink)

    const link = label.querySelector('a')
    expect(link.getAttribute('href')).toBe('/legal#terms')
    expect(link.getAttribute('target')).toBe('_blank')

    // Un único botón: no hay «cerrar» ni «no acepto».
    expect(dialog().querySelectorAll('button')).toHaveLength(1)
    expect(button().textContent.trim()).toBe(es.legalConsent.accept)
  })

  it('el botón Aceptar se habilita al marcar la casilla y libera la plataforma', async () => {
    logIn(7)
    await mountAt('/dashboard')

    expect(button().disabled).toBe(true)
    await check()
    expect(button().disabled).toBe(false)

    button().click()
    await flushPromises()

    expect(dialog()).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({ version: LEGAL_VERSION, users: ['7'] })
  })

  it('no aparece sin sesión ni en la portada o los textos legales', async () => {
    const router = await mountAt('/login')
    expect(dialog()).toBeNull()

    logIn(7)
    await router.push('/')
    await flushPromises()
    expect(dialog()).toBeNull()

    await router.push('/legal')
    await flushPromises()
    expect(dialog()).toBeNull()

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

  it('quien ya aceptó no lo vuelve a ver; un usuario nuevo en el mismo navegador sí', async () => {
    const auth = logIn(7)
    const router = await mountAt('/dashboard')
    await check()
    button().click()
    await flushPromises()

    auth.logout()
    logIn(7)
    await router.push('/login')
    await router.push('/dashboard')
    await flushPromises()
    expect(dialog()).toBeNull()

    auth.logout()
    logIn(8)
    await router.push('/login')
    await router.push('/dashboard')
    await flushPromises()
    expect(dialog()).not.toBeNull()
  })
})

describe('useLegalConsent — versión', () => {
  it('una aceptación de otra versión no cuenta', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: '0.9', users: ['7'] }))
    const { useLegalConsent } = await loadModules()
    expect(useLegalConsent().hasAccepted(7)).toBe(false)
  })

  it('la aceptación de la versión vigente se recuerda al recargar', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: LEGAL_VERSION, users: ['7'] }))
    const { useLegalConsent } = await loadModules()
    expect(useLegalConsent().hasAccepted(7)).toBe(true)
    expect(useLegalConsent().hasAccepted(8)).toBe(false)
  })

  it('un valor dañado en localStorage se trata como no aceptado', async () => {
    localStorage.setItem(STORAGE_KEY, '{no es json')
    const { useLegalConsent } = await loadModules()
    expect(useLegalConsent().hasAccepted(7)).toBe(false)
  })
})
