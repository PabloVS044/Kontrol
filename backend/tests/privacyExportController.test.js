import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { Readable } from 'node:stream'

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  isMongoReady: vi.fn(),
  prepareCompanyDataExport: vi.fn(),
  disconnectUserSockets: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
}))

vi.mock('../src/db/pool.js', () => ({
  default: { connect: mocks.connect },
}))
vi.mock('../src/db/mongo.js', () => ({
  isMongoReady: mocks.isMongoReady,
}))
vi.mock('../src/services/companyDataExport.js', () => ({
  prepareCompanyDataExport: mocks.prepareCompanyDataExport,
}))
vi.mock('../src/services/accountDeletionOutbox.js', () => ({
  processMongoAccountDeletion: vi.fn(),
}))
vi.mock('../src/socket/index.js', () => ({
  disconnectUserSockets: mocks.disconnectUserSockets,
}))
vi.mock('../src/utils/logger.js', () => ({
  logger: { error: mocks.loggerError, info: mocks.loggerInfo },
}))

import { exportCompanyData } from '../src/controllers/privacyController.js'

function makeApp() {
  const app = express()
  app.get('/export', (req, res, next) => {
    req.company = { id_empresa: 12 }
    req.user = { id_usuario: 7 }
    return exportCompanyData(req, res, next)
  })
  app.use((error, req, res, next) => {
    res.status(500).json({ message: error.message })
  })
  return app
}

function makeClient() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.isMongoReady.mockReturnValue(true)
})

describe('company export controller resource cleanup', () => {
  it('rolls back and releases the connection if preparing the stream fails', async () => {
    const client = makeClient()
    mocks.connect.mockResolvedValue(client)
    mocks.prepareCompanyDataExport.mockRejectedValue(new Error('schema query failed'))

    const response = await request(makeApp()).get('/export')

    expect(response.status).toBe(500)
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('rolls back and releases when a stream is destroyed before iteration starts', async () => {
    const client = makeClient()
    const stream = Readable.from((async function* () {
      yield '{"unreachable":true}'
    })())
    stream.destroy()
    mocks.connect.mockResolvedValue(client)
    mocks.prepareCompanyDataExport.mockResolvedValue(stream)

    await expect(request(makeApp()).get('/export')).rejects.toThrow()

    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('releases the connection after a successful download', async () => {
    const client = makeClient()
    mocks.connect.mockResolvedValue(client)
    mocks.prepareCompanyDataExport.mockResolvedValue(Readable.from(['{"ok":true}']))

    const response = await request(makeApp()).get('/export')

    expect(response.status).toBe(200)
    expect(response.text).toBe('{"ok":true}')
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalledOnce()
  })
})
