// globalSetup: corre UNA vez, antes de todas las suites de integración y de
// regresión. Deja la base de pruebas idéntica a una instalación nueva:
//   1. borra y recrea el esquema `public`;
//   2. carga `kontrol.sql` (tablas + catálogos de roles y permisos);
//   3. aplica `ensureDatabaseSchema()`, las mismas migraciones que corre el
//      backend al arrancar en producción.
// Así las pruebas ejercitan el esquema real, no uno escrito a mano para ellas.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { assertSafeTestDatabase, testDatabaseUrl } from './testDatabase.js'

const SCHEMA_FILE = fileURLToPath(new URL('../../kontrol.sql', import.meta.url))

export default async function setup() {
  const url = testDatabaseUrl()
  assertSafeTestDatabase(url)

  const client = new pg.Client({ connectionString: url })
  try {
    await client.connect()
  } catch (err) {
    throw new Error(
      `Could not connect to the test database (${err.message}). ` +
      'Start it with `npm run db:test:up` or set TEST_DATABASE_URL.'
    )
  }

  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    await client.query('CREATE SCHEMA public')
    await client.query(await readFile(SCHEMA_FILE, 'utf8'))
  } finally {
    await client.end()
  }

  // `db/pool.js` lee DATABASE_URL al importarse: se fija antes del import.
  process.env.DATABASE_URL = url
  process.env.DATABASE_SSL = 'false'
  const { ensureDatabaseSchema } = await import('../../src/db/bootstrap.js')
  const { default: pool } = await import('../../src/db/pool.js')
  try {
    await ensureDatabaseSchema()
  } finally {
    await pool.end()
  }
}
