import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import InventoryView from '@/views/InventoryView.vue'
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

const producto = (over) => ({
  id_producto: 1,
  nombre: 'Café molido',
  precio_venta: '25.50',
  precio_costo: '12.00',
  stock_actual: 20,
  stock_minimo: 5,
  codigo_barras: '7401234',
  categoria: 'Abarrotes',
  id_proyecto: 10,
  proyecto_nombre: 'Tienda',
  ...over,
})

const PRODUCTOS = [
  producto(),
  producto({ id_producto: 2, nombre: 'Azúcar 1kg', precio_venta: '9.00', stock_actual: 3, categoria: 'Abarrotes' }),
  producto({ id_producto: 3, nombre: 'Aceite', precio_venta: '30.00', stock_actual: 0, codigo_barras: null, id_proyecto: 11, proyecto_nombre: 'Bodega' }),
]

const Stub = { template: '<div />' }
let router

function respuesta(data) {
  return { ok: true, json: async () => ({ data }) }
}

async function montar({ query = '' } = {}) {
  const store = useAuthStore()
  store.setEmpresaActual({ id_empresa: 1, nombre: 'Skiot', rol: 'owner' })
  store.setAccessContext({ capabilities: { can_view_inventory: true, can_manage_inventory: true, can_sell_inventory: true } })

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/inventory', name: 'inventory', component: Stub },
      { path: '/inventory/:id', name: 'inventory-detail', component: Stub },
      { path: '/sales/charge', name: 'sales-charge', component: Stub },
    ],
  })
  await router.push(`/inventory${query}`)
  await router.isReady()

  const wrapper = mount(InventoryView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true },
    },
  })
  await flushPromises()
  return wrapper
}

const nombres = (wrapper) => wrapper.findAll('.invt-name').map((a) => a.text())

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
  globalThis.fetch = vi.fn(async (url) => {
    const ruta = String(url)
    if (ruta.includes('/api/projects')) return respuesta([{ id_proyecto: 10, nombre: 'Tienda' }, { id_proyecto: 11, nombre: 'Bodega' }])
    if (ruta.includes('/api/products?projectId=10')) return respuesta(PRODUCTOS.filter((p) => p.id_proyecto === 10))
    if (ruta.includes('/api/products')) return respuesta(PRODUCTOS)
    return respuesta({})
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InventoryView.vue — tabla de productos', () => {
  it('lista todos los productos con precio, stock y proyecto', async () => {
    const wrapper = await montar()
    expect(nombres(wrapper)).toEqual(['Aceite', 'Azúcar 1kg', 'Café molido'])
    const cabeceras = wrapper.findAll('thead th').map((th) => th.text())
    expect(cabeceras.join(' ')).toMatch(/Producto.*Categoría.*Proyecto.*Precio.*Costo.*Stock.*Mínimo/)
    expect(wrapper.find('.invt-summary').text()).toBe('Productos: 3 · Stock bajo: 1 · Agotados: 1')
  })

  it('marca el stock bajo y el agotado', async () => {
    const wrapper = await montar()
    expect(wrapper.findAll('.invt-stock.is-out')).toHaveLength(1)
    expect(wrapper.findAll('.invt-stock.is-low')).toHaveLength(1)
    expect(wrapper.find('.invt-stock.is-out .invt-badge').text()).toBe('Sin stock')
  })

  it('elegir un proyecto lo pide al servidor, lo deja en la URL y oculta la columna', async () => {
    const wrapper = await montar()
    await wrapper.findAll('.invt-select option')[1].setSelected()
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/products?projectId=10'), expect.anything())
    expect(router.currentRoute.value.query.project).toBe('10')
    expect(nombres(wrapper)).toEqual(['Azúcar 1kg', 'Café molido'])
    expect(wrapper.findAll('thead th').map((th) => th.text()).join(' ')).not.toMatch(/Proyecto/)
  })

  it('arranca con el proyecto de la URL', async () => {
    await montar({ query: '?project=10' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/products?projectId=10'), expect.anything())
  })

  it('busca por nombre, código o categoría y filtra por estado de stock', async () => {
    const wrapper = await montar()
    await wrapper.find('.invt-input').setValue('7401234')
    expect(nombres(wrapper)).toEqual(['Azúcar 1kg', 'Café molido'])

    await wrapper.find('.invt-input').setValue('')
    const [, bajo, agotado] = wrapper.findAll('.invt-seg-btn')
    await bajo.trigger('click')
    expect(nombres(wrapper)).toEqual(['Azúcar 1kg'])
    await agotado.trigger('click')
    expect(nombres(wrapper)).toEqual(['Aceite'])
  })

  it('ordena por precio al tocar la cabecera, y la segunda vez al revés', async () => {
    const wrapper = await montar()
    const precio = wrapper.findAll('.invt-sort')[1]
    await precio.trigger('click')
    expect(nombres(wrapper)).toEqual(['Azúcar 1kg', 'Café molido', 'Aceite'])
    await precio.trigger('click')
    expect(nombres(wrapper)).toEqual(['Aceite', 'Café molido', 'Azúcar 1kg'])
  })

  it('cada nombre lleva al detalle del producto con su proyecto', async () => {
    const wrapper = await montar()
    expect(wrapper.find('.invt-name').attributes('href')).toBe('/inventory/3?project=11')
  })

  it('si falla la carga ofrece reintentar', async () => {
    fetch.mockImplementation(async (url) => (String(url).includes('/api/products')
      ? { ok: false, status: 500, json: async () => ({}) }
      : respuesta([])))
    const wrapper = await montar()
    expect(wrapper.find('[role="alert"]').text()).toContain('No se pudieron cargar los productos.')
  })
})
