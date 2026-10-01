import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => {
  const client = { query: vi.fn(), release: vi.fn() }
  return {
    default: {
      query: vi.fn(),
      connect: vi.fn(async () => client),
      __client: client,
    },
  }
})

// Las notificaciones de stock bajo salen por Slack: aquí no interesan.
vi.mock('../src/services/notificationService.js', () => ({
  notifyCompany: vi.fn(),
}))

import request from 'supertest'
import pool from '../src/db/pool.js'
import { buildTestApp, signToken, companyMembership } from './helpers/authTestApp.js'

const app = buildTestApp()
const client = pool.__client

/** Producto tal como lo devuelve el SELECT ... FOR UPDATE. */
const producto = (over = {}) => ({
  id_producto: 1,
  stock_actual: 10,
  costo_promedio_ponderado: '6.00',
  precio_venta: '25.50',
  nombre: 'Café molido 500g',
  stock_minimo: 2,
  proyecto_nombre: 'Sucursal Norte',
  ...over,
})

const auth = (req) =>
  req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', '1')

/**
 * Guiona las respuestas del cliente de la transacción en el orden en que
 * createSale las pide: BEGIN, config, un SELECT por ítem, INSERT venta, y por
 * cada línea INSERT movimiento + UPDATE stock, COMMIT.
 */
