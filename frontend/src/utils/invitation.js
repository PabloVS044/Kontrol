export const INVITE_ERROR_MESSAGES = {
  invite_not_found: 'The invitation does not exist or was removed.',
  invite_inactive: 'The invitation link was already deactivated by the owner.',
}

export function getInviteTokenFromQuery(query) {
  if (typeof query.invite === 'string') return query.invite
  if (typeof query.inviteToken === 'string') return query.inviteToken
  return ''
}

export function getInviteErrorMessage(code) {
  if (!code || typeof code !== 'string') return ''
  return INVITE_ERROR_MESSAGES[code] || 'The invitation could not be processed.'
}
