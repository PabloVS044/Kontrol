import pool from '../db/pool.js'

export const getProjectMetrics = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await pool.query(
      `SELECT id_proyecto
       FROM public.proyecto
       WHERE id_proyecto = $1`,
      [id]
    )

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }

    const [tasks, budget, movements, team, progressStats, latestProgress] = await Promise.all([
      pool.query(
        `SELECT estado, COUNT(*)::int AS count
         FROM public.tarea
         WHERE id_proyecto = $1
         GROUP BY estado`,
        [id]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(monto_planificado), 0) AS total_planificado,
           COALESCE(SUM(monto_real), 0) AS total_real
         FROM public.presupuesto_actividad
         WHERE id_proyecto = $1`,
        [id]
      ),
      pool.query(
        `SELECT tipo, COUNT(*)::int AS count, SUM(precio_unitario * cantidad) AS total
         FROM public.movimiento_inventario
         WHERE id_proyecto = $1
         GROUP BY tipo`,
        [id]
      ),
      pool.query(
        `SELECT rp.nombre AS rol, COUNT(*)::int AS total
         FROM public.proyecto_usuario pu
         LEFT JOIN public.rol_proyecto rp ON rp.id_rol_proyecto = pu.id_rol_proyecto
         WHERE pu.id_proyecto = $1
         GROUP BY rp.nombre`,
        [id]
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS entries_total,
           COUNT(*) FILTER (WHERE update_type = 'MILESTONE')::int AS milestones_total,
           COUNT(*) FILTER (WHERE update_type = 'BLOCKER')::int AS blockers_total,
           MAX(happened_at) AS last_update_at
         FROM public.project_progress_entry
         WHERE id_proyecto = $1`,
        [id]
      ),
      pool.query(
        `SELECT progress_percentage, happened_at
         FROM public.project_progress_entry
         WHERE id_proyecto = $1
         ORDER BY happened_at DESC, id_progress_entry DESC
         LIMIT 1`,
        [id]
      ),
    ])

    const totalTasks = tasks.rows.reduce((sum, row) => sum + Number(row.count), 0)
    const completedTasks = tasks.rows
      .filter((row) => row.estado === 'COMPLETADA')
      .reduce((sum, row) => sum + Number(row.count), 0)
    const taskCompletionPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0

    const latestProgressRow = latestProgress.rows[0]
    const progressSummary = progressStats.rows[0] ?? {}

    return res.status(200).json({
      success: true,
      data: {
        tareas: tasks.rows,
        presupuesto: budget.rows[0],
        movimientos: movements.rows,
        equipo: team.rows,
        progress: {
          current_percentage: latestProgressRow
            ? Number(latestProgressRow.progress_percentage)
            : taskCompletionPercentage,
          derived_from: latestProgressRow ? 'progress_entry' : 'tasks',
          last_update_at: progressSummary.last_update_at ?? null,
          entries_total: progressSummary.entries_total ?? 0,
          milestones_total: progressSummary.milestones_total ?? 0,
          blockers_total: progressSummary.blockers_total ?? 0,
          task_completion_percentage: taskCompletionPercentage,
        },
      },
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}
