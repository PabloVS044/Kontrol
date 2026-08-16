import { describe, it, expect } from 'vitest'
import {
  getInviteTokenFromQuery,
  getInviteErrorMessage,
  INVITE_ERROR_MESSAGES,
} from '@/utils/invitation.js'

describe('getInviteTokenFromQuery', () => {
  it('lee el token del parámetro "invite"', () => {
    expect(getInviteTokenFromQuery({ invite: 'abc123' })).toBe('abc123')
  })

  it('acepta el alias "inviteToken" cuando "invite" no existe', () => {
    expect(getInviteTokenFromQuery({ inviteToken: 'xyz789' })).toBe('xyz789')
  })

  it('prioriza "invite" sobre "inviteToken" cuando vienen ambos', () => {
    expect(getInviteTokenFromQuery({ invite: 'a', inviteToken: 'b' })).toBe('a')
  })

  it('devuelve cadena vacía si no hay token o no es string', () => {
    expect(getInviteTokenFromQuery({})).toBe('')
    expect(getInviteTokenFromQuery({ invite: ['array'] })).toBe('')
  })
})

describe('getInviteErrorMessage', () => {
  it('devuelve el mensaje mapeado para códigos conocidos', () => {
    expect(getInviteErrorMessage('invite_not_found')).toBe(INVITE_ERROR_MESSAGES.invite_not_found)
    expect(getInviteErrorMessage('invite_inactive')).toBe(INVITE_ERROR_MESSAGES.invite_inactive)
  })

  it('devuelve mensaje genérico para códigos desconocidos', () => {
    expect(getInviteErrorMessage('otro_error')).toBe('The invitation could not be processed.')
  })

  it('devuelve cadena vacía sin código o con tipos inválidos', () => {
    expect(getInviteErrorMessage()).toBe('')
    expect(getInviteErrorMessage(42)).toBe('')
  })
})
