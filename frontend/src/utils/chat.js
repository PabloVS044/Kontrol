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

export function normalizeAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object') return null

  const url = typeof attachment.url === 'string' ? attachment.url.trim() : ''
  if (!url) return null

  return {
    type: typeof attachment.type === 'string' ? attachment.type : 'file',
    url,
    publicId: typeof attachment.publicId === 'string' ? attachment.publicId : '',
    filename: typeof attachment.filename === 'string' && attachment.filename.trim()
      ? attachment.filename.trim()
      : 'Archivo',
    size: toPositiveNumber(attachment.size),
    mimeType: typeof attachment.mimeType === 'string' ? attachment.mimeType : '',
    duration: toPositiveNumber(attachment.duration),
    width: toPositiveNumber(attachment.width),
    height: toPositiveNumber(attachment.height),
  }
}

export function getMessagePreview({ text = '', attachments = [] }) {
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

export function normalizeMessage(message) {
  const rawAttachments = Array.isArray(message?.attachments)
    ? message.attachments
    : (message?.attachment ? [message.attachment] : [])

  const attachments = rawAttachments
    .map(normalizeAttachment)
    .filter(Boolean)

  return {
    _id: String(message?._id ?? ''),
    conversationId: String(message?.conversationId ?? ''),
    senderId: Number(message?.senderId),
    senderName: message?.senderName ?? '',
    senderAvatar: message?.senderAvatar ?? '??',
    text: message?.text ?? '',
    attachments,
    readBy: Array.isArray(message?.readBy)
      ? message.readBy.map(Number).filter(Number.isFinite)
      : [],
    createdAt: normalizeDate(message?.createdAt),
    updatedAt: normalizeDate(message?.updatedAt),
  }
}

export function normalizeConversation(conversation) {
  return {
    _id: String(conversation?._id ?? ''),
    type: conversation?.type ?? 'dm',
    name: conversation?.name ?? 'Usuario',
    avatar: conversation?.avatar ?? '??',
    email: conversation?.email ?? '',
    otherUserId: Number(conversation?.otherUserId ?? 0) || null,
    lastMessage: conversation?.lastMessage
      ? {
          text: conversation.lastMessage.text ?? '',
          senderId: Number(conversation.lastMessage.senderId ?? 0) || null,
          type: conversation.lastMessage.type ?? 'text',
          createdAt: normalizeDate(conversation.lastMessage.createdAt),
        }
      : null,
    unread: Number(conversation?.unread ?? 0) || 0,
    updatedAt: normalizeDate(conversation?.updatedAt),
  }
}

export function formatFileSize(bytes) {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
