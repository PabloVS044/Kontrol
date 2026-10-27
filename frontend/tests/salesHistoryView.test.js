import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import SalesHistoryView from '@/views/SalesHistoryView.vue'
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

const HISTORIAL = {
  resumen: { ventas: 2, subtotal: 60, descuentos: 5, iva: 6.6, cobrado_total: 61.6, ingreso_neto: 55, costo_ventas: 31.5, utilidad: 23.5, unidades: 4, ticket_promedio: 30.8 },
  truncado: false,
  ventas: [
    {
      clave: 'v12',
      id_venta: 12,
      fecha: '2026-10-27T16:05:00Z',
      vendedor: 'Ana Martínez',
      proyectos: ['Tienda'],
      unidades: 3,
      subtotal: 50,
      descuento: 5,
      iva: 5.4,
      total: 50.4,
      lineas: [
        { id_movimiento: 1, producto_nombre: 'Café molido', proyecto_nombre: 'Tienda', cantidad: 2, precio_unitario: 20, descuento: 4, iva: 4.32, importe: 40.32 },
        { id_movimiento: 2, producto_nombre: 'Azúcar 1kg', proyecto_nombre: 'Tienda', cantidad: 1, precio_unitario: 10, descuento: 1, iva: 1.08, importe: 10.08 },
      ],
    },
    {
      clave: 'v11',
      id_venta: 11,
      fecha: '2026-10-27T15:00:00Z',
      vendedor: 'Luis Ramírez',
      proyectos: ['Tienda'],
      unidades: 1,
      subtotal: 10,
      descuento: 0,
      iva: 1.2,
      total: 11.2,
      lineas: [{ id_movimiento: 3, producto_nombre: 'Aceite', proyecto_nombre: 'Tienda', cantidad: 1, precio_unitario: 10, descuento: 0, iva: 1.2, importe: 11.2 }],
    },
  ],
}

const Stub = { template: '<div />' }

const ventasUrl = () => fetch.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/sales?'))
const params = (url) => new URL(url, 'http://localhost').searchParams

