import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

// Only the external LLM is stubbed. SQL, Mongo, sessions and outbox are real.
vi.mock('../../src/services/aiAgentService.js', () => ({
  isAgentConfigured: () => true,
  runAgentTurn: vi.fn(),
}))
import { runAgentTurn } from '../../src/services/aiAgentService.js'
import { api, closeDb, createCompanyWithOwner, createUser, query, setCompanyPlan } from '../db/fixtures.js'
import { connectMongo } from '../../src/db/mongo.js'
import Conversation from '../../src/models/Conversation.js'
import Message from '../../src/models/Message.js'
import AgentConversation from '../../src/models/AgentConversation.js'
import AgentMessage from '../../src/models/AgentMessage.js'
import AccountPrivacyState from '../../src/models/AccountPrivacyState.js'
import { withAccountMongoWrite, ensureAccountPrivacyState } from '../../src/services/accountMongoWrite.js'
import { persistUserTurn, persistAssistantTurn } from '../../src/services/agentPersistence.js'
import { createDirectConversation, persistHumanMessage, markConversationRead } from '../../src/services/chatPersistence.js'
import { removeMongoAccountData } from '../../src/services/mongoAccountCleanup.js'
import { processPendingMongoAccountDeletions, processMongoAccountDeletion } from '../../src/services/accountDeletionOutbox.js'

const models = [Conversation, Message, AgentConversation, AgentMessage, AccountPrivacyState]
const password = 'Privacy-test-password'
const deferred = () => {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}
const person = (id) => ({ id, nombre: `User ${id}`, email: `user${id}@example.test`, avatar: 'UT' })

async function seedChat(a, b) {
  const conv = await createDirectConversation([person(a), person(b)])
  await persistHumanMessage({ userId: b, conversationId: conv._id, senderName: 'B', senderAvatar: 'B', text: 'keep B', attachments: [] })
  await persistHumanMessage({ userId: a, conversationId: conv._id, senderName: 'A', senderAvatar: 'A', text: 'remove A', attachments: [] })
  await markConversationRead(a, conv._id)
  const assistant = await persistUserTurn({ userId: a, empresaId: 1, content: 'private prompt' })
  await persistAssistantTurn({ userId: a, empresaId: 1, conversationId: assistant.conversation._id, answer: 'private response', queries: [] })
  return conv
}
async function snapshot() {
  const data = {}
  for (const model of models) data[model.modelName] = await model.find().sort({ _id: 1 }).lean()
  return JSON.parse(JSON.stringify(data))
}
async function account() {
  const ctx = await createCompanyWithOwner()
  // PAY-1 — El agente es del plan Business; estas pruebas son de privacidad.
  await setCompanyPlan(ctx.company.id_empresa, 'business')
  await query('UPDATE public.usuario SET password_hash = $1 WHERE id_usuario = $2', [await bcrypt.hash(password, 4), ctx.owner.id_usuario])
  return ctx
}
const deleteAccount = (ctx, suppliedPassword = password) => api().delete('/api/auth/account')
  .set('Authorization', `Bearer ${ctx.token}`).send({ password: suppliedPassword })

beforeAll(connectMongo)
afterAll(async () => { await mongoose.disconnect(); await closeDb() })
beforeEach(async () => {
  vi.clearAllMocks()
  process.env.RATE_LIMIT_ENABLED = 'false'
  for (const model of models) await model.deleteMany({})
  await query('DELETE FROM public.account_mongo_deletion_outbox')
})
afterEach(() => vi.restoreAllMocks())

