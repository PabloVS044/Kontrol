import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// DT-01 · T-02 — Un error no manejado en cualquier handler async llega al
// middleware central, devuelve una respuesta controlada y el proceso sigue
// atendiendo. Antes de DT-01, cada uno de estos casos era un
// `unhandledRejection` que terminaba el proceso de Node.

const client = { query: vi.fn(), release: vi.fn() }

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import express from 'express'
import request from 'supertest'
import pool from '../src/db/pool.js'
import companyRoutes from '../src/routes/companyRoutes.js'
import supplierRoutes from '../src/routes/supplierRoutes.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import { asyncHandler, createRouter } from '../src/middleware/asyncHandler.js'
import { signToken, companyMembership } from './helpers/authTestApp.js'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/companies', companyRoutes)
  app.use('/api/suppliers', supplierRoutes)
  app.use(errorHandler)
  return app
}

const app = buildApp()
const bearer = `Bearer ${signToken()}`
const pgError = (code) => Object.assign(new Error(`insert or update violates constraint (${code})`), { code })

// Cualquier rechazo que se escape falla la prueba, igual que tumbaría Node.
const unhandled = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  pool.connect.mockResolvedValue(client)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.on('unhandledRejection', unhandled)
})

afterEach(() => {
  process.off('unhandledRejection', unhandled)
  expect(unhandled).not.toHaveBeenCalled()
  vi.restoreAllMocks()
})

// POST /api/companies: la última inserción viola una FK. El controlador solo
// maneja 23505, así que hace ROLLBACK y relanza con `throw err`.
function mockCreateCompanyWithForeignKeyViolation() {
  pool.query.mockResolvedValueOnce({ rows: [{ email: 'ivana@kontrol.gt' }] })
  client.query
    .mockResolvedValueOnce({}) // BEGIN
    .mockResolvedValueOnce({ rows: [{ id_empresa: 9, nombre: 'Empresa', email: 'ivana@kontrol.gt' }] })
    .mockResolvedValueOnce({ rows: [{ id_rol_empresa: 1 }] }) // rol owner
    .mockRejectedValueOnce(pgError('23503')) // INSERT empresa_usuario
    .mockResolvedValueOnce({}) // ROLLBACK
}

describe('DT-01 · Middleware central de errores', () => {
  it('una violación de FK no manejada devuelve 409 controlado y el proceso sobrevive', async () => {
    mockCreateCompanyWithForeignKeyViolation()

    const res = await request(app).post('/api/companies').set('Authorization', bearer).send({ nombre: 'Empresa' })

    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      success: false,
      message: 'The operation references data that does not exist or is still in use.',
    })
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalledOnce()

    // El mismo proceso sigue atendiendo la siguiente petición.
    pool.query.mockResolvedValueOnce(companyMembership('owner')).mockResolvedValueOnce({ rows: [] })
    const next = await request(app).get('/api/suppliers').set('Authorization', bearer).set('X-Company-ID', '1')
    expect(next.status).toBe(200)
  })

  it('un fallo del pool en el handler devuelve 500 sin filtrar el detalle', async () => {
    pool.query.mockResolvedValueOnce(companyMembership('owner'))
    pool.query.mockRejectedValueOnce(new Error('connection terminated unexpectedly: host db-01'))

    const res = await request(app).get('/api/suppliers').set('Authorization', bearer).set('X-Company-ID', '1')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ success: false, message: 'Internal server error.' })
    expect(JSON.stringify(res.body)).not.toContain('db-01')
    expect(console.error).toHaveBeenCalled()
  })

  it('un fallo de pool.connect() fuera del try del controlador también se captura', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ email: 'ivana@kontrol.gt' }] })
    pool.connect.mockRejectedValueOnce(new Error('timeout exceeded when trying to connect'))

    const res = await request(app).post('/api/companies').set('Authorization', bearer).send({ nombre: 'Empresa' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ success: false, message: 'Internal server error.' })
  })

  it('un middleware async que rechaza (requireCompany) también se captura', async () => {
    pool.query.mockRejectedValueOnce(new Error('pool exhausted'))

    const res = await request(app).get('/api/suppliers').set('Authorization', bearer).set('X-Company-ID', '1')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ success: false, message: 'Internal server error.' })
  })

  it('un JSON mal formado devuelve 400 en el formato de la API', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', bearer)
      .set('Content-Type', 'application/json')
      .send('{"nombre": ')

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(typeof res.body.message).toBe('string')
  })

  it('un error con status 4xx propio conserva su status y mensaje', async () => {
    const router = createRouter()
    router.get('/', async () => {
      throw Object.assign(new Error('Team not found in this company.'), { status: 404 })
    })
    const local = express().use(router).use(errorHandler)

    const res = await request(local).get('/')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ success: false, message: 'Team not found in this company.' })
  })
})

describe('DT-01 · asyncHandler / createRouter', () => {
  it('encadena el rechazo de un handler async a next(err)', async () => {
    const error = new Error('boom')
    const next = vi.fn()

    await asyncHandler(async () => { throw error })({}, {}, next)

    expect(next).toHaveBeenCalledWith(error)
  })

  it('conserva la aridad de un middleware de errores', () => {
    // eslint-disable-next-line no-unused-vars
    const wrapped = asyncHandler(async (err, req, res, next) => {})
    expect(wrapped.length).toBe(4)
  })

  it('no envuelve sub-routers montados con use()', async () => {
    const child = createRouter()
    child.get('/hijo', (req, res) => res.json({ ok: true }))
    const parent = createRouter()
    parent.use('/padre', child)

    const res = await request(express().use(parent)).get('/padre/hijo')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
