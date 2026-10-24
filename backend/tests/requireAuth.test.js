import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

import pool from '../src/db/pool.js'
import requireAuth from '../src/middleware/requireAuth.js'

const SECRET = 'secreto-de-pruebas'

const buildRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireAuth middleware (JWT)', () => {
  it('acepta un token válido, adjunta el payload en req.user y llama next()', () => {
    const payload = { id_usuario: 7, email: 'ana@kontrol.gt', nombre_rol: 'admin' }
    const token = jwt.sign(payload, SECRET)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = buildRes()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toMatchObject(payload)
  })

  it('responde 401 cuando no hay header Authorization', () => {
    const req = { headers: {} }
    const res = buildRes()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Token required.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 cuando el header no usa el esquema Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } }
    const res = buildRes()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 cuando el token está expirado', () => {
    const token = jwt.sign({ id_usuario: 7 }, SECRET, { expiresIn: '-1s' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = buildRes()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired token.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 cuando el token fue firmado con otro secreto', () => {
    const token = jwt.sign({ id_usuario: 7 }, 'otro-secreto')
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = buildRes()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('comprueba que la cuenta versionada siga activa', async () => {
    pool.query.mockResolvedValue({ rows: [{ activo: true, token_version: 3 }] })
    const token = jwt.sign({ id_usuario: 7, token_version: 3 }, SECRET)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = buildRes()
    const next = vi.fn()

    await requireAuth(req, res, next)

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT activo, token_version FROM public.usuario WHERE id_usuario = $1',
      [7]
    )
    expect(req.user.token_version).toBe(3)
    expect(next).toHaveBeenCalledOnce()
  })

  it('rechaza cuentas desactivadas y versiones de token revocadas', async () => {
    pool.query.mockResolvedValue({ rows: [{ activo: false, token_version: 4 }] })
    const token = jwt.sign({ id_usuario: 7, token_version: 3 }, SECRET)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = buildRes()
    const next = vi.fn()

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rechaza tokens cuya versión ya no coincide con la cuenta', async () => {
    pool.query.mockResolvedValue({ rows: [{ activo: true, token_version: 4 }] })
    const token = jwt.sign({ id_usuario: 7, token_version: 3 }, SECRET)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = buildRes()
    const next = vi.fn()

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
