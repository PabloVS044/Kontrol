import { describe, it, expect } from 'vitest'
import {
  normalizeAttachment,
  getMessagePreview,
  normalizeMessage,
  normalizeConversation,
  formatFileSize,
} from '@/utils/chat.js'

describe('normalizeAttachment', () => {
  it('descarta valores que no son objeto o no traen URL', () => {
    expect(normalizeAttachment(null)).toBeNull()
    expect(normalizeAttachment('https://x')).toBeNull()
    expect(normalizeAttachment({})).toBeNull()
    expect(normalizeAttachment({ url: '   ' })).toBeNull()
    expect(normalizeAttachment({ url: 42 })).toBeNull()
  })

  it('normaliza un adjunto completo y recorta URL y nombre', () => {
    expect(
      normalizeAttachment({
        type: 'image',
        url: '  https://cdn/x.png  ',
        publicId: 'abc',
        filename: '  foto.png ',
        size: '2048',
        mimeType: 'image/png',
        duration: 0,
        width: 800,
        height: '600',
      })
    ).toEqual({
      type: 'image',
      url: 'https://cdn/x.png',
      publicId: 'abc',
      filename: 'foto.png',
      size: 2048,
      mimeType: 'image/png',
      duration: 0,
      width: 800,
      height: 600,
    })
  })

  it('aplica valores por defecto cuando los campos faltan o son inválidos', () => {
    expect(
      normalizeAttachment({ url: 'https://x', type: 7, filename: '   ', size: -1, width: 'abc' })
    ).toEqual({
      type: 'file',
      url: 'https://x',
      publicId: '',
      filename: 'Archivo',
      size: undefined,
      mimeType: '',
      duration: undefined,
      width: undefined,
      height: undefined,
    })
  })
})

describe('getMessagePreview', () => {
  it('prefiere el texto recortado', () => {
    expect(getMessagePreview({ text: '  hola  ', attachments: [{ type: 'image' }] })).toBe('hola')
  })

  it('etiqueta un único adjunto por tipo, con Archivo como respaldo', () => {
    expect(getMessagePreview({ attachments: [{ type: 'audio' }] })).toBe('[Audio]')
    expect(getMessagePreview({ attachments: [{ type: 'raro' }] })).toBe('[Archivo]')
  })

  it('cuenta varios adjuntos', () => {
    expect(getMessagePreview({ text: '', attachments: [{}, {}, {}] })).toBe('[3 adjuntos]')
  })

  it('devuelve cadena vacía sin texto ni adjuntos, aunque el texto no sea string', () => {
    expect(getMessagePreview({})).toBe('')
    expect(getMessagePreview({ text: 5, attachments: [] })).toBe('')
  })
})

describe('normalizeMessage', () => {
  it('normaliza un mensaje con lista de adjuntos y fechas válidas', () => {
    const msg = normalizeMessage({
      _id: 10,
      conversationId: 3,
      senderId: '7',
      senderName: 'Ana',
      senderAvatar: 'AM',
      text: 'hola',
      attachments: [{ url: 'https://a' }, { url: '' }],
      readBy: ['1', 'x', 2],
      createdAt: '2026-10-11T10:00:00Z',
      updatedAt: new Date('2026-10-11T11:00:00Z'),
    })

    expect(msg).toMatchObject({
      _id: '10',
      conversationId: '3',
      senderId: 7,
      senderName: 'Ana',
      senderAvatar: 'AM',
      text: 'hola',
      readBy: [1, 2],
      createdAt: '2026-10-11T10:00:00.000Z',
      updatedAt: '2026-10-11T11:00:00.000Z',
    })
    expect(msg.attachments).toHaveLength(1)
    expect(msg.attachments[0].url).toBe('https://a')
  })

  it('acepta el formato antiguo de un solo `attachment`', () => {
    const msg = normalizeMessage({ attachment: { url: 'https://b', type: 'video' } })
    expect(msg.attachments.map((a) => a.type)).toEqual(['video'])
  })

  it('rellena valores por defecto con un mensaje vacío y fechas inválidas', () => {
    const msg = normalizeMessage({ createdAt: 'no-es-fecha' })
    expect(msg).toMatchObject({
      _id: '',
      conversationId: '',
      senderName: '',
      senderAvatar: '??',
      text: '',
      attachments: [],
      readBy: [],
      createdAt: null,
      updatedAt: null,
    })
    expect(Number.isNaN(msg.senderId)).toBe(true)
    expect(normalizeMessage(undefined).attachments).toEqual([])
  })
})

describe('normalizeConversation', () => {
  it('normaliza una conversación con último mensaje', () => {
    expect(
      normalizeConversation({
        _id: 1,
        type: 'group',
        name: 'Equipo',
        avatar: 'EQ',
        email: 'e@x.dev',
        otherUserId: '9',
        lastMessage: { text: 'ok', senderId: '9', type: 'image', createdAt: '2026-10-11T00:00:00Z' },
        unread: '4',
        updatedAt: '2026-10-11T00:00:00Z',
      })
    ).toEqual({
      _id: '1',
      type: 'group',
      name: 'Equipo',
      avatar: 'EQ',
      email: 'e@x.dev',
      otherUserId: 9,
      lastMessage: { text: 'ok', senderId: 9, type: 'image', createdAt: '2026-10-11T00:00:00.000Z' },
      unread: 4,
      updatedAt: '2026-10-11T00:00:00.000Z',
    })
  })

  it('aplica valores por defecto, incluido un último mensaje incompleto', () => {
    expect(normalizeConversation({ lastMessage: {} })).toEqual({
      _id: '',
      type: 'dm',
      name: 'Usuario',
      avatar: '??',
      email: '',
      otherUserId: null,
      lastMessage: { text: '', senderId: null, type: 'text', createdAt: null },
      unread: 0,
      updatedAt: null,
    })
    expect(normalizeConversation(null).lastMessage).toBeNull()
    expect(normalizeConversation({ unread: 'x' }).unread).toBe(0)
  })
})

describe('formatFileSize', () => {
  it('devuelve vacío para tamaños inválidos o no positivos', () => {
    expect(formatFileSize(undefined)).toBe('')
    expect(formatFileSize('abc')).toBe('')
    expect(formatFileSize(0)).toBe('')
  })

  it('formatea bytes, KB y MB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1536)).toBe('2 KB')
    expect(formatFileSize(5 * 1024 * 1024 + 100)).toBe('5.0 MB')
  })
})
