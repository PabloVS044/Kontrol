import mongoose from 'mongoose'
import AgentConversation from '../models/AgentConversation.js'
import AgentMessage from '../models/AgentMessage.js'
import { isMongoReady } from '../db/mongo.js'
import { isAgentConfigured, runAgentTurn } from '../services/aiAgentService.js'

/* ────────────────────────────────────────────────────────────────────────── */

const PERSISTENCE_AVAILABLE = () => isMongoReady()

function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
}

/** Trims a user message into a usable conversation title. */
function deriveTitle(text) {
  const trimmed = (text || '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return 'Nueva conversación'
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed
}

/**
 * Loads a conversation if it belongs to the calling user. Returns null
 * otherwise (caller is expected to respond with 404).
 */
async function loadOwnedConversation(conversationId, userId) {
  if (!isValidObjectId(conversationId)) return null
  const conv = await AgentConversation.findById(conversationId).lean()
  if (!conv || conv.userId !== userId) return null
  return conv
}

function serializeMessage(msg) {
  return {
    _id: String(msg._id),
    conversationId: String(msg.conversationId),
    role: msg.role,
    content: msg.content,
    queries: msg.queries ?? [],
    edited: !!msg.edited,
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt,
  }
}

function serializeConversation(conv) {
  return {
    _id: String(conv._id),
    title: conv.title,
    empresaId: conv.empresaId,
    lastMessageAt: conv.lastMessageAt,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  }
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/agent/chat
 *
 * Body: {
 *   messages: [{ role, content }, ...],   // full client history (last must be user)
 *   conversationId?: string                // existing conversation to append to
 * }
 *
 * Behavior:
 *   1. Resolve/create a conversation scoped to (userId, empresaId).
 *   2. Persist the latest user message immediately (so it survives an abort).
 *   3. Call the agent loop. If the client aborts the HTTP request (Stop
 *      button), abort the upstream LLM fetch and skip saving any assistant
 *      reply — the user message stays.
 *   4. On success, persist the assistant reply and return both ids so the
 *      client can attach actions (edit / remove) to specific messages.
 */
export const chat = async (req, res) => {
  if (!isAgentConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'AI agent is not configured. Set AGENT_API_KEY in backend/.env. AGENT_API_URL is optional and defaults to the ClawStitch Qwen endpoint.',
    })
  }

  const { messages, conversationId } = req.body
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user') {
    return res.status(400).json({
      success: false,
      message: 'The last message must come from the user.',
    })
  }

  const userId = req.user.id_usuario
  const empresaId = req.company.id_empresa
  const persist = PERSISTENCE_AVAILABLE()

  // ── 1) Conversation
  let conversation = null
  if (persist) {
    if (conversationId) {
      conversation = await loadOwnedConversation(conversationId, userId)
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found.' })
      }
    } else {
      conversation = await AgentConversation.create({
        userId,
        empresaId,
        title: deriveTitle(lastMessage.content),
        lastMessageAt: new Date(),
      })
      conversation = conversation.toObject()
    }
  }

  // ── 2) Persist user message
  let savedUserMessage = null
  if (persist) {
    savedUserMessage = await AgentMessage.create({
      conversationId: conversation._id,
      userId,
      empresaId,
      role: 'user',
      content: lastMessage.content,
    })
  }

  // ── 3) Abort plumbing: link the client connection to an AbortController
  const ac = new AbortController()
  const onClose = () => ac.abort()
  req.on('close', onClose)

  try {
    const { answer, queries } = await runAgentTurn({
      history: messages,
      user: {
        id_usuario: userId,
        email: req.user.email,
        nombre_rol: req.user.nombre_rol,
      },
      company: {
        id_empresa: empresaId,
        nombre: req.company.nombre,
        rol_empresa: req.company.rol_empresa,
      },
      signal: ac.signal,
    })

    // ── 4) Persist assistant message
    let savedAssistant = null
    if (persist) {
      savedAssistant = await AgentMessage.create({
        conversationId: conversation._id,
        userId,
        empresaId,
        role: 'assistant',
        content: answer,
        queries,
      })
      await AgentConversation.updateOne(
        { _id: conversation._id },
        { $set: { lastMessageAt: new Date() } }
      )
    }

    return res.json({
      success: true,
      data: {
        conversationId: conversation ? String(conversation._id) : null,
        userMessage: savedUserMessage ? serializeMessage(savedUserMessage) : null,
        assistantMessage: savedAssistant
          ? serializeMessage(savedAssistant)
          : {
              _id: null,
              role: 'assistant',
              content: answer,
              queries,
              edited: false,
            },
        answer,
        queries,
      },
    })
  } catch (err) {
    if (err?.name === 'AbortError' || ac.signal.aborted) {
      // Client cut the request. Don't try to write to res — it's gone.
      return
    }
    console.error('agentController.chat:', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'AI agent failed to respond.',
    })
  } finally {
    req.off('close', onClose)
  }
}

