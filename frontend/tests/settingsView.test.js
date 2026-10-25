import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import SettingsView from '@/views/SettingsView.vue'
import { useAuthStore } from '@/stores/auth'

// Node 25 expone un localStorage propio que tapa el de happy-dom y no
// implementa getItem/clear. Con Node 22 (.nvmrc) el shim es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

const Stub = { template: '<div />' }

const montar = async ({ rol = 'owner', canManageUsers = rol === 'owner' } = {}) => {
  const store = useAuthStore()
  store.setEmpresaActual({ id_empresa: 1, nombre: 'Skiot', rol })
  store.setAccessContext({ capabilities: { can_manage_users: canManageUsers } })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: Stub },
      { path: '/integrations', component: Stub },
      { path: '/billing', component: Stub },
      { path: '/dashboard', component: Stub },
    ],
  })
  await router.push('/settings')
  await router.isReady()

  const wrapper = mount(SettingsView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true, LanguageSelector: true },
    },
  })
  await flushPromises()
  return wrapper
}

const enlaces = (wrapper) => wrapper.findAll('.sc-link').map((l) => l.attributes('href'))

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsView.vue — configuración unificada', () => {
  it('se ve con la barra de navegación, como el resto de secciones', async () => {
    const wrapper = await montar()
    expect(wrapper.findComponent({ name: 'AppNavbar' }).exists()).toBe(true)
  })

  it('el bloque de venta tiene el ancla a la que lleva Ventas', async () => {
    const wrapper = await montar()
    expect(wrapper.find('#sale-config').exists()).toBe(true)
    expect(wrapper.find('#sale-config .sc-title').text()).toBe('Configuración de venta')
  })

  it('el owner ve integraciones y miembros de la empresa', async () => {
    const wrapper = await montar()
    expect(enlaces(wrapper)).toEqual(['/billing', '/integrations', '/dashboard#company-members'])
  })

  it('el admin ve integraciones pero no miembros de la empresa', async () => {
    // Igual que hoy: integraciones es owner/admin; el panel de miembros, solo owner.
    const wrapper = await montar({ rol: 'admin' })
    expect(enlaces(wrapper)).toEqual(['/billing', '/integrations'])
  })

  it('manager y colaborador no ven integraciones ni miembros, solo el plan', async () => {
    for (const rol of ['manager', 'collaborator']) {
      const wrapper = await montar({ rol })
      expect(enlaces(wrapper)).toEqual(['/billing'])
    }
  })

  // PAY-1 — El plan es de la empresa: cualquier miembro ve cuál tiene.
  it('la tarjeta del plan muestra el plan de la empresa activa', async () => {
    const store = useAuthStore()
    const wrapper = await montar({ rol: 'collaborator' })
    expect(wrapper.find('#plan').text()).toContain('Plan actual: Gratis')

    store.setAccessContext({ capabilities: {}, plan: { code: 'business' } })
    await flushPromises()
    expect(wrapper.find('#plan').text()).toContain('Plan actual: Business')
  })
})
