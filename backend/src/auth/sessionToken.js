export function isSessionTokenPayload(payload) {
  return Boolean(
    payload &&
      Number.isSafeInteger(payload.id_usuario) &&
      payload.id_usuario > 0 &&
      Number.isSafeInteger(payload.token_version) &&
      payload.token_version > 0 &&
      payload.purpose === undefined
  )
}
