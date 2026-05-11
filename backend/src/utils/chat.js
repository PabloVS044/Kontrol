const ATTACHMENT_TYPES = new Set(['image', 'audio', 'video', 'file'])

const ATTACHMENT_LABELS = {
  image: 'Imagen',
  audio: 'Audio',
  video: 'Video',
  file: 'Archivo',
}

function normalizeDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function toPositiveNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export function sanitizeAttachment(input) {
  if (!input || typeof input !== 'object') return null

  const type = typeof input.type === 'string' && ATTACHMENT_TYPES.has(input.type)
    ? input.type
    : 'file'

  const url = typeof input.url === 'string' ? input.url.trim() : ''
  if (!url) return null

  return {
    type,
    url,
    publicId: typeof input.publicId === 'string' ? input.publicId : undefined,
    filename: typeof input.filename === 'string' && input.filename.trim()
      ? input.filename.trim()
      : 'Archivo',
    size: toPositiveNumber(input.size),
    mimeType: typeof input.mimeType === 'string' ? input.mimeType : undefined,
    duration: toPositiveNumber(input.duration),
    width: toPositiveNumber(input.width),
    height: toPositiveNumber(input.height),
  }
}

export function sanitizeAttachments(input) {
  if (!Array.isArray(input)) return []
  return input
    .map(sanitizeAttachment)
    .filter(Boolean)
}

export function buildMessagePreview({ text = '', attachments = [] }) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (trimmed) return trimmed

  if (attachments.length === 1) {
    return `[${ATTACHMENT_LABELS[attachments[0].type] ?? ATTACHMENT_LABELS.file}]`
  }

  if (attachments.length > 1) {
    return `[${attachments.length} adjuntos]`
  }

  return ''
}

export function serializeMessage(message) {
  const source = typeof message?.toObject === 'function' ? message.toObject() : message
  const attachments = sanitizeAttachments(source?.attachments)

  return {
    _id: String(source?._id),
    conversationId: String(source?.conversationId),
    senderId: Number(source?.senderId),
    senderName: source?.senderName ?? '',
    senderAvatar: source?.senderAvatar ?? '??',
    text: source?.text ?? '',
    attachments,
    readBy: Array.isArray(source?.readBy)
      ? source.readBy.map(Number).filter(Number.isFinite)
      : [],
    createdAt: normalizeDate(source?.createdAt),
    updatedAt: normalizeDate(source?.updatedAt),
  }
}

function unreadForUser(conv, userId) {
  const key = String(userId)

  if (conv?.unreadCounts instanceof Map) {
    return Number(conv.unreadCounts.get(key) ?? 0)
  }

  if (conv?.unreadCounts && typeof conv.unreadCounts === 'object') {
    return Number(conv.unreadCounts[key] ?? 0)
  }

  return 0
}

export function formatConversation(conv, userId) {
  const source = typeof conv?.toObject === 'function' ? conv.toObject() : conv
  const other = source?.participantInfo?.find((participant) => participant.id !== userId)
  const lastMessage = source?.lastMessage
    ? {
        text: source.lastMessage.text ?? '',
        senderId: Number(source.lastMessage.senderId ?? 0) || null,
        type: source.lastMessage.type ?? 'text',
        createdAt: normalizeDate(source.lastMessage.createdAt),
      }
    : null

  return {
    _id: String(source?._id),
    type: source?.type ?? 'dm',
    name: other?.nombre ?? 'Usuario',
    avatar: other?.avatar ?? '??',
    email: other?.email ?? '',
    otherUserId: Number(other?.id ?? 0) || null,
    lastMessage,
    unread: unreadForUser(source, userId),
    updatedAt: normalizeDate(source?.updatedAt),
  }
}
