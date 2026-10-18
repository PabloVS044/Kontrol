/**
 * I3 — Integración: API de productos ↔ restricción única de PostgreSQL.
 *
 * Componentes reales: productRoutes → requireAuth → requireCompany →
 * requireProject y requireProjectPermission (consultas de acceso) → validate
 * (Zod) → createProduct → índice único parcial `producto_codigo_barras_unique`
 * ON producto (id_proyecto, codigo_barras) WHERE codigo_barras IS NOT NULL.
 *
 * La unicidad del código de barras no la decide el controlador: la impone la
 * base, y el controlador traduce el error 23505 a un 409. Solo una prueba con
 * Postgres real puede comprobar que ambos lados encajan.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api, closeDb, createCompanyWithOwner, createProject, query } from '../db/fixtures.js'

const BARCODE = '7501234567890'

describe('I3 — unicidad del código de barras por proyecto', () => {
  let ctx
  let bodega
  let sucursal

  beforeAll(async () => {
    ctx = await createCompanyWithOwner()
    bodega = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario, nombre: 'Bodega central' })
    sucursal = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario, nombre: 'Sucursal norte' })
  })

  afterAll(closeDb)

  const createIn = (project, body) =>
    api()
      .post('/api/products')
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
      .set('X-Project-ID', String(project.id_proyecto))
      .send({ precio_venta: 50, precio_costo: 30, ...body })

  const countWithBarcode = async (project) => {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS n FROM public.producto WHERE id_proyecto = $1 AND codigo_barras = $2',
      [project.id_proyecto, BARCODE]
    )
    return rows[0].n
  }

  it('crea el primer producto con el código de barras (201)', async () => {
    const res = await createIn(bodega, { nombre: 'Taladro', codigo_barras: BARCODE })

    expect(res.status).toBe(201)
    expect(await countWithBarcode(bodega)).toBe(1)
  })

  it('el mismo código en el mismo proyecto lo rechaza la base y la API responde 409', async () => {
    const res = await createIn(bodega, { nombre: 'Taladro duplicado', codigo_barras: BARCODE })

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/barcode/i)
    expect(await countWithBarcode(bodega)).toBe(1)
  })

  it('el mismo código en otro proyecto de la empresa sí se permite (201)', async () => {
    const res = await createIn(sucursal, { nombre: 'Taladro', codigo_barras: BARCODE })

    expect(res.status).toBe(201)
    expect(await countWithBarcode(sucursal)).toBe(1)
  })

  it('varios productos sin código de barras conviven en el mismo proyecto (índice parcial)', async () => {
    const a = await createIn(bodega, { nombre: 'Lija fina' })
    const b = await createIn(bodega, { nombre: 'Lija gruesa' })

    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
  })
})
