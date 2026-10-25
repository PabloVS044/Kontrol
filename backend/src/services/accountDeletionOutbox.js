import pool from '../db/pool.js'
import { isMongoReady } from '../db/mongo.js'
import { removeMongoAccountData } from './mongoAccountCleanup.js'
import { logger } from '../utils/logger.js'

const LEASE_MINUTES = 5
const POLL_INTERVAL_MS = 30_000

async function claimJob(userId = null) {
  const { rows } = await pool.query(
    `UPDATE public.account_mongo_deletion_outbox
     SET locked_until = CURRENT_TIMESTAMP + ($1 * INTERVAL '1 minute'),
         attempts = attempts + 1
     WHERE id_usuario = (
       SELECT id_usuario
       FROM public.account_mongo_deletion_outbox
       WHERE available_at <= CURRENT_TIMESTAMP
         AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP)
         AND ($2::integer IS NULL OR id_usuario = $2)
       ORDER BY available_at, id_usuario
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id_usuario, attempts`,
    [LEASE_MINUTES, userId]
  )
  return rows[0] ?? null
}

async function scheduleRetry(userId, attempts) {
  const delaySeconds = Math.min(86_400, 30 * (2 ** Math.min(attempts - 1, 11)))
  await pool.query(
    `UPDATE public.account_mongo_deletion_outbox
     SET locked_until = NULL,
         available_at = CURRENT_TIMESTAMP + ($2 * INTERVAL '1 second')
     WHERE id_usuario = $1`,
    [userId, delaySeconds]
  )
}

async function processClaimedJob(job) {
  try {
    await removeMongoAccountData(job.id_usuario)
    await pool.query(
      'DELETE FROM public.account_mongo_deletion_outbox WHERE id_usuario = $1',
      [job.id_usuario]
    )
    return true
  } catch (error) {
    await scheduleRetry(job.id_usuario, job.attempts)
    throw error
  }
}

export async function processMongoAccountDeletion(userId) {
  if (!isMongoReady()) return false
  const job = await claimJob(userId)
  if (!job) return false
  return processClaimedJob(job)
}

export async function processPendingMongoAccountDeletions(batchSize = 10) {
  if (!isMongoReady()) return
  for (let index = 0; index < batchSize; index += 1) {
    const job = await claimJob()
    if (!job) return
    try {
      await processClaimedJob(job)
    } catch (error) {
      logger.error('Could not process queued MongoDB account cleanup:', error)
    }
  }
}

export function startMongoAccountDeletionWorker() {
  const timer = setInterval(() => {
    processPendingMongoAccountDeletions().catch((error) => {
      logger.error('MongoDB account cleanup worker failed:', error)
    })
  }, POLL_INTERVAL_MS)
  timer.unref?.()
  processPendingMongoAccountDeletions().catch((error) => {
    logger.error('MongoDB account cleanup worker failed during startup:', error)
  })
  return () => clearInterval(timer)
}
