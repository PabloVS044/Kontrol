import { describe, it, expect } from 'vitest'
import {
  sanitizeAttachment,
  sanitizeAttachments,
  buildMessagePreview,
  serializeMessage,
} from '../src/utils/chat.js'

describe('sanitizeAttachment', () => {
  it('normaliza un adjunto válido recortando espacios y conservando el tipo', () => {
    const result = sanitizeAttachment({
      type: 'image',
      url: '  https://cdn.kontrol.gt/foto.png  ',
      filename: '  foto.png ',
      size: '2048',
    })

    expect(result).toMatchObject({
      type: 'image',
      url: 'https://cdn.kontrol.gt/foto.png',
      filename: 'foto.png',
      size: 2048,
    })
  })

  it('usa "file" como tipo por defecto ante tipos desconocidos', () => {
    const result = sanitizeAttachment({ type: 'virus', url: 'https://x.gt/a' })
    expect(result.type).toBe('file')
  })

  it('devuelve null si no hay URL o la entrada no es objeto', () => {
    expect(sanitizeAttachment({ type: 'image', url: '   ' })).toBeNull()
    expect(sanitizeAttachment(null)).toBeNull()
    expect(sanitizeAttachment('texto')).toBeNull()
  })

  it('descarta tamaños negativos o no numéricos', () => {
    const result = sanitizeAttachment({ url: 'https://x.gt/a', size: -5, duration: 'abc' })
    expect(result.size).toBeUndefined()
    expect(result.duration).toBeUndefined()
  })
})

describe('sanitizeAttachments', () => {
  it('filtra los adjuntos inválidos de la lista', () => {
    const result = sanitizeAttachments([
      { type: 'image', url: 'https://x.gt/a.png' },
      { type: 'image', url: '' },
      null,
    ])
    expect(result).toHaveLength(1)
  })

  it('devuelve lista vacía si la entrada no es un arreglo', () => {
    expect(sanitizeAttachments('nada')).toEqual([])
    expect(sanitizeAttachments(undefined)).toEqual([])
  })
})

describe('buildMessagePreview', () => {
  it('prioriza el texto del mensaje cuando existe', () => {
    expect(buildMessagePreview({ text: '  hola  ', attachments: [] })).toBe('hola')
  })

  it('muestra la etiqueta del adjunto único según su tipo', () => {
    expect(buildMessagePreview({ text: '', attachments: [{ type: 'image' }] })).toBe('[Imagen]')
    expect(buildMessagePreview({ text: '', attachments: [{ type: 'audio' }] })).toBe('[Audio]')
  })

  it('muestra el conteo cuando hay varios adjuntos', () => {
    const attachments = [{ type: 'image' }, { type: 'file' }, { type: 'video' }]
    expect(buildMessagePreview({ text: '', attachments })).toBe('[3 adjuntos]')
  })
})

describe('serializeMessage', () => {
  it('serializa un mensaje normalizando ids, fechas y lectores', () => {
    const createdAt = new Date('2026-07-01T10:00:00Z')
    const message = {
      _id: 'abc123',
      conversationId: 'conv1',
      senderId: '9',
      senderName: 'Ana',
      text: 'hola',
      attachments: [{ type: 'image', url: 'https://x.gt/a.png' }],
      readBy: ['1', '2', 'no-numérico'],
      createdAt,
    }

    const result = serializeMessage(message)

    expect(result._id).toBe('abc123')
    expect(result.senderId).toBe(9)
    expect(result.readBy).toEqual([1, 2])
    expect(result.createdAt).toBe(createdAt.toISOString())
    expect(result.attachments).toHaveLength(1)
  })

  it('soporta documentos de Mongoose vía toObject()', () => {
    const doc = {
      toObject: () => ({ _id: 'x1', conversationId: 'c1', senderId: 3, text: 'hey' }),
    }
    const result = serializeMessage(doc)
    expect(result._id).toBe('x1')
    expect(result.text).toBe('hey')
  })
})
