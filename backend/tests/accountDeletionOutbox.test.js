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
      'DELETE FROM public.account_mongo_deletion_outbox WHERE id_usuario = $1',
      [7]
    )
  })

  it('schedules a failed cleanup for retry instead of losing the outbox record', async () => {
    const failure = new Error('MongoDB unavailable')
    mocks.query.mockResolvedValueOnce({ rows: [{ id_usuario: 7, attempts: 2 }] })
    mocks.removeMongoAccountData.mockRejectedValue(failure)

    await expect(processMongoAccountDeletion(7)).rejects.toBe(failure)

    expect(mocks.query).toHaveBeenLastCalledWith(
      expect.stringContaining('available_at = CURRENT_TIMESTAMP'),
      [7, 60]
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
