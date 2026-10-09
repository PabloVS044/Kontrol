/**
 * DT-15 — instrumentación del pool de Postgres, pendiente desde SCRUM-28.
 *
 * Las pruebas de carga midieron cuellos de botella pero no pudieron decir si
 * venían del pool, porque nadie leía sus contadores. `waiting > 0` sostenido
 * significa que hay consultas esperando un cliente libre: el pool es el
 * límite, no Postgres ni la CPU del backend.
 *
 * - total:   clientes abiertos (ocupados + libres), nunca más que `max`
 * - idle:    clientes abiertos sin consulta en curso
 * - waiting: peticiones en cola esperando un cliente
 */
export function getPoolStats(pool) {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: pool.options?.max,
  }
}

export function resolveStatsIntervalMs(env = process.env) {
  const parsed = Number.parseInt(env.DB_POOL_STATS_INTERVAL_MS, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

/**
 * Escribe una línea JSON con los contadores cada `intervalMs`. Pensado para
 * encenderlo durante una corrida de k6 y cruzar los picos de `waiting` con la
 * latencia medida. Con 0 no hace nada. El temporizador va con `unref()` para
 * no retener el proceso al apagarlo.
 */
export function startPoolStatsLogger(pool, intervalMs, log = console.log) {
  if (!intervalMs) return () => {}

  const timer = setInterval(() => {
    log(JSON.stringify({ event: 'db_pool_stats', at: new Date().toISOString(), ...getPoolStats(pool) }))
  }, intervalMs)
  timer.unref()

  return () => clearInterval(timer)
}
