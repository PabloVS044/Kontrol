const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return null

  try {
    const url = new URL(value)
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export const getFrontendBaseUrl = (req) => {
  const envUrl = normalizeBaseUrl(process.env.FRONTEND_URL)
  if (envUrl) return envUrl

  const originUrl = normalizeBaseUrl(req.get('origin'))
  if (originUrl) return originUrl

  const forwardedProto = req.get('x-forwarded-proto')
  const forwardedHost = req.get('x-forwarded-host')
  if (forwardedHost) {
    const proto = forwardedProto || req.protocol || 'http'
    return `${proto}://${forwardedHost}`.replace(/\/$/, '')
  }

  const host = req.get('host')
  if (host) {
    return `${req.protocol || 'http'}://${host}`.replace(/\/$/, '')
  }

  return 'http://localhost:5173'
}

export const buildInvitationUrl = (req, token) =>
  `${getFrontendBaseUrl(req)}/invite/${encodeURIComponent(token)}`
