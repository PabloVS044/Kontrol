import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import pool from '../db/pool.js'
import {
  buildMessagePreview,
  formatConversation,
  sanitizeAttachments,
  serializeMessage,
} from '../utils/chat.js'

const CHAT_UNAVAILABLE_MESSAGE = 'Chat is unavailable because MongoDB is not connected.'
const CHAT_AVAILABLE_MESSAGE = 'Chat is available again.'

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

async function joinConversationRooms(socket, userId) {
  try {
    const convs = await Conversation.find({ participants: userId }, '_id').lean()
    convs.forEach((conv) => socket.join(`conv:${conv._id}`))
  } catch (err) {
    console.error('socket join rooms error:', err)
  }
}

// ── setup ─────────────────────────────────────────────────────

export function setupSocket(httpServer, { isChatAvailable = () => true } = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  })

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
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET)
      next()
    } catch {
      next(new Error('Invalid or expired token'))
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

        const sorted = [userId, targetUserId].sort((a, b) => a - b)

        // Find or create conversation
        let conv = await Conversation.findOne({ participants: sorted })

        if (!conv) {
          conv = await Conversation.create({
            type: 'dm',
            participants: sorted,
            participantInfo: [
              { id: me.id_usuario, nombre: me.nombre, email: me.email, avatar: initials(me.nombre, me.apellido) },
              { id: other.id_usuario, nombre: other.nombre, email: other.email, avatar: initials(other.nombre, other.apellido) },
            ],
            unreadCounts: new Map([[String(userId), 0], [String(targetUserId), 0]]),
          })
        }

        // Join both users to the room if they're online
        socket.join(`conv:${conv._id}`)
        io.to(`user:${targetUserId}`).socketsJoin(`conv:${conv._id}`)

        emitConversationEvent(io, 'chat:conversation_ready', conv, [userId, targetUserId])
      } catch (err) {
        console.error('chat:start_dm error:', err)
        socket.emit('chat:error', { message: 'Could not start conversation' })
      }
    })

    // ── chat:send ──────────────────────────────────────────────
    // Payload: { conversationId, text?, attachments? }
    socket.on('chat:send', async ({ conversationId, text, attachments }) => {
      try {
        if (!isChatAvailable()) {
          return socket.emit('chat:error', { message: CHAT_UNAVAILABLE_MESSAGE })
        }

        const conv = await Conversation.findById(conversationId)
        if (!conv || !conv.participants.includes(userId)) {
          return socket.emit('chat:error', { message: 'Conversation not found' })
        }

        const cleanAttachments = sanitizeAttachments(attachments)
        const trimmedText = typeof text === 'string' ? text.trim() : ''

        if (!trimmedText && cleanAttachments.length === 0) {
          return socket.emit('chat:error', { message: 'Empty message' })
        }

        const me = await getUserById(userId)
        const msg = await Message.create({
          conversationId,
          senderId:     userId,
          senderName:   me.nombre + (me.apellido ? ' ' + me.apellido : ''),
          senderAvatar: initials(me.nombre, me.apellido),
          text:         trimmedText,
          attachments:  cleanAttachments,
          readBy:       [userId],
        })

        const lastType = cleanAttachments.length ? cleanAttachments[0].type : 'text'

        // Update conversation
        const updatedConv = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            $set: {
              lastMessage: {
                text:      buildMessagePreview({ text: trimmedText, attachments: cleanAttachments }),
                senderId:  userId,
                type:      lastType,
                createdAt: msg.createdAt,
              },
            },
            $inc: Object.fromEntries(
              conv.participants
                .filter(p => p !== userId)
                .map(p => [`unreadCounts.${p}`, 1])
            ),
          },
          { returnDocument: 'after' }
        )

        io.to(`conv:${conversationId}`).emit('chat:message', serializeMessage(msg))

        if (updatedConv) {
          emitConversationEvent(io, 'chat:conversation_updated', updatedConv, conv.participants)
        }
      } catch (err) {
        console.error('chat:send error:', err)
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

        const conv = await Conversation.findById(conversationId)
        if (!conv || !conv.participants.includes(userId)) {
          return
        }

        const updatedConv = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            $set: {
              [`unreadCounts.${userId}`]: 0,
            },
          },
          { returnDocument: 'after' }
        )

        await Message.updateMany(
          { conversationId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        )

        socket.to(`conv:${conversationId}`).emit('chat:read_update', { conversationId, userId })

        if (updatedConv) {
          emitConversationEvent(io, 'chat:conversation_updated', updatedConv, conv.participants)
        }
      } catch (err) {
        console.error('chat:mark_read error:', err)
      }
    })
  })

  return io
}

// ── format conversation for a specific user ─────────────────

export { formatConversation as formatConv }
