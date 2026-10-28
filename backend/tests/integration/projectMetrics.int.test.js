/**
 * DT-30 (RTF 2, PERF-02) — Integración: métricas del proyecto en una consulta.
 *
 * `GET /api/projects/:id/metrics` pasó de siete consultas, seis en paralelo y
 * cada una con su conexión, a una sola. La respuesta tiene que ser la misma:
 * esta prueba ejecuta aquí las siete consultas originales como referencia y
 * compara campo por campo, tipos incluidos (los numeric llegan como string).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api, closeDb, createCompanyWithOwner, createProduct, createProject, query } from '../db/fixtures.js'

// Las consultas de antes del cambio, tal cual estaban en el controlador.
async function referencia(id) {
  const [tasks, budget, movements, team, progressStats, latestProgress] = await Promise.all([
    query(`SELECT estado, COUNT(*)::int AS count FROM public.tarea WHERE id_proyecto = $1 GROUP BY estado`, [id]),
    query(
      `SELECT COALESCE(SUM(monto_planificado), 0) AS total_planificado, COALESCE(SUM(monto_real), 0) AS total_real
       FROM public.presupuesto_actividad WHERE id_proyecto = $1`,
      [id]
    ),
    query(
      `SELECT tipo, COUNT(*)::int AS count, COALESCE(SUM(precio_unitario * COALESCE(cantidad, 1)), 0) AS total
       FROM public.movimiento_inventario WHERE id_proyecto = $1 GROUP BY tipo`,
      [id]
    ),
    query(
      `SELECT rp.nombre AS rol, COUNT(*)::int AS total
       FROM public.proyecto_usuario pu
       LEFT JOIN public.rol_proyecto rp ON rp.id_rol_proyecto = pu.id_rol_proyecto
       WHERE pu.id_proyecto = $1 GROUP BY rp.nombre`,
      [id]
    ),
    query(
      `SELECT COUNT(*)::int AS entries_total,
              COUNT(*) FILTER (WHERE update_type = 'MILESTONE')::int AS milestones_total,
              COUNT(*) FILTER (WHERE update_type = 'BLOCKER')::int AS blockers_total,
              MAX(happened_at) AS last_update_at
       FROM public.project_progress_entry WHERE id_proyecto = $1`,
      [id]
    ),
    query(
      `SELECT progress_percentage, happened_at FROM public.project_progress_entry
       WHERE id_proyecto = $1 ORDER BY happened_at DESC, id_progress_entry DESC LIMIT 1`,
      [id]
    ),
  ])

  const totalTasks = tasks.rows.reduce((sum, row) => sum + Number(row.count), 0)
  const completed = tasks.rows.filter((r) => r.estado === 'COMPLETADA').reduce((s, r) => s + Number(r.count), 0)
  const pct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0
  const latest = latestProgress.rows[0]
  const summary = progressStats.rows[0] ?? {}

  // Ida y vuelta por JSON, como hacía res.json con las filas de pg.
  return JSON.parse(JSON.stringify({
    tareas: tasks.rows,
    presupuesto: budget.rows[0],
    movimientos: movements.rows,
    equipo: team.rows,
    progress: {
      current_percentage: latest ? Number(latest.progress_percentage) : pct,
      derived_from: latest ? 'progress_entry' : 'tasks',
      last_update_at: summary.last_update_at ?? null,
      entries_total: summary.entries_total ?? 0,
      milestones_total: summary.milestones_total ?? 0,
      blockers_total: summary.blockers_total ?? 0,
      task_completion_percentage: pct,
    },
  }))
}

// GROUP BY sin ORDER BY no garantiza orden, ni antes ni ahora.
const ordenado = (data) => ({
  ...data,
  tareas: [...data.tareas].sort((a, b) => a.estado.localeCompare(b.estado)),
  movimientos: [...data.movimientos].sort((a, b) => a.tipo.localeCompare(b.tipo)),
  equipo: [...data.equipo].sort((a, b) => String(a.rol).localeCompare(String(b.rol))),
})

describe('DT-30 — métricas del proyecto en una sola consulta', () => {
  let ctx
  let lleno
  let vacio

  beforeAll(async () => {
    ctx = await createCompanyWithOwner()
    const empresa = ctx.company.id_empresa
    const owner = ctx.owner.id_usuario
    lleno = await createProject({ id_empresa: empresa, id_encargado: owner, nombre: 'Con datos' })
    vacio = await createProject({ id_empresa: empresa, id_encargado: owner, nombre: 'Sin datos' })
    const id = lleno.id_proyecto

    for (const estado of ['PENDIENTE', 'PENDIENTE', 'EN_PROGRESO', 'COMPLETADA']) {
      await query('INSERT INTO public.tarea (nombre, estado, id_proyecto) VALUES ($1, $2, $3)', [`T ${estado}`, estado, id])
    }
    await query(
      `INSERT INTO public.presupuesto_actividad (nombre, monto_planificado, monto_real, id_proyecto)
       VALUES ('Materiales', 1500.50, 1200.25, $1), ('Mano de obra', 800, NULL, $1)`,
      [id]
    )
    const producto = await createProduct({ id_proyecto: id })
    await query(
      `INSERT INTO public.movimiento_inventario (tipo, cantidad, precio_unitario, id_empresa, id_usuario, id_proyecto, id_producto)
       VALUES ('ENTRADA', 10, 5.25, $1, $2, $3, $4), ('SALIDA', 3, 12, $1, $2, $3, $4)`,
      [empresa, owner, id, producto.id_producto]
    )
    await query(
      `INSERT INTO public.movimiento_inventario (tipo, cantidad, precio_unitario, id_empresa, id_usuario, id_proyecto)
       VALUES ('GASTO_ADMIN', NULL, 99.99, $1, $2, $3)`,
      [empresa, owner, id]
    )
    const rol = await query(
      `INSERT INTO public.rol_proyecto (id_proyecto, nombre) VALUES ($1, 'Supervisor') RETURNING id_rol_proyecto`,
      [id]
    )
    await query('INSERT INTO public.proyecto_usuario (id_proyecto, id_usuario, id_rol_proyecto) VALUES ($1, $2, $3)', [
      id,
      owner,
      rol.rows[0].id_rol_proyecto,
    ])
    await query(
      `INSERT INTO public.project_progress_entry (id_proyecto, id_usuario, title, update_type, progress_percentage, happened_at)
       VALUES ($1, $2, 'Inicio', 'UPDATE', 10, NOW() - INTERVAL '2 days'),
              ($1, $2, 'Hito', 'MILESTONE', 45.5, NOW() - INTERVAL '1 day'),
              ($1, $2, 'Bloqueo', 'BLOCKER', 40, NOW())`,
      [id, owner]
    )
  })

  afterAll(closeDb)

  const metrics = (project) =>
    api()
      .get(`/api/projects/${project.id_proyecto}/metrics`)
      .set('Authorization', `Bearer ${ctx.token}`)
      .set('X-Company-ID', String(ctx.company.id_empresa))
      .set('X-Project-ID', String(project.id_proyecto))

  it('devuelve lo mismo que las siete consultas originales en un proyecto con datos', async () => {
    const res = await metrics(lleno)

    expect(res.status).toBe(200)
    expect(ordenado(res.body.data)).toEqual(ordenado(await referencia(lleno.id_proyecto)))
    // Comprobación explícita de lo que la paridad podría tapar si ambos lados fallaran igual.
    expect(res.body.data.presupuesto).toEqual({ total_planificado: '2300.50', total_real: '1200.25' })
    expect(res.body.data.progress).toMatchObject({ current_percentage: 40, derived_from: 'progress_entry', entries_total: 3 })
  })

  it('devuelve lo mismo en un proyecto vacío', async () => {
    const res = await metrics(vacio)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(await referencia(vacio.id_proyecto))
    expect(res.body.data.progress.derived_from).toBe('tasks')
  })
})
