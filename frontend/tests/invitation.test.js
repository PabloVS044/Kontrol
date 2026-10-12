import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import {
  getInviteTokenFromQuery,
  getInviteErrorKey,
  getInviteErrorMessage,
  INVITE_ERROR_KEYS,
} from '@/utils/invitation.js'

/** Los mensajes salen del diccionario, no del propio módulo. */
const i18nDe = (locale) => {
  const { global } = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } })
  return { t: global.t }
}

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

describe('getInviteErrorKey', () => {
  it('mapea los códigos conocidos a su clave del diccionario', () => {
    expect(getInviteErrorKey('invite_not_found')).toBe(INVITE_ERROR_KEYS.invite_not_found)
    expect(getInviteErrorKey('invite_inactive')).toBe(INVITE_ERROR_KEYS.invite_inactive)
  })

  it('cae en la clave genérica para códigos desconocidos', () => {
    expect(getInviteErrorKey('otro_error')).toBe('invite.errors.generic')
  })

  it('devuelve cadena vacía sin código o con tipos inválidos', () => {
    expect(getInviteErrorKey()).toBe('')
    expect(getInviteErrorKey(42)).toBe('')
  })
})

describe('getInviteErrorMessage', () => {
  it('traduce el código al idioma de la interfaz', () => {
    // El mensaje estaba escrito en inglés dentro del módulo, así que la
    // pantalla de invitación lo mostraba en inglés con la app en español.
    expect(getInviteErrorMessage('invite_not_found', i18nDe('es')))
      .toBe('La invitación no existe o fue eliminada.')
    expect(getInviteErrorMessage('invite_not_found', i18nDe('en')))
      .toBe('The invitation does not exist or was removed.')
  })

  it('un código desconocido usa el mensaje genérico, también traducido', () => {
    expect(getInviteErrorMessage('otro_error', i18nDe('es')))
      .toBe('No se pudo procesar la invitación.')
  })

  it('devuelve cadena vacía sin código o con tipos inválidos', () => {
    expect(getInviteErrorMessage(undefined, i18nDe('es'))).toBe('')
    expect(getInviteErrorMessage(42, i18nDe('es'))).toBe('')
  })
})
