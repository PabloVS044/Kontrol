import mongoose from 'mongoose'

const attachmentSchema = new mongoose.Schema({
  type:     { type: String, enum: ['image', 'audio', 'file', 'video'], required: true },
  url:      { type: String, required: true },
  publicId: String,
  filename: String,
  size:     Number,  // bytes
  mimeType: String,
  duration: Number,  // seconds (audio / video)
  width:    Number,  // px (image / video)
  height:   Number,  // px (image / video)
}, { _id: false })

const messageSchema = new mongoose.Schema({
  conversationId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Conversation',
    required: true,
    index:    true,
  },
  senderId:   { type: Number, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, required: true }, // initials
  text:       { type: String, default: '' },
  attachments:[attachmentSchema],
  readBy:     [{ type: Number }],
}, { timestamps: true })

export default mongoose.model('Message', messageSchema)
