import { describe, it, expect, beforeEach, vi } from 'vitest'

const client = { query: vi.fn(), release: vi.fn() }

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import pool from '../src/db/pool.js'
import {
  AGENT_DB_ROLE,
  validateReadOnlySql,
  executeReadOnly,
} from '../src/services/agentSql.js'

const scope = {
  id_empresa: 1,
  id_usuario: 7,
  project_ids: [10],
  inventory_project_ids: [10],
  capabilities: {},
}

const sentSql = () => client.query.mock.calls.map(([sql]) => sql)

beforeEach(() => {
  vi.resetAllMocks()
  pool.connect.mockResolvedValue(client)
  client.query.mockResolvedValue({ rowCount: 0, rows: [], fields: [] })
})

describe('validateReadOnlySql', () => {
  it('acepta un SELECT simple', () => {
    expect(validateReadOnlySql('SELECT nombre FROM proyecto')).toMatchObject({ ok: true })
  })

  it.each([
    "SELECT set_config('role', 'postgres', true)",
    "SELECT current_setting('server_version')",
  ])('rechaza el acceso a la configuración del servidor: %s', (sql) => {
    expect(validateReadOnlySql(sql)).toMatchObject({ ok: false })
  })
})

/**
 * Las vistas temporales son el límite entre empresas. Antes, `public . usuario`
 * (con espacios, que Postgres acepta) no se reescribía y leía la tabla real
 * con los usuarios y hashes de todas las empresas.
 */
describe('executeReadOnly con scope del agente', () => {
  it('reescribe nombres calificados con espacios o comillas hacia las vistas', async () => {
    await executeReadOnly('SELECT * FROM public . usuario JOIN "public" .proyecto ON true', [], scope)

    const finalSql = sentSql().find((statement) => statement.startsWith('SELECT * FROM usuario JOIN proyecto'))
    expect(finalSql).toBe('SELECT * FROM usuario JOIN proyecto ON true')
  })

  it('crea las vistas dentro de la transacción antes de usar el rol sin privilegios', async () => {
    await executeReadOnly('SELECT 1', [], scope)

    const sql = sentSql()
    const begin = sql.indexOf('BEGIN')
    const createView = sql.findIndex((statement) => statement.startsWith('CREATE OR REPLACE TEMP VIEW'))
    const setRole = sql.indexOf(`SET LOCAL ROLE ${AGENT_DB_ROLE}`)
    expect(begin).toBeGreaterThan(-1)
    expect(createView).toBeGreaterThan(begin)
    expect(setRole).toBeGreaterThan(createView)
    expect(setRole).toBeLessThan(sql.indexOf('SELECT 1'))
  })

  it('elimina todas las vistas antes de confirmar la transacción', async () => {
    await executeReadOnly('SELECT 1', [], scope)

    const sql = sentSql()
    const queryIndex = sql.indexOf('SELECT 1')
    const resetRole = sql.indexOf('RESET ROLE')
    const dropViews = sql.findIndex((statement) => statement.startsWith('DROP VIEW IF EXISTS pg_temp.'))
    const commit = sql.indexOf('COMMIT')

    expect(resetRole).toBeGreaterThan(queryIndex)
    expect(dropViews).toBeGreaterThan(resetRole)
    expect(commit).toBeGreaterThan(dropViews)
    expect(sql[dropViews]).toContain('pg_temp.project_progress_entry')
  })

  it('concede SELECT al rol sobre cada vista temporal que crea', async () => {
    await executeReadOnly('SELECT 1', [], scope)

    const sql = sentSql()
    const views = sql
      .map((s) => s.match(/^CREATE OR REPLACE TEMP VIEW (\w+)/)?.[1])
      .filter(Boolean)
    expect(views.length).toBeGreaterThan(0)
    for (const view of views) {
      expect(sql).toContain(`GRANT SELECT ON ${view} TO ${AGENT_DB_ROLE}`)
    }
  })

  it('la vista usuario no expone password_hash, google_id ni token_version', async () => {
    await executeReadOnly('SELECT 1', [], scope)

    const usuarioView = sentSql().find((s) => s.startsWith('CREATE OR REPLACE TEMP VIEW usuario '))
    expect(usuarioView).toBeDefined()
    expect(usuarioView).not.toMatch(/u\.\*|password_hash|google_id|token_version/)
  })

  it('sin scope no cambia de rol ni crea vistas', async () => {
    await executeReadOnly('SELECT 1', [])

    const sql = sentSql()
    expect(sql).toContain('BEGIN TRANSACTION READ ONLY')
    expect(sql.some((s) => s.startsWith('SET LOCAL ROLE'))).toBe(false)
    expect(sql.some((s) => s.startsWith('CREATE OR REPLACE TEMP VIEW'))).toBe(false)
  })

  it('revierte la creación de vistas si falla la consulta', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql === 'SELECT 1') throw new Error('query failed')
      return { rowCount: 0, rows: [], fields: [] }
    })

    await expect(executeReadOnly('SELECT 1', [], scope)).rejects.toThrow('query failed')

    const sql = sentSql()
    expect(sql.at(-1)).toBe('ROLLBACK')
    expect(sql).not.toContain('COMMIT')
  })
})
