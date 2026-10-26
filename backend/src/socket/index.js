import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import { createDirectConversation, persistHumanMessage, markConversationRead } from '../services/chatPersistence.js'
import pool from '../db/pool.js'
import { isSessionTokenPayload } from '../auth/sessionToken.js'
import {
  formatConversation,
  sanitizeAttachments,
  serializeMessage,
} from '../utils/chat.js'
import { logger } from '../utils/logger.js'

const CHAT_UNAVAILABLE_MESSAGE = 'Chat is unavailable because MongoDB is not connected.'
const CHAT_AVAILABLE_MESSAGE = 'Chat is available again.'
const CALL_DM_ONLY_MESSAGE = 'Only direct video calls are supported.'
const CALL_TARGET_OFFLINE_MESSAGE = 'The other user is not connected to the chat.'
const CALL_START_ERROR_MESSAGE = 'Could not start video call.'
const CALL_SIGNAL_ERROR_MESSAGE = 'Could not deliver call signaling data.'
let socketServer = null

// ── helpers ──────────────────────────────────────────────────

function initials(nombre = '', apellido = '') {
  const a = (nombre[0] ?? '').toUpperCase()
  const b = (apellido[0] ?? '').toUpperCase()
  return (a + b) || '??'
}

async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id_usuario, nombre, apellido, email FROM public.usuario WHERE id_usuario = $1',
    [id]
  )
  return rows[0] ?? null
}

function buildDisplayName(user) {
  if (!user) return 'Usuario'
  return [user.nombre, user.apellido].filter(Boolean).join(' ').trim() || user.email || 'Usuario'
}

async function usersShareCompany(userA, userB) {
  const { rows } = await pool.query(
    `SELECT 1
       FROM public.empresa_usuario a
       JOIN public.empresa_usuario b
         ON a.id_empresa = b.id_empresa
      WHERE a.id_usuario = $1
        AND b.id_usuario = $2
      LIMIT 1`,
    [userA, userB]
  )

  return rows.length > 0
}

function emitConversationEvent(io, eventName, conv, participantIds) {
  participantIds.forEach((participantId) => {
    io.to(`user:${participantId}`).emit(eventName, {
      conversation: formatConversation(conv, participantId),
    })
  })
}

function emitToUsers(io, participantIds, eventName, payload, excludedUserId = null) {
  participantIds
    .filter((participantId) => participantId !== excludedUserId)
    .forEach((participantId) => {
      io.to(`user:${participantId}`).emit(eventName, payload)
    })
}

function getOtherParticipantId(conv, userId) {
  return Array.isArray(conv?.participants)
    ? conv.participants.find((participantId) => participantId !== userId) ?? null
    : null
}

function isUserOnline(io, userId) {
  const room = io.sockets.adapter.rooms.get(`user:${userId}`)
  return Boolean(room?.size)
}

async function getDirectConversationForUser(conversationId, userId) {
  const conv = await Conversation.findById(conversationId).lean()
  if (!conv || !conv.participants.includes(userId)) {
    return { conv: null, error: 'Conversation not found.' }
  }

  if (conv.type !== 'dm' || conv.participants.length !== 2) {
    return { conv: null, error: CALL_DM_ONLY_MESSAGE }
  }

  return { conv, error: null }
}

async function joinConversationRooms(socket, userId) {
  try {
    const convs = await Conversation.find({ participants: userId }, '_id').lean()
    convs.forEach((conv) => socket.join(`conv:${conv._id}`))
  } catch (err) {
    logger.error('socket join rooms error:', err)
  }
}

// ── setup ─────────────────────────────────────────────────────

