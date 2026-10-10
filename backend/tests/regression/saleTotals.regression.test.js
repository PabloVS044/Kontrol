/**
 * RG1 — Regresión: el IVA se calcula sobre la base imponible, no sobre el subtotal.
 *
 * Comportamiento protegido (HU del punto de venta, Sprint 5; IVA y descuento
 * configurables por empresa desde el Sprint 8): el orden del cálculo es
 *   subtotal → − descuento → base imponible → + IVA sobre la base → total.
 *
 * Cambio que lo rompería: en `src/services/saleCalculation.js` (`calcSale`),
 * calcular `tax` sobre `subtotal` en vez de sobre `taxableBase`. El código
 * sigue compilando, cada número parece razonable por separado y la venta se
 * registra sin error, pero el cliente paga IVA sobre un dinero que no pagó.
 *
 * Se comprueba de punta a punta: lo que devuelve la API (lo que se imprime en
 * el ticket) y lo que queda en la tabla `venta` (lo que leen los reportes).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api, closeDb, createCompanyWithOwner, createProduct, createProject, query } from '../db/fixtures.js'

describe('RG1 — desglose de la venta con descuento e IVA', () => {
  let ctx
  let project
  let producto

  beforeAll(async () => {
    ctx = await createCompanyWithOwner({
      config: { iva_activo: true, iva_tasa: 0.12, descuento_activo: true, descuento_max_pct: 10 },
    })
    project = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario })
    producto = await createProduct({ id_proyecto: project.id_proyecto, nombre: 'Cemento', precio_venta: 100, stock_actual: 50 })
  })

  afterAll(closeDb)

  const sell = (body) =>
    api()
      .post('/api/inventory-movements/sale')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
      .send(body)

  // Q100 con 10 % de descuento e IVA del 12 %:
  //   descuento 10.00 → base 90.00 → IVA 12 % de 90 = 10.80 → total 100.80
  // Con la regresión (IVA sobre el subtotal): IVA 12.00 → total 102.00
  const ESPERADO = {
    subtotal: 100,
    descuento_pct: 10,
    descuento: 10,
    base_imponible: 90,
    iva_tasa: 0.12,
    iva: 10.8,
    total: 100.8,
  }

  it('Q100 − 10 % + IVA 12 % = Q100.80 en la respuesta (ticket)', async () => {
    const res = await sell({
      descuento_pct: 10,
      items: [{ id_producto: producto.id_producto, id_proyecto: project.id_proyecto, cantidad: 1 }],
    })

    expect(res.status).toBe(201)
    expect(res.body.data.venta).toMatchObject(ESPERADO)
  })

  it('las mismas cifras quedan persistidas en la tabla venta (reportes)', async () => {
    const res = await sell({
      descuento_pct: 10,
      items: [{ id_producto: producto.id_producto, id_proyecto: project.id_proyecto, cantidad: 1 }],
    })
    expect(res.status).toBe(201)

    const { rows } = await query(
      `SELECT subtotal, descuento_pct, descuento, base_imponible, iva_tasa, iva, total
       FROM public.venta WHERE id_venta = $1`,
      [res.body.data.venta.id_venta]
    )
    const persisted = Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, Number(v)]))
    expect(persisted).toEqual(ESPERADO)
  })

  it('el IVA de cada línea suma exactamente el IVA de la cabecera', async () => {
    const res = await sell({
      descuento_pct: 10,
      items: [{ id_producto: producto.id_producto, id_proyecto: project.id_proyecto, cantidad: 3 }],
    })
    expect(res.status).toBe(201)

    const { rows } = await query(
      'SELECT COALESCE(SUM(iva_linea), 0) AS iva FROM public.movimiento_inventario WHERE id_venta = $1',
      [res.body.data.venta.id_venta]
    )
    // Q300 − 10 % = 270 → IVA 32.40
    expect(res.body.data.venta.iva).toBe(32.4)
    expect(Number(rows[0].iva)).toBe(32.4)
  })
})
