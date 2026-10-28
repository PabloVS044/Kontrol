import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

vi.mock('@/services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  apiFetch: vi.fn(),
  authHeaders: vi.fn(() => ({})),
}))

import { apiFetch } from '@/services/api.js'
import { useAuthStore } from '@/stores/auth'
import InventoryPage from '@/views/InventoryPage.vue'

// Mismo shim que settingsView.test.js: Node 25 expone un localStorage propio
// que tapa el de happy-dom. Con Node 22 (.nvmrc) es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

/**
 * DT-22 (RTF 2, PERF-04): el POS resolvía cada escaneo buscando en el
 * inventario completo que descarga la vista, y lo volvía a descargar después
 * de cada venta. Estas pruebas fijan el flujo nuevo mirando las peticiones:
 * el código se pide al servidor y la venta no vuelve a pedir el listado.
 */
const CODE = '7501234567890'

const producto = (over = {}) => ({
  id_producto: 1,
  nombre: 'Taladro',
  precio_venta: '50.00',
  stock_actual: 7,
  stock_minimo: 2,
  codigo_barras: CODE,
  id_proyecto: 10,
  proyecto_nombre: 'Bodega',
  categoria: 'Herramientas',
  id_categoria: 1,
  ...over,
})

const json = (body, status = 200) => new Response(JSON.stringify(body), { status })

let respuestas
const peticiones = () => apiFetch.mock.calls.map(([path]) => path)

beforeEach(() => {
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.empresaActual = { id_empresa: 1, rol: 'owner' }
  auth.accessContext = {
    empresa: { id_empresa: 1, rol_empresa: 'owner' },
    capabilities: { can_view_inventory: true, can_sell_inventory: true, can_manage_inventory: true },
    inventory_project_ids: [10],
  }

  respuestas = {
    '/api/projects?limit=100': () => json({ data: [] }),
    '/api/products': () => json({ data: [producto()] }),
    '/api/products/alerts/low-stock': () => json({ data: [] }),
    '/api/companies/sale-config': () => json({ data: {} }),
    [`/api/products/barcode/${CODE}`]: () => json({ data: [producto({ stock_actual: 6 })] }),
    '/api/inventory-movements/sale': () =>
      json({ success: true, data: { venta: { id_venta: 1, total: 100 }, stock: [{ id_producto: 1, stock_actual: 4 }] } }, 201),
  }
  apiFetch.mockImplementation(async (path) => {
    const responder = respuestas[path]
    if (!responder) throw new Error(`petición inesperada: ${path}`)
    return responder()
  })
})

let wrapper
afterEach(() => {
  wrapper?.unmount()
  vi.resetAllMocks()
})

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/inventory', component: InventoryPage }, { path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  router.push('/inventory')
  await router.isReady()
  wrapper = shallowMount(InventoryPage, {
    global: { plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })] },
  })
  await flushPromises()
  return wrapper
}

const scanner = () => wrapper.findComponent({ name: 'BarcodeScanner' })
const checkout = () => wrapper.findComponent({ name: 'SaleCheckoutModal' })
const stockEnTarjeta = () => wrapper.find('.product-card').text()

describe('POS · búsqueda por código en el servidor (DT-22)', () => {
  it('el escaneo pide el código al servidor y deja el producto a confirmar con su stock vigente', async () => {
    await montar()
    apiFetch.mockClear()

    scanner().vm.$emit('detected', CODE)
    await flushPromises()

    expect(peticiones()).toEqual([`/api/products/barcode/${CODE}`])
    expect(scanner().props('pending')).toMatchObject({ product: { id_producto: 1, stock_actual: 6 }, max: 6 })
    // El stock que trajo el servidor también llega a la tarjeta de la lista.
    expect(stockEnTarjeta()).toContain('6')
  })

  it('un código sin coincidencias avisa sin tocar el carrito', async () => {
    respuestas[`/api/products/barcode/${CODE}`] = () => json({ data: [] })
    await montar()

    scanner().vm.$emit('detected', CODE)
    await flushPromises()

    expect(scanner().props('pending')).toBeNull()
    expect(scanner().props('feedback')).toMatchObject({ type: 'err' })
  })

  it('con el código en dos proyectos pregunta de cuál vender', async () => {
    respuestas[`/api/products/barcode/${CODE}`] = () =>
      json({ data: [producto(), producto({ id_producto: 2, id_proyecto: 11, proyecto_nombre: 'Sucursal' })] })
    await montar()

    scanner().vm.$emit('detected', CODE)
    await flushPromises()

    expect(scanner().props('choices').options.map((c) => c.product.id_producto)).toEqual([1, 2])
  })

  it('después de vender actualiza el stock con la respuesta y no vuelve a descargar el inventario', async () => {
    await montar()
    scanner().vm.$emit('detected', CODE)
    await flushPromises()
    scanner().vm.$emit('confirm', 2)
    await flushPromises()
    apiFetch.mockClear()

    checkout().vm.$emit('confirm')
    await flushPromises()

    expect(peticiones()).toEqual(['/api/inventory-movements/sale', '/api/products/alerts/low-stock'])
    expect(stockEnTarjeta()).toContain('4')
  })

  it('si la venta no trae el stock, recarga el inventario como antes', async () => {
    respuestas['/api/inventory-movements/sale'] = () =>
      json({ success: true, data: { venta: { id_venta: 1, total: 100 } } }, 201)
    await montar()
    scanner().vm.$emit('detected', CODE)
    await flushPromises()
    scanner().vm.$emit('confirm', 1)
    await flushPromises()
    apiFetch.mockClear()

    checkout().vm.$emit('confirm')
    await flushPromises()

    expect(peticiones()).toContain('/api/products')
  })
})
