import mongoose from 'mongoose'

/**
 * Conversation between a single user and the Kontrol AI agent.
 *
 * Stored in its OWN collection ("agent_conversations") so it never mixes
 * with the human-to-human chat conversations in "conversations".
 */
const agentConversationSchema = new mongoose.Schema({
  // PostgreSQL id_usuario of the owner — only this user can read/edit it.
  userId:    { type: Number, required: true, index: true },
  // PostgreSQL id_empresa the conversation is scoped to.
  empresaId: { type: Number, required: true, index: true },
  title:     { type: String, default: 'Nueva conversación' },
  lastMessageAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'agent_conversations',
})

agentConversationSchema.index({ userId: 1, lastMessageAt: -1 })

export default mongoose.model('AgentConversation', agentConversationSchema)
