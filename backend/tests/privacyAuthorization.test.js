import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  isMongoReady: vi.fn(),
  bcryptCompare: vi.fn(),
  conversationFind: vi.fn(),
  messageFind: vi.fn(),
  agentConversationDeleteMany: vi.fn(),
  agentMessageDeleteMany: vi.fn(),
  removeMongoAccountData: vi.fn(),
}))

vi.mock('../src/services/mongoAccountCleanup.js', () => ({ removeMongoAccountData: mocks.removeMongoAccountData }))

vi.mock('../src/db/pool.js', () => ({
  default: { query: mocks.query, connect: mocks.connect },
}))
vi.mock('../src/db/mongo.js', () => ({ isMongoReady: mocks.isMongoReady }))
vi.mock('bcrypt', () => ({ default: { compare: mocks.bcryptCompare } }))
vi.mock('../src/models/Conversation.js', () => ({ default: { find: mocks.conversationFind } }))
vi.mock('../src/models/Message.js', () => ({ default: { find: mocks.messageFind } }))
vi.mock('../src/models/AgentConversation.js', () => ({
  default: { deleteMany: mocks.agentConversationDeleteMany },
}))
vi.mock('../src/models/AgentMessage.js', () => ({
  default: { deleteMany: mocks.agentMessageDeleteMany },
}))

import request from 'supertest'
import { buildTestApp, companyMembership, noMembership, signToken } from './helpers/authTestApp.js'

const app = buildTestApp({ mockSessionAccount: false })

async function* emptyCursor() {}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.isMongoReady.mockReturnValue(false)
  mocks.query.mockResolvedValue({ rows: [] })
  mocks.conversationFind.mockReturnValue({ cursor: emptyCursor })
  mocks.messageFind.mockReturnValue({
    updateMany: vi.fn().mockResolvedValue({}),
    findOne: vi.fn(() => ({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) })),
  })
  mocks.agentConversationDeleteMany.mockResolvedValue({})
  mocks.agentMessageDeleteMany.mockResolvedValue({})
  mocks.removeMongoAccountData.mockResolvedValue(undefined)
})

function mockDeletionWorker(userId = 7) {
  mocks.query.mockImplementation(async (sql) => {
    if (sql.includes('SELECT activo, token_version')) {
      return { rows: [{ activo: true, token_version: 1 }] }
    }
    if (sql.includes('SET locked_until')) {
      return { rows: [{ id_usuario: userId, attempts: 1 }] }
    }
    return { rows: [], rowCount: 1 }
  })
}

