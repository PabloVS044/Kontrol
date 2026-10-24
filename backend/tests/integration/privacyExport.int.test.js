import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcrypt'

const { emptyCursor } = vi.hoisted(() => ({
  emptyCursor: async function* () {},
}))

vi.mock('../../src/db/mongo.js', () => ({ isMongoReady: () => true }))
vi.mock('../../src/models/Conversation.js', () => ({
  default: { find: () => ({ cursor: emptyCursor, lean: () => ({ cursor: emptyCursor }) }) },
}))
vi.mock('../../src/models/Message.js', () => ({
  default: { find: () => ({ lean: () => ({ cursor: emptyCursor }) }) },
}))
vi.mock('../../src/models/AgentConversation.js', () => ({
  default: {
    find: () => ({ lean: () => ({ cursor: emptyCursor }) }),
    deleteMany: async () => ({ deletedCount: 0 }),
  },
}))
vi.mock('../../src/models/AgentMessage.js', () => ({
  default: {
    find: () => ({ lean: () => ({ cursor: emptyCursor }) }),
    deleteMany: async () => ({ deletedCount: 0 }),
  },
}))

import {
  api,
  closeDb,
  createCompanyWithOwner,
  createProduct,
  createProject,
  createUser,
  query,
} from '../db/fixtures.js'
import {
  buildCompanyTableScopes,
  renderCompanyTableScope,
} from '../../src/services/companyDataExport.js'

const sensitiveField = /password|secret|token|credential|api.?key|private.?key/i

