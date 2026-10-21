/**
 * I4 — Integración: relación producto ↔ proveedor (DT-04).
 *
 * Componentes reales: productRoutes → requireAuth → requireCompany →
 * requireProject → requireProjectPermission → validate (productSupplierParamsSchema)
 * → linkSupplier / updateSupplierLink / unlinkSupplier → tabla `producto_proveedor`.
 *
 * DT-04 fue un desajuste entre el nombre del parámetro de la ruta
 * (`:supplierId`) y el que leía el controlador (`req.params.pid`): los tres
 * endpoints quedaron rotos en producción mientras todas las pruebas unitarias,
 * que llamaban al controlador con `req.params` armado a mano, seguían en verde.
 * Aquí la petición entra por la ruta real de Express, así que un renombre en
 * un solo lado vuelve a poner la suite en rojo.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  api, closeDb, createCompanyWithOwner, createProduct, createProject, createSupplier, query,
} from '../db/fixtures.js'

// Un solo pool por archivo: se cierra al final, no al terminar cada describe.
afterAll(closeDb)

describe('I4 — vincular, actualizar y desvincular un proveedor de un producto', () => {
  let ctx
  let project
  let producto
  let proveedor

  beforeAll(async () => {
    ctx = await createCompanyWithOwner()
    project = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario })
    producto = await createProduct({ id_proyecto: project.id_proyecto, nombre: 'Varilla' })
    proveedor = await createSupplier({ id_empresa: ctx.company.id_empresa, nombre: 'Aceros del Sur' })
  })


  const as = (actor, projectId) => (method, url) =>
    api()[method](url)
      .set('Authorization', `Bearer ${actor.token}`)
      .set('X-Company-ID', String(actor.company.id_empresa))
      .set('X-Project-ID', String(projectId))

  const link = async () => {
    const { rows } = await query(
      'SELECT precio_unitario, fecha_ultima_cotizacion FROM public.producto_proveedor WHERE id_producto = $1 AND id_proveedor = $2',
      [producto.id_producto, proveedor.id_proveedor]
    )
    return rows[0]
  }

  const owner = () => as(ctx, project.id_proyecto)
  const linkUrl = () => `/api/products/${producto.id_producto}/suppliers/${proveedor.id_proveedor}`

  it('POST /:id/suppliers crea la relación con su precio (201)', async () => {
    const res = await owner()('post', `/api/products/${producto.id_producto}/suppliers`)
      .send({ id_proveedor: proveedor.id_proveedor, precio_unitario: 42.5 })

    expect(res.status).toBe(201)
    expect(Number((await link()).precio_unitario)).toBe(42.5)
  })

  it('vincular dos veces el mismo proveedor responde 409 sin duplicar la fila', async () => {
    const res = await owner()('post', `/api/products/${producto.id_producto}/suppliers`)
      .send({ id_proveedor: proveedor.id_proveedor, precio_unitario: 40 })

    expect(res.status).toBe(409)
    expect(Number((await link()).precio_unitario)).toBe(42.5)
  })

  it('PUT /:id/suppliers/:supplierId actualiza la fila que nombran los parámetros de la ruta', async () => {
    const res = await owner()('put', linkUrl())
      .send({ precio_unitario: 39.9, fecha_ultima_cotizacion: '2026-10-01' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      id_producto: producto.id_producto,
      id_proveedor: proveedor.id_proveedor,
    })
    const persisted = await link()
    expect(Number(persisted.precio_unitario)).toBe(39.9)
    expect(persisted.fecha_ultima_cotizacion.toISOString().slice(0, 10)).toBe('2026-10-01')
  })

  it('PUT sobre una relación que no existe responde 404, no 500', async () => {
    const otro = await createSupplier({ id_empresa: ctx.company.id_empresa })
    const res = await owner()('put', `/api/products/${producto.id_producto}/suppliers/${otro.id_proveedor}`)
      .send({ precio_unitario: 10 })

    expect(res.status).toBe(404)
  })

  it('un supplierId no numérico lo rechaza la validación de parámetros (400)', async () => {
    const res = await owner()('put', `/api/products/${producto.id_producto}/suppliers/abc`)
      .send({ precio_unitario: 10 })

    expect(res.status).toBe(400)
  })

  it('DELETE /:id/suppliers/:supplierId borra la relación y un segundo DELETE da 404', async () => {
    const first = await owner()('delete', linkUrl())
    expect(first.status).toBe(200)
    expect(await link()).toBeUndefined()

    const second = await owner()('delete', linkUrl())
    expect(second.status).toBe(404)
  })

  it('el producto y el proveedor siguen existiendo después de desvincularlos', async () => {
    const { rows } = await query(
      `SELECT (SELECT COUNT(*)::int FROM public.producto WHERE id_producto = $1) AS productos,
              (SELECT COUNT(*)::int FROM public.proveedor WHERE id_proveedor = $2) AS proveedores`,
      [producto.id_producto, proveedor.id_proveedor]
    )
    expect(rows[0]).toEqual({ productos: 1, proveedores: 1 })
  })
})

describe('I4 — aislamiento entre empresas en producto ↔ proveedor', () => {
  let empresaA
  let empresaB
  let proyectoA
  let proyectoB
  let productoA
  let proveedorA
  let proveedorB

  beforeAll(async () => {
    empresaA = await createCompanyWithOwner()
    empresaB = await createCompanyWithOwner()
    proyectoA = await createProject({ id_empresa: empresaA.company.id_empresa, id_encargado: empresaA.owner.id_usuario })
    proyectoB = await createProject({ id_empresa: empresaB.company.id_empresa, id_encargado: empresaB.owner.id_usuario })
    productoA = await createProduct({ id_proyecto: proyectoA.id_proyecto })
    proveedorA = await createSupplier({ id_empresa: empresaA.company.id_empresa })
    proveedorB = await createSupplier({ id_empresa: empresaB.company.id_empresa })

    await query(
      'INSERT INTO public.producto_proveedor (id_producto, id_proveedor, precio_unitario) VALUES ($1, $2, 25)',
      [productoA.id_producto, proveedorA.id_proveedor]
    )
  })


  // El owner de B usa su propia empresa y su propio proyecto en las cabeceras:
  // pasa requireCompany y requireProject legítimamente y apunta a ids de A.
  const asOwnerB = (method, url) =>
    api()[method](url)
      .set('Authorization', `Bearer ${empresaB.token}`)
      .set('X-Company-ID', String(empresaB.company.id_empresa))
      .set('X-Project-ID', String(proyectoB.id_proyecto))

  const linksOf = async (id_producto) => {
    const { rows } = await query(
      'SELECT id_proveedor, precio_unitario FROM public.producto_proveedor WHERE id_producto = $1 ORDER BY id_proveedor',
      [id_producto]
    )
    return rows.map((r) => ({ id_proveedor: r.id_proveedor, precio_unitario: Number(r.precio_unitario) }))
  }

  it('B no puede vincular su proveedor a un producto de A', async () => {
    const res = await asOwnerB('post', `/api/products/${productoA.id_producto}/suppliers`)
      .send({ id_proveedor: proveedorB.id_proveedor, precio_unitario: 1 })

    expect(res.status).toBe(404)
    expect(await linksOf(productoA.id_producto)).toEqual([{ id_proveedor: proveedorA.id_proveedor, precio_unitario: 25 }])
  })

  it('B no puede cambiar el precio pactado entre A y su proveedor', async () => {
    const res = await asOwnerB('put', `/api/products/${productoA.id_producto}/suppliers/${proveedorA.id_proveedor}`)
      .send({ precio_unitario: 0 })

    expect(res.status).toBe(404)
    expect(await linksOf(productoA.id_producto)).toEqual([{ id_proveedor: proveedorA.id_proveedor, precio_unitario: 25 }])
  })

  it('B no puede desvincular el proveedor de un producto de A', async () => {
    const res = await asOwnerB('delete', `/api/products/${productoA.id_producto}/suppliers/${proveedorA.id_proveedor}`)

    expect(res.status).toBe(404)
    expect(await linksOf(productoA.id_producto)).toHaveLength(1)
  })

  // Misma causa que los tres anteriores: el producto se buscaba solo por id.
  it('B tampoco puede editar ni borrar el producto de A', async () => {
    const put = await asOwnerB('put', `/api/products/${productoA.id_producto}`).send({ precio_venta: 0, precio_costo: 0 })
    expect(put.status).toBe(404)

    const del = await asOwnerB('delete', `/api/products/${productoA.id_producto}`)
    expect(del.status).toBe(404)

    const { rows } = await query('SELECT precio_venta FROM public.producto WHERE id_producto = $1', [productoA.id_producto])
    expect(Number(rows[0].precio_venta)).toBe(50)
  })
})
