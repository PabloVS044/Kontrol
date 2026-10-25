import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

// El controller real hace bcrypt + Postgres; aquí solo interesa el límite,
// así que la contraseña correcta es literalmente 'correcta'.
vi.mock('../src/controllers/authController.js', () => {
  const ok = (req, res) => res.json({ success: true })
  return {
    login: (req, res) => (req.body.password === 'correcta'
      ? res.json({ success: true, token: 't' })
      : res.status(401).json({ success: false, message: 'Invalid credentials.' })),
    register: ok,
    getMe: ok,
    googleAuth: ok,
    googleCallback: ok,
    googleDeletionReauthentication: ok,
  }
})

const ENV_KEYS = [
  'RATE_LIMIT_ENABLED',
  'RATE_LIMIT_AUTH_MAX',
  'RATE_LIMIT_LOGIN_IP_MAX',
  'RATE_LIMIT_LOGIN_ACCOUNT_MAX',
  'RATE_LIMIT_EXPENSIVE_MAX',
  'RATE_LIMIT_ACCOUNT_DELETE_IP_MAX',
  'RATE_LIMIT_ACCOUNT_DELETE_USER_MAX',
]

// Los umbrales se leen al importar el módulo, así que cada prueba fija el
// entorno y reimporta para tener contadores y límites nuevos.
async function buildAuthApp(env = {}) {
  Object.assign(process.env, env)
  vi.resetModules()
  const { default: authRoutes } = await import('../src/routes/authRoutes.js')
  const { authLimiter } = await import('../src/middleware/rateLimit.js')
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authLimiter, authRoutes)
  return app
}

const login = (app, email, password = 'incorrecta') =>
  request(app).post('/api/auth/login').send({ email, password })

beforeEach(() => {
  ENV_KEYS.forEach((key) => delete process.env[key])
})

afterEach(() => {
  ENV_KEYS.forEach((key) => delete process.env[key])
})

describe('DT-13 · Límite de peticiones en /auth', () => {
  it('bloquea una cuenta con 429 tras superar el umbral de intentos fallidos', async () => {
    const app = await buildAuthApp({ RATE_LIMIT_LOGIN_ACCOUNT_MAX: '3' })

    for (let i = 0; i < 3; i++) {
      const res = await login(app, 'victima@kontrol.gt')
      expect(res.status).toBe(401)
    }

    const blocked = await login(app, 'victima@kontrol.gt')
    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual({
      success: false,
      message: 'Too many failed login attempts for this account. Please try again later.',
    })
    expect(blocked.headers).toHaveProperty('retry-after')

    // Bloqueada incluso con la contraseña correcta: el atacante no puede
    // seguir probando hasta que venza la ventana.
    expect((await login(app, 'victima@kontrol.gt', 'correcta')).status).toBe(429)
  })

  it('cuenta el email sin distinguir mayúsculas ni espacios', async () => {
    const app = await buildAuthApp({ RATE_LIMIT_LOGIN_ACCOUNT_MAX: '2' })

    await login(app, 'victima@kontrol.gt')
    await login(app, 'VICTIMA@kontrol.gt')

    expect((await login(app, 'Victima@Kontrol.gt')).status).toBe(429)
  })

  it('no suma los inicios de sesión correctos al contador de la cuenta', async () => {
    const app = await buildAuthApp({ RATE_LIMIT_LOGIN_ACCOUNT_MAX: '2' })

    for (let i = 0; i < 5; i++) {
      expect((await login(app, 'ana@kontrol.gt', 'correcta')).status).toBe(200)
    }
    expect((await login(app, 'ana@kontrol.gt')).status).toBe(401)
  })

  it('no afecta a otras cuentas cuando una está bloqueada', async () => {
    const app = await buildAuthApp({ RATE_LIMIT_LOGIN_ACCOUNT_MAX: '1' })

    await login(app, 'victima@kontrol.gt')
    expect((await login(app, 'victima@kontrol.gt')).status).toBe(429)
    expect((await login(app, 'otra@kontrol.gt', 'correcta')).status).toBe(200)
  })

  it('bloquea por IP aunque cada intento vaya a una cuenta distinta', async () => {
    const app = await buildAuthApp({ RATE_LIMIT_LOGIN_IP_MAX: '3' })

    for (let i = 0; i < 3; i++) {
      expect((await login(app, `usuario${i}@kontrol.gt`)).status).toBe(401)
    }

    const blocked = await login(app, 'nueva@kontrol.gt', 'correcta')
    expect(blocked.status).toBe(429)
    expect(blocked.body.message).toBe('Too many login attempts from this network. Please try again later.')
  })

  it('aplica el tope general de /auth también a las demás rutas', async () => {
    const app = await buildAuthApp({ RATE_LIMIT_AUTH_MAX: '2' })

    await request(app).get('/api/auth/google')
    await request(app).get('/api/auth/google')

    expect((await request(app).get('/api/auth/google')).status).toBe(429)
  })

  it('RATE_LIMIT_ENABLED=false desactiva todos los límites', async () => {
    const app = await buildAuthApp({ RATE_LIMIT_ENABLED: 'false', RATE_LIMIT_LOGIN_ACCOUNT_MAX: '1' })

    for (let i = 0; i < 5; i++) {
      expect((await login(app, 'victima@kontrol.gt')).status).toBe(401)
    }
  })
})

