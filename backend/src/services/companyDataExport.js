import { Readable } from 'node:stream'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import AgentConversation from '../models/AgentConversation.js'
import AgentMessage from '../models/AgentMessage.js'

const BATCH_SIZE = 250
const SENSITIVE_FIELD = /password|secret|token|credential|api.?key|private.?key/i

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`

export function buildCompanyTableScopes(tables, foreignKeys) {
  const direct = new Set(
    tables.filter((table) => table.columns.includes('id_empresa')).map((table) => table.name)
  )
  const scopes = new Map([...direct].map((name) => [name, { direct: true }]))
  let changed = true

  while (changed) {
    changed = false
    for (const foreignKey of foreignKeys) {
      if (direct.has(foreignKey.child) || !scopes.has(foreignKey.parent)) continue

      let scope = scopes.get(foreignKey.child)
      if (!scope) {
        scope = { direct: false, foreignKeys: [] }
        scopes.set(foreignKey.child, scope)
        changed = true
      }
      if (!scope.foreignKeys.some((candidate) => candidate === foreignKey)) {
        scope.foreignKeys.push(foreignKey)
      }
    }
  }

  return scopes
}

export function renderCompanyTableScope(tableName, alias, scopes, ancestors = new Set(), depth = 0) {
  if (ancestors.has(tableName)) return null
  const scope = scopes.get(tableName)
  if (!scope) return null
  if (scope.direct) return `${alias}."id_empresa" = $1`

  const nextAncestors = new Set(ancestors).add(tableName)
  const routes = scope.foreignKeys.flatMap((foreignKey, index) => {
    const parentAlias = `scope_parent_${depth}_${index}`
    const joins = foreignKey.childColumns
      .map((column, columnIndex) =>
        `${alias}.${quoteIdentifier(column)} = ${parentAlias}.${quoteIdentifier(foreignKey.parentColumns[columnIndex])}`
      )
      .join(' AND ')
    const parentScope = renderCompanyTableScope(
      foreignKey.parent,
      parentAlias,
      scopes,
      nextAncestors,
      depth + 1
    )
    return parentScope
      ? [`EXISTS (SELECT 1 FROM public.${quoteIdentifier(foreignKey.parent)} ${parentAlias} WHERE ${joins} AND (${parentScope}))`]
      : []
  })
  return routes.length ? `(${routes.join(' OR ')})` : null
}

function redactSensitiveFields(value) {
  if (Array.isArray(value)) return value.map(redactSensitiveFields)
  if (value instanceof Date) return value.toISOString()
  if (value?._bsontype === 'ObjectId') return value.toString()
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_FIELD.test(key))
      .map(([key, nested]) => [key, redactSensitiveFields(nested)])
  )
}

async function* exportRows(client, table, scope, scopes) {
  let cursor = null
  const where = renderCompanyTableScope(table.name, 't', scopes)
  if (!where) return

  while (true) {
    const result = await client.query(
      `SELECT to_jsonb(t) AS row, t.ctid::text AS cursor
       FROM public.${quoteIdentifier(table.name)} t
       WHERE ${where}
         AND ($2::tid IS NULL OR t.ctid > $2::tid)
       ORDER BY t.ctid
       LIMIT $3`,
      [scope.companyId, cursor, BATCH_SIZE]
    )
    if (result.rows.length === 0) return

    for (const row of result.rows) {
      yield redactSensitiveFields(row.row)
    }
    cursor = result.rows.at(-1).cursor
  }
}

async function* exportAssistantData(companyId) {
  yield '"assistant_conversations":['
  let first = true
  for await (const conversation of AgentConversation.find({ empresaId: companyId }).lean().cursor()) {
    if (!first) yield ','
    first = false
    yield JSON.stringify(redactSensitiveFields(conversation))
  }
  yield '],"assistant_messages":['
  first = true
  for await (const message of AgentMessage.find({ empresaId: companyId }).lean().cursor()) {
    if (!first) yield ','
    first = false
    yield JSON.stringify(redactSensitiveFields(message))
  }
  yield ']'
}

async function* exportHumanConversations(userId) {
  yield '"human_conversations":['
  let firstConversation = true
  for await (const conversation of Conversation.find({ participants: userId }).lean().cursor()) {
    if (!firstConversation) yield ','
    firstConversation = false
    const metadata = redactSensitiveFields({
      id: conversation._id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    })
    yield `{"conversation":${JSON.stringify(metadata)},"messages":[`
    let firstMessage = true
    for await (const message of Message.find({
      conversationId: conversation._id,
      senderId: userId,
    }).lean().cursor()) {
      if (!firstMessage) yield ','
      firstMessage = false
      yield JSON.stringify(redactSensitiveFields(message))
    }
    yield ']}'
  }
  yield ']'
}

export async function prepareCompanyDataExport(client, { companyId, userId }) {
  const tableResult = await client.query(
    `SELECT c.relname AS name, array_agg(a.attname::text ORDER BY a.attnum) AS columns
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND a.attnum > 0
       AND NOT a.attisdropped
     GROUP BY c.relname
     ORDER BY c.relname`
  )
  const foreignKeyResult = await client.query(
    `SELECT child.relname AS child, parent.relname AS parent,
            array_agg(child_column.attname::text ORDER BY key_pair.ordinality) AS "childColumns",
            array_agg(parent_column.attname::text ORDER BY key_pair.ordinality) AS "parentColumns"
     FROM pg_constraint constraint_row
     JOIN pg_class child ON child.oid = constraint_row.conrelid
     JOIN pg_namespace child_schema ON child_schema.oid = child.relnamespace
     JOIN pg_class parent ON parent.oid = constraint_row.confrelid
     JOIN pg_namespace parent_schema ON parent_schema.oid = parent.relnamespace
     CROSS JOIN LATERAL unnest(constraint_row.conkey, constraint_row.confkey)
       WITH ORDINALITY AS key_pair(child_attnum, parent_attnum, ordinality)
     JOIN pg_attribute child_column
       ON child_column.attrelid = child.oid AND child_column.attnum = key_pair.child_attnum
     JOIN pg_attribute parent_column
       ON parent_column.attrelid = parent.oid AND parent_column.attnum = key_pair.parent_attnum
     WHERE constraint_row.contype = 'f'
       AND child_schema.nspname = 'public'
       AND parent_schema.nspname = 'public'
     GROUP BY child.relname, parent.relname`
  )
  const profileResult = await client.query(
    `SELECT id_usuario, nombre, apellido, email, telefono
     FROM public.usuario
     WHERE id_usuario = $1`,
    [userId]
  )

  if (!profileResult.rows.length) throw new Error('Authenticated account no longer exists.')

  const tables = tableResult.rows
  const foreignKeys = foreignKeyResult.rows.map((row) => ({
    ...row,
    childColumns: row.childColumns,
    parentColumns: row.parentColumns,
  }))
  const scopes = buildCompanyTableScopes(tables, foreignKeys)
  if (!scopes.has('empresa')) throw new Error('Company table is missing from the export schema.')

  return Readable.from((async function* () {
    try {
      yield `{"format":"Kontrol company data export","version":1,"generated_at":${JSON.stringify(new Date().toISOString())},"profile":${JSON.stringify(profileResult.rows[0])},"company_id":${JSON.stringify(companyId)},"tables":{`
      let firstTable = true
      for (const table of tables) {
        const scope = scopes.get(table.name)
        if (!scope) continue
        if (!firstTable) yield ','
        firstTable = false
        yield `${JSON.stringify(table.name)}:[`
        let firstRow = true
        for await (const row of exportRows(client, table, { companyId }, scopes)) {
          if (!firstRow) yield ','
          firstRow = false
          yield JSON.stringify(row)
        }
        yield ']'
      }
      yield '},"conversations":{'
      yield* exportAssistantData(companyId)
      yield ','
      yield* exportHumanConversations(userId)
      yield '}}'
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  })())
}