describe('privacy endpoints authorization', () => {
  it('blocks an account from exporting a company it does not belong to', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ activo: true, token_version: 1 }] })
      .mockResolvedValueOnce(noMembership())

    const response = await request(app)
      .get('/api/companies/export')
      .set('Authorization', `Bearer ${signToken({ token_version: 1 })}`)
      .set('X-Company-ID', '99')

    expect(response.status).toBe(403)
    expect(mocks.isMongoReady).not.toHaveBeenCalled()
  })

  it('rejects a disabled account even when it presents a previously issued token', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ activo: false, token_version: 2 }] })

    const response = await request(app)
      .get('/api/companies/export')
      .set('Authorization', `Bearer ${signToken({ token_version: 1 })}`)
      .set('X-Company-ID', '1')

    expect(response.status).toBe(401)
    expect(mocks.query).toHaveBeenCalledOnce()
  })

  it('does not allow a company collaborator to export the company database', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ activo: true, token_version: 1 }] })
      .mockResolvedValueOnce(companyMembership('collaborator'))

    const response = await request(app)
      .get('/api/companies/export')
      .set('Authorization', `Bearer ${signToken({ token_version: 1 })}`)
      .set('X-Company-ID', '1')

    expect(response.status).toBe(403)
    expect(mocks.isMongoReady).not.toHaveBeenCalled()
  })

  it('deletes only the authenticated account, even if a different user ID is submitted', async () => {
    mocks.isMongoReady.mockReturnValue(true)
    mockDeletionWorker()
    mocks.bcryptCompare.mockResolvedValue(true)

    const client = {
      query: vi.fn(async (sql) => {
        if (sql.includes('SELECT id_usuario, password_hash')) {
          return { rows: [{ id_usuario: 7, password_hash: 'hash', google_id: null, activo: true }] }
        }
        if (sql.includes('SELECT eu.id_empresa, re.nombre')) return { rows: [] }
        if (sql.includes("WHERE nombre = 'owner'")) return { rows: [{ id_rol_empresa: 1 }] }
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    mocks.connect.mockResolvedValue(client)

    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${signToken({ id_usuario: 7, token_version: 1 })}`)
      .send({ password: 'correct-password', id_usuario: 99 })

    expect(response.status).toBe(200)
    expect(response.body.data.account).toBe('disabled_and_anonymized')
    expect(response.body.data.mongoConversationData).toBe('completed')
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id_usuario = $1'),
      [7]
    )
    const anonymizeCall = client.query.mock.calls.find(([sql]) =>
      sql.includes("SET nombre = 'Cuenta eliminada'")
    )
    expect(anonymizeCall[1][1]).toBe(7)
    expect(client.query.mock.calls.findIndex(([sql]) =>
      sql.includes('INSERT INTO public.account_mongo_deletion_outbox')
    )).toBeLessThan(client.query.mock.calls.findIndex(([sql]) => sql === 'COMMIT'))
    expect(mocks.removeMongoAccountData).toHaveBeenCalledWith(7)
  })

  it('commits account deletion and leaves Mongo cleanup queued when MongoDB is offline', async () => {
    mocks.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT activo, token_version')) {
        return { rows: [{ activo: true, token_version: 1 }] }
      }
      return { rows: [] }
    })
    mocks.isMongoReady.mockReturnValue(false)
    mocks.bcryptCompare.mockResolvedValue(true)
    const client = {
      query: vi.fn(async (sql) => {
        if (sql.includes('SELECT id_usuario, password_hash')) {
          return { rows: [{ id_usuario: 7, password_hash: 'hash', google_id: null, activo: true }] }
        }
        if (sql.includes("WHERE nombre = 'owner'")) return { rows: [{ id_rol_empresa: 1 }] }
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    mocks.connect.mockResolvedValue(client)

    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${signToken()}`)
      .send({ password: 'correct-password' })

    expect(response.status).toBe(200)
    expect(response.body.data.mongoConversationData).toBe('pending_retry')
    expect(client.query).toHaveBeenCalledWith('COMMIT')
    expect(mocks.removeMongoAccountData).not.toHaveBeenCalled()
  })

  it('transfers an owner company to an active member before removing the old owner', async () => {
    mocks.isMongoReady.mockReturnValue(true)
    mockDeletionWorker()
    mocks.bcryptCompare.mockResolvedValue(true)
    const client = {
      query: vi.fn(async (sql) => {
        if (sql.includes('SELECT id_usuario, password_hash')) {
          return { rows: [{ id_usuario: 7, password_hash: 'hash', google_id: null, activo: true }] }
        }
        if (sql.includes('SELECT eu.id_empresa, re.nombre')) {
          return { rows: [{ id_empresa: 4, rol_empresa: 'owner' }] }
        }
        if (sql.includes("WHERE nombre = 'owner'")) return { rows: [{ id_rol_empresa: 1 }] }
        if (sql.includes('SELECT eu.id_usuario')) return { rows: [{ id_usuario: 8 }] }
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    mocks.connect.mockResolvedValue(client)

    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${signToken({ id_usuario: 7, token_version: 1 })}`)
      .send({ password: 'correct-password' })

    expect(response.status).toBe(200)
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.empresa_usuario'),
      [1, 4, 8]
    )
    expect(client.query).not.toHaveBeenCalledWith(
      'UPDATE public.empresa SET activo = false WHERE id_empresa = $1',
      [4]
    )
  })

  it('deactivates an owner company when there is no active successor', async () => {
    mocks.isMongoReady.mockReturnValue(true)
    mockDeletionWorker()
    mocks.bcryptCompare.mockResolvedValue(true)
    const client = {
      query: vi.fn(async (sql) => {
        if (sql.includes('SELECT id_usuario, password_hash')) {
          return { rows: [{ id_usuario: 7, password_hash: 'hash', google_id: null, activo: true }] }
        }
        if (sql.includes('SELECT eu.id_empresa, re.nombre')) {
          return { rows: [{ id_empresa: 4, rol_empresa: 'owner' }] }
        }
        if (sql.includes("WHERE nombre = 'owner'")) return { rows: [{ id_rol_empresa: 1 }] }
        if (sql.includes('SELECT eu.id_usuario')) return { rows: [] }
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    mocks.connect.mockResolvedValue(client)

    const response = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${signToken({ id_usuario: 7, token_version: 1 })}`)
      .send({ password: 'correct-password' })

    expect(response.status).toBe(200)
    expect(client.query).toHaveBeenCalledWith(
      'UPDATE public.empresa SET activo = false WHERE id_empresa = $1',
      [4]
    )
  })
})
