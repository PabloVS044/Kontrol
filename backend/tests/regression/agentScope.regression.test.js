import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import pool from '../../src/db/pool.js'
import { executeReadOnly } from '../../src/services/agentSql.js'
import { closeDb, createCompanyWithOwner } from '../db/fixtures.js'

describe('DT-16 — las vistas del agente quedan aisladas por transacción', () => {
  let empresaA
  let empresaB
  let scopedPool
  let connectSpy

  beforeAll(async () => {
    empresaA = await createCompanyWithOwner()
    empresaB = await createCompanyWithOwner()

    scopedPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      ssl: false,
    })
    connectSpy = vi.spyOn(pool, 'connect').mockImplementation(() => scopedPool.connect())
  })

  afterAll(async () => {
    connectSpy?.mockRestore()
    await scopedPool?.end()
    await closeDb()
  })

  function scopeFor(company) {
    return {
      id_empresa: company.company.id_empresa,
      id_usuario: company.owner.id_usuario,
      project_ids: [],
      inventory_project_ids: [],
      capabilities: {},
    }
  }

  async function tempViewsOnReturnedConnection() {
    const client = await scopedPool.connect()
    try {
      const { rows } = await client.query(`
        SELECT c.relname
        FROM pg_class c
        WHERE c.relnamespace = pg_my_temp_schema()
          AND c.relkind = 'v'
        ORDER BY c.relname
      `)
      return rows.map(({ relname }) => relname)
    } finally {
      client.release()
    }
  }

  it('no deja vistas en la conexión devuelta al pool ni mezcla empresas consecutivas', async () => {
    const resultA = await executeReadOnly(
      'SELECT id_empresa, pg_backend_pid() AS backend_pid FROM empresa',
      [],
      scopeFor(empresaA)
    )

    expect(resultA.rows.map(({ id_empresa }) => id_empresa)).toEqual([
      empresaA.company.id_empresa,
    ])
    expect(await tempViewsOnReturnedConnection()).toEqual([])

    const resultB = await executeReadOnly(
      'SELECT id_empresa, pg_backend_pid() AS backend_pid FROM empresa',
      [],
      scopeFor(empresaB)
    )

    expect(resultB.rows.map(({ id_empresa }) => id_empresa)).toEqual([
      empresaB.company.id_empresa,
    ])
    expect(resultB.rows[0].backend_pid).toBe(resultA.rows[0].backend_pid)
    expect(await tempViewsOnReturnedConnection()).toEqual([])
  })
})
