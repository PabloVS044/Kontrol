import { rateLimit, ipKeyGenerator } from 'express-rate-limit'

/**
 * DT-13 · Límite de peticiones por IP y por cuenta.
 *
 * SCRUM-28 (hallazgo 5, caso E1) midió que el login ya degrada con 50 VUs
 * por el costo de bcrypt.compare: sin límite, un atacante no autenticado
 * puede tumbar el servicio solo con peticiones de login, además de hacer
 * fuerza bruta sin freno. El almacén es en memoria (una sola instancia de
 * backend); si se escala horizontalmente hay que moverlo a Redis.
 *
 * Todos los umbrales se pueden ajustar por entorno. RATE_LIMIT_ENABLED=false
 * lo apaga por completo, pensado para re-correr C2–C5 de k6 sin que el
 * límite enmascare la latencia real que se quiere medir.
 */

const MINUTE = 60 * 1000

function envInt(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const isEnabled = () => process.env.RATE_LIMIT_ENABLED !== 'false'

const TOO_MANY = 'Too many requests. Please try again later.'

/**
 * Fábrica común: respuesta 429 con el mismo formato JSON que el resto de la
 * API y cabeceras estándar RateLimit-* / Retry-After.
 */
export function createRateLimiter({ windowMs, limit, keyGenerator, message = TOO_MANY, ...options }) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !isEnabled(),
    // `trust proxy` es `true` porque el tráfico entra por Caddy → nginx, y
    // Caddy descarta el X-Forwarded-For que manda el cliente. La validación
    // de la librería no puede saber eso y avisaría en cada arranque.
    validate: { trustProxy: false },
    handler: (req, res, next, opts) => {
      res.status(opts.statusCode).json({ success: false, message })
    },
    ...options,
  })
}

// Clave por IP, normalizando IPv6 a su /56 para que un atacante no rote
// direcciones dentro del mismo bloque.
const byIp = (req) => ipKeyGenerator(req.ip)

// Clave por usuario autenticado; cae a IP si la ruta aún no pasó requireAuth.
const byUserOrIp = (req) => (req.user?.id_usuario ? `user:${req.user.id_usuario}` : byIp(req))

// Clave por cuenta objetivo del login. Va después de validate(loginSchema),
// así que el email ya existe; se normaliza para que `A@x.com` y `a@x.com`
// compartan contador.
const byLoginAccount = (req) => `account:${String(req.body?.email ?? '').trim().toLowerCase()}`

/**
 * Tope general de /auth por IP (register, login, Google OAuth). Es el
 * techo grueso; los de login de abajo son más finos.
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: envInt('RATE_LIMIT_AUTH_MAX', 100),
  keyGenerator: byIp,
})

/**
 * Login por IP: cuenta todos los intentos, exitosos o no, porque lo que se
 * protege es la CPU que consume bcrypt en cada uno. Holgado para una
 * oficina detrás de un mismo NAT iniciando sesión a la vez.
 */
export const loginIpLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: envInt('RATE_LIMIT_LOGIN_IP_MAX', 30),
  keyGenerator: byIp,
  message: 'Too many login attempts from this network. Please try again later.',
})

/**
 * Login por cuenta: solo cuenta intentos fallidos, así que frena la fuerza
 * bruta distribuida contra una contraseña sin penalizar al usuario que entra
 * bien. Un login correcto no suma.
 */
export const loginAccountLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: envInt('RATE_LIMIT_LOGIN_ACCOUNT_MAX', 5),
  keyGenerator: byLoginAccount,
  skipSuccessfulRequests: true,
  message: 'Too many failed login attempts for this account. Please try again later.',
})

/**
 * Endpoints costosos identificados en SCRUM-28 (C2, C4, C5). Va después de
 * requireAuth, así que el límite es por usuario: en un punto de venta varios
 * cajeros comparten la IP pública y no deben bloquearse entre sí.
 */
export const expensiveLimiter = createRateLimiter({
  windowMs: MINUTE,
  limit: envInt('RATE_LIMIT_EXPENSIVE_MAX', 60),
  keyGenerator: byUserOrIp,
})
