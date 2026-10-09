/**
 * RG3 — Regresión: aislamiento de datos entre empresas (multi-tenant, SCRUM-9).
 *
 * Comportamiento protegido: un usuario solo ve y opera datos de las empresas a
 * las que pertenece. `requireCompany` valida la cabecera X-Company-ID contra
 * `empresa_usuario`, y los controladores filtran por `id_empresa`.
 *
 * Cambios que lo romperían: quitar o relajar la consulta de membresía en
 * `src/middleware/requireCompany.js` (p. ej. confiar en la cabecera tal cual),
 * o eliminar el filtro `pr.id_empresa = $3` de la venta. Ningún test unitario
 * con el pool simulado lo detecta, porque el mock devuelve lo que se le pida;
 * aquí la membresía se resuelve contra filas reales.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  api, closeDb, createCompanyWithOwner, createProduct, createProject, stockOf,
} from '../db/fixtures.js'

describe('RG3 — una empresa no puede ver ni vender datos de otra', () => {
  let empresaA
  let empresaB
  let proyectoA
  let proyectoB
  let productoA

  beforeAll(async () => {
    empresaA = await createCompanyWithOwner()
    empresaB = await createCompanyWithOwner()
    proyectoA = await createProject({ id_empresa: empresaA.company.id_empresa, id_encargado: empresaA.owner.id_usuario, nombre: 'Obra A' })
    proyectoB = await createProject({ id_empresa: empresaB.company.id_empresa, id_encargado: empresaB.owner.id_usuario, nombre: 'Obra B' })
    productoA = await createProduct({ id_proyecto: proyectoA.id_proyecto, precio_venta: 40, stock_actual: 10 })
  })

  afterAll(closeDb)

  const as = (actor, companyId) => ({
    get: (url) => api().get(url)
      .set('Authorization', `Bearer ${actor.token}`)
      .set('X-Company-ID', String(companyId)),
    post: (url, body) => api().post(url)
      .set('Authorization', `Bearer ${actor.token}`)
      .set('X-Company-ID', String(companyId))
      .send(body),
  })

  it('cada owner lista solo los proyectos de su empresa', async () => {
    const res = await as(empresaB, empresaB.company.id_empresa).get('/api/projects')

    expect(res.status).toBe(200)
    const ids = JSON.stringify(res.body)
    expect(ids).toContain('Obra B')
    expect(ids).not.toContain('Obra A')
  })

  it('el owner de B no puede listar proyectos enviando el X-Company-ID de A (403)', async () => {
    const res = await as(empresaB, empresaA.company.id_empresa).get('/api/projects')

    expect(res.status).toBe(403)
    expect(JSON.stringify(res.body)).not.toContain('Obra A')
  })

  it('el owner de B no puede registrar ventas en nombre de la empresa A (403)', async () => {
    const res = await as(empresaB, empresaA.company.id_empresa).post('/api/inventory-movements/sale', {
      items: [{ id_producto: productoA.id_producto, id_proyecto: proyectoA.id_proyecto, cantidad: 1 }],
    })

    expect(res.status).toBe(403)
    expect(await stockOf(productoA.id_producto)).toBe(10)
  })

  it('tampoco puede vender un producto de A desde su propia empresa', async () => {
    const res = await as(empresaB, empresaB.company.id_empresa).post('/api/inventory-movements/sale', {
      items: [{ id_producto: productoA.id_producto, id_proyecto: proyectoA.id_proyecto, cantidad: 1 }],
    })

    expect([403, 404]).toContain(res.status)
    expect(await stockOf(productoA.id_producto)).toBe(10)
  })
})
