const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return null

  try {
    const url = new URL(value)
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

const toOrigin = (value) => {
  if (!value || typeof value !== 'string') return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

// FRONTEND_URL admite varios frontends separados por coma (p. ej. el dominio
// propio y el *.vercel.app), igual que el CORS de index.js. Las entradas que no
// son URL válidas, como '*', se ignoran.
export const getAllowedFrontendUrls = () =>
  (process.env.FRONTEND_URL || '')
    .split(',')
    .map((entry) => normalizeBaseUrl(entry.trim()))
    .filter(Boolean)

/**
 * Devuelve la entrada de FRONTEND_URL cuyo origen coincide con `candidate`, o
 * null. Nunca devuelve un valor fuera de la lista: es lo que impide que
 * `return_to` o el `state` de OAuth se usen como redirección abierta.
 */
export const matchAllowedFrontendUrl = (candidate) => {
  const origin = toOrigin(candidate)
  if (!origin) return null
  return getAllowedFrontendUrls().find((url) => toOrigin(url) === origin) ?? null
}

/**
 * Elige a qué frontend volver. Con FRONTEND_URL definido, prueba en orden
 * `preferred`, el Origin y el Referer de la petición contra la lista, y si
 * ninguno coincide usa la primera entrada.
 */
export const getFrontendBaseUrl = (req, preferred) => {
  const allowed = getAllowedFrontendUrls()
  if (allowed.length) {
    const candidates = [preferred, req.get('origin'), req.get('referer')]
    for (const candidate of candidates) {
      const match = matchAllowedFrontendUrl(candidate)
      if (match) return match
    }
    return allowed[0]
  }

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
