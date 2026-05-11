import mongoose from 'mongoose'

const participantInfoSchema = new mongoose.Schema({
  id:     { type: Number, required: true },
  nombre: { type: String, required: true },
  email:  { type: String, required: true },
  avatar: { type: String, required: true }, // computed initials, e.g. "MG"
}, { _id: false })

const lastMessageSchema = new mongoose.Schema({
  text:      { type: String, default: '' },
  senderId:  { type: Number },
  type:      { type: String, enum: ['text', 'image', 'audio', 'file', 'video'], default: 'text' },
  createdAt: { type: Date },
}, { _id: false })

const conversationSchema = new mongoose.Schema({
  type:            { type: String, enum: ['dm'], default: 'dm' },
  // sorted array of PostgreSQL user IDs
  participants:    [{ type: Number }],
  participantInfo: [participantInfoSchema],
  lastMessage:     lastMessageSchema,
  // key = String(userId), value = unread count
  unreadCounts:    { type: Map, of: Number, default: {} },
}, { timestamps: true })

conversationSchema.index({ participants: 1 })

export default mongoose.model('Conversation', conversationSchema)