/* ────────────────────────────────────────────────────────────────────────── */

export const status = (_req, res) => {
  return res.json({
    success: true,
    data: {
      configured: isAgentConfigured(),
      persistence: PERSISTENCE_AVAILABLE(),
    },
  })
}

/* ── Conversations CRUD ──────────────────────────────────────────────────── */

/** GET /api/agent/conversations */
export const listConversations = async (req, res) => {
  if (!PERSISTENCE_AVAILABLE()) {
    return res.json({ success: true, data: [] })
  }
  const convs = await AgentConversation.find({
    userId: req.user.id_usuario,
    empresaId: req.company.id_empresa,
  })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .lean()
  return res.json({ success: true, data: convs.map(serializeConversation) })
}

/** GET /api/agent/conversations/:id/messages */
export const getConversationMessages = async (req, res) => {
  if (!PERSISTENCE_AVAILABLE()) {
    return res.status(503).json({ success: false, message: 'Chat history unavailable: MongoDB is not connected.' })
  }
  const conv = await loadOwnedConversation(req.params.id, req.user.id_usuario)
  if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' })

  const messages = await AgentMessage.find({ conversationId: conv._id })
    .sort({ createdAt: 1 })
    .lean()
  return res.json({
    success: true,
    data: {
      conversation: serializeConversation(conv),
      messages: messages.map(serializeMessage),
    },
  })
}

/** DELETE /api/agent/conversations/:id */
export const deleteConversation = async (req, res) => {
  if (!PERSISTENCE_AVAILABLE()) {
    return res.status(503).json({ success: false, message: 'Chat history unavailable: MongoDB is not connected.' })
  }
  const conv = await loadOwnedConversation(req.params.id, req.user.id_usuario)
  if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' })

  await AgentMessage.deleteMany({ conversationId: conv._id })
  await AgentConversation.deleteOne({ _id: conv._id })
  return res.json({ success: true })
}

/* ── Message-level edit / delete ─────────────────────────────────────────── */

async function loadOwnedMessage(messageId, userId) {
  if (!isValidObjectId(messageId)) return null
  const msg = await AgentMessage.findById(messageId)
  if (!msg || msg.userId !== userId) return null
  return msg
}

/** PATCH /api/agent/messages/:id    Body: { content } */
export const updateMessage = async (req, res) => {
  if (!PERSISTENCE_AVAILABLE()) {
    return res.status(503).json({ success: false, message: 'Chat history unavailable: MongoDB is not connected.' })
  }
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  if (!content) {
    return res.status(400).json({ success: false, message: 'Content is required.' })
  }
  if (content.length > 8000) {
    return res.status(400).json({ success: false, message: 'Message too long.' })
  }

  const msg = await loadOwnedMessage(req.params.id, req.user.id_usuario)
  if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' })

  // Only user messages can be edited — editing an assistant message would
  // mean rewriting what the model said, which we don't want.
  if (msg.role !== 'user') {
    return res.status(403).json({ success: false, message: 'Only user messages can be edited.' })
  }

  msg.content = content
  msg.edited = true
  await msg.save()
  return res.json({ success: true, data: serializeMessage(msg) })
}

/** DELETE /api/agent/messages/:id */
export const deleteMessage = async (req, res) => {
  if (!PERSISTENCE_AVAILABLE()) {
    return res.status(503).json({ success: false, message: 'Chat history unavailable: MongoDB is not connected.' })
  }
  const msg = await loadOwnedMessage(req.params.id, req.user.id_usuario)
  if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' })

  await AgentMessage.deleteOne({ _id: msg._id })
  return res.json({ success: true })
}
