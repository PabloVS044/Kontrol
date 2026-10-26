import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import AgentConversation from '../models/AgentConversation.js'
import AgentMessage from '../models/AgentMessage.js'
import AccountPrivacyState from '../models/AccountPrivacyState.js'
import { ensureAccountPrivacyState, MONGO_TRANSACTION_OPTIONS } from './accountMongoWrite.js'

export async function removeMongoAccountData(userId) {
  await ensureAccountPrivacyState(userId)
  return mongoose.connection.transaction(async (session) => {
    // Serializes cleanup with every write by this account across API instances.
    // The tombstone and all deletions either commit together or abort together.
    await AccountPrivacyState.updateOne(
      { _id: userId },
      { $set: { deleted: true }, $inc: { revision: 1 } },
      { session }
    )
    await AgentMessage.deleteMany({ userId }, { session })
    await AgentConversation.deleteMany({ userId }, { session })
    // Include stale/orphan messages, not only conversations still listing us.
    await Message.deleteMany({ senderId: userId }, { session })
    await Message.updateMany({ readBy: userId }, { $pull: { readBy: userId } }, { session })

    const cursor = Conversation.find({
      $or: [{ participants: userId }, { 'participantInfo.id': userId }, { 'lastMessage.senderId': userId }],
    }).session(session).cursor()
    try {
      for await (const conversation of cursor) {
        const conversationId = conversation._id
        if (conversation.participants.every((id) => id === userId)) {
          await Message.deleteMany({ conversationId }, { session })
          await Conversation.deleteOne({ _id: conversationId }, { session })
          continue
        }
        const lastMessage = await Message.findOne({ conversationId })
          .sort({ createdAt: -1, _id: -1 }).session(session).lean()
        await Conversation.updateOne({ _id: conversationId }, {
          $pull: { participants: userId, participantInfo: { id: userId } },
          $set: {
            lastMessage: lastMessage ? {
              text: lastMessage.text,
              senderId: lastMessage.senderId,
              type: lastMessage.attachments?.[0]?.type || 'text',
              createdAt: lastMessage.createdAt,
            } : null,
          },
          $unset: { [`unreadCounts.${userId}`]: '' },
        }, { session })
      }
    } finally {
      await cursor.close()
    }
  }, MONGO_TRANSACTION_OPTIONS)
}