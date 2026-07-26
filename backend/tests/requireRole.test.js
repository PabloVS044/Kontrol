import { describe, it, expect, vi } from 'vitest'
import requireRole from '../src/middleware/requireRole.js'

const buildRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('requireRole middleware (RBAC)', () => {
  it('permite el paso cuando el rol del usuario está en la lista', () => {
    const req = { user: { nombre_rol: 'admin' } }
    const res = buildRes()
    const next = vi.fn()

    requireRole('admin', 'gerente')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('responde 403 cuando el rol no está permitido', () => {
    const req = { user: { nombre_rol: 'colaborador' } }
    const res = buildRes()
    const next = vi.fn()

    requireRole('admin')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Access denied.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 403 cuando no hay usuario autenticado en la request', () => {
    const req = {}
    const res = buildRes()
    const next = vi.fn()

    requireRole('admin')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})
