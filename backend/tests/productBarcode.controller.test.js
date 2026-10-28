import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

import request from 'supertest'
import pool from '../src/db/pool.js'
import { buildTestApp, signToken, companyMembership, dbRows } from './helpers/authTestApp.js'

const app = buildTestApp()
const auth = (req) => req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', '1')

/**
 * DT-22 (RTF 2, PERF-04): `GET /api/products/barcode/:code`. Con Postgres real
 * lo cubre `tests/integration/posBarcodeLookup.int.test.js`; aquí se fija la
 * consulta que arma el controlador y la validación de la ruta.
 */
const ultimaConsulta = () => pool.query.mock.calls.at(-1)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/products/barcode/:code', () => {
  it('un admin busca en toda la empresa, solo por código y empresa', async () => {
    pool.query
      .mockResolvedValueOnce(companyMembership('admin'))
      .mockResolvedValueOnce(dbRows([{ id_producto: 1, codigo_barras: '750' }, { id_producto: 2, codigo_barras: '750' }]))

    const res = await auth(request(app).get('/api/products/barcode/750'))

    expect(res.status).toBe(200)
    expect(res.body.data.map((p) => p.id_producto)).toEqual([1, 2])
    const [sql, params] = ultimaConsulta()
    expect(sql).toContain('p.codigo_barras = $1')
    expect(sql).not.toContain('movimiento_inventario')
    expect(params).toEqual(['750', 1])
  })

  it('con ?projectId acota la búsqueda a ese proyecto', async () => {
    pool.query
      .mockResolvedValueOnce(companyMembership('owner'))
      .mockResolvedValueOnce(dbRows([]))

    const res = await auth(request(app).get('/api/products/barcode/750?projectId=10'))

    expect(res.status).toBe(200)
    const [sql, params] = ultimaConsulta()
    expect(sql).toContain('p.id_proyecto = $3')
    expect(params).toEqual(['750', 1, 10])
  })

  it('el código viaja como parámetro, no dentro del SQL', async () => {
    pool.query
      .mockResolvedValueOnce(companyMembership('owner'))
      .mockResolvedValueOnce(dbRows([]))

    await auth(request(app).get(`/api/products/barcode/${encodeURIComponent("1' OR '1'='1")}`))

    const [sql, params] = ultimaConsulta()
    expect(sql).not.toContain("'1'='1")
    expect(params[0]).toBe("1' OR '1'='1")
  })

  it('rechaza un código de más de 64 caracteres sin consultar productos', async () => {
    pool.query.mockResolvedValueOnce(companyMembership('owner'))

    const res = await auth(request(app).get(`/api/products/barcode/${'9'.repeat(65)}`))

    expect(res.status).toBe(400)
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('rechaza un projectId que no es un entero positivo', async () => {
    pool.query.mockResolvedValueOnce(companyMembership('owner'))

    const res = await auth(request(app).get('/api/products/barcode/750?projectId=abc'))

    expect(res.status).toBe(400)
  })
})
