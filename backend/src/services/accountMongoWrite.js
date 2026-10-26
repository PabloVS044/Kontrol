import mongoose from 'mongoose'
import AccountPrivacyState from '../models/AccountPrivacyState.js'

export const MONGO_TRANSACTION_OPTIONS = {
  readPreference: 'primary',
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  maxCommitTimeMS: 10_000,
  timeoutMS: 45_000,
}

export function accountUnavailable() {
  return Object.assign(new Error('Account is unavailable.'), { status: 401 })
}

export async function ensureAccountPrivacyState(userId) {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new TypeError('Invalid account identifier.')
  // A read avoids taking an unnecessary write lock on every existing guard.
  if (await AccountPrivacyState.exists({ _id: userId })) return
  try {
    // Concurrent first use can collide on _id. Never overwrite a tombstone.
    await AccountPrivacyState.updateOne(
      { _id: userId },
      { $setOnInsert: { deleted: false, revision: 0 } },
      { upsert: true, writeConcern: { w: 'majority' } }
    )
  } catch (error) {
    if (error.code !== 11000) throw error
  }
}

// Callbacks may be retried: no HTTP calls or socket emits inside them.
// Every Mongo operation inside the callback must use the provided session.
export async function withAccountMongoWrite(userIds, operation) {
  const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])].sort((a, b) => a - b)
  if (!ids.length) throw new TypeError('An account identifier is required.')
  for (const id of ids) await ensureAccountPrivacyState(id)
  return mongoose.connection.transaction(async (session) => {
    for (const id of ids) {
      const result = await AccountPrivacyState.updateOne(
        { _id: id, deleted: false },
        { $inc: { revision: 1 } },
        { session }
      )
      if (result.matchedCount !== 1) throw accountUnavailable()
    }
    return operation(session)
  }, MONGO_TRANSACTION_OPTIONS)
}
