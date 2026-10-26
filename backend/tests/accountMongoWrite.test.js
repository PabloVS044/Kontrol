import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ exists: vi.fn(), updateOne: vi.fn(), transaction: vi.fn() }))
vi.mock('mongoose', () => ({ default: { connection: { transaction: mocks.transaction } } }))
vi.mock('../src/models/AccountPrivacyState.js', () => ({ default: { exists: mocks.exists, updateOne: mocks.updateOne } }))
import { ensureAccountPrivacyState, withAccountMongoWrite } from '../src/services/accountMongoWrite.js'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.exists.mockResolvedValue(null)
  mocks.updateOne.mockResolvedValue({ matchedCount: 1 })
  mocks.transaction.mockImplementation((callback) => callback({ id: 'session' }))
})
describe('Mongo account write fence', () => {
  it.each([0, -1, '7', null, 1.5])('rejects invalid account IDs: %s', async (id) => {
    await expect(ensureAccountPrivacyState(id)).rejects.toThrow('identifier')
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })
  it('tolerates simultaneous initialization without overwriting a tombstone', async () => {
    mocks.updateOne.mockRejectedValueOnce({ code: 11000 })
    await ensureAccountPrivacyState(7)
    expect(mocks.updateOne).toHaveBeenCalledWith({ _id: 7 }, { $setOnInsert: { deleted: false, revision: 0 } }, expect.any(Object))
  })
  it('propagates other initialization errors', async () => {
    mocks.updateOne.mockRejectedValueOnce(new Error('network'))
    await expect(ensureAccountPrivacyState(7)).rejects.toThrow('network')
  })
  it('rejects an empty account set', async () => {
    await expect(withAccountMongoWrite([], vi.fn())).rejects.toThrow('identifier')
  })
  it('deduplicates/sorts account guards and returns the transaction result', async () => {
    const operation = vi.fn().mockResolvedValue('saved')
    expect(await withAccountMongoWrite([8, 7, 8], operation)).toBe('saved')
    expect(mocks.updateOne).toHaveBeenCalledTimes(4)
    expect(operation).toHaveBeenCalledWith({ id: 'session' })
  })
  it('rejects a write when cleanup already committed', async () => {
    mocks.updateOne.mockResolvedValueOnce({}).mockResolvedValueOnce({ matchedCount: 0 })
    const operation = vi.fn()
    await expect(withAccountMongoWrite(7, operation)).rejects.toMatchObject({ status: 401 })
    expect(operation).not.toHaveBeenCalled()
  })
})