function scriptSale({ config = null, productos = [producto()], idVenta = 500 } = {}) {
  // requireCompany va contra el pool, no contra el cliente.
  pool.query.mockResolvedValueOnce(companyMembership('owner'))
  // ensureProjectAccess: el super_user se salta el chequeo, aquí usamos owner.
  pool.query.mockResolvedValue({ rows: [{ id_proyecto: 10, permisos: [] }], rowCount: 1 })

  client.query.mockImplementation(async (sql) => {
    const q = String(sql)
    if (q.startsWith('BEGIN') || q.startsWith('COMMIT') || q.startsWith('ROLLBACK')) return { rows: [] }
    if (q.includes('FROM public.empresa_config')) {
      return { rows: config ? [config] : [], rowCount: config ? 1 : 0 }
    }
    if (q.includes('FROM public.producto p')) {
      const next = productos.shift()
      return { rows: next ? [next] : [], rowCount: next ? 1 : 0 }
    }
    if (q.includes('INSERT INTO public.venta')) {
      return { rows: [{ id_venta: idVenta, fecha: '2026-09-27T10:00:00.000Z' }], rowCount: 1 }
    }
    if (q.includes('INSERT INTO public.movimiento_inventario')) {
      return { rows: [{ id_movimiento: 900 }], rowCount: 1 }
    }
    if (q.startsWith('UPDATE public.producto')) return { rows: [], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
}

/** Todas las llamadas del cliente que coinciden con un fragmento de SQL. */
const callsWith = (fragment) =>
  client.query.mock.calls.filter(([sql]) => String(sql).includes(fragment))

const sale = (over = {}) => ({
  items: [{ id_producto: 1, id_proyecto: 10, cantidad: 2, precio_unitario: 25.5 }],
  ...over,
})

beforeEach(() => {
  vi.resetAllMocks()
  client.release.mockReturnValue(undefined)
  pool.connect.mockResolvedValue(client)
})

/**
 * POST /api/inventory-movements/sale
 *
 * El fallo que se cierra aquí: el endpoint aceptaba `precio_unitario` tal como
 * lo enviaba el cliente y nunca lo contrastaba contra producto.precio_venta, así
 * que un cliente manipulado podía registrar ventas a precio arbitrario. Y el
 * descuento y el IVA se calculaban solo en el navegador, sin persistirse.
 */
describe('createSale — el precio sale del producto, no del cliente', () => {
  it('rechaza un precio que no coincide con el vigente', async () => {
    scriptSale({ productos: [producto({ precio_venta: '25.50' })] })

    const res = await auth(
      request(app)
        .post('/api/inventory-movements/sale')
        .send(sale({ items: [{ id_producto: 1, id_proyecto: 10, cantidad: 2, precio_unitario: 0.01 }] }))
    )

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('PRICE_MISMATCH')
    // Y nada se escribió.
    expect(callsWith('INSERT INTO public.venta')).toHaveLength(0)
    expect(callsWith('ROLLBACK')).toHaveLength(1)
  })

  it('persiste el precio del producto, no el que envió el cliente', async () => {
    // Sin precio_unitario en el body no hay nada que contrastar, y el servidor
    // usa el del producto de todos modos: es la garantía de fondo.
    scriptSale({ productos: [producto({ precio_venta: '25.50' })] })

    const res = await auth(
      request(app)
        .post('/api/inventory-movements/sale')
        .send({ items: [{ id_producto: 1, id_proyecto: 10, cantidad: 2 }] })
    )

    expect(res.status).toBe(201)
    const [, params] = callsWith('INSERT INTO public.movimiento_inventario')[0]
    expect(params[1]).toBe(25.5)
  })

  it('un precio por debajo del vigente tampoco pasa', async () => {
    // El caso del atacante que rebaja: no hay tolerancia a la baja.
    scriptSale({ productos: [producto({ precio_venta: '25.50' })] })

    const res = await auth(
      request(app)
        .post('/api/inventory-movements/sale')
        .send(sale({ items: [{ id_producto: 1, id_proyecto: 10, cantidad: 1, precio_unitario: 25.49 }] }))
    )

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('PRICE_MISMATCH')
  })

  it('el precio correcto sí vende', async () => {
    scriptSale({ productos: [producto({ precio_venta: '25.50' })] })

    const res = await auth(request(app).post('/api/inventory-movements/sale').send(sale()))

    expect(res.status).toBe(201)
    expect(callsWith('COMMIT')).toHaveLength(1)
  })
})

describe('createSale — descuento e IVA se calculan y persisten en el servidor', () => {
  it('sin configuración no aplica IVA ni descuento', async () => {
    scriptSale({ config: null, productos: [producto({ precio_venta: '100.00' })] })

    const res = await auth(
      request(app)
        .post('/api/inventory-movements/sale')
        .send(sale({ items: [{ id_producto: 1, id_proyecto: 10, cantidad: 1, precio_unitario: 100 }] }))
    )

    expect(res.status).toBe(201)
    expect(res.body.data.venta).toMatchObject({ subtotal: 100, descuento: 0, iva: 0, total: 100 })
  })

  it('con IVA activo lo calcula y lo devuelve para el ticket', async () => {
    scriptSale({
      config: { iva_activo: true, iva_tasa: '0.12', descuento_activo: false, descuento_max_pct: '0' },
      productos: [producto({ precio_venta: '100.00' })],
    })

    const res = await auth(
      request(app)
        .post('/api/inventory-movements/sale')
        .send(sale({ items: [{ id_producto: 1, id_proyecto: 10, cantidad: 1, precio_unitario: 100 }] }))
    )

    expect(res.body.data.venta).toMatchObject({
      subtotal: 100, base_imponible: 100, iva_tasa: 0.12, iva: 12, total: 112,
    })
  })

  it('el descuento se aplica antes del IVA y se persiste en la cabecera', async () => {
    scriptSale({
      config: { iva_activo: true, iva_tasa: '0.12', descuento_activo: true, descuento_max_pct: '20' },
      productos: [producto({ precio_venta: '100.00' })],
    })

    const res = await auth(
      request(app)
        .post('/api/inventory-movements/sale')
        .send(sale({
          descuento_pct: 10,
          items: [{ id_producto: 1, id_proyecto: 10, cantidad: 1, precio_unitario: 100 }],
        }))
    )

    expect(res.body.data.venta).toMatchObject({
      subtotal: 100, descuento_pct: 10, descuento: 10,
      base_imponible: 90, iva: 10.8, total: 100.8,
    })

    const [, params] = callsWith('INSERT INTO public.venta')[0]
    // subtotal, pct, descuento, base, tasa, iva, total
    expect(params.slice(0, 7)).toEqual([100, 10, 10, 90, 0.12, 10.8, 100.8])
  })

  it('un descuento por encima del tope de la empresa se rechaza con 422', async () => {
    scriptSale({
      config: { iva_activo: true, iva_tasa: '0.12', descuento_activo: true, descuento_max_pct: '10' },
      productos: [producto()],
    })

    const res = await auth(
      request(app).post('/api/inventory-movements/sale').send(sale({ descuento_pct: 50 }))
    )

    expect(res.status).toBe(422)
    expect(res.body.code).toBe('DISCOUNT_ABOVE_MAX')
    expect(callsWith('INSERT INTO public.venta')).toHaveLength(0)
  })

  it('pedir descuento con el descuento desactivado se rechaza', async () => {
    scriptSale({
      config: { iva_activo: false, iva_tasa: '0.12', descuento_activo: false, descuento_max_pct: '0' },
      productos: [producto()],
    })

    const res = await auth(
      request(app).post('/api/inventory-movements/sale').send(sale({ descuento_pct: 5 }))
    )

    expect(res.status).toBe(422)
    expect(res.body.code).toBe('DISCOUNT_DISABLED')
  })

  it('la config se lee dentro de la transacción, no antes', async () => {
    // Leerla fuera dejaría una ventana en la que el owner desactiva el descuento
    // y la venta en vuelo todavía lo aplica.
    scriptSale({ productos: [producto()] })

    await auth(request(app).post('/api/inventory-movements/sale').send(sale()))

    const order = client.query.mock.calls.map(([sql]) => String(sql).trim())
    const begin = order.findIndex((q) => q.startsWith('BEGIN'))
    const cfg = order.findIndex((q) => q.includes('empresa_config'))
    expect(begin).toBeGreaterThanOrEqual(0)
    expect(cfg).toBeGreaterThan(begin)
  })

  it('reparte el descuento entre las líneas y el reparto suma la cabecera', async () => {
    scriptSale({
      config: { iva_activo: true, iva_tasa: '0.12', descuento_activo: true, descuento_max_pct: '20' },
      productos: [
        producto({ id_producto: 1, precio_venta: '75.00' }),
        producto({ id_producto: 2, precio_venta: '25.00' }),
      ],
    })

    const res = await auth(
      request(app).post('/api/inventory-movements/sale').send({
        descuento_pct: 20,
        items: [
          { id_producto: 1, id_proyecto: 10, cantidad: 1, precio_unitario: 75 },
          { id_producto: 2, id_proyecto: 10, cantidad: 1, precio_unitario: 25 },
        ],
      })
    )

    expect(res.status).toBe(201)
    const inserts = callsWith('INSERT INTO public.movimiento_inventario')
    expect(inserts).toHaveLength(2)

    // Orden del INSERT: 0 cantidad, 1 precio, 2 motivo, 3 producto, 4 usuario,
    // 5 proyecto, 6 empresa, 7 costo, 8 id_venta, 9 descuento_linea, 10 iva_linea.
    const descuentos = inserts.map(([, p]) => p[9])
    const ivas = inserts.map(([, p]) => p[10])
    expect(descuentos).toEqual([15, 5])
    expect(descuentos.reduce((a, b) => a + b, 0)).toBe(res.body.data.venta.descuento)
    expect(ivas.reduce((a, b) => a + Math.round(b * 100), 0) / 100)
      .toBe(res.body.data.venta.iva)
  })

  it('todas las líneas quedan ligadas a la misma cabecera', async () => {
    scriptSale({
      productos: [producto({ id_producto: 1 }), producto({ id_producto: 2 })],
      idVenta: 777,
    })

    await auth(
      request(app).post('/api/inventory-movements/sale').send({
        items: [
          { id_producto: 1, id_proyecto: 10, cantidad: 1 },
          { id_producto: 2, id_proyecto: 10, cantidad: 1 },
        ],
      })
    )

    const idsVenta = callsWith('INSERT INTO public.movimiento_inventario').map(([, p]) => p[8])
    expect(idsVenta).toEqual([777, 777])
  })

  it('stock insuficiente deshace la venta completa', async () => {
    scriptSale({ productos: [producto({ stock_actual: 1 })] })

    const res = await auth(
      request(app).post('/api/inventory-movements/sale').send(sale({
        items: [{ id_producto: 1, id_proyecto: 10, cantidad: 5 }],
      }))
    )

    expect(res.status).toBe(409)
    expect(callsWith('ROLLBACK')).toHaveLength(1)
    expect(callsWith('COMMIT')).toHaveLength(0)
  })
})
