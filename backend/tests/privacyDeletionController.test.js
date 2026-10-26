import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
const mocks = vi.hoisted(() => ({ connect: vi.fn(), compare: vi.fn(), cleanup: vi.fn(), disconnect: vi.fn() }))
vi.mock('../src/db/pool.js', () => ({ default: { connect: mocks.connect } }))
vi.mock('bcrypt', () => ({ default: { compare: mocks.compare } }))
vi.mock('../src/db/mongo.js', () => ({ isMongoReady: () => true }))
vi.mock('../src/services/companyDataExport.js', () => ({ prepareCompanyDataExport: vi.fn() }))
vi.mock('../src/services/accountDeletionOutbox.js', () => ({ processMongoAccountDeletion: mocks.cleanup }))
vi.mock('../src/socket/index.js', () => ({ disconnectUserSockets: mocks.disconnect }))
import { deleteOwnAccount } from '../src/controllers/privacyController.js'

let client, req, res, user
beforeEach(() => {
  vi.resetAllMocks()
  process.env.JWT_SECRET = 'privacy-unit-secret'
  user = { id_usuario: 7, activo: true, password_hash: 'hash' }
  client = {
    query: vi.fn(async (sql) => {
      if (sql.includes('SELECT id_usuario, password_hash')) return { rows: user ? [user] : [] }
      if (sql.includes("WHERE nombre = 'owner'")) return { rows: [{ id_rol_empresa: 1 }] }
      return { rows: [] }
    }), release: vi.fn(),
  }
  mocks.connect.mockResolvedValue(client)
  mocks.compare.mockResolvedValue(true)
  mocks.cleanup.mockResolvedValue(true)
  req = { user: { id_usuario: 7 }, body: { password: 'correct' } }
  res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res); res.json.mockReturnValue(res)
})

describe('account deletion failure boundaries and reauthentication', () => {
  it.each([null, { id_usuario: 7, activo: false }])('rejects a missing/inactive account', async (account) => {
    user = account
    await deleteOwnAccount(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(mocks.cleanup).not.toHaveBeenCalled()
    expect(client.release).toHaveBeenCalledOnce()
  })
  it('rejects a wrong password and does not enqueue or clean anything', async () => {
    mocks.compare.mockResolvedValue(false)
    await deleteOwnAccount(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(mocks.cleanup).not.toHaveBeenCalled()
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(false)
  })
  it.each([
    { id_usuario: 99, purpose: 'account-deletion' },
    { id_usuario: 7, purpose: 'another-purpose' },
  ])('rejects Google proof for another user/purpose', async (payload) => {
    user.password_hash = null
    req.body = { google_reauth_token: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5m' }) }
    await deleteOwnAccount(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })
  it('rejects expired Google proof', async () => {
    user.password_hash = null
    req.body = { google_reauth_token: jwt.sign({ id_usuario: 7, purpose: 'account-deletion' }, process.env.JWT_SECRET, { expiresIn: '-1s' }) }
    await deleteOwnAccount(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })
  it('accepts valid Google proof without a password', async () => {
    user.password_hash = null
    req.body = { google_reauth_token: jwt.sign({ id_usuario: 7, purpose: 'account-deletion' }, process.env.JWT_SECRET, { expiresIn: '5m' }) }
    await deleteOwnAccount(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    expect(mocks.compare).not.toHaveBeenCalled()
  })
  it.each(['INSERT INTO public.account_mongo_deletion_outbox', 'COMMIT'])('rolls back on %s failure without touching Mongo', async (point) => {
    const original = client.query.getMockImplementation()
    client.query.mockImplementation(async (sql) => {
      if (sql.includes(point)) throw new Error('SQL failure')
      return original(sql)
    })
    await expect(deleteOwnAccount(req, res)).rejects.toThrow('SQL failure')
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(mocks.cleanup).not.toHaveBeenCalled()
    expect(client.release).toHaveBeenCalledOnce()
  })
  it('leaves cleanup pending after a Mongo error without rolling back committed SQL', async () => {
    mocks.cleanup.mockRejectedValue(new Error('Mongo offline'))
    await deleteOwnAccount(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mongoConversationData: 'pending_retry' }) }))
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK')
    expect(client.release.mock.invocationCallOrder[0]).toBeLessThan(mocks.cleanup.mock.invocationCallOrder[0])
  })
  it('does not fail a committed deletion if socket disconnection throws', async () => {
    mocks.disconnect.mockImplementation(() => { throw new Error('socket offline') })
    await deleteOwnAccount(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK')
  })
  it('fails safely if the owner role is missing', async () => {
    const original = client.query.getMockImplementation()
    client.query.mockImplementation(async (sql) => sql.includes("WHERE nombre = 'owner'") ? { rows: [] } : original(sql))
    await expect(deleteOwnAccount(req, res)).rejects.toThrow('owner role')
    expect(mocks.cleanup).not.toHaveBeenCalled()
  })
})
