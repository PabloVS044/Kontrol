// Configuración compartida por globalSetup y por cada suite de integración.
//
// La URL por defecto es la del Postgres de `docker-compose.integration.yml`.
// En CI llega por variable de entorno desde el service container del job.
export const DEFAULT_TEST_DATABASE_URL = 'postgres://kontrol:kontrol@localhost:5433/kontrol_test'

export const testDatabaseUrl = () => process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL

const SAFE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'postgres-test'])

// globalSetup borra el esquema `public` completo. Este guard es lo único que
// impide hacerlo sobre Supabase si alguien exporta por error la URL de
// producción: solo se aceptan hosts locales y bases cuyo nombre diga "test".
export function assertSafeTestDatabase(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid connection string.')
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '')
  const database = parsed.pathname.replace(/^\//, '')

  if (!SAFE_HOSTS.has(host) || !database.includes('test')) {
    throw new Error(
      `Refusing to run integration tests against ${host}/${database}: ` +
      'the database is wiped before every run, so it must be a local database whose name contains "test".'
    )
  }
}
