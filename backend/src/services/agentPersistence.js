import mongoose from 'mongoose'
import AgentConversation from '../models/AgentConversation.js'
import AgentMessage from '../models/AgentMessage.js'
import { withAccountMongoWrite } from './accountMongoWrite.js'

const notFound = () => Object.assign(new Error('Conversation not found.'), { status: 404 })

export async function persistUserTurn({ userId, empresaId, conversationId, content }) {
  return withAccountMongoWrite(userId, async (session) => {
    let conversation
    if (conversationId) {
      if (!mongoose.isObjectIdOrHexString(conversationId)) throw notFound()
      conversation = await AgentConversation.findOne({ _id: conversationId, userId, empresaId })
        .session(session).lean()
      if (!conversation) throw notFound()
    } else {
      const title = content.trim().replace(/\s+/g, ' ').slice(0, 60) || 'Nueva conversación'
      const [created] = await AgentConversation.create([
        { userId, empresaId, title, lastMessageAt: new Date() },
      ], { session })
      conversation = created.toObject()
    }
    const [message] = await AgentMessage.create([{
      conversationId: conversation._id, userId, empresaId, role: 'user', content,
    }], { session })
    return { conversation, message: message.toObject() }
  })
}

export async function persistAssistantTurn({ userId, empresaId, conversationId, answer, queries }) {
  return withAccountMongoWrite(userId, async (session) => {
    const conversation = await AgentConversation.findOne({ _id: conversationId, userId, empresaId })
      .session(session).lean()
    // A separately deleted conversation must not acquire orphan messages.
    if (!conversation) throw notFound()
    const [message] = await AgentMessage.create([{
      conversationId, userId, empresaId, role: 'assistant', content: answer, queries,
    }], { session })
    await AgentConversation.updateOne({ _id: conversationId }, {
      $set: { lastMessageAt: new Date() },
    }, { session })
    return message.toObject()
  })
}
