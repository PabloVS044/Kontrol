import mongoose from 'mongoose'

/**
 * Individual message inside an AgentConversation.
 *
 * Stored in its OWN collection ("agent_messages") — completely separate
 * from human chat messages.
 */
const agentQuerySchema = new mongoose.Schema({
  sql:       { type: String },
  rowCount:  { type: Number },
  error:     { type: String },
  rationale: { type: String },
}, { _id: false })

const agentMessageSchema = new mongoose.Schema({
  conversationId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'AgentConversation',
    required: true,
    index:    true,
  },
  // Denormalized for cheap ownership checks (and pruning on user delete).
  userId:    { type: Number, required: true, index: true },
  empresaId: { type: Number, required: true },

  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },

  // SQL trace for assistant messages (optional, used for transparency).
  queries:   { type: [agentQuerySchema], default: undefined },

  edited:    { type: Boolean, default: false },
}, {
  timestamps: true,
  collection: 'agent_messages',
})

agentMessageSchema.index({ conversationId: 1, createdAt: 1 })

export default mongoose.model('AgentMessage', agentMessageSchema)
