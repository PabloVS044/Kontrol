/**
 * I5 — Integración: autorización por rol de empresa y por empresa.
 *
 * Componentes reales: requireAuth (JWT) → requireCompany (membresía en
 * `empresa_usuario` + `empresa.activo`) → requireCompanyRole / requireProject /
 * requireProjectPermission (rol en `rol_empresa`, asignación en
 * `proyecto_usuario`) → controlador.
 *
 * Las pruebas unitarias de estos middlewares (`requireAuth.test.js`,
 * `requireRole.test.js`, `authz.controller.test.js`) les pasan `req.empresa`
 * ya resuelto. Aquí el rol sale de las filas reales, así que lo que se prueba
 * es la cadena completa: un cambio en el catálogo de roles, en la consulta de
 * membresía o en el orden de los middlewares de una ruta se nota.
 */
import jwt from 'jsonwebtoken'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  addCompanyMember, api, closeDb, createCompanyWithOwner, createProject, createUser, query, tokenFor,
} from '../db/fixtures.js'

// Un solo pool por archivo: se cierra al final, no al terminar cada describe.
afterAll(closeDb)

describe('I5 — autorización por rol dentro de la empresa', () => {
  let ctx
  let project
  let admin
  let manager
  let collaborator
  let activityId

  beforeAll(async () => {
    ctx = await createCompanyWithOwner()
    project = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario })
    admin = await addCompanyMember({ id_empresa: ctx.company.id_empresa, rol_empresa: 'admin' })
    manager = await addCompanyMember({ id_empresa: ctx.company.id_empresa, rol_empresa: 'manager' })
    collaborator = await addCompanyMember({ id_empresa: ctx.company.id_empresa, rol_empresa: 'collaborator' })

    const { rows } = await query(
      `INSERT INTO public.presupuesto_actividad (nombre, monto_planificado, id_proyecto)
       VALUES ('Cimentación', 500, $1) RETURNING id_actividad`,
      [project.id_proyecto]
    )
    activityId = rows[0].id_actividad
  })


  const as = (actor) => (method, url) =>
    api()[method](url)
      .set('Authorization', `Bearer ${actor.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
      .set('X-Project-ID', String(project.id_proyecto))

  const expense = { projectId: 0, activityName: 'Transporte', expenseAmount: 50 }
  const registerExpense = (actor) =>
    as(actor)('post', '/api/budgets/register-expense').send({ ...expense, projectId: project.id_proyecto })

  it('owner, admin y manager pueden registrar gastos (200)', async () => {
    for (const actor of [ctx, admin, manager]) {
      const res = await registerExpense(actor)
      expect(res.status, `rol ${actor.user?.nombre ?? 'owner'}`).toBe(200)
    }
  })

  it('un collaborator no puede registrar gastos (403) y no queda movimiento', async () => {
    const before = await query(
      `SELECT COUNT(*)::int AS n FROM public.movimiento_inventario WHERE id_proyecto = $1 AND id_usuario = $2`,
      [project.id_proyecto, collaborator.user.id_usuario]
    )

    const res = await registerExpense(collaborator)

    expect(res.status).toBe(403)
    const after = await query(
      `SELECT COUNT(*)::int AS n FROM public.movimiento_inventario WHERE id_proyecto = $1 AND id_usuario = $2`,
      [project.id_proyecto, collaborator.user.id_usuario]
    )
    expect(after.rows[0].n).toBe(before.rows[0].n)
  })

  it('un manager no puede borrar actividades de presupuesto (403): solo owner y admin', async () => {
    const res = await as(manager)('delete', `/api/budgets/${activityId}`)

    expect(res.status).toBe(403)
    const { rows } = await query('SELECT 1 FROM public.presupuesto_actividad WHERE id_actividad = $1', [activityId])
    expect(rows).toHaveLength(1)
  })

  it('un admin sí puede borrar la actividad (200)', async () => {
    const res = await as(admin)('delete', `/api/budgets/${activityId}`)

    expect(res.status).toBe(200)
    const { rows } = await query('SELECT 1 FROM public.presupuesto_actividad WHERE id_actividad = $1', [activityId])
    expect(rows).toHaveLength(0)
  })

  it('un collaborator sin asignación al proyecto no puede crear productos en él (403)', async () => {
    const res = await as(collaborator)('post', '/api/products')
      .send({ nombre: 'Intruso', precio_venta: 10, precio_costo: 5 })

    expect(res.status).toBe(403)
    const { rows } = await query(
      `SELECT 1 FROM public.producto WHERE id_proyecto = $1 AND nombre = 'Intruso'`,
      [project.id_proyecto]
    )
    expect(rows).toHaveLength(0)
  })

  it('un manager sí puede crear productos en un proyecto de su empresa (201)', async () => {
    const res = await as(manager)('post', '/api/products')
      .send({ nombre: 'Pala', precio_venta: 10, precio_costo: 5 })

    expect(res.status).toBe(201)
  })

  it('solo owner y admin ajustan el presupuesto asignado del proyecto', async () => {
    const denied = await as(manager)('post', `/api/budgets/project/${project.id_proyecto}/funding`).send({ monto: 1000 })
    expect(denied.status).toBe(403)

    const allowed = await as(ctx)('post', `/api/budgets/project/${project.id_proyecto}/funding`).send({ monto: 1000 })
    expect(allowed.status).toBe(200)
    expect(allowed.body.data.presupuesto_total).toBe(11000)
  })
})

describe('I5 — autorización por empresa y por token', () => {
  let ctx
  let outsider

  beforeAll(async () => {
    ctx = await createCompanyWithOwner()
    const user = await createUser({ nombre: 'Ajeno' })
    outsider = { user, token: tokenFor(user) }
  })


  const getProjects = (token, companyId) => {
    const req = api().get('/api/projects')
    if (token) req.set('Authorization', `Bearer ${token}`)
    if (companyId !== undefined) req.set('X-Company-ID', String(companyId))
    return req
  }

  it('sin token responde 401', async () => {
    expect((await getProjects(null, ctx.company.id_empresa)).status).toBe(401)
  })

  it('un token firmado con otro secreto responde 401', async () => {
    const forged = jwt.sign(
      { id_usuario: ctx.owner.id_usuario, email: ctx.owner.email, nombre_rol: 'super_user' },
      'not-the-server-secret'
    )
    expect((await getProjects(forged, ctx.company.id_empresa)).status).toBe(401)
  })

  it('sin cabecera X-Company-ID responde 400', async () => {
    expect((await getProjects(ctx.token)).status).toBe(400)
  })

  it('un usuario autenticado que no es miembro de la empresa recibe 403', async () => {
    expect((await getProjects(outsider.token, ctx.company.id_empresa)).status).toBe(403)
  })

  it('el owner de una empresa desactivada pierde el acceso (403)', async () => {
    expect((await getProjects(ctx.token, ctx.company.id_empresa)).status).toBe(200)

    await query('UPDATE public.empresa SET activo = false WHERE id_empresa = $1', [ctx.company.id_empresa])
    const res = await getProjects(ctx.token, ctx.company.id_empresa)

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/inactive/i)
  })
})
