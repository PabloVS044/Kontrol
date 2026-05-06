import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import pool from '../db/pool.js'
import { isMongoReady } from '../db/mongo.js'
import { formatConv } from '../socket/index.js'
import { serializeMessage } from '../utils/chat.js'

function ensureChatAvailable(res) {
  if (isMongoReady()) return true

  res.status(503).json({
    success: false,
    message: 'Chat is unavailable because MongoDB is not connected.',
  })
  return false
}

// ── GET /api/chat/conversations ───────────────────────────────
export async function getConversations(req, res) {
  if (!ensureChatAvailable(res)) return

  try {
    const userId = req.user.id_usuario
    const convs = await Conversation
      .find({ participants: userId })
      .sort({ updatedAt: -1 })
      .lean()

    res.json({ success: true, data: convs.map(c => formatConv(c, userId)) })
  } catch (err) {
    console.error('getConversations:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── GET /api/chat/conversations/:id/messages ──────────────────
export async function getMessages(req, res) {
  if (!ensureChatAvailable(res)) return

  try {
    const userId = req.user.id_usuario
    const { id } = req.params
    const limit  = Math.min(parseInt(req.query.limit) || 50, 100)
    const before = req.query.before // ISO date for cursor pagination

    const conv = await Conversation.findById(id).lean()
    if (!conv || !conv.participants.includes(userId)) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }

    const query = { conversationId: id }
    if (before) query.createdAt = { $lt: new Date(before) }

    const messages = await Message
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    res.json({ success: true, data: messages.reverse().map(serializeMessage) })
  } catch (err) {
    console.error('getMessages:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── GET /api/chat/users ───────────────────────────────────────
// Returns all active users in the same company, excluding self
export async function getCompanyUsers(req, res) {
  try {
    const userId = req.user.id_usuario

    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email
       FROM public.usuario u
       JOIN public.empresa_usuario eu ON u.id_usuario = eu.id_usuario
       WHERE eu.id_empresa = (
         SELECT id_empresa FROM public.empresa_usuario WHERE id_usuario = $1 LIMIT 1
       )
       AND u.id_usuario != $1
       AND u.activo = true
       ORDER BY u.nombre`,
      [userId]
    )

    const users = rows.map(u => ({
      id:     u.id_usuario,
      nombre: u.nombre,
      apellido: u.apellido,
      email:  u.email,
      avatar: ((u.nombre?.[0] ?? '') + (u.apellido?.[0] ?? '')).toUpperCase() || '??',
    }))

    res.json({ success: true, data: users })
  } catch (err) {
    console.error('getCompanyUsers:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