export function setupSocket(httpServer, { isChatAvailable = () => true, corsOrigin } = {}) {
  const fallbackOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin || fallbackOrigin,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  })
  socketServer = io

  mongoose.connection.on('connected', () => {
    io.emit('chat:available', { message: CHAT_AVAILABLE_MESSAGE })

    if (!isChatAvailable()) return

    for (const socket of io.sockets.sockets.values()) {
      const userId = socket.user?.id_usuario
      if (!userId) continue
      void joinConversationRooms(socket, userId)
    }
  })

  mongoose.connection.on('disconnected', () => {
    io.emit('chat:unavailable', { message: CHAT_UNAVAILABLE_MESSAGE })
  })

  // Auth middleware: validate JWT on handshake
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      if (!isSessionTokenPayload(payload)) return next(new Error('Invalid or expired token'))
      const account = await pool.query(
        'SELECT activo, token_version FROM public.usuario WHERE id_usuario = $1',
        [payload.id_usuario]
      )
      const row = account.rows[0]
      if (!row?.activo || row.token_version !== payload.token_version) {
        return next(new Error('Account is unavailable'))
      }
      socket.user = payload
      next()
    } catch (error) {
      next(error instanceof jwt.JsonWebTokenError
        ? new Error('Invalid or expired token')
        : error)
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.user.id_usuario

    // Personal room so we can push events to this user from anywhere
    socket.join(`user:${userId}`)

    if (!isChatAvailable()) {
      socket.emit('chat:unavailable', { message: CHAT_UNAVAILABLE_MESSAGE })
    } else {
      await joinConversationRooms(socket, userId)
    }

    // ── chat:start_dm ──────────────────────────────────────────
    // Payload: { targetUserId: Number }
    socket.on('chat:start_dm', async ({ targetUserId }) => {
      try {
        if (!isChatAvailable()) {
          return socket.emit('chat:error', { message: CHAT_UNAVAILABLE_MESSAGE })
        }

        if (!targetUserId || targetUserId === userId) {
          return socket.emit('chat:error', { message: 'Invalid target user' })
        }

        const allowed = await usersShareCompany(userId, targetUserId)
        if (!allowed) {
          return socket.emit('chat:error', { message: 'You can only chat with users from your company.' })
        }

        // Fetch both users from PostgreSQL
        const [me, other] = await Promise.all([
          getUserById(userId),
          getUserById(targetUserId),
        ])
        if (!me || !other) {
          return socket.emit('chat:error', { message: 'User not found' })
        }

        const conv = await createDirectConversation([
          { id: me.id_usuario, nombre: me.nombre, email: me.email, avatar: initials(me.nombre, me.apellido) },
          { id: other.id_usuario, nombre: other.nombre, email: other.email, avatar: initials(other.nombre, other.apellido) },
        ])

        // Join both users to the room if they're online
        socket.join(`conv:${conv._id}`)
        io.to(`user:${targetUserId}`).socketsJoin(`conv:${conv._id}`)

        emitConversationEvent(io, 'chat:conversation_ready', conv, [userId, targetUserId])
      } catch (err) {
        logger.error('chat:start_dm error:', err)
        socket.emit('chat:error', { message: 'Could not start conversation' })
      }
    })

    // ── call:invite ───────────────────────────────────────────
    socket.on('call:invite', async ({ conversationId }) => {
      try {
        if (!isChatAvailable()) {
          return socket.emit('call:error', { conversationId, message: CHAT_UNAVAILABLE_MESSAGE })
        }

        const { conv, error } = await getDirectConversationForUser(conversationId, userId)
        if (!conv) {
          return socket.emit('call:error', { conversationId, message: error || CALL_START_ERROR_MESSAGE })
        }

        const targetUserId = getOtherParticipantId(conv, userId)
        if (!targetUserId) {
          return socket.emit('call:error', { conversationId, message: CALL_START_ERROR_MESSAGE })
        }

        if (!isUserOnline(io, targetUserId)) {
          return socket.emit('call:error', { conversationId, message: CALL_TARGET_OFFLINE_MESSAGE })
        }

        const me = await getUserById(userId)

        io.to(`user:${targetUserId}`).emit('call:incoming', {
          conversationId: String(conv._id),
          fromUserId: userId,
          fromName: buildDisplayName(me),
          fromAvatar: initials(me?.nombre, me?.apellido),
        })

        socket.emit('call:ringing', {
          conversationId: String(conv._id),
          targetUserId,
        })
      } catch (err) {
        logger.error('call:invite error:', err)
        socket.emit('call:error', { conversationId, message: CALL_START_ERROR_MESSAGE })
      }
    })

    // ── call:answer ───────────────────────────────────────────
    socket.on('call:answer', async ({ conversationId }) => {
      try {
        if (!isChatAvailable()) {
          return socket.emit('call:error', { conversationId, message: CHAT_UNAVAILABLE_MESSAGE })
        }

        const { conv, error } = await getDirectConversationForUser(conversationId, userId)
        if (!conv) {
          return socket.emit('call:error', { conversationId, message: error || CALL_START_ERROR_MESSAGE })
        }

        const me = await getUserById(userId)
        emitToUsers(io, conv.participants, 'call:accepted', {
          conversationId: String(conv._id),
          byUserId: userId,
          byName: buildDisplayName(me),
        }, userId)
      } catch (err) {
        logger.error('call:answer error:', err)
        socket.emit('call:error', { conversationId, message: CALL_START_ERROR_MESSAGE })
      }
    })

    // ── call:decline ──────────────────────────────────────────
    socket.on('call:decline', async ({ conversationId, reason }) => {
      try {
        const { conv } = await getDirectConversationForUser(conversationId, userId)
        if (!conv) return

        emitToUsers(io, conv.participants, 'call:declined', {
          conversationId: String(conv._id),
          byUserId: userId,
          reason: reason === 'busy' ? 'busy' : 'declined',
        }, userId)
      } catch (err) {
        logger.error('call:decline error:', err)
      }
    })

    // ── call:end ──────────────────────────────────────────────
    socket.on('call:end', async ({ conversationId }) => {
      try {
        const { conv } = await getDirectConversationForUser(conversationId, userId)
        if (!conv) return

        emitToUsers(io, conv.participants, 'call:ended', {
          conversationId: String(conv._id),
          byUserId: userId,
        }, userId)
      } catch (err) {
        logger.error('call:end error:', err)
      }
    })

    // ── call:signal ───────────────────────────────────────────
    socket.on('call:signal', async ({ conversationId, description, candidate }) => {
      try {
        if (!description && !candidate) return

        if (!isChatAvailable()) {
          return socket.emit('call:error', { conversationId, message: CHAT_UNAVAILABLE_MESSAGE })
        }

        const { conv, error } = await getDirectConversationForUser(conversationId, userId)
        if (!conv) {
          return socket.emit('call:error', { conversationId, message: error || CALL_SIGNAL_ERROR_MESSAGE })
        }

        emitToUsers(io, conv.participants, 'call:signal', {
          conversationId: String(conv._id),
          fromUserId: userId,
          description: description ?? null,
          candidate: candidate ?? null,
        }, userId)
      } catch (err) {
        logger.error('call:signal error:', err)
        socket.emit('call:error', { conversationId, message: CALL_SIGNAL_ERROR_MESSAGE })
      }
    })

    // ── chat:send ──────────────────────────────────────────────
    // Payload: { conversationId, text?, attachments? }
    socket.on('chat:send', async ({ conversationId, text, attachments }) => {
      try {
        if (!isChatAvailable()) {
          return socket.emit('chat:error', { message: CHAT_UNAVAILABLE_MESSAGE })
        }

        const cleanAttachments = sanitizeAttachments(attachments)
        const trimmedText = typeof text === 'string' ? text.trim() : ''

        if (!trimmedText && cleanAttachments.length === 0) {
          return socket.emit('chat:error', { message: 'Empty message' })
        }

        const me = await getUserById(userId)
        const { message: msg, conversation: updatedConv } = await persistHumanMessage({
          userId, conversationId,
          senderName: me.nombre + (me.apellido ? ' ' + me.apellido : ''),
          senderAvatar: initials(me.nombre, me.apellido),
          text: trimmedText, attachments: cleanAttachments,
        })

        io.to(`conv:${conversationId}`).emit('chat:message', serializeMessage(msg))

        if (updatedConv) {
          emitConversationEvent(io, 'chat:conversation_updated', updatedConv, updatedConv.participants)
        }
      } catch (err) {
        logger.error('chat:send error:', err)
        socket.emit('chat:error', { message: 'Could not send message' })
      }
    })

    // ── chat:typing ────────────────────────────────────────────
    socket.on('chat:typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('chat:typing', { userId, conversationId })
    })

    socket.on('chat:stop_typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('chat:stop_typing', { userId, conversationId })
    })

    // ── chat:mark_read ─────────────────────────────────────────
    socket.on('chat:mark_read', async ({ conversationId }) => {
      try {
        if (!isChatAvailable()) {
          return
        }

        const updatedConv = await markConversationRead(userId, conversationId)

        socket.to(`conv:${conversationId}`).emit('chat:read_update', { conversationId, userId })

        if (updatedConv) {
          emitConversationEvent(io, 'chat:conversation_updated', updatedConv, updatedConv.participants)
        }
      } catch (err) {
        logger.error('chat:mark_read error:', err)
      }
    })
  })

  return io
}

export function disconnectUserSockets(userId) {
  socketServer?.in(`user:${userId}`).disconnectSockets(true)
}

// ── format conversation for a specific user ─────────────────

export { formatConversation as formatConv }
