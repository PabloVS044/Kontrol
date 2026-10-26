import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import AgentConversation from '../models/AgentConversation.js'
import AgentMessage from '../models/AgentMessage.js'
import AccountPrivacyState from '../models/AccountPrivacyState.js'
import { logger } from '../utils/logger.js'

mongoose.set('bufferCommands', false)

export function isMongoReady() {
  return mongoose.connection.readyState === 1
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables')

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'))
  mongoose.connection.on('error', err => logger.error('MongoDB error:', err))
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 })
    if (!hello.setName && hello.msg !== 'isdbgrid') {
      throw new Error('MongoDB transactions require a replica set or sharded cluster.')
    }
    // Create collections before transactions, including on a fresh deployment.
    for (const model of [Conversation, Message, AgentConversation, AgentMessage, AccountPrivacyState]) {
      await model.createCollection()
    }
  } catch (error) {
    await mongoose.disconnect()
    throw error
  }
}
