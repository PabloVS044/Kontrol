import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import { withAccountMongoWrite } from './accountMongoWrite.js'
import { buildMessagePreview } from '../utils/chat.js'

const notFound = () => Object.assign(new Error('Conversation not found.'), { status: 404 })

export async function createDirectConversation(users) {
  const ids = users.map((user) => user.id).sort((a, b) => a - b)
  return withAccountMongoWrite(ids, async (session) => {
    const existing = await Conversation.findOne({ participants: ids }).session(session)
    if (existing) return existing
    const [conversation] = await Conversation.create([{
      type: 'dm', participants: ids, participantInfo: users,
      unreadCounts: Object.fromEntries(ids.map((id) => [String(id), 0])),
    }], { session })
    return conversation
  })
}

export async function persistHumanMessage({ userId, conversationId, senderName, senderAvatar, text, attachments }) {
  return withAccountMongoWrite(userId, async (session) => {
    const conv = await Conversation.findById(conversationId).session(session)
    if (!conv || !conv.participants.includes(userId)) throw notFound()
    const [message] = await Message.create([{
      conversationId, senderId: userId, senderName, senderAvatar, text, attachments, readBy: [userId],
    }], { session })
    const updatedConversation = await Conversation.findByIdAndUpdate(conversationId, {
      $set: { lastMessage: {
        text: buildMessagePreview({ text, attachments }), senderId: userId,
        type: attachments[0]?.type || 'text', createdAt: message.createdAt,
      } },
      $inc: Object.fromEntries(conv.participants.filter((id) => id !== userId)
        .map((id) => [`unreadCounts.${id}`, 1])),
    }, { session, returnDocument: 'after' })
    return { message, conversation: updatedConversation }
  })
}

export async function markConversationRead(userId, conversationId) {
  return withAccountMongoWrite(userId, async (session) => {
    const conv = await Conversation.findById(conversationId).session(session)
    if (!conv || !conv.participants.includes(userId)) throw notFound()
    const updated = await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCounts.${userId}`]: 0 },
    }, { session, returnDocument: 'after' })
    await Message.updateMany({ conversationId, readBy: { $ne: userId } }, {
      $addToSet: { readBy: userId },
    }, { session })
    return updated
  })
}