describe('DT-13 · Límite en endpoints costosos (SCRUM-28)', () => {
  async function buildExpensiveApp(env) {
    Object.assign(process.env, env)
    vi.resetModules()
    const { expensiveLimiter } = await import('../src/middleware/rateLimit.js')
    const app = express()
    // Sustituye a requireAuth: el usuario llega en una cabecera de prueba.
    app.use((req, res, next) => {
      const id = req.get('x-test-user')
      if (id) req.user = { id_usuario: Number(id) }
      next()
    })
    app.get('/costoso', expensiveLimiter, (req, res) => res.json({ success: true }))
    return app
  }

  it('limita por usuario, sin bloquear a otros usuarios detrás de la misma IP', async () => {
    const app = await buildExpensiveApp({ RATE_LIMIT_EXPENSIVE_MAX: '2' })
    const as = (id) => request(app).get('/costoso').set('x-test-user', String(id))

    expect((await as(1)).status).toBe(200)
    expect((await as(1)).status).toBe(200)

    const blocked = await as(1)
    expect(blocked.status).toBe(429)
    expect(blocked.body.success).toBe(false)

    expect((await as(2)).status).toBe(200)
  })

  it('cae a límite por IP cuando no hay usuario autenticado', async () => {
    const app = await buildExpensiveApp({ RATE_LIMIT_EXPENSIVE_MAX: '1' })

    expect((await request(app).get('/costoso')).status).toBe(200)
    expect((await request(app).get('/costoso')).status).toBe(429)
  })
})

describe('P-1 · Protección de fuerza bruta para borrado de cuenta', () => {
  async function buildDeletionApp(env) {
    Object.assign(process.env, env)
    vi.resetModules()
    const {
      accountDeletionIpLimiter,
      accountDeletionUserLimiter,
    } = await import('../src/middleware/rateLimit.js')
    const app = express()
    app.use((req, res, next) => {
      req.user = { id_usuario: Number(req.get('x-test-user')) }
      next()
    })
    app.delete(
      '/account',
      accountDeletionIpLimiter,
      accountDeletionUserLimiter,
      (req, res) => res.status(401).json({ success: false })
    )
    return app
  }

  it('limita los intentos fallidos por cuenta sin bloquear otras cuentas', async () => {
    const app = await buildDeletionApp({
      RATE_LIMIT_ACCOUNT_DELETE_IP_MAX: '20',
      RATE_LIMIT_ACCOUNT_DELETE_USER_MAX: '2',
    })
    const as = (id) => request(app).delete('/account').set('x-test-user', String(id))

    expect((await as(7)).status).toBe(401)
    expect((await as(7)).status).toBe(401)
    expect((await as(7)).status).toBe(429)
    expect((await as(8)).status).toBe(401)
  })

  it('limita los intentos fallidos por IP aunque se usen distintas cuentas', async () => {
    const app = await buildDeletionApp({
      RATE_LIMIT_ACCOUNT_DELETE_IP_MAX: '2',
      RATE_LIMIT_ACCOUNT_DELETE_USER_MAX: '20',
    })
    const as = (id) => request(app).delete('/account').set('x-test-user', String(id))

    expect((await as(7)).status).toBe(401)
    expect((await as(8)).status).toBe(401)
    expect((await as(9)).status).toBe(429)
  })
})

describe('P-1 · Concurrencia de exportaciones de empresa', () => {
  it('rechaza una segunda exportación de la misma empresa hasta que termina la primera', async () => {
    vi.resetModules()
    const { companyExportConcurrencyLimiter } = await import('../src/middleware/rateLimit.js')
    const app = express()
    let releaseFirst
    let markFirstStarted
    const firstStarted = new Promise((resolve) => {
      markFirstStarted = resolve
    })
    app.use((req, res, next) => {
      req.company = { id_empresa: Number(req.get('x-test-company')) }
      next()
    })
    app.get('/export', companyExportConcurrencyLimiter, (req, res) => {
      if (req.get('x-hold') === 'true') {
        releaseFirst = () => res.status(200).end()
        markFirstStarted()
        return
      }
      return res.status(200).end()
    })

    const firstRequest = request(app).get('/export')
      .set('x-test-company', '31')
      .set('x-hold', 'true')
    const firstResponse = new Promise((resolve, reject) => {
      firstRequest.end((error, response) => error ? reject(error) : resolve(response))
    })
    await firstStarted

    const blocked = await request(app).get('/export').set('x-test-company', '31')
    expect(blocked.status).toBe(429)
    expect(blocked.headers).toHaveProperty('retry-after')

    releaseFirst()
    expect((await firstResponse).status).toBe(200)
    expect((await request(app).get('/export').set('x-test-company', '31')).status).toBe(200)
  })
})
