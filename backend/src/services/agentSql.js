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

function normalizeIdList(ids) {
  if (!Array.isArray(ids)) return []
  return [...new Set(
    ids
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )].sort((a, b) => a - b)
}

function toIntArrayLiteral(ids) {
  const normalized = normalizeIdList(ids)
  if (!normalized.length) return 'ARRAY[]::int[]'
  return `ARRAY[${normalized.join(', ')}]::int[]`
}

function rewriteAgentSql(sql) {
  return String(sql || '')
    .replace(/"public"\./gi, '')
    .replace(/\bpublic\./gi, '')
}

function alignSqlParams(sql, params = []) {
  const placeholderIndexes = [...String(sql || '').matchAll(/\$(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0)

  if (!placeholderIndexes.length) return []

  const highestIndex = Math.max(...placeholderIndexes)
  if (highestIndex > params.length) {
    throw new Error(
      `SQL expects ${highestIndex} parameter(s), but only ${params.length} value(s) were provided.`
    )
  }

  return params.slice(0, highestIndex)
}

async function createTempView(client, name, selectSql) {
  await client.query(`CREATE OR REPLACE TEMP VIEW ${name} AS ${selectSql}`)
}

async function setupAgentScope(client, scope) {
  const idEmpresa = Number(scope?.empresa?.id_empresa ?? scope?.id_empresa)
  const idUsuario = Number(scope?.user?.id_usuario ?? scope?.id_usuario)
  const projectIdsSql = toIntArrayLiteral(scope?.project_ids)
  const inventoryProjectIdsSql = toIntArrayLiteral(scope?.inventory_project_ids)
  const canManageUsers = scope?.capabilities?.can_manage_users === true
  const empresaUsuarioWhere = canManageUsers
    ? `eu.id_empresa = ${idEmpresa}`
    : `eu.id_empresa = ${idEmpresa} AND eu.id_usuario = ${idUsuario}`

  await createTempView(client, 'rol', 'SELECT * FROM public.rol')
  await createTempView(client, 'permiso_empresa', 'SELECT * FROM public.permiso_empresa')
  await createTempView(client, 'permiso_proyecto', 'SELECT * FROM public.permiso_proyecto')
  await createTempView(client, 'rol_empresa', 'SELECT * FROM public.rol_empresa')

  await createTempView(
    client,
    'empresa',
    `SELECT * FROM public.empresa WHERE id_empresa = ${idEmpresa}`
  )

  await createTempView(
    client,
    'empresa_usuario',
    `SELECT eu.*
     FROM public.empresa_usuario eu
     WHERE ${empresaUsuarioWhere}`
  )

  await createTempView(
    client,
    'categoria',
    `SELECT *
     FROM public.categoria
     WHERE id_empresa = ${idEmpresa}`
  )

  await createTempView(
    client,
    'proyecto',
    `SELECT *
     FROM public.proyecto
     WHERE id_empresa = ${idEmpresa}
       AND id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'rol_proyecto',
    `SELECT rp.*
     FROM public.rol_proyecto rp
     WHERE rp.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'rol_proyecto_permiso',
    `SELECT rpp.*
     FROM public.rol_proyecto_permiso rpp
     JOIN public.rol_proyecto rp ON rp.id_rol_proyecto = rpp.id_rol_proyecto
     WHERE rp.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'proyecto_usuario',
    `SELECT pu.*
     FROM public.proyecto_usuario pu
     WHERE pu.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'proyecto_usuario_permiso',
    `SELECT pup.*
     FROM public.proyecto_usuario_permiso pup
     WHERE pup.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'usuario',
    `SELECT u.*
     FROM public.usuario u
     JOIN public.empresa_usuario eu
       ON eu.id_usuario = u.id_usuario
      AND eu.id_empresa = ${idEmpresa}
     WHERE u.id_usuario = ${idUsuario}
        OR EXISTS (
          SELECT 1
          FROM public.proyecto p
          WHERE p.id_proyecto = ANY(${projectIdsSql})
            AND p.id_encargado = u.id_usuario
        )
        OR EXISTS (
          SELECT 1
          FROM public.proyecto_usuario pu
          WHERE pu.id_proyecto = ANY(${projectIdsSql})
            AND pu.id_usuario = u.id_usuario
        )
        OR EXISTS (
          SELECT 1
          FROM public.asignacion a
          WHERE a.id_proyecto = ANY(${projectIdsSql})
            AND a.id_usuario = u.id_usuario
        )`
  )

  await createTempView(
    client,
    'producto',
    `SELECT pr.*
     FROM public.producto pr
     WHERE pr.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'producto_proveedor',
    `SELECT pp.*
     FROM public.producto_proveedor pp
     JOIN public.producto pr ON pr.id_producto = pp.id_producto
     WHERE pr.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'proveedor',
    `SELECT pv.*
     FROM public.proveedor pv
     WHERE EXISTS (
       SELECT 1
       FROM public.producto_proveedor pp
       JOIN public.producto pr ON pr.id_producto = pp.id_producto
       WHERE pp.id_proveedor = pv.id_proveedor
         AND pr.id_proyecto = ANY(${projectIdsSql})
     )
        OR EXISTS (
          SELECT 1
          FROM public.movimiento_inventario mi
          WHERE mi.id_proveedor = pv.id_proveedor
            AND mi.id_proyecto = ANY(${inventoryProjectIdsSql})
        )`
  )

  await createTempView(
    client,
    'movimiento_inventario',
    `SELECT mi.*
     FROM public.movimiento_inventario mi
     WHERE mi.id_empresa = ${idEmpresa}
       AND mi.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'tarea',
    `SELECT t.*
     FROM public.tarea t
     WHERE t.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'asignacion',
    `SELECT a.*
     FROM public.asignacion a
     WHERE a.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'evidencia',
    `SELECT e.*
     FROM public.evidencia e
     WHERE EXISTS (
       SELECT 1
       FROM public.tarea t
       WHERE t.id_tarea = e.id_tarea
         AND t.id_proyecto = ANY(${projectIdsSql})
     )`
  )

  await createTempView(
    client,
    'presupuesto_actividad',
    `SELECT pa.*
     FROM public.presupuesto_actividad pa
     WHERE pa.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'presupuesto_ajuste',
    `SELECT pa.*
     FROM public.presupuesto_ajuste pa
     WHERE pa.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'reporte',
    `SELECT r.*
     FROM public.reporte r
     WHERE r.id_proyecto = ANY(${projectIdsSql})`
  )

  await createTempView(
    client,
    'project_progress_entry',
    `SELECT ppe.*
     FROM public.project_progress_entry ppe
     WHERE ppe.id_proyecto = ANY(${projectIdsSql})`
  )
}

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
export async function executeReadOnly(sql, params, scope = null) {
  const client = await pool.connect()
  try {
    const finalSql = scope ? rewriteAgentSql(sql) : sql
    const finalParams = alignSqlParams(finalSql, params)
    if (scope) {
      await setupAgentScope(client, scope)
    }
    await client.query('BEGIN TRANSACTION READ ONLY')
    if (scope) {
      await client.query('SET LOCAL search_path = pg_temp')
    }
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`)
    const result = await client.query(finalSql, finalParams)
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
