import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { io } from 'socket.io-client'
import { genUploader } from 'uploadthing/client'
import { useAuthStore } from './auth.js'
import {
  getMessagePreview,
  normalizeAttachment,
  normalizeConversation,
  normalizeMessage,
} from '../utils/chat.js'

const API = import.meta.env.VITE_API_URL || window.location.origin
const uploadthing = genUploader({
  url: `${API}/api/uploadthing`,
})

function sortConversations(list) {
  return [...list].sort((left, right) => {
    const leftDate = left.lastMessage?.createdAt ?? left.updatedAt ?? ''
    const rightDate = right.lastMessage?.createdAt ?? right.updatedAt ?? ''
    const leftTime = leftDate ? new Date(leftDate).getTime() : 0
    const rightTime = rightDate ? new Date(rightDate).getTime() : 0
    return rightTime - leftTime
  })
}

function uniqueMessages(list) {
  const seen = new Set()
  return [...list]
    .filter((message) => {
      if (!message._id || seen.has(message._id)) return false
      seen.add(message._id)
      return true
    })
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
      return leftTime - rightTime
    })
}

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()

  const socket = ref(null)
  const isConnected = ref(false)
  const conversations = ref([])
  const messages = ref({})
  const typingUsers = ref({})
  const companyUsers = ref([])
  const lastError = ref('')

  const totalUnread = computed(() =>
    conversations.value.reduce((sum, conversation) => sum + (conversation.unread || 0), 0)
  )

  function clearLastError() {
    lastError.value = ''
  }

  function authHeaders() {
    return authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}
  }

  function currentChatUnavailableMessage() {
    return lastError.value || 'The chat server is unavailable.'
  }

  function upsertConversation(rawConversation) {
    const conversation = normalizeConversation(rawConversation)
    const index = conversations.value.findIndex((item) => item._id === conversation._id)

    if (index === -1) {
      conversations.value = sortConversations([conversation, ...conversations.value])
      return conversation
    }

    const nextList = [...conversations.value]
    nextList[index] = {
      ...nextList[index],
      ...conversation,
    }
    conversations.value = sortConversations(nextList)
    return nextList[index]
  }

  function mergeMessages(conversationId, incomingMessages, prepend = false) {
    const current = messages.value[conversationId] ?? []
    const merged = prepend
      ? [...incomingMessages, ...current]
      : [...current, ...incomingMessages]

    messages.value = {
      ...messages.value,
      [conversationId]: uniqueMessages(merged),
    }

    return messages.value[conversationId]
  }

  async function apiFetch(path, opts = {}) {
    const response = await fetch(`${API}/api/chat${path}`, {
      ...opts,
      headers: {
        ...authHeaders(),
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...opts.headers,
      },
    })

    const payload = await response.json().catch(() => ({
      success: false,
      message: 'Invalid server response.',
    }))

    if (!response.ok) {
      throw new Error(payload.message || 'Chat request failed.')
    }

    return payload
  }

  function handleIncomingConversation(rawConversation) {
    if (!rawConversation) return null
    clearLastError()
    return upsertConversation(rawConversation)
  }

  function handleIncomingMessage(rawMessage) {
    const message = normalizeMessage(rawMessage)
    if (!message._id || !message.conversationId) return null

    clearLastError()

    mergeMessages(message.conversationId, [message])

    const conversation = conversations.value.find((item) => item._id === message.conversationId)
    if (conversation) {
      conversation.lastMessage = {
        text: getMessagePreview(message),
        senderId: message.senderId,
        type: message.attachments[0]?.type ?? 'text',
        createdAt: message.createdAt,
      }

      if (message.senderId !== authStore.user?.id_usuario) {
        conversation.unread = Number(conversation.unread || 0) + 1
      }

      conversations.value = sortConversations(conversations.value)
    } else {
      void loadConversations()
    }

    return message
  }

  function connect() {
    if (!authStore.token || socket.value) return

    lastError.value = ''

    socket.value = io(API, {
      auth: { token: authStore.token },
      withCredentials: true,
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      clearLastError()
      void loadConversations()
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
    })

    socket.value.on('connect_error', (error) => {
      isConnected.value = false
      lastError.value = error?.message || 'The chat server is unavailable.'
    })

    socket.value.on('chat:message', (message) => {
      handleIncomingMessage(message)
    })

    socket.value.on('chat:conversation_ready', ({ conversation }) => {
      handleIncomingConversation(conversation)
    })

    socket.value.on('chat:conversation_updated', ({ conversation }) => {
      handleIncomingConversation(conversation)
    })

    socket.value.on('chat:typing', ({ userId, conversationId }) => {
      if (!typingUsers.value[conversationId]) {
        typingUsers.value[conversationId] = new Set()
      }
      typingUsers.value[conversationId].add(userId)
    })

    socket.value.on('chat:stop_typing', ({ userId, conversationId }) => {
      typingUsers.value[conversationId]?.delete(userId)
    })

    socket.value.on('chat:read_update', ({ conversationId, userId }) => {
      clearLastError()

      const currentMessages = messages.value[conversationId] ?? []
      if (!currentMessages.length) return

      messages.value = {
        ...messages.value,
        [conversationId]: currentMessages.map((message) => (
          message.senderId === authStore.user?.id_usuario && !message.readBy.includes(userId)
            ? { ...message, readBy: [...message.readBy, userId] }
            : message
        )),
      }
    })

    socket.value.on('chat:error', ({ message }) => {
      lastError.value = message || 'Chat socket error.'
      console.error('Socket chat error:', message)
    })

    socket.value.on('chat:unavailable', ({ message }) => {
      lastError.value = message || 'Chat is unavailable.'
    })

    socket.value.on('chat:available', () => {
      clearLastError()
      void loadConversations()
    })
  }

  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    isConnected.value = false
    conversations.value = []
    messages.value = {}
    typingUsers.value = {}
    companyUsers.value = []
    lastError.value = ''
  }

  async function loadConversations() {
    try {
      const response = await apiFetch('/conversations')
      conversations.value = sortConversations(
        Array.isArray(response.data) ? response.data.map(normalizeConversation) : []
      )
      lastError.value = ''
      return response
    } catch (error) {
      lastError.value = error.message
      return { success: false, message: error.message }
    }
  }

  async function loadMessages(conversationId, before = null) {
    try {
      const query = before ? `?before=${encodeURIComponent(before)}` : ''
      const response = await apiFetch(`/conversations/${conversationId}/messages${query}`)
      const normalized = Array.isArray(response.data)
        ? response.data.map(normalizeMessage)
        : []

      mergeMessages(conversationId, normalized, Boolean(before))
      lastError.value = ''
      return response
    } catch (error) {
      lastError.value = error.message
      return { success: false, message: error.message }
    }
  }

  async function loadCompanyUsers() {
    try {
      const response = await apiFetch('/users')
      companyUsers.value = Array.isArray(response.data) ? response.data : []
      lastError.value = ''
      return response
    } catch (error) {
      lastError.value = error.message
      return { success: false, message: error.message }
    }
  }

  function startDM(targetUserId) {
    const existing = conversations.value.find((conversation) => conversation.otherUserId === targetUserId)
    if (existing) return Promise.resolve(existing)

    if (!socket.value?.connected) {
      connect()
    }

    if (!socket.value) {
      return Promise.resolve(null)
    }

    return new Promise((resolve, reject) => {
      clearLastError()

      const timeoutId = window.setTimeout(() => {
        cleanup()
        reject(new Error(lastError.value || 'The conversation could not be created.'))
      }, 10000)

      const cleanup = () => {
        window.clearTimeout(timeoutId)
        socket.value?.off('chat:conversation_ready', onReady)
        socket.value?.off('chat:error', onError)
      }

      const onReady = ({ conversation }) => {
        const normalized = handleIncomingConversation(conversation)
        if (!normalized || normalized.otherUserId !== targetUserId) return
        cleanup()
        resolve(normalized)
      }

      const onError = ({ message }) => {
        cleanup()
        reject(new Error(message || 'The conversation could not be created.'))
      }

      socket.value.on('chat:conversation_ready', onReady)
      socket.value.on('chat:error', onError)
      socket.value.emit('chat:start_dm', { targetUserId })
    })
  }

  function sendMessage({ conversationId, text = '', attachments = [] }) {
    if (!socket.value?.connected) {
      lastError.value = currentChatUnavailableMessage()
      return false
    }

    const normalizedAttachments = attachments
      .map(normalizeAttachment)
      .filter(Boolean)

    const trimmedText = typeof text === 'string' ? text.trim() : ''
    if (!trimmedText && normalizedAttachments.length === 0) return false

    clearLastError()
    socket.value.emit('chat:send', {
      conversationId,
      text: trimmedText,
      attachments: normalizedAttachments,
    })

    return true
  }

  function emitTyping(conversationId) {
    if (!conversationId) return
    socket.value?.emit('chat:typing', { conversationId })
  }

  function emitStopTyping(conversationId) {
    if (!conversationId) return
    socket.value?.emit('chat:stop_typing', { conversationId })
  }

  function markRead(conversationId) {
    if (!conversationId) return

    socket.value?.emit('chat:mark_read', { conversationId })

    const conversation = conversations.value.find((item) => item._id === conversationId)
    if (conversation) {
      conversation.unread = 0
    }
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList ?? []).filter(Boolean)
    if (!files.length) {
      return { success: false, message: 'No files selected.' }
    }

    if (!socket.value?.connected) {
      const message = currentChatUnavailableMessage()
      lastError.value = message
      return { success: false, message }
    }

    try {
      const uploaded = await uploadthing.uploadFiles('chatAttachment', {
        files,
        headers: () => authHeaders(),
      })

      const attachments = uploaded
        .map((item) => normalizeAttachment(item?.serverData))
        .filter(Boolean)

      if (!attachments.length) {
        return { success: false, message: 'No attachment data was returned.' }
      }

      lastError.value = ''
      return { success: true, data: attachments }
    } catch (error) {
      console.error('UploadThing upload error:', error)
      const message = error?.message || 'Upload failed.'
      lastError.value = message
      return { success: false, message }
    }
  }

  async function uploadFile(file) {
    const response = await uploadFiles(file ? [file] : [])
    if (!response.success) return response

    return {
      success: true,
      data: response.data[0] ?? null,
    }
  }

  return {
    socket,
    isConnected,
    conversations,
    messages,
    typingUsers,
    companyUsers,
    lastError,
    totalUnread,
    connect,
    disconnect,
    loadConversations,
    loadMessages,
    loadCompanyUsers,
    startDM,
    sendMessage,
    emitTyping,
    emitStopTyping,
    markRead,
    uploadFiles,
    uploadFile,
  }
})
