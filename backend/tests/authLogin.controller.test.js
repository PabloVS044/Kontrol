import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import bcrypt from 'bcrypt'
import request from 'supertest'
import pool from '../src/db/pool.js'
import { buildTestApp } from './helpers/authTestApp.js'

const app = buildTestApp()

/**
 * RTF 2 (PERF-01): el login tomaba un cliente del pool al entrar y lo retenía
 * durante bcrypt.compare. Con el pool de 10, una ráfaga de logins dejaba al
 * resto de la API esperando conexión. Estas pruebas fijan que sin invitación
 * no se reserva ningún cliente, y que con invitación se libera siempre.
 */
const PASSWORD = 'Secreto-123'
const HASH = bcrypt.hashSync(PASSWORD, 4)

const usuario = (over = {}) => ({
  id_usuario: 1,
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'ana@example.com',
  password_hash: HASH,
  activo: true,
  token_version: 0,
  nombre_rol: 'usuario',
  ...over,
})

const login = (body) => request(app).post('/api/auth/login').send({ email: 'ana@example.com', ...body })

let client
beforeEach(() => {
  vi.resetAllMocks()
  client = { query: vi.fn(async () => ({ rows: [] })), release: vi.fn() }
  pool.connect.mockResolvedValue(client)
})

describe('POST /api/auth/login · uso del pool', () => {
  it('credenciales válidas: responde 200 sin reservar ningún cliente', async () => {
    pool.query.mockResolvedValueOnce({ rows: [usuario()] })

    const res = await login({ password: PASSWORD })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.data).not.toHaveProperty('password_hash')
    expect(res.body.data).not.toHaveProperty('token_version')
    expect(pool.connect).not.toHaveBeenCalled()
  })

  it('contraseña incorrecta: 401 sin reservar cliente', async () => {
    pool.query.mockResolvedValueOnce({ rows: [usuario()] })

    const res = await login({ password: 'otra-cosa' })

    expect(res.status).toBe(401)
    expect(pool.connect).not.toHaveBeenCalled()
  })

  it('usuario inexistente o cuenta desactivada: 401 y 403', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [usuario({ activo: false })] })

    expect((await login({ password: PASSWORD })).status).toBe(401)
    expect((await login({ password: PASSWORD })).status).toBe(403)
    expect(pool.connect).not.toHaveBeenCalled()
  })

  it('con invitación toma un cliente solo para resolverla y lo libera', async () => {
    pool.query.mockResolvedValueOnce({ rows: [usuario()] })

    const res = await login({ password: PASSWORD, inviteToken: 'x'.repeat(32) })

    expect(res.status).toBe(200)
    expect(res.body.invite).toMatchObject({ success: false, code: 'invite_not_found' })
    expect(pool.connect).toHaveBeenCalledTimes(1)
    expect(client.release).toHaveBeenCalledTimes(1)
  })
})
