import { readFileSync } from 'node:fs'

/**
 * DT-15 — configuración explícita del pool de Postgres.
 *
 * Antes el `Pool` recibía solo `connectionString` y `ssl`: `max` quedaba en
 * el 10 por defecto de `pg` sin que nadie lo eligiera, y sin
 * `connectionTimeoutMillis` una petición esperaba un cliente libre para
 * siempre cuando el pool estaba agotado. Los tres valores se declaran aquí y
 * se pueden ajustar por entorno sin tocar código, por ejemplo al repetir las
 * pruebas de carga de SCRUM-28.
 */

export const POOL_DEFAULTS = Object.freeze({
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
})

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * DT-15 — TLS que verifica el certificado.
 *
 * Antes era `{ rejectUnauthorized: false }`: cifraba, pero aceptaba cualquier
 * certificado, así que un intermediario podía presentar el suyo. Ahora la
 * verificación es siempre obligatoria. Si el servidor usa una CA que Node no
 * trae de serie (Supabase firma con la suya), se indica en DATABASE_SSL_CA:
 * o bien la ruta a un archivo PEM, o bien el PEM en línea. En línea, los
 * saltos de línea pueden ir escapados como `\n`, porque el `.env` que genera
 * `scripts/deploy.sh` no admite valores multilínea.
 */
export function buildSslConfig(env = process.env, readFile = readFileSync) {
  if (env.DATABASE_SSL !== 'true') return false

  const ca = env.DATABASE_SSL_CA?.trim()
  if (!ca) return { rejectUnauthorized: true }

  const pem = ca.startsWith('-----BEGIN')
    ? ca.replace(/\\n/g, '\n')
    : readFile(ca, 'utf8')

  return { rejectUnauthorized: true, ca: pem }
}

/**
 * `pg` mezcla los parámetros de la URL encima de la configuración, así que un
 * `?sslmode=...` en DATABASE_URL reemplazaría el objeto `ssl` de arriba y se
 * perdería la CA (y `sslmode=no-verify` volvería a aceptar cualquier
 * certificado). Con DATABASE_SSL activo, DATABASE_SSL y DATABASE_SSL_CA son la
 * única fuente de verdad para TLS.
 */
const SSL_URL_PARAMS = ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']

export function stripSslParams(connectionString) {
  if (!connectionString) return connectionString
  let url
  try {
    url = new URL(connectionString)
  } catch {
    return connectionString
  }
  const before = url.search
  for (const param of SSL_URL_PARAMS) url.searchParams.delete(param)
  return url.search === before ? connectionString : url.toString()
}

export function buildPoolConfig(env = process.env, readFile = readFileSync) {
  const ssl = buildSslConfig(env, readFile)
  return {
    connectionString: ssl ? stripSslParams(env.DATABASE_URL) : env.DATABASE_URL,
    ssl,
    max: positiveInt(env.DB_POOL_MAX, POOL_DEFAULTS.max),
    connectionTimeoutMillis: positiveInt(
      env.DB_POOL_CONNECTION_TIMEOUT_MS,
      POOL_DEFAULTS.connectionTimeoutMillis,
    ),
    idleTimeoutMillis: positiveInt(env.DB_POOL_IDLE_TIMEOUT_MS, POOL_DEFAULTS.idleTimeoutMillis),
  }
}
