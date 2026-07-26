import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import validate from '../src/middleware/validate.js'

const buildRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const schema = z.object({
  email: z.string().email(),
  edad: z.coerce.number().int().min(18),
})

describe('validate middleware (Zod)', () => {
  it('llama next() y reemplaza req.body con los datos parseados cuando el body es válido', () => {
    const req = { body: { email: 'ana@kontrol.gt', edad: '25' } }
    const res = buildRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
    // coerción aplicada: edad llega como string y queda como número
    expect(req.body.edad).toBe(25)
  })

  it('responde 400 con la lista de errores cuando el body es inválido', () => {
    const req = { body: { email: 'no-es-correo', edad: 15 } }
    const res = buildRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const payload = res.json.mock.calls[0][0]
    expect(payload.success).toBe(false)
    expect(payload.errors).toHaveLength(2)
    expect(payload.errors.map((e) => e.field)).toEqual(['email', 'edad'])
  })

  it('valida otras fuentes como query cuando se indica', () => {
    const querySchema = z.object({ page: z.coerce.number().min(1) })
    const req = { query: { page: '0' } }
    const res = buildRes()
    const next = vi.fn()

    validate(querySchema, 'query')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })
})
