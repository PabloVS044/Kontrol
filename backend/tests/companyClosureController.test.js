import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'

const mocks = vi.hoisted(() => ({ connect: vi.fn(), query: vi.fn(), compare: vi.fn() }))
vi.mock('../src/db/pool.js', () => ({ default: { connect: mocks.connect, query: mocks.query } }))
vi.mock('bcrypt', () => ({ default: { compare: mocks.compare } }))
import {
  cancelCompanyClosure,
  getCompanyClosure,
  listMyCompanyClosures,
  requestCompanyClosure,
} from '../src/controllers/companyClosureController.js'
import { requireCompanyAllowingClosure } from '../src/middleware/requireCompany.js'
import { isReauthAction } from '../src/auth/reauthentication.js'

const closureRow = {
  company_id: 4, company_name: 'Tienda Pérez', reason: 'owner_request', status: 'export_window',
  requested_at: 'now', export_until: 'later', delete_by: 'later', backups_by: 'later', deleted_at: null,
}

let client, req, res, user, company, inserted
beforeEach(() => {
  vi.resetAllMocks()
  process.env.JWT_SECRET = 'closure-unit-secret'
  user = { id_usuario: 7, password_hash: 'hash', activo: true }
  company = { nombre: 'Tienda Pérez', activo: true }
  inserted = [closureRow]
  client = {
    query: vi.fn(async (sql) => {
      if (sql.includes('FROM public.usuario')) return { rows: user ? [user] : [] }
      if (sql.includes('FROM public.empresa WHERE')) return { rows: company ? [company] : [] }
      if (sql.includes('INSERT INTO public.company_closure')) return { rows: inserted }
      if (sql.includes('DELETE FROM public.company_closure')) return { rowCount: 1 }
      return { rows: [] }
    }),
    release: vi.fn(),
  }
  mocks.connect.mockResolvedValue(client)
  mocks.compare.mockResolvedValue(true)
  req = {
    user: { id_usuario: 7, nombre_rol: 'usuario' },
    company: { id_empresa: 4 },
    body: { confirm_name: '  tienda pérez ', password: 'correct' },
  }
  res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
})

describe('requesting a company closure', () => {
  it('opens the window for the owner and confirms the name without case or spaces', async () => {
    await requestCompanyClosure(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(client.query).toHaveBeenCalledWith('COMMIT')
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.company_closure'),
      [4, 'owner_request', 7, false, 60, 90, 30]
    )
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('records a support closure as a provider termination and can skip the window', async () => {
    req.user.nombre_rol = 'super_user'
    req.body.skip_export_window = true
    await requestCompanyClosure(req, res)
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.company_closure'),
      [4, 'provider_termination', 7, true, 60, 90, 30]
    )
  })

  it.each([
    ['a wrong password', () => { mocks.compare.mockResolvedValue(false) }],
    ['an inactive account', () => { user.activo = false }],
    ['a missing account', () => { user = null }],
  ])('rejects %s', async (_, arrange) => {
    arrange()
    await requestCompanyClosure(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
  })

  it('only knows the account deletion and company closure reauthentication actions', () => {
    expect(isReauthAction('account-deletion')).toBe(true)
    expect(isReauthAction('company-closure')).toBe(true)
    expect(isReauthAction('transfer-ownership')).toBe(false)
  })

  it('accepts a Google proof issued for closing a company, not for deleting the account', async () => {
    user.password_hash = null
    req.body = { confirm_name: 'Tienda Pérez', google_reauth_token: jwt.sign({ id_usuario: 7, purpose: 'account-deletion' }, process.env.JWT_SECRET) }
    await requestCompanyClosure(req, res)
    expect(res.status).toHaveBeenCalledWith(401)

    req.body.google_reauth_token = jwt.sign({ id_usuario: 7, purpose: 'company-closure' }, process.env.JWT_SECRET)
    await requestCompanyClosure(req, res)
    expect(res.status).toHaveBeenLastCalledWith(201)
  })

  it.each([
    ['an inactive company', () => { company.activo = false }, 409],
    ['a missing company', () => { company = null }, 409],
    ['a different name', () => { req.body.confirm_name = 'Otra' }, 400],
    ['a company already closing', () => { inserted = [] }, 409],
  ])('refuses %s', async (_, arrange, status) => {
    arrange()
    await requestCompanyClosure(req, res)
    expect(res.status).toHaveBeenCalledWith(status)
    expect(client.query).not.toHaveBeenCalledWith('COMMIT')
  })

  it('rolls back, releases a broken client and rethrows on a database error', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql === 'BEGIN') return { rows: [] }
      if (sql === 'ROLLBACK') throw new Error('connection lost')
      throw new Error('database offline')
    })
    await expect(requestCompanyClosure(req, res)).rejects.toThrow('database offline')
    expect(client.release).toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('cancelling and reading closures', () => {
  it('cancels during the window and refuses afterwards', async () => {
    await cancelCompanyClosure(req, res)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { company_id: 4, status: 'active' } })

    client.query.mockImplementation(async (sql) => (sql.includes('DELETE') ? { rowCount: 0 } : { rows: [] }))
    await cancelCompanyClosure(req, res)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('rolls back and rethrows when cancelling fails', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] }
      throw new Error('database offline')
    })
    await expect(cancelCompanyClosure(req, res)).rejects.toThrow('database offline')
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('returns the closure of the company, or null', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [closureRow] }).mockResolvedValueOnce({ rows: [] })
    await getCompanyClosure(req, res)
    expect(res.json).toHaveBeenLastCalledWith({ success: true, data: expect.objectContaining({ status: 'export_window' }) })
    await getCompanyClosure(req, res)
    expect(res.json).toHaveBeenLastCalledWith({ success: true, data: null })
  })

  it('lists the closures this account requested', async () => {
    mocks.query.mockResolvedValue({ rows: [{ ...closureRow, status: 'deleted', files_deleted: 3 }] })
    await listMyCompanyClosures(req, res)
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('WHERE requested_by = $1'), [7])
    expect(res.json.mock.calls[0][0].data[0].deletion).toMatchObject({ files_deleted: 3 })
  })
})

describe('company access during the export window', () => {
  const call = async (closureStatus) => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ rol_empresa: 'owner', activo: false, nombre: 'Tienda Pérez' }] })
      .mockResolvedValueOnce({ rows: closureStatus ? [{ status: closureStatus }] : [] })
    const request = { headers: { 'x-company-id': '4' }, user: { id_usuario: 7, nombre_rol: 'usuario' } }
    const next = vi.fn()
    await requireCompanyAllowingClosure(request, res, next)
    return { request, next }
  }

  it('lets an inactive company through only while its export window is open', async () => {
    const open = await call('export_window')
    expect(open.next).toHaveBeenCalledOnce()
    expect(open.request.company).toMatchObject({ id_empresa: 4, closing: true })

    for (const status of ['deleting', null]) {
      const closed = await call(status)
      expect(closed.next).not.toHaveBeenCalled()
    }
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