describe('real Mongo cleanup: atomicity, concurrency and late writers', () => {
  it('removes all personal data while retaining other participants and their messages', async () => {
    const conv = await seedChat(101, 102)
    // A stale message whose conversation does not exist must also be cleaned.
    await Message.create({ conversationId: new mongoose.Types.ObjectId(), senderId: 101, senderName: 'A', senderAvatar: 'A', text: 'orphan' })
    await removeMongoAccountData(101)
    expect(await AgentConversation.countDocuments({ userId: 101 })).toBe(0)
    expect(await AgentMessage.countDocuments({ userId: 101 })).toBe(0)
    expect(await Message.countDocuments({ senderId: 101 })).toBe(0)
    expect(await Message.countDocuments({ readBy: 101 })).toBe(0)
    const remaining = await Conversation.findById(conv._id).lean()
    expect(remaining.participants).toEqual([102])
    expect(remaining.participantInfo.map((p) => p.id)).toEqual([102])
    expect(remaining.unreadCounts).not.toHaveProperty('101')
    expect(remaining.lastMessage.senderId).toBe(102)
    expect(await Message.countDocuments({ senderId: 102 })).toBe(1)
    expect((await AccountPrivacyState.findById(101).lean()).deleted).toBe(true)
  })
  it('deletes a conversation left without participants and is idempotent', async () => {
    const conv = await Conversation.create({ participants: [201], participantInfo: [person(201)] })
    await Message.create({ conversationId: conv._id, senderId: 201, senderName: 'A', senderAvatar: 'A', text: 'bye' })
    await removeMongoAccountData(201)
    await removeMongoAccountData(201)
    expect(await Conversation.countDocuments()).toBe(0)
    expect(await Message.countDocuments()).toBe(0)
  })
  it('keeps a shared conversation with no remaining messages', async () => {
    const conv = await createDirectConversation([person(301), person(302)])
    await removeMongoAccountData(301)
    expect((await Conversation.findById(conv._id).lean()).lastMessage).toBeNull()
  })
  it('aborts ALL Mongo changes after a failure in the middle of cleanup', async () => {
    await seedChat(401, 402)
    const before = await snapshot()
    vi.spyOn(Conversation, 'updateOne').mockRejectedValueOnce(new Error('injected cleanup failure'))
    await expect(removeMongoAccountData(401)).rejects.toThrow('injected cleanup failure')
    expect(await snapshot()).toEqual(before)
  })
  it('does not restore either identity when both users delete concurrently', async () => {
    await seedChat(501, 502)
    await Promise.all([removeMongoAccountData(501), removeMongoAccountData(502)])
    expect(await Conversation.countDocuments()).toBe(0)
    expect(await Message.countDocuments()).toBe(0)
    expect(await AccountPrivacyState.countDocuments({ deleted: true })).toBe(2)
  })
  it('rejects late IA writes and attempts to start a DM with a deleted account', async () => {
    const turn = await persistUserTurn({ userId: 601, empresaId: 1, content: 'hello' })
    await removeMongoAccountData(601)
    await expect(persistAssistantTurn({ userId: 601, empresaId: 1, conversationId: turn.conversation._id, answer: 'late', queries: [] })).rejects.toMatchObject({ status: 401 })
    await expect(persistUserTurn({ userId: 601, empresaId: 1, content: 'late' })).rejects.toMatchObject({ status: 401 })
    await expect(createDirectConversation([person(601), person(602)])).rejects.toMatchObject({ status: 401 })
    expect(await AgentMessage.countDocuments()).toBe(0)
    expect(await Conversation.countDocuments()).toBe(0)
  })
  it('rejects late human sends and read acknowledgements', async () => {
    const conv = await seedChat(701, 702)
    await removeMongoAccountData(701)
    await expect(persistHumanMessage({ userId: 701, conversationId: conv._id, senderName: 'A', senderAvatar: 'A', text: 'late', attachments: [] })).rejects.toMatchObject({ status: 401 })
    await expect(markConversationRead(701, conv._id)).rejects.toMatchObject({ status: 401 })
    expect(await Message.countDocuments({ senderId: 701 })).toBe(0)
    expect(await Message.countDocuments({ readBy: 701 })).toBe(0)
  })
  it('includes a writer admitted before deletion and fences subsequent writes', async () => {
    await ensureAccountPrivacyState(801)
    const admitted = deferred(), resume = deferred(), cleanupAttempted = deferred()
    const originalUpdate = AccountPrivacyState.updateOne.bind(AccountPrivacyState)
    vi.spyOn(AccountPrivacyState, 'updateOne').mockImplementation((filter, update, options) => {
      if (update.$set?.deleted) cleanupAttempted.resolve()
      return originalUpdate(filter, update, options)
    })
    const writer = withAccountMongoWrite(801, async (session) => {
      admitted.resolve()
      await resume.promise
      await AgentConversation.create([{ userId: 801, empresaId: 1, title: 'in flight' }], { session })
    })
    await admitted.promise
    const cleanup = removeMongoAccountData(801)
    try { await cleanupAttempted.promise } finally { resume.resolve() }
    await Promise.all([writer, cleanup])
    expect(await AgentConversation.countDocuments({ userId: 801 })).toBe(0)
    await expect(withAccountMongoWrite(801, async () => {})).rejects.toMatchObject({ status: 401 })
  })
  it('preserves other tenants and enforces ownership when appending IA messages', async () => {
    const first = await persistUserTurn({ userId: 901, empresaId: 1, content: 'hello' })
    const second = await persistUserTurn({ userId: 901, empresaId: 1, conversationId: first.conversation._id, content: 'again' })
    expect(String(second.conversation._id)).toBe(String(first.conversation._id))
    for (const args of [
      { userId: 902, empresaId: 1, conversationId: first.conversation._id },
      { userId: 901, empresaId: 2, conversationId: first.conversation._id },
      { userId: 901, empresaId: 1, conversationId: 'invalid' },
    ]) await expect(persistUserTurn({ ...args, content: 'unauthorized' })).rejects.toMatchObject({ status: 404 })
    await expect(persistAssistantTurn({ userId: 901, empresaId: 1, conversationId: new mongoose.Types.ObjectId(), answer: 'orphan', queries: [] })).rejects.toMatchObject({ status: 404 })
    await persistUserTurn({ userId: 902, empresaId: 2, content: 'retain me' })
    await removeMongoAccountData(901)
    expect(await AgentMessage.countDocuments({ userId: 902 })).toBe(1)
  })
  it('reuses DMs and rejects writes/read receipts by a nonparticipant', async () => {
    const conv = await createDirectConversation([person(1001), person(1002)])
    expect(String((await createDirectConversation([person(1002), person(1001)]))._id)).toBe(String(conv._id))
    await expect(markConversationRead(1003, conv._id)).rejects.toMatchObject({ status: 404 })
    await expect(persistHumanMessage({ userId: 1003, conversationId: conv._id, senderName: 'X', senderAvatar: 'X', text: 'no', attachments: [] })).rejects.toMatchObject({ status: 404 })
    await expect(markConversationRead(1001, new mongoose.Types.ObjectId())).rejects.toMatchObject({ status: 404 })
  })
})

