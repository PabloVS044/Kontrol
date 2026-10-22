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
    expect(exported.tables.proyecto).toContainEqual(expectedProject.rows[0].row)
    expect(exported.tables.producto).toContainEqual(expectedProduct.rows[0].row)
    expect(exported.profile.id_usuario).toBe(context.owner.id_usuario)
    expect(exported.tables.usuario).toBeUndefined()
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
