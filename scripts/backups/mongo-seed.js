/* global db, ObjectId */
const data = db.getSiblingDB('kontrol_p2_drill')
const when = new Date('2026-10-25T12:00:00Z')
const conversationId = ObjectId('000000000000000000000001')
const agentId = ObjectId('000000000000000000000002')
data.conversations.insertOne({
  _id: conversationId, type: 'dm', participants: [1, 2],
  participantInfo: [1, 2].map((id) => ({ id, nombre: `P2 Usuario ${id}`, email: `p2-user-${id}@example.test`, avatar: 'P2' })),
  unreadCounts: { 1: 0, 2: 1 },
  lastMessage: { text: 'Mensaje sintético de P2', senderId: 1, type: 'text', createdAt: when },
  createdAt: when, updatedAt: when,
})
data.conversations.createIndex({ participants: 1 })
data.messages.insertOne({
  _id: ObjectId('000000000000000000000003'), conversationId, senderId: 1,
  senderName: 'P2 Usuario 1', senderAvatar: 'P2', text: 'Mensaje sintético de P2',
  attachments: [{ type: 'file', url: 'https://example.test/not-backed-up.pdf', filename: 'sin-copia.pdf' }],
  readBy: [1], createdAt: when, updatedAt: when,
})
data.messages.createIndex({ conversationId: 1 })
data.agent_conversations.insertOne({ _id: agentId, userId: 1, empresaId: 1, title: 'P2 IA', lastMessageAt: when, createdAt: when, updatedAt: when })
data.agent_conversations.createIndex({ userId: 1 })
data.agent_conversations.createIndex({ empresaId: 1 })
data.agent_conversations.createIndex({ userId: 1, lastMessageAt: -1 })
data.agent_messages.insertMany([
  { _id: ObjectId('000000000000000000000004'), conversationId: agentId, userId: 1, empresaId: 1, role: 'user', content: 'Consulta sintética', createdAt: when, updatedAt: when },
  { _id: ObjectId('000000000000000000000005'), conversationId: agentId, userId: 1, empresaId: 1, role: 'assistant', content: 'Respuesta sintética', queries: [], createdAt: when, updatedAt: when },
])
data.agent_messages.createIndex({ conversationId: 1 })
data.agent_messages.createIndex({ userId: 1 })
data.agent_messages.createIndex({ conversationId: 1, createdAt: 1 })
