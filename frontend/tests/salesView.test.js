import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import SalesView from '@/views/SalesView.vue'
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

const montar = async ({ rol = 'owner', capabilities = { can_view_inventory: true } } = {}) => {
  const store = useAuthStore()
  store.setEmpresaActual({ id_empresa: 1, nombre: 'Skiot', rol })
  store.setAccessContext({ capabilities })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/sales', component: Stub },
      { path: '/sales/charge', name: 'sales-charge', component: Stub },
      { path: '/sales/history', name: 'sales-history', component: Stub },
      { path: '/settings', component: Stub },
    ],
  })
  await router.push('/sales')
  await router.isReady()

  return mount(SalesView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true },
    },
  })
}

const destinos = (wrapper) => wrapper.findAll('.sales-card').map((c) => c.attributes('href'))

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
})

describe('SalesView.vue — navegación de Ventas', () => {
  it('el owner ve las tres tarjetas con sus destinos', async () => {
    const wrapper = await montar()
    expect(destinos(wrapper)).toEqual(['/sales/charge', '/sales/history', '/settings#sale-config'])
  })

  it('nombra las tarjetas como en el card sorting', async () => {
    const wrapper = await montar()
    const titulos = wrapper.findAll('.sc-title').map((t) => t.text())
    expect(titulos).toEqual(['Cobrar', 'Historial de ventas', 'Configuración de venta'])
  })

  it('el admin también ve la configuración de venta', async () => {
    const wrapper = await montar({ rol: 'admin' })
    expect(destinos(wrapper)).toContain('/settings#sale-config')
  })

  it('manager y colaborador no ven la configuración de venta', async () => {
    // Misma regla que SettingsView: solo owner y admin pueden cambiarla.
    for (const rol of ['manager', 'collaborator']) {
      const wrapper = await montar({ rol })
      expect(destinos(wrapper)).toEqual(['/sales/charge', '/sales/history'])
    }
  })

  it('sin acceso al inventario no se ofrece cobrar', async () => {
    const wrapper = await montar({ rol: 'collaborator', capabilities: {} })
    expect(destinos(wrapper)).toEqual(['/sales/history'])
  })
})
