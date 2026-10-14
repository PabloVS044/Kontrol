/**
 * Invitaciones: token de la URL y mensajes de error.
 *
 * Los mensajes estaban escritos aquí en inglés, así que la pantalla de
 * invitación —la primera que ve quien entra por un enlace— los mostraba en
 * inglés con la app en español. Ahora el código del backend se traduce a una
 * clave del diccionario y la vista pide el texto.
 */

/** Código que devuelve el backend → clave del diccionario. */
export const INVITE_ERROR_KEYS = {
  invite_not_found: 'invite.errors.notFound',
  invite_inactive:  'invite.errors.inactive',
}

const GENERIC_ERROR_KEY = 'invite.errors.generic'

export function getInviteTokenFromQuery(query) {
  if (typeof query.invite === 'string') return query.invite
  if (typeof query.inviteToken === 'string') return query.inviteToken
  return ''
}

/** Clave del diccionario para un código, o cadena vacía si no hay código. */
export function getInviteErrorKey(code) {
  if (!code || typeof code !== 'string') return ''
  return INVITE_ERROR_KEYS[code] || GENERIC_ERROR_KEY
}

/** @param {{ t: Function }} i18n  de `useI18n()` */
export function getInviteErrorMessage(code, { t } = {}) {
  const key = getInviteErrorKey(code)
  if (!key) return ''
  return typeof t === 'function' ? t(key) : key
}
