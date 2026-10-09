import { describe, it, expect } from 'vitest'
import { buildPoolConfig, POOL_DEFAULTS } from '../src/db/poolConfig.js'

describe('DT-15 · buildPoolConfig', () => {
  it('declara max, connectionTimeoutMillis e idleTimeoutMillis aunque no haya variables', () => {
    const config = buildPoolConfig({ DATABASE_URL: 'postgresql://x' })

    expect(config).toMatchObject({
      connectionString: 'postgresql://x',
      max: POOL_DEFAULTS.max,
      connectionTimeoutMillis: POOL_DEFAULTS.connectionTimeoutMillis,
      idleTimeoutMillis: POOL_DEFAULTS.idleTimeoutMillis,
    })
  })

  it('toma los tres valores de las variables de entorno', () => {
    const config = buildPoolConfig({
      DB_POOL_MAX: '25',
      DB_POOL_CONNECTION_TIMEOUT_MS: '3000',
      DB_POOL_IDLE_TIMEOUT_MS: '30000',
    })

    expect(config.max).toBe(25)
    expect(config.connectionTimeoutMillis).toBe(3000)
    expect(config.idleTimeoutMillis).toBe(30000)
  })

  // 0 se rechaza a propósito: en `pg`, connectionTimeoutMillis = 0 significa
  // esperar sin límite, que es justo lo que DT-15 elimina.
  it.each(['', 'abc', '0', '-1'])('ignora el valor inválido %j y usa el por defecto', (value) => {
    const config = buildPoolConfig({
      DB_POOL_MAX: value,
      DB_POOL_CONNECTION_TIMEOUT_MS: value,
      DB_POOL_IDLE_TIMEOUT_MS: value,
    })

    expect(config.max).toBe(POOL_DEFAULTS.max)
    expect(config.connectionTimeoutMillis).toBe(POOL_DEFAULTS.connectionTimeoutMillis)
    expect(config.idleTimeoutMillis).toBe(POOL_DEFAULTS.idleTimeoutMillis)
  })
})
