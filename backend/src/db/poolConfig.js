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

export function buildPoolConfig(env = process.env) {
  return {
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: positiveInt(env.DB_POOL_MAX, POOL_DEFAULTS.max),
    connectionTimeoutMillis: positiveInt(
      env.DB_POOL_CONNECTION_TIMEOUT_MS,
      POOL_DEFAULTS.connectionTimeoutMillis,
    ),
    idleTimeoutMillis: positiveInt(env.DB_POOL_IDLE_TIMEOUT_MS, POOL_DEFAULTS.idleTimeoutMillis),
  }
}
