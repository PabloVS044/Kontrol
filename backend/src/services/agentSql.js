import pool from '../db/pool.js'

/**
 * SQL safety + execution helpers for the Kontrol AI Agent.
 *
 * The agent is restricted to read-only access. Defense in depth:
 *   1. Static parser-style validation (this file).
 *   2. Postgres "READ ONLY" transaction + statement_timeout at execution time.
 *   3. The connecting role itself should ideally be granted SELECT only on
 *      the agent-exposed tables in production.
 */

const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE',
  'GRANT', 'REVOKE', 'COMMENT', 'COPY', 'MERGE', 'CALL', 'DO', 'EXECUTE',
  'PREPARE', 'REINDEX', 'VACUUM', 'LOCK', 'SET', 'RESET', 'DECLARE',
  'CLUSTER', 'REFRESH', 'LISTEN', 'NOTIFY', 'UNLISTEN', 'SECURITY',
  'TRIGGER', 'POLICY', 'ATTACH', 'DETACH', 'LOAD', 'CHECKPOINT',
  'DISCARD', 'IMPORT', 'INTO',
]

const MAX_ROWS = 200
const STATEMENT_TIMEOUT_MS = 8000

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
}

/**
 * Replace single-quoted string literals and double-quoted identifiers with
 * empty placeholders so the keyword scanner does not match words living
 * inside user-typed content (e.g. WHERE descripcion LIKE '%do this%').
 */
function maskLiterals(sql) {
  return sql
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""')
}

/**
 * Validates that a SQL string is safe to execute on behalf of the agent.
 * Returns { ok: true, sql } or { ok: false, error }.
 */
export function validateReadOnlySql(rawSql) {
  if (typeof rawSql !== 'string' || !rawSql.trim()) {
    return { ok: false, error: 'Empty SQL query.' }
  }

  let sql = stripComments(rawSql).trim()
  sql = sql.replace(/;\s*$/, '')

  if (sql.includes(';')) {
    return { ok: false, error: 'Multiple SQL statements are not allowed.' }
  }

  const head = sql.replace(/^\s+/, '').toUpperCase()
  if (!head.startsWith('SELECT') && !head.startsWith('WITH')) {
    return { ok: false, error: 'Only SELECT or WITH (CTE) queries are allowed.' }
  }

  const masked = maskLiterals(sql)
  const upper = masked.toUpperCase()
  for (const kw of FORBIDDEN_KEYWORDS) {
    const re = new RegExp(`\\b${kw}\\b`)
    if (re.test(upper)) {
      return { ok: false, error: `Disallowed keyword in query: ${kw}.` }
    }
  }

  if (/\bpg_[a-z_]+/i.test(masked) || /\binformation_schema\b/i.test(masked)) {
    return { ok: false, error: 'Access to system catalogs is not allowed.' }
  }

  const placeholders = masked.match(/\$\d+/g) || []
  for (const p of placeholders) {
    if (p !== '$1' && p !== '$2') {
      return {
        ok: false,
        error: `Only $1 (id_empresa) and $2 (id_usuario) parameters are allowed. Found ${p}.`,
      }
    }
  }

  return { ok: true, sql }
}

/**
 * Caps the result set size by injecting/clamping a LIMIT clause.
 */
export function enforceLimit(sql, maxRows = MAX_ROWS) {
  const limitMatch = sql.match(/\blimit\b\s+(\d+)/i)
  if (limitMatch) {
    const requested = Number(limitMatch[1])
    const capped = Math.min(requested, maxRows)
    return sql.replace(/\blimit\b\s+\d+/i, `LIMIT ${capped}`)
  }
  return `${sql} LIMIT ${maxRows}`
}

/**
 * Executes a SQL query inside a READ ONLY transaction with a strict timeout.
 * Postgres itself enforces the read-only guarantee — any write attempt fails.
 */
export async function executeReadOnly(sql, params) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN TRANSACTION READ ONLY')
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`)
    const result = await client.query(sql, params)
    await client.query('COMMIT')
    return {
      rowCount: result.rowCount,
      rows: result.rows,
      fields: result.fields?.map((f) => f.name) ?? [],
    }
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    throw err
  } finally {
    client.release()
  }
}

export const AGENT_SQL_LIMITS = {
  MAX_ROWS,
  STATEMENT_TIMEOUT_MS,
}