async function montar() {
  const store = useAuthStore()
  store.setEmpresaActual({ id_empresa: 1, nombre: 'Skiot', rol: 'owner' })
  store.setAccessContext({ capabilities: { can_view_inventory: true, can_manage_inventory: true } })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/sales', name: 'sales', component: Stub },
      { path: '/sales/history', name: 'sales-history', component: Stub },
      { path: '/reports', component: Stub },
    ],
  })
  await router.push('/sales/history')
  await router.isReady()

  const wrapper = mount(SalesHistoryView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 14, 30))
  globalThis.fetch = vi.fn(async (url) => {
    const ruta = String(url)
    if (ruta.includes('/api/projects')) return { ok: true, json: async () => ({ data: [{ id_proyecto: 10, nombre: 'Tienda' }] }) }
    if (ruta.includes('/api/inventory-movements/sales')) return { ok: true, json: async () => ({ data: HISTORIAL }) }
    return { ok: true, json: async () => ({ data: {} }) }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SalesHistoryView.vue — historial por fechas', () => {
  it('por defecto pide las ventas de hoy, en hora local y con la zona del navegador', async () => {
    await montar()
    const [url] = ventasUrl()
    expect(params(url).get('desde')).toBe('2026-10-15T00:00:00')
    expect(params(url).get('hasta')).toBe('2026-10-15T23:59:59')
    expect(params(url).get('tz')).toBeTruthy()
    expect(params(url).has('projectId')).toBe(false)
  })

  it('muestra lo que ingresó en el periodo y cuántas ventas hubo', async () => {
    const wrapper = await montar()
    const kpis = wrapper.findAll('.sh-kpi-value').map((k) => k.text())
    expect(kpis[0]).toContain('61.60')
    expect(kpis[2]).toBe('2')
    expect(wrapper.find('.sh-kpi-note').text()).toContain('5.00')
  })

  it('a la derecha de los ingresos muestra la utilidad: ingreso sin IVA menos costo', async () => {
    const wrapper = await montar()
    const [ingresos, utilidad] = wrapper.findAll('.sh-kpi')
    expect(ingresos.find('.sh-kpi-label').text()).toBe('Ingresos')
    expect(utilidad.find('.sh-kpi-label').text()).toBe('Utilidad')
    expect(utilidad.find('.sh-kpi-value').text()).toContain('23.50')
    expect(utilidad.find('.sh-kpi-note').text()).toMatch(/55.00.*31.50/)
    expect(utilidad.classes()).not.toContain('is-loss')
  })

  it('los atajos de semana y mes cambian el rango', async () => {
    const wrapper = await montar()
    const [, semana, mes] = wrapper.findAll('.sh-seg-btn')

    await semana.trigger('click')
    await flushPromises()
    expect(params(ventasUrl().at(-1)).get('desde')).toBe('2026-10-12T00:00:00')

    await mes.trigger('click')
    await flushPromises()
    expect(params(ventasUrl().at(-1)).get('desde')).toBe('2026-10-01T00:00:00')
  })

  it('el rango personalizado usa las dos fechas y avisa si están al revés', async () => {
    const wrapper = await montar()
    await wrapper.findAll('.sh-seg-btn')[3].trigger('click')
    const [desde, hasta] = wrapper.findAll('.sh-input')

    await desde.setValue('2026-10-01')
    await hasta.setValue('2026-10-05')
    await flushPromises()
    const url = ventasUrl().at(-1)
    expect(params(url).get('desde')).toBe('2026-10-01T00:00:00')
    expect(params(url).get('hasta')).toBe('2026-10-05T23:59:59')

    const llamadas = ventasUrl().length
    await desde.setValue('2026-10-09')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('Elige una fecha de inicio')
    expect(ventasUrl()).toHaveLength(llamadas)
  })

  it('filtra por proyecto', async () => {
    const wrapper = await montar()
    await wrapper.findAll('.sh-select option')[1].setSelected()
    await flushPromises()
    expect(params(ventasUrl().at(-1)).get('projectId')).toBe('10')
  })

  it('cada venta es una fila y su detalle se abre y se cierra con el botón', async () => {
    const wrapper = await montar()
    expect(wrapper.findAll('.sh-row')).toHaveLength(2)
    expect(wrapper.find('.sh-lines').exists()).toBe(false)

    const boton = wrapper.find('.sh-toggle')
    expect(boton.attributes('aria-expanded')).toBe('false')
    await boton.trigger('click')

    expect(boton.attributes('aria-expanded')).toBe('true')
    const productos = wrapper.findAll('.sh-lines tbody tr').map((tr) => tr.find('td').text())
    expect(productos).toEqual(['Café molido', 'Azúcar 1kg'])
    expect(wrapper.find('.sh-breakdown-total').text()).toContain('50.40')

    await boton.trigger('click')
    expect(wrapper.find('.sh-lines').exists()).toBe(false)
  })

  it('sin ventas lo dice en vez de dejar la tabla vacía', async () => {
    fetch.mockImplementation(async (url) => (String(url).includes('/sales?')
      ? { ok: true, json: async () => ({ data: { resumen: HISTORIAL.resumen, ventas: [], truncado: false } }) }
      : { ok: true, json: async () => ({ data: [] }) }))
    const wrapper = await montar()
    expect(wrapper.find('.sh-table').exists()).toBe(false)
    expect(wrapper.text()).toContain('No hay ventas en este periodo.')
  })

  it('avisa cuando solo se muestran las ventas más recientes', async () => {
    fetch.mockImplementation(async (url) => (String(url).includes('/sales?')
      ? { ok: true, json: async () => ({ data: { ...HISTORIAL, truncado: true } }) }
      : { ok: true, json: async () => ({ data: [] }) }))
    const wrapper = await montar()
    expect(wrapper.find('.sh-note').text()).toContain('Los totales de arriba incluyen todas')
  })
})
