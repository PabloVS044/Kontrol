// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginUser(email, password, inviteToken) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      inviteToken: inviteToken || undefined,
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Login failed')
  return data
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerUser(firstName, lastName, email, password, options = {}) {
  const { inviteToken } = options

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre:   firstName,
      apellido: lastName,
      email,
      password,
      role: inviteToken ? 'usuario' : 'admin',
      inviteToken: inviteToken || undefined,
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Registration failed')
  return data
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

/**
 * Initiates the Google OAuth flow by redirecting the browser to the backend.
 * The backend handles the full OAuth dance and redirects back to /auth/callback.
 */
export function loginWithGoogle(inviteToken) {
  const params = new URLSearchParams()
  if (inviteToken) params.set('invite', inviteToken)

  const suffix = params.toString() ? `?${params}` : ''
  window.location.href = `/api/auth/google${suffix}`
}
