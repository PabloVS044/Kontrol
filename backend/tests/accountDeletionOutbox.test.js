import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  isMongoReady: vi.fn(),
  removeMongoAccountData: vi.fn(),
}))

vi.mock('../src/db/pool.js', () => ({
  default: { query: mocks.query },
}))
vi.mock('../src/db/mongo.js', () => ({
  isMongoReady: mocks.isMongoReady,
}))
vi.mock('../src/services/mongoAccountCleanup.js', () => ({
  removeMongoAccountData: mocks.removeMongoAccountData,
}))

import {
  processMongoAccountDeletion,
  processPendingMongoAccountDeletions,
  startMongoAccountDeletionWorker,
} from '../src/services/accountDeletionOutbox.js'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.removeMongoAccountData.mockResolvedValue(undefined)
  mocks.isMongoReady.mockReturnValue(true)
  mocks.query.mockResolvedValue({ rows: [] })
})

describe('account deletion MongoDB outbox', () => {
  it('claims the account job, cleans MongoDB, then removes the completed job', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id_usuario: 7, attempts: 1 }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    await expect(processMongoAccountDeletion(7)).resolves.toBe(true)

    expect(mocks.removeMongoAccountData).toHaveBeenCalledWith(7)
    expect(mocks.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FOR UPDATE SKIP LOCKED'),
      [5, 7]
    )
    expect(mocks.query).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM public.account_mongo_deletion_outbox WHERE id_usuario = $1 AND attempts = $2',
      [7, 1]
    )
  })

  it('schedules a failed cleanup for retry instead of losing the outbox record', async () => {
    const failure = new Error('MongoDB unavailable')
    mocks.query.mockResolvedValueOnce({ rows: [{ id_usuario: 7, attempts: 2 }] })
    mocks.removeMongoAccountData.mockRejectedValue(failure)

    await expect(processMongoAccountDeletion(7)).rejects.toBe(failure)

    expect(mocks.query).toHaveBeenLastCalledWith(
      expect.stringContaining('available_at = CURRENT_TIMESTAMP'),
      [7, 60, 2]
    )
  })

  it('continues processing subsequent jobs when one queued cleanup fails', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id_usuario: 7, attempts: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_usuario: 8, attempts: 1 }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    mocks.removeMongoAccountData
      .mockRejectedValueOnce(new Error('temporary MongoDB failure'))
      .mockResolvedValueOnce(undefined)

    await expect(processPendingMongoAccountDeletions(2)).resolves.toBeUndefined()

    expect(mocks.removeMongoAccountData).toHaveBeenNthCalledWith(1, 7)
    expect(mocks.removeMongoAccountData).toHaveBeenNthCalledWith(2, 8)
  })
})


describe('outbox leases and unavailable dependencies', () => {
  it('does not claim jobs while Mongo is offline', async () => {
    mocks.isMongoReady.mockReturnValue(false)
    expect(await processMongoAccountDeletion(7)).toBe(false)
    await processPendingMongoAccountDeletions()
    expect(mocks.query).not.toHaveBeenCalled()
  })
  it('handles an empty queue and a job claimed by another worker', async () => {
    expect(await processMongoAccountDeletion(7)).toBe(false)
    await processPendingMongoAccountDeletions()
    expect(mocks.removeMongoAccountData).not.toHaveBeenCalled()
  })
  it('does not acknowledge a job whose lease was superseded', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ id_usuario: 7, attempts: 2 }] })
      .mockResolvedValueOnce({ rowCount: 0 })
    expect(await processMongoAccountDeletion(7)).toBe(false)
  })
  it('caps retry backoff at one day', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ id_usuario: 7, attempts: 50 }] })
    mocks.removeMongoAccountData.mockRejectedValueOnce(new Error('offline'))
    await expect(processMongoAccountDeletion(7)).rejects.toThrow('offline')
    expect(mocks.query).toHaveBeenLastCalledWith(expect.stringContaining('attempts = $3'), [7, 86400, 50])
  })
  it('starts immediately, does not overlap polls and can be stopped', async () => {
    vi.useFakeTimers()
    let release
    mocks.query.mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))
    const stop = startMongoAccountDeletionWorker()
    try {
      await vi.advanceTimersByTimeAsync(60_000)
      expect(mocks.query).toHaveBeenCalledOnce()
      release({ rows: [] })
      await vi.advanceTimersByTimeAsync(30_000)
      expect(mocks.query).toHaveBeenCalledTimes(2)
      stop()
      await vi.advanceTimersByTimeAsync(60_000)
      expect(mocks.query).toHaveBeenCalledTimes(2)
    } finally { stop(); vi.useRealTimers() }
  })
  it('recovers the polling loop after a claim error', async () => {
    vi.useFakeTimers()
    mocks.query.mockRejectedValueOnce(new Error('postgres offline'))
    const stop = startMongoAccountDeletionWorker()
    try {
      await vi.advanceTimersByTimeAsync(30_000)
      expect(mocks.query).toHaveBeenCalledTimes(2)
    } finally { stop(); vi.useRealTimers() }
  })
})
