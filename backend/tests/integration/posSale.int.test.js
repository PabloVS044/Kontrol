/**
 * I2 — Integración: API del punto de venta ↔ transacción en PostgreSQL.
 *
 * Componentes reales: inventoryMovementRoutes → requireAuth → requireCompany
 * (consulta de membresía) → validate (Zod) → createSale → saleCalculation →
 * transacción pg sobre `empresa_config`, `producto` (FOR UPDATE), `venta` y
 * `movimiento_inventario`.
 *
 * Verifica que una venta deja las tres tablas coherentes entre sí y que, si
 * falla a la mitad, el ROLLBACK no deja nada escrito.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  api, closeDb, createCompanyWithOwner, createProduct, createProject, query, salesCountFor, stockOf,
} from '../db/fixtures.js'

describe('I2 — venta del punto de venta persistida de forma atómica', () => {
  let ctx
  let project
  let martillo
  let clavos

  beforeAll(async () => {
    ctx = await createCompanyWithOwner({
      config: { iva_activo: true, iva_tasa: 0.12, descuento_activo: true, descuento_max_pct: 10 },
    })
    project = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario })
    martillo = await createProduct({ id_proyecto: project.id_proyecto, nombre: 'Martillo', precio_venta: 50, stock_actual: 10 })
    clavos = await createProduct({ id_proyecto: project.id_proyecto, nombre: 'Clavos', precio_venta: 20, stock_actual: 5 })
  })

  afterAll(closeDb)

  const sell = (body) =>
    api()
      .post('/api/inventory-movements/sale')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
      .send(body)

  it('crea la venta, un movimiento SALIDA por línea y descuenta el stock', async () => {
    const res = await sell({
      motivo: 'Venta mostrador',
      items: [
        { id_producto: martillo.id_producto, id_proyecto: project.id_proyecto, cantidad: 2 },
        { id_producto: clavos.id_producto, id_proyecto: project.id_proyecto, cantidad: 1 },
      ],
    })

    expect(res.status).toBe(201)
    expect(res.body.data.count).toBe(2)
    const { id_venta, total } = res.body.data.venta
    // 2 × 50 + 1 × 20 = 120, sin descuento, IVA 12 % → 134.40
    expect(total).toBe(134.4)

    // Cabecera de la venta: lo que se persiste es lo que se devolvió.
    const venta = await query('SELECT * FROM public.venta WHERE id_venta = $1', [id_venta])
    expect(venta.rows).toHaveLength(1)
    expect(Number(venta.rows[0].subtotal)).toBe(120)
    expect(Number(venta.rows[0].iva)).toBe(14.4)
    expect(Number(venta.rows[0].total)).toBe(134.4)
    expect(venta.rows[0].id_empresa).toBe(ctx.company.id_empresa)
    expect(venta.rows[0].id_usuario).toBe(ctx.owner.id_usuario)

    // Detalle: un movimiento SALIDA por línea, ligado a la venta.
    const movimientos = await query(
      `SELECT id_producto, tipo, cantidad, precio_unitario
       FROM public.movimiento_inventario WHERE id_venta = $1 ORDER BY id_producto`,
      [id_venta]
    )
    expect(movimientos.rows).toHaveLength(2)
    expect(movimientos.rows.every((m) => m.tipo === 'SALIDA')).toBe(true)
    expect(movimientos.rows.map((m) => m.cantidad)).toEqual([2, 1])

    // Inventario descontado en la misma transacción.
    expect(await stockOf(martillo.id_producto)).toBe(8)
    expect(await stockOf(clavos.id_producto)).toBe(4)
  })

  it('con stock insuficiente responde 409 y el ROLLBACK no deja venta ni movimientos', async () => {
    const ventasAntes = await salesCountFor(ctx.company.id_empresa)
    const stockMartillo = await stockOf(martillo.id_producto)

    // La primera línea es válida y se procesa; la segunda pide más clavos de
    // los que hay. Toda la venta debe deshacerse, incluida la primera línea.
    const res = await sell({
      items: [
        { id_producto: martillo.id_producto, id_proyecto: project.id_proyecto, cantidad: 1 },
        { id_producto: clavos.id_producto, id_proyecto: project.id_proyecto, cantidad: 99 },
      ],
    })

    expect(res.status).toBe(409)
    expect(await salesCountFor(ctx.company.id_empresa)).toBe(ventasAntes)
    expect(await stockOf(martillo.id_producto)).toBe(stockMartillo)
    expect(await stockOf(clavos.id_producto)).toBe(4)
  })

  it('un descuento por encima del tope configurado en empresa_config se rechaza (422)', async () => {
    const res = await sell({
      descuento_pct: 25,
      items: [{ id_producto: martillo.id_producto, id_proyecto: project.id_proyecto, cantidad: 1 }],
    })

    expect(res.status).toBe(422)
    expect(res.body.code).toBeDefined()
  })
})
