import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { EventEmitter } from 'node:events'
import { Readable, Writable } from 'node:stream'

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
  app.use((error, _req, res, _next) => {
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


function directResponse() {
  const req = Object.assign(new EventEmitter(), { company: { id_empresa: 12 }, user: { id_usuario: 7 } })
  const res = new Writable({ write(chunk, encoding, done) { done() } })
  res.locals = { releaseCompanyExport: vi.fn() }
  res.status = res.type = res.set = () => res
  res.json = () => res.end()
  return { req, res, next: vi.fn() }
}
const deferred = () => {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

describe('export cancellation boundaries', () => {
  it('does not acquire a connection for an already closed response', async () => {
    const { req, res, next } = directResponse()
    res.destroy()
    await exportCompanyData(req, res, next)
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(res.locals.releaseCompanyExport).toHaveBeenCalledOnce()
  })
  it('releases a connection acquired after cancellation without starting SQL', async () => {
    const waiting = deferred()
    const client = makeClient()
    mocks.connect.mockReturnValue(waiting.promise)
    const { req, res, next } = directResponse()
    const done = exportCompanyData(req, res, next)
    req.aborted = true
    req.emit('aborted')
    waiting.resolve(client)
    await done
    expect(client.query).not.toHaveBeenCalled()
    expect(client.release).toHaveBeenCalledOnce()
    expect(mocks.prepareCompanyDataExport).not.toHaveBeenCalled()
  })
  it('cleans up a cancellation during preparation before the first stream read', async () => {
    const started = deferred(), prepared = deferred()
    const client = makeClient()
    mocks.connect.mockResolvedValue(client)
    mocks.prepareCompanyDataExport.mockImplementation(() => { started.resolve(); return prepared.promise })
    const { req, res, next } = directResponse()
    const done = exportCompanyData(req, res, next)
    await started.promise
    res.destroy()
    req.emit('aborted')
    const stream = Readable.from(['{}'])
    prepared.resolve(stream)
    await done
    expect(stream.destroyed).toBe(true)
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalledOnce()
    expect(res.locals.releaseCompanyExport).toHaveBeenCalledOnce()
  })
  it('cleans up interruption during streaming', async () => {
    const client = makeClient(), started = deferred()
    const stream = new Readable({ read() { started.resolve() } })
    mocks.connect.mockResolvedValue(client)
    mocks.prepareCompanyDataExport.mockResolvedValue(stream)
    const { req, res, next } = directResponse()
    const done = exportCompanyData(req, res, next)
    await started.promise
    res.destroy()
    await done
    expect(stream.destroyed).toBe(true)
    expect(client.release).toHaveBeenCalledOnce()
  })
  it('enforces the overall deadline and releases its slot', async () => {
    vi.useFakeTimers()
    process.env.COMPANY_EXPORT_TIMEOUT_MS = '100'
    const client = makeClient(), started = deferred()
    mocks.connect.mockResolvedValue(client)
    mocks.prepareCompanyDataExport.mockResolvedValue(new Readable({ read() { started.resolve() } }))
    const { req, res, next } = directResponse()
    try {
      const done = exportCompanyData(req, res, next)
      await started.promise
      await vi.advanceTimersByTimeAsync(101)
      await done
      expect(res.destroyed).toBe(true)
      expect(client.release).toHaveBeenCalledOnce()
      expect(res.locals.releaseCompanyExport).toHaveBeenCalledOnce()
    } finally { delete process.env.COMPANY_EXPORT_TIMEOUT_MS; vi.useRealTimers() }
  })
  it('forwards pool connection errors and releases its concurrency slot', async () => {
    const failure = new Error('pool exhausted')
    mocks.connect.mockRejectedValue(failure)
    const { req, res, next } = directResponse()
    await exportCompanyData(req, res, next)
    expect(next).toHaveBeenCalledWith(failure)
    expect(res.locals.releaseCompanyExport).toHaveBeenCalledOnce()
  })
  it('discards a client when rollback fails', async () => {
    const client = makeClient(), failure = new Error('connection closed')
    client.query.mockImplementation(async (sql) => { if (sql === 'ROLLBACK') throw failure; return { rows: [] } })
    mocks.connect.mockResolvedValue(client)
    mocks.prepareCompanyDataExport.mockResolvedValue(Readable.from(['{}']))
    await request(makeApp()).get('/export')
    expect(client.release).toHaveBeenCalledWith(failure)
  })
  it('handles a checked-out PostgreSQL client error during streaming', async () => {
    const client = Object.assign(new EventEmitter(), makeClient()), started = deferred()
    mocks.connect.mockResolvedValue(client)
    mocks.prepareCompanyDataExport.mockResolvedValue(new Readable({ read() { started.resolve() } }))
    const { req, res, next } = directResponse()
    const done = exportCompanyData(req, res, next)
    await started.promise
    const failure = new Error('idle transaction terminated')
    client.emit('error', failure)
    await done
    expect(client.release).toHaveBeenCalledWith(failure)
    expect(res.locals.releaseCompanyExport).toHaveBeenCalledOnce()
  })
  it('returns 503 without acquiring Postgres when Mongo is unavailable', async () => {
    mocks.isMongoReady.mockReturnValue(false)
    const response = await request(makeApp()).get('/export')
    expect(response.status).toBe(503)
    expect(mocks.connect).not.toHaveBeenCalled()
  })
})
