/**
 * RG2 — Regresión: el precio de venta lo dicta la base de datos, nunca el cliente.
 *
 * Comportamiento protegido (corrección "compute and persist sale totals on the
 * server"): el controlador de venta toma `producto.precio_venta` de Postgres.
 * Si el cliente declara un `precio_unitario` distinto, la venta se rechaza con
 * 409 PRICE_MISMATCH en vez de cobrarse a ese importe.
 *
 * Cambio que lo rompería: en `createSale`
 * (`src/controllers/inventoryMovementController.js`) volver a usar
 * `item.precio_unitario` del body —por ejemplo, para "respetar el precio que
 * mostró el carrito"—. Cualquiera con un token podría registrar ventas a Q0.01.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  api, closeDb, createCompanyWithOwner, createProduct, createProject, query, salesCountFor, stockOf,
} from '../db/fixtures.js'

describe('RG2 — autoridad del precio en el servidor', () => {
  let ctx
  let project
  let producto

  beforeAll(async () => {
    ctx = await createCompanyWithOwner()
    project = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario })
    producto = await createProduct({ id_proyecto: project.id_proyecto, nombre: 'Pintura', precio_venta: 75, stock_actual: 20 })
  })

  afterAll(closeDb)

  const sell = (item) =>
    api()
      .post('/api/inventory-movements/sale')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
      .send({ items: [{ id_producto: producto.id_producto, id_proyecto: project.id_proyecto, cantidad: 1, ...item }] })

  it('un precio manipulado por el cliente se rechaza con 409 PRICE_MISMATCH y no se vende nada', async () => {
    const ventasAntes = await salesCountFor(ctx.company.id_empresa)

    const res = await sell({ precio_unitario: 0.01 })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('PRICE_MISMATCH')
    expect(await salesCountFor(ctx.company.id_empresa)).toBe(ventasAntes)
    expect(await stockOf(producto.id_producto)).toBe(20)
  })

  it('sin precio en el body se cobra el precio vigente de la base', async () => {
    const res = await sell({})

    expect(res.status).toBe(201)
    expect(res.body.data.venta.total).toBe(75)

    const { rows } = await query(
      'SELECT precio_unitario FROM public.movimiento_inventario WHERE id_venta = $1',
      [res.body.data.venta.id_venta]
    )
    expect(Number(rows[0].precio_unitario)).toBe(75)
  })

  it('si el precio cambia en la base, la venta usa el nuevo precio', async () => {
    await query('UPDATE public.producto SET precio_venta = 80 WHERE id_producto = $1', [producto.id_producto])

    const stale = await sell({ precio_unitario: 75 })
    expect(stale.status).toBe(409)
    expect(stale.body.code).toBe('PRICE_MISMATCH')

    const fresh = await sell({ precio_unitario: 80 })
    expect(fresh.status).toBe(201)
    expect(fresh.body.data.venta.total).toBe(80)
  })
})
