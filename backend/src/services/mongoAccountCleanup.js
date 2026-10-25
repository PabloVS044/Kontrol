import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import AgentConversation from '../models/AgentConversation.js'
import AgentMessage from '../models/AgentMessage.js'

export async function removeMongoAccountData(userId) {
  await AgentMessage.deleteMany({ userId })
  await AgentConversation.deleteMany({ userId })

  for await (const conversation of Conversation.find({ participants: userId }).cursor()) {
    const participants = conversation.participants.filter((participant) => participant !== userId)
    const participantInfo = conversation.participantInfo.filter((participant) => participant.id !== userId)
    const conversationId = conversation._id

    await Message.deleteMany({ conversationId, senderId: userId })
    await Message.updateMany({ conversationId }, { $pull: { readBy: userId } })

    if (participants.length === 0) {
      await Message.deleteMany({ conversationId })
      await Conversation.deleteOne({ _id: conversationId })
      continue
    }

    const lastMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 }).lean()
    const update = {
      $set: {
        participants,
        participantInfo,
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              senderId: lastMessage.senderId,
              type: lastMessage.type,
              createdAt: lastMessage.createdAt,
            }
          : null,
      },
      $unset: { [`unreadCounts.${userId}`]: '' },
    }
    await Conversation.updateOne({ _id: conversationId }, update)
  }
}
