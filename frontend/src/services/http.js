const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const SAFE_RETRY_STATUSES = new Set([502, 503, 504])

export function getApiBaseUrl() {
  return API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
}

export function resolveApiUrl(path) {
  if (typeof path !== 'string' || !/^\/?api(?:\/|$)/.test(path)) return path
  if (!API_BASE_URL) return path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function getStoredToken() {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem('token')
}

export function setStoredToken(token) {
  if (typeof localStorage !== 'undefined') localStorage.setItem('token', token)
}

export function clearStoredToken() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('token')
}

function getStoredCompanyId() {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem('empresaActual')
  if (!raw) return null

  try {
    return JSON.parse(raw)?.id_empresa ?? null
  } catch (error) {
    if (error instanceof SyntaxError) return null
    throw error
  }
}

function appendHeader(headers, name, value) {
  const existingName = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase())
  headers[existingName || name] = value
}

function toHeaderObject(input = {}) {
  if (input instanceof Headers) {
    return Object.fromEntries(input.entries())
  }
  return { ...input }
}

export function authHeaders(extraHeaders = {}, context = {}) {
  const options = context && typeof context === 'object' ? context : {}
  const projectId = typeof context === 'number' || typeof context === 'string'
    ? context
    : options.projectId
  const token = options.token !== undefined
    ? options.token
    : getStoredToken()
  const companyId = options.companyId !== undefined
    ? options.companyId
    : getStoredCompanyId()
  const headers = {}

  if (token) appendHeader(headers, 'Authorization', `Bearer ${token}`)
  if (companyId) appendHeader(headers, 'X-Company-ID', String(companyId))
  if (projectId) appendHeader(headers, 'X-Project-ID', String(projectId))
  for (const [name, value] of Object.entries(toHeaderObject(extraHeaders))) {
    appendHeader(headers, name, value)
  }

  return headers
}

function handleUnauthorized(url, token) {
  if (!token) return
  clearStoredToken()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api:unauthorized', { detail: { url } }))
  }
}

// PAY-1 — Un 403 por plan (PLAN_FEATURE_REQUIRED / PLAN_LIMIT_REACHED) avisa a
// toda la app para mostrar "Mejora tu plan" sin que cada vista lo maneje. Se
// lee una copia: el cuerpo original queda intacto para quien hizo la petición.
function notifyPlanRequired(url, response) {
  if (typeof window === 'undefined' || typeof response.clone !== 'function') return
  response
    .clone()
    .json()
    .then((body) => {
      if (!String(body?.code ?? '').startsWith('PLAN_')) return
      window.dispatchEvent(new CustomEvent('api:plan-required', { detail: { url, ...body } }))
    })
    .catch(() => {})
}

export async function apiFetch(path, options = {}) {
  const {
    auth = true,
    token,
    companyId,
    projectId,
    json = false,
    ...fetchOptions
  } = options
  const headers = auth
    ? authHeaders(fetchOptions.headers, { token, companyId, projectId })
    : toHeaderObject(fetchOptions.headers)

  if (
    (json || (typeof fetchOptions.body === 'string' && fetchOptions.body !== '')) &&
    !Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')
  ) {
    appendHeader(headers, 'Content-Type', 'application/json')
  }

  const url = resolveApiUrl(path)
  const method = (fetchOptions.method || 'GET').toUpperCase()
  let response

  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await globalThis.fetch(url, { ...fetchOptions, headers })
    } catch (error) {
      if (attempt === 0 && ['GET', 'HEAD'].includes(method) && !fetchOptions.signal?.aborted) continue
      throw error
    }

    if (
      attempt === 0 &&
      ['GET', 'HEAD'].includes(method) &&
      SAFE_RETRY_STATUSES.has(response.status)
    ) {
      continue
    }
    break
  }

  if (response.status === 401) handleUnauthorized(url, token ?? getStoredToken())
  if (response.status === 403) notifyPlanRequired(url, response)
  return response
}
