import { describe, it, expect, vi, afterEach } from 'vitest'
import { loginUser, registerUser, loginWithGoogle } from '../src/services/auth.js'

/**
 * Manejo de respuestas de `services/auth.js`.
 *
 * Contexto: `loginUser` llamaba a `response.json()` antes de comprobar
 * `response.ok`. En cuanto la petición no llegaba al backend —el proxy de Vite
 * responde 500 con cuerpo vacío cuando nada escucha en el puerto 3000— ese
 * `.json()` lanzaba y el banner del login mostraba
 * «Failed to execute 'json' on 'Response': Unexpected end of JSON input».
 *
 * El usuario veía un error de JavaScript en vez de «no se puede conectar», que
 * es justo lo que necesitaba saber para arrancar el backend.
 */

/** Respuesta mínima con la superficie que usa el servicio. */
function respond({ status = 200, body = '' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  }
}

const mockFetch = (response) => {
  global.fetch = vi.fn(() => Promise.resolve(response))
}

afterEach(() => {
  vi.restoreAllMocks()
  delete global.fetch
})

describe('loginUser', () => {
  it('devuelve el cuerpo cuando la petición va bien', async () => {
    mockFetch(respond({ body: JSON.stringify({ token: 'abc', user: { id: 1 } }) }))
    await expect(loginUser('a@b.c', 'pw')).resolves.toEqual({ token: 'abc', user: { id: 1 } })
  })

  it('envía email, password y el token de invitación cuando lo hay', async () => {
    mockFetch(respond({ body: '{"token":"x"}' }))
    await loginUser('a@b.c', 'pw', 'inv-123')
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(JSON.parse(init.body)).toEqual({
      email: 'a@b.c',
      password: 'pw',
      inviteToken: 'inv-123',
    })
  })

  it('propaga el mensaje del backend en un 401', async () => {
    // Es el que distingue «credenciales incorrectas» de «cuenta desactivada»:
    // si se pierde, el usuario no sabe cuál de las dos cosas le pasa.
    mockFetch(respond({ status: 401, body: JSON.stringify({ message: 'Invalid credentials' }) }))
    await expect(loginUser('a@b.c', 'pw')).rejects.toThrow('Invalid credentials')
  })

  it('marca `unreachable` cuando el servidor responde 500 sin cuerpo', async () => {
    mockFetch(respond({ status: 500, body: '' }))
    await expect(loginUser('a@b.c', 'pw')).rejects.toMatchObject({ code: 'unreachable' })
  })

  it('marca `unreachable` cuando llega HTML en vez de JSON', async () => {
    // Un gateway o un proxy mal configurado devuelven una página de error.
    mockFetch(respond({ status: 502, body: '<!doctype html><title>502</title>' }))
    await expect(loginUser('a@b.c', 'pw')).rejects.toMatchObject({ code: 'unreachable' })
  })

  it('marca `unreachable` si un 200 llega con el cuerpo vacío', async () => {
    mockFetch(respond({ status: 200, body: '' }))
    await expect(loginUser('a@b.c', 'pw')).rejects.toMatchObject({ code: 'unreachable' })
  })

  it('marca `generic` en un 4xx sin cuerpo legible', async () => {
    // 4xx es un problema de la petición, no del servidor: no procede decirle al
    // usuario que revise su conexión.
    mockFetch(respond({ status: 400, body: '' }))
    await expect(loginUser('a@b.c', 'pw')).rejects.toMatchObject({ code: 'generic' })
  })

  it('nunca deja escapar el TypeError de JSON.parse', async () => {
    mockFetch(respond({ status: 500, body: 'no soy json' }))
    await expect(loginUser('a@b.c', 'pw')).rejects.not.toThrow(/JSON input/)
  })
})

describe('registerUser', () => {
  it('devuelve el cuerpo cuando la petición va bien', async () => {
    mockFetch(respond({ body: JSON.stringify({ token: 'abc' }) }))
    await expect(registerUser('Ana', 'Ruiz', 'a@b.c', 'pw')).resolves.toEqual({ token: 'abc' })
  })

  it('manda rol admin sin invitación y usuario con ella', async () => {
    mockFetch(respond({ body: '{"token":"x"}' }))
    await registerUser('Ana', 'Ruiz', 'a@b.c', 'pw')
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({
      nombre: 'Ana',
      apellido: 'Ruiz',
      role: 'admin',
    })

    mockFetch(respond({ body: '{"token":"x"}' }))
    await registerUser('Ana', 'Ruiz', 'a@b.c', 'pw', { inviteToken: 'inv-9' })
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({
      role: 'usuario',
      inviteToken: 'inv-9',
    })
  })

  it('marca `unreachable` cuando el backend no contesta', async () => {
    mockFetch(respond({ status: 500, body: '' }))
    await expect(registerUser('Ana', 'Ruiz', 'a@b.c', 'pw')).rejects.toMatchObject({
      code: 'unreachable',
    })
  })
})

describe('loginWithGoogle', () => {
  /** `window.location` no es asignable en happy-dom; se sustituye por un doble. */
  function captureRedirect() {
    const original = Object.getOwnPropertyDescriptor(window, 'location')
    const spot = { href: '' }
    Object.defineProperty(window, 'location', {
      value: spot,
      writable: true,
      configurable: true,
    })
    return {
      get href() {
        return spot.href
      },
      restore() {
        if (original) Object.defineProperty(window, 'location', original)
      },
    }
  }

  it('redirige al backend sin parámetros cuando no hay invitación', () => {
    const nav = captureRedirect()
    loginWithGoogle()
    expect(nav.href).toBe('/api/auth/google')
    nav.restore()
  })

  it('adjunta el token de invitación como query cuando lo hay', () => {
    const nav = captureRedirect()
    loginWithGoogle('inv-123')
    expect(nav.href).toBe('/api/auth/google?invite=inv-123')
    nav.restore()
  })

  it('codifica el token en lugar de interpolarlo tal cual', () => {
    // Sin codificar, un token con `&` partiría la query.
    const nav = captureRedirect()
    loginWithGoogle('a&b=c')
    expect(nav.href).toBe('/api/auth/google?invite=a%26b%3Dc')
    nav.restore()
  })
})
