/**
 * I6 — Integración: presupuesto y gastos del proyecto.
 *
 * Componentes reales: budgetRoutes → requireAuth → requireCompany →
 * requireCompanyRole → validate (Zod) → budgetController → transacción pg
 * sobre `proyecto` (FOR UPDATE), `presupuesto_actividad`,
 * `movimiento_inventario` (GASTO_ADMIN) y `presupuesto_ajuste`.
 *
 * El resumen de presupuesto suma tres fuentes distintas —actividades,
 * movimientos de inventario y ajustes—. Las pruebas unitarias cubren
 * `budgetCalculations.js` con números sueltos; aquí se comprueba que lo que
 * escribe un endpoint es lo que el otro lee y suma.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api, closeDb, createCompanyWithOwner, createProject, query } from '../db/fixtures.js'

// Un solo pool por archivo: se cierra al final, no al terminar cada describe.
afterAll(closeDb)

describe('I6 — actividades, gastos y resumen del presupuesto', () => {
  let ctx
  let project

  beforeAll(async () => {
    ctx = await createCompanyWithOwner()
    // createProject asigna presupuesto_total = 10 000.
    project = await createProject({ id_empresa: ctx.company.id_empresa, id_encargado: ctx.owner.id_usuario })
  })


  const as = (actor, companyId = actor.company.id_empresa) => (method, url) =>
    api()[method](url)
      .set('Authorization', `Bearer ${actor.token}`)
      .set('X-Company-ID', String(companyId))

  const owner = () => as(ctx)
  const summary = async () => {
    const res = await owner()('get', `/api/budgets/project/${project.id_proyecto}/summary`)
    expect(res.status).toBe(200)
    return res.body.data
  }

  it('un proyecto nuevo arranca con su presupuesto completo disponible', async () => {
    expect(await summary()).toMatchObject({
      presupuesto_total: 10000,
      total_gastado: 0,
      disponible: 10000,
      alerta_nivel: expect.any(String),
      actividades: [],
    })
  })

  it('POST /api/budgets crea una actividad planificada que aparece en el resumen', async () => {
    const res = await owner()('post', '/api/budgets').send({
      nombre: 'Mano de obra', monto_planificado: 4000, projectId: project.id_proyecto,
    })

    expect(res.status).toBe(201)
    const data = await summary()
    expect(data.total_planificado).toBe(4000)
    expect(data.actividades.map((a) => a.nombre)).toEqual(['Mano de obra'])
  })

  it('registrar un gasto crea un movimiento GASTO_ADMIN ligado a la actividad y lo descuenta', async () => {
    const res = await owner()('post', '/api/budgets/register-expense').send({
      projectId: project.id_proyecto, activityName: 'Mano de obra', expenseAmount: 1500, motivo: 'Planilla semana 1',
    })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ total_gastado: 1500, disponible: 8500, gasto_inventario_admin: 1500 })

    const { rows } = await query(
      `SELECT m.tipo, m.precio_unitario, m.id_usuario, pa.nombre
       FROM public.movimiento_inventario m
       JOIN public.presupuesto_actividad pa ON pa.id_actividad = m.id_actividad
       WHERE m.id_proyecto = $1`,
      [project.id_proyecto]
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ tipo: 'GASTO_ADMIN', nombre: 'Mano de obra', id_usuario: ctx.owner.id_usuario })
    expect(Number(rows[0].precio_unitario)).toBe(1500)
  })

  it('los gastos se acumulan en la misma actividad aunque el nombre cambie de mayúsculas', async () => {
    const res = await owner()('post', '/api/budgets/register-expense').send({
      projectId: project.id_proyecto, activityName: '  MANO DE OBRA ', expenseAmount: 500,
    })
    expect(res.status).toBe(200)

    const data = await summary()
    expect(data.actividades).toHaveLength(1)
    expect(data.actividades[0]).toMatchObject({ monto_movimientos: 2000, gastos_count: 2 })
    expect(data.total_gastado).toBe(2000)
  })

  it('el historial de gastos de la actividad devuelve los dos movimientos', async () => {
    const [{ id_actividad }] = (await summary()).actividades
    const res = await owner()('get', `/api/budgets/${id_actividad}/expenses`)

    expect(res.status).toBe(200)
    const montos = JSON.stringify(res.body.data)
    expect(montos).toContain('1500')
    expect(montos).toContain('500')
  })

  it('un ajuste de fondos se suma al presupuesto y queda en el historial', async () => {
    const res = await owner()('post', `/api/budgets/project/${project.id_proyecto}/funding`)
      .send({ monto: 2500, motivo: 'Ampliación aprobada' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ presupuesto_total: 12500, total_ajustes: 2500, disponible: 10500 })

    const history = await owner()('get', `/api/budgets/project/${project.id_proyecto}/funding`)
    expect(history.body.data).toEqual([expect.objectContaining({ monto: 2500, motivo: 'Ampliación aprobada' })])
  })

  it('al pasar del presupuesto el resumen marca la alerta EXCEDIDO', async () => {
    const res = await owner()('post', '/api/budgets/register-expense').send({
      projectId: project.id_proyecto, activityName: 'Materiales', expenseAmount: 11000,
    })

    expect(res.status).toBe(200)
    expect(res.body.data.alerta_nivel).toBe('EXCEDIDO')
    expect(res.body.data.disponible).toBe(-500)
  })

  it('un gasto de monto cero lo rechaza la validación (400) y no escribe nada', async () => {
    const before = (await summary()).total_gastado
    const res = await owner()('post', '/api/budgets/register-expense').send({
      projectId: project.id_proyecto, activityName: 'Materiales', expenseAmount: 0,
    })

    expect(res.status).toBe(400)
    expect((await summary()).total_gastado).toBe(before)
  })
})

describe('I6 — aislamiento entre empresas en presupuesto', () => {
  let empresaA
  let empresaB
  let proyectoA
  let actividadA

  beforeAll(async () => {
    empresaA = await createCompanyWithOwner()
    empresaB = await createCompanyWithOwner()
    proyectoA = await createProject({ id_empresa: empresaA.company.id_empresa, id_encargado: empresaA.owner.id_usuario })
    const { rows } = await query(
      `INSERT INTO public.presupuesto_actividad (nombre, monto_planificado, id_proyecto)
       VALUES ('Acabados', 800, $1) RETURNING id_actividad`,
      [proyectoA.id_proyecto]
    )
    actividadA = rows[0].id_actividad
  })


  const asOwnerB = (method, url) =>
    api()[method](url)
      .set('Authorization', `Bearer ${empresaB.token}`)
      .set('X-Company-ID', String(empresaB.company.id_empresa))

  const gastosDeA = async () => {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS n FROM public.movimiento_inventario WHERE id_proyecto = $1',
      [proyectoA.id_proyecto]
    )
    return rows[0].n
  }

  it('B no puede leer el resumen de presupuesto de un proyecto de A (404)', async () => {
    const res = await asOwnerB('get', `/api/budgets/project/${proyectoA.id_proyecto}/summary`)

    expect(res.status).toBe(404)
    expect(JSON.stringify(res.body)).not.toContain('Acabados')
  })

  it('B no puede cargar gastos al proyecto de A (404) y el ROLLBACK no deja movimiento', async () => {
    const res = await asOwnerB('post', '/api/budgets/register-expense').send({
      projectId: proyectoA.id_proyecto, activityName: 'Sabotaje', expenseAmount: 999,
    })

    expect(res.status).toBe(404)
    expect(await gastosDeA()).toBe(0)
    const { rows } = await query(
      `SELECT 1 FROM public.presupuesto_actividad WHERE id_proyecto = $1 AND nombre = 'Sabotaje'`,
      [proyectoA.id_proyecto]
    )
    expect(rows).toHaveLength(0)
  })

  it('B no ve, no edita ni borra actividades de A', async () => {
    const list = await asOwnerB('get', '/api/budgets')
    expect(list.status).toBe(200)
    expect(list.body.data).toEqual([])

    expect((await asOwnerB('get', `/api/budgets/${actividadA}`)).status).toBe(404)
    expect((await asOwnerB('put', `/api/budgets/${actividadA}`).send({ monto_planificado: 0 })).status).toBe(404)
    expect((await asOwnerB('delete', `/api/budgets/${actividadA}`)).status).toBe(404)

    const { rows } = await query('SELECT monto_planificado FROM public.presupuesto_actividad WHERE id_actividad = $1', [actividadA])
    expect(Number(rows[0].monto_planificado)).toBe(800)
  })

  it('B no puede ajustar los fondos de A (404)', async () => {
    const res = await asOwnerB('post', `/api/budgets/project/${proyectoA.id_proyecto}/funding`).send({ monto: -10000 })

    expect(res.status).toBe(404)
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM public.presupuesto_ajuste WHERE id_proyecto = $1', [proyectoA.id_proyecto])
    expect(rows[0].n).toBe(0)
  })
})
