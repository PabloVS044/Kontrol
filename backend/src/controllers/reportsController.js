import pool from "../db/pool.js";

// A report belongs to a company either directly (exports, which span every
// project) or through its project (manually created reports, whose id_empresa
// is backfilled but kept coherent here for rows written before the migration).
const COMPANY_SCOPE = `COALESCE(r.id_empresa, p.id_empresa) = `

//GET /api/reports
export const getReports = async (req, res) => {
  try {
    const { id_empresa } = req.empresa

    const result = await pool.query(
      `SELECT r.*
       FROM public.reporte r
       LEFT JOIN public.proyecto p ON p.id_proyecto = r.id_proyecto
       WHERE ${COMPANY_SCOPE}$1
       ORDER BY r.fecha_generacion DESC`,
      [id_empresa]
    )

    return res.status(200).json({ success: true, data: result.rows })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

//GET /api/reports/:id
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params
    const { id_empresa } = req.empresa

    const result = await pool.query(
      `SELECT r.*
       FROM public.reporte r
       LEFT JOIN public.proyecto p ON p.id_proyecto = r.id_proyecto
       WHERE r.id_reporte = $1 AND ${COMPANY_SCOPE}$2`,
      [id, id_empresa]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Report not found.' })
    }

    return res.status(200).json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

//POST /api/reports
export const createReport = async (req, res) => {
  try {
    const { titulo, tipo, contenido_url, id_proyecto } = req.body
    const id_usuario = req.user.id_usuario
    const { id_empresa } = req.empresa

    const projectCheck = await pool.query(
      `SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2`,
      [id_proyecto, id_empresa]
    )

    if (!projectCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }

    const result = await pool.query(
      `INSERT INTO public.reporte (titulo, tipo, contenido_url, id_proyecto, id_empresa, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [titulo, tipo, contenido_url, id_proyecto, id_empresa, id_usuario]
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

//POST /api/reports/exports
//Records that a report was downloaded as a shareable file. The file itself is
//built in the browser from what is already on screen; this only leaves the
//generation event in REPORTE so the reports list shows who exported what.
export const registerReportExport = async (req, res) => {
  try {
    const { titulo, tipo, id_proyecto } = req.body
    const id_usuario = req.user.id_usuario
    const { id_empresa } = req.empresa

    // A project-scoped export must name a project of this company; a
    // company-wide one leaves id_proyecto null.
    if (id_proyecto != null) {
      const projectCheck = await pool.query(
        `SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2`,
        [id_proyecto, id_empresa]
      )

      if (!projectCheck.rows.length) {
        return res.status(404).json({ success: false, message: 'Project not found.' })
      }
    }

    const result = await pool.query(
      `INSERT INTO public.reporte (titulo, tipo, id_proyecto, id_empresa, id_usuario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titulo, tipo, id_proyecto ?? null, id_empresa, id_usuario]
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

//PUT /api/reports/:id
export const updateReport = async (req, res) => {
  try {
    const { id } = req.params
    const { titulo, tipo, contenido_url } = req.body
    const { id_empresa } = req.empresa

    const result = await pool.query(
      `UPDATE public.reporte r
       SET titulo = $1, tipo = $2, contenido_url = $3
       WHERE r.id_reporte = $4
         AND COALESCE(
               r.id_empresa,
               (SELECT p.id_empresa FROM public.proyecto p WHERE p.id_proyecto = r.id_proyecto)
             ) = $5
       RETURNING r.*`,
      [titulo, tipo, contenido_url, id, id_empresa]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Report not found.' })
    }

    return res.status(200).json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

//DELETE /api/reports/:id
export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params
    const { id_empresa } = req.empresa

    const result = await pool.query(
      `DELETE FROM public.reporte r
       WHERE r.id_reporte = $1
         AND COALESCE(
               r.id_empresa,
               (SELECT p.id_empresa FROM public.proyecto p WHERE p.id_proyecto = r.id_proyecto)
             ) = $2
       RETURNING r.id_reporte`,
      [id, id_empresa]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Report not found.' })
    }

    return res.status(200).json({ success: true, message: 'Report deleted.' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

//GET /api/reports/summary
export const getCompanySummary = async (req, res) => {
  try {
    const { id_empresa } = req.empresa

    const result = await pool.query(
      `SELECT
         p.id_proyecto,
         p.nombre,
         p.descripcion,
         p.estado,
         p.fecha_inicio,
         p.fecha_fin_planificada,
         p.presupuesto_total,
         COALESCE(t.total_tareas, 0)        AS total_tareas,
         COALESCE(t.tareas_completadas, 0) AS tareas_completadas,
         COALESCE(t.tareas_en_progreso, 0) AS tareas_en_progreso,
         COALESCE(t.tareas_pendientes, 0)  AS tareas_pendientes,
         COALESCE(b.total_planificado, 0)  AS presupuesto_planificado,
         COALESCE(b.total_real, 0)         AS presupuesto_real,
         COALESCE(pr.progreso_actual, 0)   AS progreso_actual
       FROM public.proyecto p
       LEFT JOIN (
         SELECT id_proyecto,
           COUNT(*)::int                                          AS total_tareas,
           COUNT(*) FILTER (WHERE estado = 'COMPLETADA')::int    AS tareas_completadas,
           COUNT(*) FILTER (WHERE estado = 'EN_PROGRESO')::int   AS tareas_en_progreso,
           COUNT(*) FILTER (WHERE estado = 'PENDIENTE')::int     AS tareas_pendientes
         FROM public.tarea
         GROUP BY id_proyecto
       ) t ON t.id_proyecto = p.id_proyecto
       LEFT JOIN (
         SELECT id_proyecto,
           COALESCE(SUM(monto_planificado), 0) AS total_planificado,
           COALESCE(SUM(monto_real), 0)        AS total_real
         FROM public.presupuesto_actividad
         GROUP BY id_proyecto
       ) b ON b.id_proyecto = p.id_proyecto
       LEFT JOIN LATERAL (
         SELECT progress_percentage AS progreso_actual
         FROM public.project_progress_entry
         WHERE id_proyecto = p.id_proyecto
         ORDER BY happened_at DESC, id_progress_entry DESC
         LIMIT 1
       ) pr ON true
       WHERE p.id_empresa = $1
       ORDER BY p.fecha_inicio DESC`,
      [id_empresa]
    )

    const proyectos = result.rows.map(p => {
      const totalTareas = Number(p.total_tareas)
      const tareasCompletadas = Number(p.tareas_completadas)
      const progresoEntrada = Number(p.progreso_actual)

      const progreso = progresoEntrada > 0
        ? progresoEntrada
        : totalTareas > 0
          ? Math.round((tareasCompletadas / totalTareas) * 100)
          : 0

      return { ...p, progreso_actual: progreso }
    })

    const totales = {
      total_proyectos:        proyectos.length,
      proyectos_activos:      proyectos.filter(p => p.estado === 'EN_PROGRESO').length,
      proyectos_completados:  proyectos.filter(p => p.estado === 'COMPLETADO').length,
      presupuesto_total:      proyectos.reduce((sum, p) => sum + Number(p.presupuesto_total ?? 0), 0),
    }

    return res.status(200).json({ success: true, data: { totales, proyectos } })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}
