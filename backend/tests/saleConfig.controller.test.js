import { describe, it, expect, beforeEach, vi } from 'vitest'

// Pool mockeado: se controla cada consulta sin tocar Postgres.
vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

import request from 'supertest'
import pool from '../src/db/pool.js'
import { buildTestApp, signToken, companyMembership } from './helpers/authTestApp.js'

const app = buildTestApp()

/** Fila tal como la devuelve Postgres: numeric llega como string. */
const configRow = (over = {}) => ({
  iva_activo: false,
  iva_tasa: '0.12',
  descuento_activo: false,
  descuento_max_pct: '0',
  ...over,
})

/** Cabeceras de un usuario autenticado sobre la empresa 1. */
const auth = (req) =>
  req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', '1')

/**
 * Prepara las respuestas del pool EN ORDEN: primero la de `requireCompany`
 * (membresía), después la del controller. Invertirlas hace que el guard lea la
 * fila de config y el controller la membresía, que es un fallo silencioso.
 */
function arrange({ rol = 'owner', rows } = {}) {
  pool.query.mockResolvedValueOnce(companyMembership(rol))
  if (rows !== undefined) {
    pool.query.mockResolvedValueOnce({ rows, rowCount: rows.length })
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

/**
 * Configuración del POS por empresa (IVA y descuento).
 *
 * Es la puerta que decide qué se cobra, así que lo que se fija aquí es: quién
 * puede cambiarla, que un PATCH parcial no pise lo que no menciona, y que los
 * límites se validen en el servidor y no solo en el formulario.
 */
describe('GET /api/companies/sale-config', () => {
  it('sin fila guardada devuelve los defaults en vez de 404', async () => {
    // La ausencia de configuración es un estado válido: la empresa aún no ha
    // entrado a la pantalla. Un 404 obligaría al POS a tratarlo como error.
    arrange({ rows: [] })

    const res = await auth(request(app).get('/api/companies/sale-config'))

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({
      iva_activo: false,
      iva_tasa: 0.12,
      descuento_activo: false,
      descuento_max_pct: 0,
      moneda: 'USD',
    })
  })

  it('normaliza los numeric de Postgres a número', async () => {
    arrange({ rows: [configRow({ iva_activo: true, descuento_activo: true, descuento_max_pct: '15' })] })

    const res = await auth(request(app).get('/api/companies/sale-config'))

    expect(res.body.data.iva_tasa).toBe(0.12)
    expect(res.body.data.descuento_max_pct).toBe(15)
  })

  it('cualquier miembro puede leerla, no solo el owner', async () => {
    // El POS de un cajero necesita saber si mostrar el campo de descuento.
    arrange({ rol: 'member', rows: [configRow()] })

    const res = await auth(request(app).get('/api/companies/sale-config'))

    expect(res.status).toBe(200)
  })

  it('sin token responde 401 y no consulta la base', async () => {
    const res = await request(app).get('/api/companies/sale-config').set('X-Company-ID', '1')

    expect(res.status).toBe(401)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('filtra por la empresa seleccionada', async () => {
    arrange({ rows: [configRow()] })

    await auth(request(app).get('/api/companies/sale-config'))

    const [, params] = pool.query.mock.calls[1]
    expect(params).toEqual([1])
  })
})

describe('PUT /api/companies/sale-config', () => {
  it('solo el owner puede cambiarla', async () => {
    arrange({ rol: 'member' })

    const res = await auth(
      request(app).put('/api/companies/sale-config').send({ iva_activo: true })
    )

    expect(res.status).toBe(403)
    // Solo la consulta de membresía: nunca se llegó a escribir.
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('el owner activa el IVA y recibe la config resultante', async () => {
    arrange({ rows: [configRow({ iva_activo: true })] })

    const res = await auth(
      request(app).put('/api/companies/sale-config').send({ iva_activo: true })
    )

    expect(res.status).toBe(200)
    expect(res.body.data.iva_activo).toBe(true)
  })

  it('un PATCH parcial no pisa los campos que no menciona', async () => {
    // Activar el IVA no debe reiniciar el descuento: los campos ausentes viajan
    // como null y el COALESCE del upsert conserva el valor guardado.
    arrange({ rows: [configRow({ iva_activo: true })] })

    await auth(request(app).put('/api/companies/sale-config').send({ iva_activo: true }))

    const [sql, params] = pool.query.mock.calls[1]
    expect(sql).toContain('ON CONFLICT')
    expect(sql).toContain('COALESCE')
    expect(params).toEqual([1, true, null, null, null, null])
  })

  it('rechaza una tasa de IVA mayor que 1 (la tasa es fracción, no porcentaje)', async () => {
    arrange()
    // 12 en vez de 0.12 cobraría un 1200% de impuesto.
    const res = await auth(
      request(app).put('/api/companies/sale-config').send({ iva_tasa: 12 })
    )

    expect(res.status).toBe(400)
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('rechaza una tasa negativa', async () => {
    arrange()
    const res = await auth(
      request(app).put('/api/companies/sale-config').send({ iva_tasa: -0.1 })
    )

    expect(res.status).toBe(400)
  })

  it('rechaza un tope de descuento por encima de 100', async () => {
    arrange()
    const res = await auth(
      request(app).put('/api/companies/sale-config').send({ descuento_max_pct: 150 })
    )

    expect(res.status).toBe(400)
  })

  it('rechaza un body vacío', async () => {
    arrange()
    const res = await auth(request(app).put('/api/companies/sale-config').send({}))

    expect(res.status).toBe(400)
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('acepta el tope de descuento en los extremos válidos', async () => {
    arrange({ rows: [configRow({ descuento_activo: true, descuento_max_pct: '100' })] })

    const res = await auth(
      request(app)
        .put('/api/companies/sale-config')
        .send({ descuento_activo: true, descuento_max_pct: 100 })
    )

    expect(res.status).toBe(200)
    expect(res.body.data.descuento_max_pct).toBe(100)
  })
})
