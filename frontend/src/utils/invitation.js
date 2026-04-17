export const INVITE_ERROR_MESSAGES = {
  invite_not_found: 'La invitación no existe o fue eliminada.',
  invite_inactive: 'El enlace de invitación ya fue desactivado por el owner.',
}

export function getInviteTokenFromQuery(query) {
  if (typeof query.invite === 'string') return query.invite
  if (typeof query.inviteToken === 'string') return query.inviteToken
  return ''
}

export function getInviteErrorMessage(code) {
  if (!code || typeof code !== 'string') return ''
  return INVITE_ERROR_MESSAGES[code] || 'No se pudo procesar la invitación.'
}
