import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mockeamos el pool para no tocar Postgres: controlamos cada consulta.
vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

import request from 'supertest'
import pool from '../src/db/pool.js'
import {
  buildTestApp,
  signToken,
  companyMembership,
  dbRows,
} from './helpers/authTestApp.js'

const app = buildTestApp()

function auth(req, rol = 'member') {
  pool.query.mockResolvedValueOnce(companyMembership(rol))
  return req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', '3')
}

/** Última llamada a pool.query, como [sql, params]. */
function lastQuery() {
  return pool.query.mock.calls.at(-1)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('POST /api/reports/exports — registro de generación', () => {
  it('registra una exportación de toda la empresa sin proyecto', async () => {
    const req = auth(request(app).post('/api/reports/exports'))
    pool.query.mockResolvedValue(dbRows([{ id_reporte: 42, id_proyecto: null, id_empresa: 3 }]))

    const res = await req.send({ titulo: 'Exportación PDF · Activos', tipo: 'CONSOLIDADO' })

    expect(res.status).toBe(201)
    expect(res.body.data.id_proyecto).toBeNull()

    const [sql, params] = lastQuery()
    expect(sql).toMatch(/INSERT INTO public\.reporte/)
    // titulo, tipo, id_proyecto, id_empresa, id_usuario
    expect(params).toEqual(['Exportación PDF · Activos', 'CONSOLIDADO', null, 3, 7])
  })

  it('asume CONSOLIDADO cuando no se envía tipo', async () => {
    const req = auth(request(app).post('/api/reports/exports'))
    pool.query.mockResolvedValue(dbRows([{ id_reporte: 43 }]))

    const res = await req.send({ titulo: 'Exportación CSV · Todos los proyectos' })

    expect(res.status).toBe(201)
    expect(lastQuery()[1][1]).toBe('CONSOLIDADO')
  })

  it('valida el proyecto contra la empresa cuando la exportación es de uno solo', async () => {
    const req = auth(request(app).post('/api/reports/exports'))
    pool.query
      .mockResolvedValueOnce(dbRows([{ id_proyecto: 10 }]))          // el proyecto existe
      .mockResolvedValueOnce(dbRows([{ id_reporte: 44, id_proyecto: 10 }]))

    const res = await req.send({ titulo: 'Exportación PDF · Obra Norte', id_proyecto: 10 })

    expect(res.status).toBe(201)
    expect(lastQuery()[1][2]).toBe(10)
  })

  it('rechaza un proyecto de otra empresa con 404', async () => {
    const req = auth(request(app).post('/api/reports/exports'))
    pool.query.mockResolvedValueOnce(dbRows([]))                     // no pertenece

    const res = await req.send({ titulo: 'Exportación PDF', id_proyecto: 999 })

    expect(res.status).toBe(404)
    expect(pool.query).toHaveBeenCalledTimes(2)                      // membresía + check
  })

  it('rechaza un título vacío con 400', async () => {
    const req = auth(request(app).post('/api/reports/exports'))

    const res = await req.send({ titulo: '' })

    expect(res.status).toBe(400)
    expect(res.body.errors[0].field).toBe('titulo')
  })

  it('rechaza un tipo fuera del enum con 400', async () => {
    const req = auth(request(app).post('/api/reports/exports'))

    const res = await req.send({ titulo: 'Exportación', tipo: 'XLSX' })

    expect(res.status).toBe(400)
  })

  it('exige autenticación', async () => {
    const res = await request(app)
      .post('/api/reports/exports')
      .set('X-Company-ID', '3')
      .send({ titulo: 'Exportación PDF' })

    expect(res.status).toBe(401)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('no exige rol de gestión: exportar es leer lo que ya se ve', async () => {
    const req = auth(request(app).post('/api/reports/exports'), 'member')
    pool.query.mockResolvedValue(dbRows([{ id_reporte: 45 }]))

    const res = await req.send({ titulo: 'Exportación CSV · Activos' })

    expect(res.status).toBe(201)
  })
})

describe('GET /api/reports — alcance por empresa', () => {
  it('resuelve la empresa por columna propia y cae al proyecto', async () => {
    const req = auth(request(app).get('/api/reports'))
    pool.query.mockResolvedValue(dbRows([{ id_reporte: 1 }]))

    const res = await req

    expect(res.status).toBe(200)
    const [sql, params] = lastQuery()
    // LEFT JOIN para que las exportaciones sin proyecto sigan listándose.
    expect(sql).toMatch(/LEFT JOIN public\.proyecto/)
    expect(sql).toMatch(/COALESCE\(r\.id_empresa, p\.id_empresa\) = \$1/)
    expect(params).toEqual([3])
  })
})
