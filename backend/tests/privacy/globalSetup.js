import mongoose from 'mongoose'
import setupPostgres from '../db/globalSetup.js'
import { assertSafeMongoTestUri, testMongoUri } from './testMongoDatabase.js'

export default async function setup() {
  const uri = testMongoUri()
  assertSafeMongoTestUri(uri)
  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise()
  try {
    const hello = await connection.db.admin().command({ hello: 1 })
    if (!hello.setName) throw new Error('Privacy tests require a Mongo replica set. Run npm run db:test:up -w backend.')
    await setupPostgres()
    await connection.dropDatabase()
    for (const name of ['conversations', 'messages', 'agent_conversations', 'agent_messages', 'account_privacy_states']) {
      await connection.db.createCollection(name)
    }
  } finally { await connection.close() }
}
