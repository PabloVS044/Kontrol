// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Login failed')
  return data
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerUser(firstName, lastName, email, password) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre:   firstName,
      apellido: lastName,
      email,
      password,
      role: 'admin', // self-registering users are owners of their own workspace
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
export function loginWithGoogle() {
  window.location.href = '/api/auth/google'
}
