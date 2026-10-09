import { describe, it, expect, vi } from 'vitest'
import { buildPoolConfig, buildSslConfig, POOL_DEFAULTS } from '../src/db/poolConfig.js'

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

describe('DT-15 · TLS hacia Postgres', () => {
  const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----'

  it('sin DATABASE_SSL no usa TLS', () => {
    expect(buildSslConfig({})).toBe(false)
    expect(buildSslConfig({ DATABASE_SSL: 'false' })).toBe(false)
  })

  it('con DATABASE_SSL verifica el certificado contra las CA del sistema', () => {
    expect(buildSslConfig({ DATABASE_SSL: 'true' })).toEqual({ rejectUnauthorized: true })
  })

  it('nunca desactiva la verificación', () => {
    for (const env of [
      { DATABASE_SSL: 'true' },
      { DATABASE_SSL: 'true', DATABASE_SSL_CA: PEM },
    ]) {
      expect(buildSslConfig(env).rejectUnauthorized).toBe(true)
    }
  })

  it('acepta la CA como PEM en línea con saltos escapados', () => {
    const escaped = PEM.replace(/\n/g, '\\n')
    expect(escaped).not.toContain('\n')
    expect(buildSslConfig({ DATABASE_SSL: 'true', DATABASE_SSL_CA: escaped }).ca).toBe(PEM)
  })

  it('acepta la CA como ruta a un archivo', () => {
    const readFile = vi.fn(() => PEM)
    const ssl = buildSslConfig({ DATABASE_SSL: 'true', DATABASE_SSL_CA: '/certs/supabase.crt' }, readFile)

    expect(readFile).toHaveBeenCalledWith('/certs/supabase.crt', 'utf8')
    expect(ssl).toEqual({ rejectUnauthorized: true, ca: PEM })
  })

  it('falla al arrancar si la ruta de la CA no existe, en lugar de conectar sin verificar', () => {
    expect(() => buildSslConfig({ DATABASE_SSL: 'true', DATABASE_SSL_CA: '/no/existe.crt' })).toThrow()
  })

  it('quita sslmode de la URL para que no pise la configuración TLS', () => {
    const config = buildPoolConfig({
      DATABASE_SSL: 'true',
      DATABASE_URL: 'postgresql://u:p@db.example.com:5432/kontrol?sslmode=no-verify&application_name=k',
    })

    expect(config.connectionString).toBe('postgresql://u:p@db.example.com:5432/kontrol?application_name=k')
    expect(config.ssl).toEqual({ rejectUnauthorized: true })
  })

  it('deja la URL intacta cuando no hay parámetros de TLS', () => {
    const url = 'postgresql://u:p%40ss@db.example.com:5432/kontrol'
    expect(buildPoolConfig({ DATABASE_SSL: 'true', DATABASE_URL: url }).connectionString).toBe(url)
  })
})
