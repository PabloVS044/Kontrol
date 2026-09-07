import http from 'k6/http'
import { check } from 'k6'
import { BASE_URL, PASSWORD } from './config.js'

// Logs in once per VU and caches the token for the life of that VU, so a
// scenario's iterations don't each pay for a fresh login round-trip.
const tokenCache = {}

export function loginAs(email) {
  if (tokenCache[email]) return tokenCache[email]

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } }
  )

  check(res, { 'login succeeded': (r) => r.status === 200 })

  const token = res.json('token')
  if (!token) {
    throw new Error(`Login failed for ${email}: ${res.status} ${res.body}`)
  }
  tokenCache[email] = token
  return token
}

export function authHeaders(token, { companyId, projectId } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
  if (companyId) headers['X-Company-ID'] = String(companyId)
  if (projectId) headers['X-Project-ID'] = String(projectId)
  return headers
}
