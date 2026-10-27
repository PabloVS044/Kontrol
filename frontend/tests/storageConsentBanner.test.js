import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import StorageConsentBanner from '@/components/StorageConsentBanner.vue'
import Footer from '@/components/Footer.vue'
import { CONSENT_KEY, useStorageConsent } from '@/composables/useStorageConsent.js'

// Node 25 expone un localStorage propio que tapa el de happy-dom.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
  clear: () => almacen.clear(),
  key: (i) => [...almacen.keys()][i] ?? null,
  get length() {
    return almacen.size
  },
}

/**
 * Aviso de almacenamiento (L-3). La decisión vive en el módulo, así que estas
 * pruebas corren en orden: primera visita, decisión y cambio posterior. Que la
 * decisión sobrevive a una recarga lo cubre storageConsent.test.js.
 */

const Stub = { template: '<div />' }
let mounted = []

async function montar(component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/legal/cookies', component: Stub },
    ],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(component, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { teleport: true },
    },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

afterEach(() => {
  mounted.forEach((w) => w.unmount())
  mounted = []
})

describe('StorageConsentBanner', () => {
  it('en la primera visita aparece sin haber escrito nada', async () => {
    const wrapper = await montar(StorageConsentBanner)

    expect(wrapper.find('.storage-banner').exists()).toBe(true)
    expect(wrapper.text()).toContain(es.storageConsent.status.pending)
    expect([...almacen.keys()]).toEqual([])
  })

  it('ofrece aceptar y rechazar, y enlaza a la política', async () => {
    const wrapper = await montar(StorageConsentBanner)

    expect(wrapper.find('[data-action="accept"]').exists()).toBe(true)
    expect(wrapper.find('[data-action="reject"]').exists()).toBe(true)
    const link = wrapper.findComponent({ name: 'RouterLink' })
    expect(link.props('to')).toBe('/legal/cookies')
  })

  it('sin decidir no se puede cerrar: no hay botón de cerrar', async () => {
    const wrapper = await montar(StorageConsentBanner)
    expect(wrapper.find('.storage-banner-close').exists()).toBe(false)
  })

  it('rechazar guarda solo la decisión y oculta el aviso', async () => {
    const wrapper = await montar(StorageConsentBanner)
    await wrapper.find('[data-action="reject"]').trigger('click')

    expect(wrapper.find('.storage-banner').exists()).toBe(false)
    expect([...almacen.keys()]).toEqual([CONSENT_KEY])
    expect(JSON.parse(almacen.get(CONSENT_KEY)).preferences).toBe(false)
  })

  it('ya decidido, no vuelve a aparecer al montar de nuevo', async () => {
    const wrapper = await montar(StorageConsentBanner)
    expect(wrapper.find('.storage-banner').exists()).toBe(false)
  })

  it('el pie de página lo reabre para cambiar la decisión', async () => {
    const banner = await montar(StorageConsentBanner)
    const footer = await montar(Footer)

    await footer.find('.footer-link-btn').trigger('click')
    await flushPromises()

    expect(banner.find('.storage-banner').exists()).toBe(true)
    expect(banner.text()).toContain(es.storageConsent.status.rejected)
    expect(banner.find('[data-action="reject"]').attributes('aria-pressed')).toBe('true')

    await banner.find('[data-action="accept"]').trigger('click')

    expect(banner.find('.storage-banner').exists()).toBe(false)
    expect(JSON.parse(almacen.get(CONSENT_KEY)).preferences).toBe(true)
    expect(useStorageConsent().decision.value).toBe('accepted')
  })

  it('reabierto, se puede cerrar sin cambiar la decisión', async () => {
    const banner = await montar(StorageConsentBanner)
    useStorageConsent().openPanel()
    await flushPromises()

    await banner.find('.storage-banner-close').trigger('click')

    expect(banner.find('.storage-banner').exists()).toBe(false)
    expect(useStorageConsent().decision.value).toBe('accepted')
  })
})
