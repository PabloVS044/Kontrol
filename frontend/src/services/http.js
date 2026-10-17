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

export function authHeaders(extraHeaders = {}, projectId = null) {
  const headers = new Headers()
  const token = getStoredToken()
  const companyId = getStoredCompanyId()
  const scopedProjectId = typeof extraHeaders === 'number' || typeof extraHeaders === 'string'
    ? extraHeaders
    : projectId

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (companyId) headers.set('X-Company-ID', String(companyId))
  if (scopedProjectId) headers.set('X-Project-ID', String(scopedProjectId))
  if (extraHeaders && typeof extraHeaders === 'object') {
    new Headers(extraHeaders).forEach((value, key) => headers.set(key, value))
  }

  return headers
}

function handleUnauthorized(url) {
  if (!getStoredToken()) return
  clearStoredToken()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api:unauthorized', { detail: { url } }))
  }
}

export async function apiFetch(path, options = {}) {
  const {
    auth = true,
    ...fetchOptions
  } = options
  const headers = auth
    ? authHeaders(fetchOptions.headers)
    : new Headers(fetchOptions.headers)

  if (fetchOptions.body != null && typeof fetchOptions.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
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

  if (response.status === 401) handleUnauthorized(url)
  return response
}
