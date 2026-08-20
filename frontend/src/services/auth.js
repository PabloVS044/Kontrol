/**
 * Lee el cuerpo de una respuesta sin dar por hecho que es JSON.
 *
 * `response.json()` lanza si el cuerpo viene vacío o no es JSON, y eso pasa en
 * cuanto la petición no llega al backend: el proxy de Vite responde 500 sin
 * cuerpo, un gateway devuelve una página HTML. Como se llamaba ANTES de mirar
 * `response.ok`, ese fallo de infraestructura acababa en el banner del login
 * como «Failed to execute 'json' on 'Response': Unexpected end of JSON input»,
 * que no le dice nada a nadie y tapa la causa real.
 */
async function readBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Devuelve el cuerpo si la petición fue bien; si no, lanza.
 *
 * Cuando el backend manda un `message` propio se usa tal cual — es el que
 * distingue «credenciales incorrectas» de «cuenta desactivada». Cuando no hay
 * cuerpo que leer, el error lleva un `code` para que la vista escoja el texto
 * traducido en vez de enseñar una cadena en inglés sin traducir.
 */
async function unwrap(response) {
  const data = await readBody(response)
  if (response.ok && data) return data

  if (data?.message) throw new Error(data.message)

  const error = new Error(`HTTP ${response.status}`)
  // 5xx o cuerpo ilegible = el servidor no contesta como debe, no es culpa de
  // lo que haya escrito el usuario.
  error.code = response.ok || response.status >= 500 ? 'unreachable' : 'generic'
  error.status = response.status
  throw error
}

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

  return unwrap(response)
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

  return unwrap(response)
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
