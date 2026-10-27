import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import request from 'supertest'
import pool from '../src/db/pool.js'
import { SALES_HISTORY_LIMIT } from '../src/controllers/inventoryMovementController.js'
import { buildTestApp, signToken, companyMembership } from './helpers/authTestApp.js'

const app = buildTestApp()

const auth = (req) =>
  req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', '1')

const RANGO = '?desde=2026-10-27T00:00:00&hasta=2026-10-27T23:59:59&tz=America%2FGuatemala'

const cabecera = (over = {}) => ({
  clave: 'v41',
  id_venta: 41,
  fecha: '2026-10-27T16:05:00Z',
  usuario_nombre: 'Ana',
  usuario_apellido: 'Martínez',
  proyectos: ['Tienda'],
  subtotal: '50.00',
  descuento: '5.00',
  iva: '5.40',
  unidades: '3',
  ...over,
})

const linea = (over = {}) => ({
  clave: 'v41',
  id_movimiento: 900,
  id_producto: 1,
  producto_nombre: 'Café molido 500g',
  id_proyecto: 10,
  proyecto_nombre: 'Tienda',
  cantidad: 2,
  precio_unitario: '20.00',
  descuento_linea: '4.00',
  iva_linea: '4.32',
  ...over,
})

/** Responde según el fragmento de SQL: membresía, resumen, cabeceras, líneas. */
function scriptHistory({ rol = 'owner', resumen, cabeceras = [cabecera()], lineas, asignaciones = [] } = {}) {
  pool.query.mockImplementation(async (sql) => {
    const q = String(sql)
    if (q.includes('FROM public.empresa_usuario')) return companyMembership(rol)
    if (q.includes('COUNT(DISTINCT')) {
      return { rows: [resumen ?? { ventas: '1', subtotal: '50.00', descuentos: '5.00', iva: '5.40', unidades: '3' }] }
    }
    if (q.includes('array_agg(DISTINCT proj.nombre)')) return { rows: cabeceras }
    if (q.includes('AS producto_nombre')) {
      return { rows: lineas ?? [linea(), linea({ id_movimiento: 901, id_producto: 2, producto_nombre: 'Azúcar 1kg', cantidad: 1, precio_unitario: '10.00', descuento_linea: '1.00', iva_linea: '1.08' })] }
    }
    return { rows: asignaciones, rowCount: asignaciones.length }
  })
}

const callsWith = (fragment) =>
  pool.query.mock.calls.filter(([sql]) => String(sql).includes(fragment))

beforeEach(() => {
  pool.query.mockReset()
})

describe('GET /api/inventory-movements/sales', () => {
  it('exige un rango con formato de fecha y hora local', async () => {
    scriptHistory()
    const sinRango = await auth(request(app).get('/api/inventory-movements/sales'))
    expect(sinRango.status).toBe(400)

    const inyeccion = await auth(request(app).get("/api/inventory-movements/sales?desde=2026-10-27';--&hasta=2026-10-27T23:59:59"))
    expect(inyeccion.status).toBe(400)
    expect(callsWith('COUNT(DISTINCT')).toHaveLength(0)
  })

  it('devuelve el resumen del rango y cada venta con sus líneas', async () => {
    scriptHistory()
    const res = await auth(request(app).get(`/api/inventory-movements/sales${RANGO}`))

    expect(res.status).toBe(200)
    expect(res.body.data.resumen).toEqual({
      ventas: 1,
      subtotal: 50,
      descuentos: 5,
      iva: 5.4,
      cobrado_total: 50.4,
      unidades: 3,
      ticket_promedio: 50.4,
    })
    const [venta] = res.body.data.ventas
    expect(venta).toMatchObject({
      id_venta: 41,
      fecha: '2026-10-27T16:05:00Z',
      vendedor: 'Ana Martínez',
      proyectos: ['Tienda'],
      unidades: 3,
      total: 50.4,
    })
    expect(venta.lineas.map((l) => [l.producto_nombre, l.cantidad, l.importe])).toEqual([
      ['Café molido 500g', 2, 40.32],
      ['Azúcar 1kg', 1, 10.08],
    ])
    expect(res.body.data.truncado).toBe(false)
  })

  it('compara el rango en la zona del cliente y filtra por proyecto si se pide', async () => {
    scriptHistory()
    await auth(request(app).get(`/api/inventory-movements/sales${RANGO}&projectId=10`))

    const [sql, values] = callsWith('COUNT(DISTINCT')[0]
    expect(sql).toContain("AT TIME ZONE 'UTC'")
    expect(values).toEqual([1, 'America/Guatemala', '2026-10-27T00:00:00', '2026-10-27T23:59:59', 10])
    expect(sql).toContain("m.tipo = 'SALIDA'")
  })

  it('solo pide las líneas de las ventas que devuelve', async () => {
    scriptHistory()
    await auth(request(app).get(`/api/inventory-movements/sales${RANGO}`))

    const [, values] = callsWith('AS producto_nombre')[0]
    expect(values.at(-1)).toEqual(['v41'])
  })

  it('sin ventas en el rango no consulta líneas', async () => {
    scriptHistory({ cabeceras: [], resumen: { ventas: '0', subtotal: '0', descuentos: '0', iva: '0', unidades: '0' } })
    const res = await auth(request(app).get(`/api/inventory-movements/sales${RANGO}`))

    expect(res.body.data.ventas).toEqual([])
    expect(res.body.data.resumen.ticket_promedio).toBe(0)
    expect(callsWith('AS producto_nombre')).toHaveLength(0)
  })

  it('avisa cuando el rango tiene más ventas de las que devuelve', async () => {
    const muchas = Array.from({ length: SALES_HISTORY_LIMIT + 1 }, (_, i) => cabecera({ clave: `v${i}`, id_venta: i }))
    scriptHistory({ cabeceras: muchas, lineas: [] })
    const res = await auth(request(app).get(`/api/inventory-movements/sales${RANGO}`))

    expect(res.body.data.truncado).toBe(true)
    expect(res.body.data.ventas).toHaveLength(SALES_HISTORY_LIMIT)
  })

  it('quien no ve el inventario de ningún proyecto recibe un historial vacío', async () => {
    scriptHistory({ rol: 'member', asignaciones: [] })
    const res = await auth(request(app).get(`/api/inventory-movements/sales${RANGO}`))

    expect(res.status).toBe(200)
    expect(res.body.data.ventas).toEqual([])
    expect(callsWith('COUNT(DISTINCT')).toHaveLength(0)
  })
})