function redactSensitiveFields(value) {
  if (Array.isArray(value)) return value.map(redactSensitiveFields)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveField.test(key))
      .map(([key, nested]) => [key, redactSensitiveFields(nested)])
  )
}
describe('P1 — exportación JSON contra PostgreSQL real', () => {
  let context
  let project
  let product

  beforeAll(async () => {
    context = await createCompanyWithOwner()
    project = await createProject({
      id_empresa: context.company.id_empresa,
      id_encargado: context.owner.id_usuario,
      nombre: 'Proyecto exportable P1',
    })
    product = await createProduct({
      id_proyecto: project.id_proyecto,
      nombre: 'Producto exportable P1',
    })
  })

  afterAll(closeDb)

  it('incluye filas de empresa y proyecto comparables con las filas PostgreSQL', async () => {
    const response = await api()
      .get('/api/companies/export')
      .set('Authorization', `Bearer ${context.token}`)
      .set('X-Company-ID', String(context.company.id_empresa))

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toContain('no-store')
    expect(response.headers['content-disposition']).toContain('attachment')

    const exported = JSON.parse(response.text)
    const expectedProject = await query(
      'SELECT to_jsonb(p) AS row FROM public.proyecto p WHERE id_empresa = $1 AND id_proyecto = $2',
      [context.company.id_empresa, project.id_proyecto]
    )
    const expectedProduct = await query(
      `SELECT to_jsonb(p) AS row
       FROM public.producto p
       JOIN public.proyecto pr ON pr.id_proyecto = p.id_proyecto
       WHERE pr.id_empresa = $1 AND p.id_producto = $2`,
      [context.company.id_empresa, product.id_producto]
    )
    const tableMetadata = await query(
      `SELECT c.relname AS name, array_agg(a.attname::text ORDER BY a.attnum) AS columns
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
         AND a.attnum > 0 AND NOT a.attisdropped
       GROUP BY c.relname`
    )
    const foreignKeys = await query(
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
         AND child_schema.nspname = 'public' AND parent_schema.nspname = 'public'
       GROUP BY child.relname, parent.relname`
    )
    const scopes = buildCompanyTableScopes(tableMetadata.rows, foreignKeys.rows)

    expect(exported.tables.proyecto).toContainEqual(expectedProject.rows[0].row)
    expect(exported.tables.producto).toContainEqual(expectedProduct.rows[0].row)
    expect(exported.profile.id_usuario).toBe(context.owner.id_usuario)
    expect(exported.tables.usuario).toBeUndefined()

    for (const [tableName, exportedRows] of Object.entries(exported.tables)) {
      const predicate = renderCompanyTableScope(tableName, 't', scopes)
      const expectedRows = await query(
        `SELECT to_jsonb(t) AS row
         FROM public."${tableName}" t
         WHERE ${predicate}
         ORDER BY t.ctid`,
        [context.company.id_empresa]
      )
      expect(exportedRows, `Export mismatch for public.${tableName}`).toEqual(
        expectedRows.rows.map(({ row }) => redactSensitiveFields(row))
      )
    }
  })

  it('anonimiza la cuenta real, transfiere su empresa y revoca la sesión', async () => {
    const ownerContext = await createCompanyWithOwner()
    const project = await createProject({
      id_empresa: ownerContext.company.id_empresa,
      id_encargado: ownerContext.owner.id_usuario,
      nombre: 'Proyecto conservado P1',
    })
    const successor = await createUser({ nombre: 'Sucesora' })
    await query(
      `INSERT INTO public.empresa_usuario (id_empresa, id_usuario, id_rol_empresa)
       SELECT $1, $2, id_rol_empresa FROM public.rol_empresa WHERE nombre = 'admin'`,
      [ownerContext.company.id_empresa, successor.id_usuario]
    )
    await query(
      'UPDATE public.usuario SET password_hash = $1 WHERE id_usuario = $2',
      [await bcrypt.hash('password-de-borrado', 4), ownerContext.owner.id_usuario]
    )

    const response = await api()
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${ownerContext.token}`)
      .send({ password: 'password-de-borrado' })

    expect(response.status).toBe(200)
    expect(response.body.data.account).toBe('disabled_and_anonymized')

    const account = await query(
      `SELECT nombre, apellido, email, password_hash, telefono, google_id, activo
       FROM public.usuario WHERE id_usuario = $1`,
      [ownerContext.owner.id_usuario]
    )
    expect(account.rows[0]).toMatchObject({
      nombre: 'Cuenta eliminada',
      apellido: '',
      password_hash: null,
      telefono: null,
      google_id: null,
      activo: false,
    })
    expect(account.rows[0].email).toMatch(/^deleted-/)

    const membership = await query(
      'SELECT 1 FROM public.empresa_usuario WHERE id_empresa = $1 AND id_usuario = $2',
      [ownerContext.company.id_empresa, ownerContext.owner.id_usuario]
    )
    const newOwner = await query(
      `SELECT re.nombre AS role
       FROM public.empresa_usuario eu
       JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
       WHERE eu.id_empresa = $1 AND eu.id_usuario = $2`,
      [ownerContext.company.id_empresa, successor.id_usuario]
    )
    const retainedProject = await query(
      'SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2',
      [project.id_proyecto, ownerContext.company.id_empresa]
    )
    expect(membership.rows).toHaveLength(0)
    expect(newOwner.rows[0].role).toBe('owner')
    expect(retainedProject.rows).toHaveLength(1)

    const revoked = await api()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ownerContext.token}`)
    expect(revoked.status).toBe(401)
  })

  it('archiva una empresa sin sucesor activo en lugar de dejarla disponible sin owner', async () => {
    const context = await createCompanyWithOwner()
    await query(
      'UPDATE public.usuario SET password_hash = $1 WHERE id_usuario = $2',
      [await bcrypt.hash('password-de-borrado', 4), context.owner.id_usuario]
    )

    const response = await api()
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${context.token}`)
      .send({ password: 'password-de-borrado' })

    expect(response.status).toBe(200)
    const company = await query(
      'SELECT activo FROM public.empresa WHERE id_empresa = $1',
      [context.company.id_empresa]
    )
    const members = await query(
      'SELECT id_usuario FROM public.empresa_usuario WHERE id_empresa = $1',
      [context.company.id_empresa]
    )
    expect(company.rows[0].activo).toBe(false)
    expect(members.rows).toHaveLength(0)
  })
})
