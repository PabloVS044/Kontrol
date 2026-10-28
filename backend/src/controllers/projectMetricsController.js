import pool from '../db/pool.js'
import { logger } from '../utils/logger.js'

/**
 * DT-30 (RTF 2, PERF-02): el endpoint hacía siete consultas por petición, seis
 * de ellas en paralelo, y cada una tomaba su propia conexión: con el pool de
 * 10, dos peticiones simultáneas ya lo agotaban. Es lo que llevó C2 a 1.91 s
 * de p95 frente a 500 ms. Ahora es una sola consulta, con una conexión y un
 * viaje a la base.
 *
 * Los agregados por grupo viajan como JSON; `total` va como texto para que
 * llegue igual que antes, cuando `pg` devolvía el numeric como string. Los
 * escalares no pasan por JSON y conservan su tipo.
 */
const METRICS_SQL = `
  SELECT
    COALESCE(t.filas, '[]'::json) AS tareas,
    b.total_planificado,
    b.total_real,
    COALESCE(m.filas, '[]'::json) AS movimientos,
    COALESCE(e.filas, '[]'::json) AS equipo,
    ps.entries_total,
    ps.milestones_total,
    ps.blockers_total,
    ps.last_update_at,
    lp.progress_percentage AS latest_progress_percentage
  FROM public.proyecto p
  CROSS JOIN LATERAL (
    SELECT json_agg(json_build_object('estado', estado, 'count', count)) AS filas
    FROM (
      SELECT estado, COUNT(*)::int AS count
      FROM public.tarea
      WHERE id_proyecto = p.id_proyecto
      GROUP BY estado
    ) x
  ) t
  CROSS JOIN LATERAL (
    SELECT
      COALESCE(SUM(monto_planificado), 0) AS total_planificado,
      COALESCE(SUM(monto_real), 0) AS total_real
    FROM public.presupuesto_actividad
    WHERE id_proyecto = p.id_proyecto
  ) b
  CROSS JOIN LATERAL (
    SELECT json_agg(json_build_object('tipo', tipo, 'count', count, 'total', total::text)) AS filas
    FROM (
      SELECT
        tipo,
        COUNT(*)::int AS count,
        COALESCE(SUM(precio_unitario * COALESCE(cantidad, 1)), 0) AS total
      FROM public.movimiento_inventario
      WHERE id_proyecto = p.id_proyecto
      GROUP BY tipo
    ) x
  ) m
  CROSS JOIN LATERAL (
    SELECT json_agg(json_build_object('rol', rol, 'total', total)) AS filas
    FROM (
      SELECT rp.nombre AS rol, COUNT(*)::int AS total
      FROM public.proyecto_usuario pu
      LEFT JOIN public.rol_proyecto rp ON rp.id_rol_proyecto = pu.id_rol_proyecto
      WHERE pu.id_proyecto = p.id_proyecto
      GROUP BY rp.nombre
    ) x
  ) e
  CROSS JOIN LATERAL (
    SELECT
      COUNT(*)::int AS entries_total,
      COUNT(*) FILTER (WHERE update_type = 'MILESTONE')::int AS milestones_total,
      COUNT(*) FILTER (WHERE update_type = 'BLOCKER')::int AS blockers_total,
      MAX(happened_at) AS last_update_at
    FROM public.project_progress_entry
    WHERE id_proyecto = p.id_proyecto
  ) ps
  LEFT JOIN LATERAL (
    SELECT progress_percentage
    FROM public.project_progress_entry
    WHERE id_proyecto = p.id_proyecto
    ORDER BY happened_at DESC, id_progress_entry DESC
    LIMIT 1
  ) lp ON true
  WHERE p.id_proyecto = $1
`

export const getProjectMetrics = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(METRICS_SQL, [id])

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }

    const row = result.rows[0]
    const totalTasks = row.tareas.reduce((sum, item) => sum + Number(item.count), 0)
    const completedTasks = row.tareas
      .filter((item) => item.estado === 'COMPLETADA')
      .reduce((sum, item) => sum + Number(item.count), 0)
    const taskCompletionPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0

    const hasProgressEntry = row.latest_progress_percentage !== null

    return res.status(200).json({
      success: true,
      data: {
        tareas: row.tareas,
        presupuesto: {
          total_planificado: row.total_planificado,
          total_real: row.total_real,
        },
        movimientos: row.movimientos,
        equipo: row.equipo,
        progress: {
          current_percentage: hasProgressEntry
            ? Number(row.latest_progress_percentage)
            : taskCompletionPercentage,
          derived_from: hasProgressEntry ? 'progress_entry' : 'tasks',
          last_update_at: row.last_update_at ?? null,
          entries_total: row.entries_total ?? 0,
          milestones_total: row.milestones_total ?? 0,
          blockers_total: row.blockers_total ?? 0,
          task_completion_percentage: taskCompletionPercentage,
        },
      },
    })
  } catch (error) {
    logger.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}
