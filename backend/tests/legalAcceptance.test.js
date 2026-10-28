/**
 * L-6 — Registro de la aceptación de los documentos legales.
 *
 * Cubre el catálogo de versiones (qué se acepta y cuándo hay que volver a
 * aceptar), el alta de cuenta (la casilla es obligatoria y la constancia se
 * guarda en la misma transacción que la cuenta) y la reaceptación.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn() }))
vi.mock('../src/db/pool.js', () => ({ default: { query: mocks.query, connect: mocks.connect } }))

import authRoutes from '../src/routes/authRoutes.js'
import legalRoutes from '../src/routes/legalRoutes.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import {
  LEGAL_DOCUMENTS,
  acceptedVersionsStillValid,
  pendingDocuments,
  requiredDocuments,
} from '../src/services/legalDocuments.js'
import { LEGAL_DOCUMENTS as FRONTEND_DOCUMENTS } from '../../frontend/src/utils/legal.js'

const JWT_SECRET = 'secreto-de-pruebas-l6'
process.env.JWT_SECRET = JWT_SECRET

const app = express()
app.set('trust proxy', true)
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/legal', legalRoutes)
app.use(errorHandler)

const CURRENT = Object.fromEntries(requiredDocuments().map((d) => [d.document, d.version]))
const NEW_USER = {
  nombre: 'Ana',
  apellido: 'Martínez',
  email: 'ana@kontrol.gt',
  password: 'Kontrol2026!',
  role: 'admin',
}

let client
let stored // filas de aceptacion_legal que «ve» la base simulada

const inserts = () =>
  client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO public.aceptacion_legal'))
const statements = () => client.query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0])

beforeEach(() => {
  vi.resetAllMocks()
  stored = []
  client = {
    query: vi.fn(async (sql) => {
      if (sql.includes('SELECT id_usuario FROM public.usuario WHERE email')) return { rows: [] }
      if (sql.includes('SELECT id_rol FROM public.rol')) return { rows: [{ id_rol: 1 }] }
      if (sql.includes('INSERT INTO public.usuario')) return { rows: [{ id_usuario: 42 }] }
      if (sql.includes('FROM public.usuario u')) {
        return { rows: [{ id_usuario: 42, nombre: 'Ana', apellido: 'Martínez', email: NEW_USER.email, nombre_rol: 'admin' }] }
      }
      return { rows: [] }
    }),
    release: vi.fn(),
  }
  mocks.connect.mockResolvedValue(client)
  mocks.query.mockImplementation(async (sql) => {
    if (sql.includes('SELECT activo, token_version')) return { rows: [{ activo: true, token_version: 1 }] }
    if (sql.includes('FROM public.aceptacion_legal')) return { rows: stored }
    return { rows: [] }
  })
})

describe('Catálogo de versiones', () => {
  it('se aceptan los Términos y la Política de Privacidad, cada uno en su versión vigente', () => {
    expect(requiredDocuments()).toEqual([
      { document: 'terms', version: LEGAL_DOCUMENTS[0].history[0].version },
      { document: 'privacy', version: LEGAL_DOCUMENTS[1].history[0].version },
    ])
  })

  it('un documento sin versión publicada (borrador) no se pide aceptar', () => {
    const dpa = LEGAL_DOCUMENTS.find((d) => d.id === 'data-processing')
    expect(dpa.history).toEqual([])
    expect(requiredDocuments().map((d) => d.document)).not.toContain('data-processing')
  })

  it('un cambio menor conserva la aceptación anterior; uno sustancial la invalida', () => {
    const doc = {
      history: [
        { version: '2.1', substantial: false },
        { version: '2.0', substantial: true },
        { version: '1.0', substantial: true },
      ],
    }
    expect(acceptedVersionsStillValid(doc)).toEqual(['2.1', '2.0'])
  })

  it('pendientes: sin aceptaciones, todo; con la versión vigente, nada', () => {
    expect(pendingDocuments([])).toEqual(requiredDocuments())
    const all = requiredDocuments().map(({ document, version }) => ({ documento: document, version }))
    expect(pendingDocuments(all)).toEqual([])
  })

  it('quien aceptó la privacidad antes de su último cambio sustancial la tiene pendiente', () => {
    const acceptances = [
      { documento: 'terms', version: CURRENT.terms },
      { documento: 'privacy', version: '1.0' },
    ]
    expect(pendingDocuments(acceptances)).toEqual([{ document: 'privacy', version: CURRENT.privacy }])
  })

  it('coincide con el catálogo que publica el frontend', () => {
    // El identificador que se guarda en la base es el slug de la URL pública.
    const shape = (docs) =>
      docs.map((d) => ({
        id: d.slug ?? d.id,
        requiresAcceptance: d.requiresAcceptance,
        history: d.history.map(({ version, date, substantial }) => ({ version, date, substantial })),
      }))
    expect(shape(FRONTEND_DOCUMENTS)).toEqual(shape(LEGAL_DOCUMENTS))
  })
})

describe('POST /api/auth/register — casilla de aceptación', () => {
  it.each([
    ['sin el campo legal', undefined],
    ['con la casilla sin marcar', { accepted: false, versions: CURRENT }],
    ['con un valor que no es true', { accepted: 'on', versions: CURRENT }],
  ])('rechaza el alta %s y no toca la base', async (_, legal) => {
    const res = await request(app).post('/api/auth/register').send({ ...NEW_USER, legal })

    expect(res.status).toBe(400)
    expect(res.body.errors.some((e) => e.field.startsWith('legal'))).toBe(true)
    expect(mocks.connect).not.toHaveBeenCalled()
  })

  it('rechaza con 409 si el formulario mostró una versión que ya no es la vigente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...NEW_USER, legal: { accepted: true, versions: { ...CURRENT, privacy: '0.9' } } })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('legal_version_outdated')
    expect(res.body.required).toEqual(requiredDocuments())
    expect(mocks.connect).not.toHaveBeenCalled()
  })

  it('crea la cuenta y una fila por documento con usuario, versión e IP, en una transacción', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', '203.0.113.7')
      .send({ ...NEW_USER, legal: { accepted: true, versions: CURRENT } })

    expect(res.status).toBe(201)
    expect(inserts().map(([, params]) => params)).toEqual(
      requiredDocuments().map(({ document, version }) => [42, document, version, '203.0.113.7', 'registro'])
    )
    // La fecha y hora la pone la base (DEFAULT CURRENT_TIMESTAMP).
    expect(inserts()[0][0]).not.toContain('aceptado_en')

    const order = statements()
    const begin = order.indexOf('BEGIN')
    expect(begin).toBeGreaterThan(-1)
    expect(order.indexOf('INSERT')).toBeGreaterThan(begin)
    expect(order.lastIndexOf('COMMIT')).toBeGreaterThan(order.lastIndexOf('INSERT'))
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('si la constancia no se puede guardar, la cuenta tampoco se crea', async () => {
    const base = client.query.getMockImplementation()
    client.query.mockImplementation(async (sql, params) => {
      if (sql.includes('INSERT INTO public.aceptacion_legal')) throw new Error('disk full')
      return base(sql, params)
    })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...NEW_USER, legal: { accepted: true, versions: CURRENT } })

    expect(res.status).toBe(500)
    expect(statements()).toContain('ROLLBACK')
    expect(statements()).not.toContain('COMMIT')
    expect(res.body).not.toHaveProperty('token')
    expect(client.release).toHaveBeenCalledOnce()
  })
})

describe('/api/legal/acceptances — reaceptación', () => {
  const auth = () => `Bearer ${jwt.sign({ id_usuario: 42, email: NEW_USER.email, nombre_rol: 'admin', token_version: 1 }, JWT_SECRET)}`

  it('exige sesión', async () => {
    expect((await request(app).get('/api/legal/acceptances')).status).toBe(401)
    expect((await request(app).post('/api/legal/acceptances').send({ accepted: true, versions: CURRENT })).status).toBe(401)
  })

  it('GET devuelve lo pendiente según las aceptaciones guardadas', async () => {
    stored = [{ documento: 'terms', version: CURRENT.terms, aceptado_en: '2026-10-27T10:00:00Z' }]
    const res = await request(app).get('/api/legal/acceptances').set('Authorization', auth())

    expect(res.status).toBe(200)
    expect(res.body.data.pending).toEqual([{ document: 'privacy', version: CURRENT.privacy }])
    expect(res.body.data.acceptances).toEqual(stored)
  })

  it('POST registra solo lo pendiente, con origen «aviso»', async () => {
    stored = [{ documento: 'terms', version: CURRENT.terms }]
    const res = await request(app)
      .post('/api/legal/acceptances')
      .set('Authorization', auth())
      .set('X-Forwarded-For', '198.51.100.4')
      .send({ accepted: true, versions: CURRENT })

    expect(res.status).toBe(201)
    expect(inserts().map(([, params]) => params)).toEqual([
      [42, 'privacy', CURRENT.privacy, '198.51.100.4', 'aviso'],
    ])
    expect(statements()).toEqual(['BEGIN', 'INSERT', 'COMMIT'])
  })

  it('POST sin la casilla marcada no registra nada', async () => {
    const res = await request(app)
      .post('/api/legal/acceptances')
      .set('Authorization', auth())
      .send({ accepted: false, versions: CURRENT })

    expect(res.status).toBe(400)
    expect(mocks.connect).not.toHaveBeenCalled()
  })

  it('POST con una versión desactualizada responde 409 y no registra nada', async () => {
    const res = await request(app)
      .post('/api/legal/acceptances')
      .set('Authorization', auth())
      .send({ accepted: true, versions: { terms: CURRENT.terms, privacy: '1.0' } })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('legal_version_outdated')
    expect(mocks.connect).not.toHaveBeenCalled()
  })
})
