import mongoose from 'mongoose'

// Retained technical tombstone; contains no name, email or other profile data.
const schema = new mongoose.Schema({
  _id: { type: Number, required: true },
  deleted: { type: Boolean, required: true, default: false },
  revision: { type: Number, required: true, default: 0 },
}, { versionKey: false, collection: 'account_privacy_states' })

export default mongoose.model('AccountPrivacyState', schema)
