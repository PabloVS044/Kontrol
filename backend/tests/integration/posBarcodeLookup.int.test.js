/**
 * DT-22 (RTF 2, PERF-04) — Integración: búsqueda del POS por código.
 *
 * El POS resolvía cada escaneo descargando el inventario completo y buscando
 * en el navegador, y volvía a descargarlo después de cada venta. Ahora el
 * código se resuelve en `GET /api/products/barcode/:code` y la venta devuelve
 * el stock final de lo vendido. Con Postgres real se fija el contrato que el
 * POS necesita: todas las coincidencias (el código es único por proyecto, no
 * por empresa), el mismo control de acceso que el listado y el stock vigente.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  addCompanyMember,
  api,
  closeDb,
  createCompanyWithOwner,
  createProduct,
  createProject,
  query,
  stockOf,
} from '../db/fixtures.js'

const CODE = '7509876543210'

const withBarcode = async (product, code = CODE) => {
  await query('UPDATE public.producto SET codigo_barras = $1 WHERE id_producto = $2', [code, product.id_producto])
  return product
}

describe('DT-22 — búsqueda del POS por código en el servidor', () => {
  let ctx
  let bodega
  let sucursal
  let enBodega
  let enSucursal
  let otraEmpresa

  beforeAll(async () => {
    ctx = await createCompanyWithOwner()
    bodega = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario, nombre: 'Bodega' })
    sucursal = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario, nombre: 'Sucursal' })
    enBodega = await withBarcode(await createProduct({ id_proyecto: bodega.id_proyecto, nombre: 'Taladro', stock_actual: 7 }))
    enSucursal = await withBarcode(await createProduct({ id_proyecto: sucursal.id_proyecto, nombre: 'Taladro', stock_actual: 3 }))
    await withBarcode(await createProduct({ id_proyecto: bodega.id_proyecto, nombre: 'Lija' }), '111')

    // El mismo código en otra empresa no debe aparecer nunca.
    otraEmpresa = await createCompanyWithOwner()
    const ajeno = await createProject({ id_empresa: otraEmpresa.company.id_empresa, id_encargado: otraEmpresa.owner.id_usuario })
    await withBarcode(await createProduct({ id_proyecto: ajeno.id_proyecto, nombre: 'Taladro ajeno' }))
  })

  afterAll(closeDb)

  const lookup = (token, path, companyId = ctx.company.id_empresa) =>
    api()
      .get(`/api/products/barcode/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Company-ID', String(companyId))

  it('devuelve todas las coincidencias de la empresa, con proyecto y stock', async () => {
    const res = await lookup(ctx.token, CODE)

    expect(res.status).toBe(200)
    expect(res.body.data.map((p) => [p.id_producto, p.proyecto_nombre, p.stock_actual])).toEqual([
      [enBodega.id_producto, 'Bodega', 7],
      [enSucursal.id_producto, 'Sucursal', 3],
    ])
  })

  it('con ?projectId solo devuelve la del proyecto', async () => {
    const res = await lookup(ctx.token, `${CODE}?projectId=${sucursal.id_proyecto}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map((p) => p.id_producto)).toEqual([enSucursal.id_producto])
  })

  it('un código inexistente devuelve una lista vacía', async () => {
    const res = await lookup(ctx.token, '000000')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('no cruza empresas', async () => {
    const res = await lookup(otraEmpresa.token, CODE, otraEmpresa.company.id_empresa)

    expect(res.body.data.map((p) => p.nombre)).toEqual(['Taladro ajeno'])
  })

  it('un colaborador sin inventario en ningún proyecto no ve nada, tampoco pidiendo un proyecto', async () => {
    const colaborador = await addCompanyMember({ id_empresa: ctx.company.id_empresa, rol_empresa: 'collaborator' })

    const todos = await lookup(colaborador.token, CODE)
    const uno = await lookup(colaborador.token, `${CODE}?projectId=${bodega.id_proyecto}`)

    expect(todos.status).toBe(200)
    expect(todos.body.data).toEqual([])
    expect(uno.status).toBe(200)
    expect(uno.body.data).toEqual([])
  })

  it('la venta devuelve el stock final de cada producto vendido', async () => {
    const res = await api()
      .post('/api/inventory-movements/sale')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
      .send({
        items: [
          { id_producto: enBodega.id_producto, id_proyecto: bodega.id_proyecto, cantidad: 2 },
          { id_producto: enSucursal.id_producto, id_proyecto: sucursal.id_proyecto, cantidad: 1 },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.data.stock).toEqual([
      { id_producto: enBodega.id_producto, stock_actual: 5 },
      { id_producto: enSucursal.id_producto, stock_actual: 2 },
    ])
    expect(await stockOf(enBodega.id_producto)).toBe(5)
    expect(await stockOf(enSucursal.id_producto)).toBe(2)
  })
})