describe('real PostgreSQL + Mongo account lifecycle', () => {
  it('rejects incorrect credentials without changing either database', async () => {
    const ctx = await account()
    await seedChat(ctx.owner.id_usuario, 20001)
    const before = await snapshot()
    expect((await deleteAccount(ctx, 'wrong-password')).status).toBe(401)
    expect(await snapshot()).toEqual(before)
    expect((await query('SELECT activo FROM public.usuario WHERE id_usuario=$1', [ctx.owner.id_usuario])).rows[0].activo).toBe(true)
  })
  it('commits anonymization, cleans Mongo, removes outbox, and revokes the token', async () => {
    const ctx = await account()
    await seedChat(ctx.owner.id_usuario, 20002)
    const response = await deleteAccount(ctx)
    expect(response.status).toBe(200)
    expect(response.body.data.mongoConversationData).toBe('completed')
    expect((await query('SELECT activo, password_hash, token_version FROM public.usuario WHERE id_usuario=$1', [ctx.owner.id_usuario])).rows[0]).toEqual({ activo: false, password_hash: null, token_version: 2 })
    expect((await query('SELECT * FROM public.account_mongo_deletion_outbox')).rows).toHaveLength(0)
    expect(await Message.countDocuments({ senderId: ctx.owner.id_usuario })).toBe(0)
    expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${ctx.token}`)).status).toBe(401)
  })
  it('keeps account and Mongo intact when PostgreSQL COMMIT fails', async () => {
    const ctx = await account()
    await seedChat(ctx.owner.id_usuario, 20003)
    const before = await snapshot()
    await query(`CREATE OR REPLACE FUNCTION privacy_test_fail_commit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.id_usuario = TG_ARGV[0]::integer THEN RAISE EXCEPTION 'injected commit failure'; END IF;
      RETURN NEW; END $$`)
    await query(`CREATE CONSTRAINT TRIGGER privacy_commit_failure AFTER UPDATE ON public.usuario
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION privacy_test_fail_commit('${ctx.owner.id_usuario}')`)
    try {
      expect((await deleteAccount(ctx)).status).toBe(500)
      expect((await query('SELECT activo FROM public.usuario WHERE id_usuario=$1', [ctx.owner.id_usuario])).rows[0].activo).toBe(true)
      expect((await query('SELECT * FROM public.account_mongo_deletion_outbox')).rows).toHaveLength(0)
      expect(await snapshot()).toEqual(before)
    } finally {
      await query('DROP TRIGGER IF EXISTS privacy_commit_failure ON public.usuario')
      await query('DROP FUNCTION IF EXISTS privacy_test_fail_commit()')
    }
  })
  it('keeps a failed cleanup durable and succeeds on a subsequent worker attempt', async () => {
    const ctx = await account()
    await seedChat(ctx.owner.id_usuario, 20004)
    const before = await snapshot()
    vi.spyOn(Conversation, 'updateOne').mockRejectedValueOnce(new Error('injected Mongo failure'))
    const response = await deleteAccount(ctx)
    expect(response.status).toBe(200)
    expect(response.body.data.mongoConversationData).toBe('pending_retry')
    expect(await snapshot()).toEqual(before)
    const job = (await query('SELECT * FROM public.account_mongo_deletion_outbox')).rows[0]
    expect(job.attempts).toBe(1)
    expect(job.locked_until).toBeNull()
    await query('UPDATE public.account_mongo_deletion_outbox SET available_at=CURRENT_TIMESTAMP')
    await processPendingMongoAccountDeletions()
    expect((await query('SELECT * FROM public.account_mongo_deletion_outbox')).rows).toHaveLength(0)
    expect(await Message.countDocuments({ senderId: ctx.owner.id_usuario })).toBe(0)
  })
  it('queues cleanup across an actual Mongo disconnect/reconnect', async () => {
    const ctx = await account()
    await seedChat(ctx.owner.id_usuario, 20005)
    await mongoose.disconnect()
    try {
      const response = await deleteAccount(ctx)
      expect(response.status).toBe(200)
      expect(response.body.data.mongoConversationData).toBe('pending_retry')
      expect((await query('SELECT * FROM public.account_mongo_deletion_outbox')).rows).toHaveLength(1)
    } finally { await connectMongo() }
    await processPendingMongoAccountDeletions()
    expect(await AgentMessage.countDocuments({ userId: ctx.owner.id_usuario })).toBe(0)
    expect((await query('SELECT * FROM public.account_mongo_deletion_outbox')).rows).toHaveLength(0)
  })
  it('allows only one worker to claim a job and recovers expired leases', async () => {
    const user = await createUser()
    await query('INSERT INTO public.account_mongo_deletion_outbox(id_usuario,locked_until) VALUES($1,CURRENT_TIMESTAMP + INTERVAL \'5 minutes\')', [user.id_usuario])
    expect(await processMongoAccountDeletion(user.id_usuario)).toBe(false)
    await query('UPDATE public.account_mongo_deletion_outbox SET locked_until=CURRENT_TIMESTAMP - INTERVAL \'1 minute\'')
    const results = await Promise.all([processMongoAccountDeletion(user.id_usuario), processMongoAccountDeletion(user.id_usuario)])
    expect(results.sort()).toEqual([false, true])
    expect((await query('SELECT * FROM public.account_mongo_deletion_outbox')).rows).toHaveLength(0)
  })
  it('does not persist an IA response after deleting the account during inference', async () => {
    const ctx = await account(), inferenceStarted = deferred(), resumeInference = deferred()
    runAgentTurn.mockImplementation(async () => {
      inferenceStarted.resolve()
      await resumeInference.promise
      return { answer: 'late answer', queries: [] }
    })
    const chatResponse = api().post('/api/agent/chat').set('Authorization', `Bearer ${ctx.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
      .send({ messages: [{ role: 'user', content: 'hello' }] }).then((r) => r)
    try {
      await inferenceStarted.promise
      expect((await deleteAccount(ctx)).body.data.mongoConversationData).toBe('completed')
    } finally { resumeInference.resolve() }
    expect((await chatResponse).status).toBe(401)
    expect(await AgentConversation.countDocuments({ userId: ctx.owner.id_usuario })).toBe(0)
    expect(await AgentMessage.countDocuments({ userId: ctx.owner.id_usuario })).toBe(0)
  })
  it('exports real Mongo data without another company or other human sender data', async () => {
    const ctx = await account(), other = await account()
    const conversation = await createDirectConversation([person(ctx.owner.id_usuario), person(other.owner.id_usuario)])
    await persistHumanMessage({ userId: ctx.owner.id_usuario, conversationId: conversation._id, senderName: 'me', senderAvatar: 'M', text: 'my message', attachments: [] })
    await persistHumanMessage({ userId: other.owner.id_usuario, conversationId: conversation._id, senderName: 'other', senderAvatar: 'O', text: 'do not export this human message', attachments: [] })
    await persistUserTurn({ userId: ctx.owner.id_usuario, empresaId: ctx.company.id_empresa, content: 'my assistant prompt' })
    await persistUserTurn({ userId: other.owner.id_usuario, empresaId: other.company.id_empresa, content: 'other tenant secret' })
    const response = await api().get('/api/companies/export').set('Authorization', `Bearer ${ctx.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
    expect(response.status).toBe(200)
    expect(response.text).toContain('my assistant prompt')
    expect(response.text).toContain('my message')
    expect(response.text).not.toContain('other tenant secret')
    expect(response.text).not.toContain('do not export this human message')
    expect(response.text).not.toContain('password_hash')
    expect(response.text).not.toContain('token_version')
    expect((await api().get('/api/companies/export').set('Authorization', `Bearer ${other.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))).status).toBe(403)
  })
})
