import pool from '../db/pool.js'

const ACTIVITY_SELECT = `
  id_actividad, nombre, monto_planificado, monto_real, id_proyecto
`

const getCompanyId = (req) => req.company?.id_empresa ?? req.empresa?.id_empresa

// GET /api/budgets
// List budget activities, optionally filtered by project.
export const getActivities = async (req, res) => {
  const projectId = req.query.projectId
  const values = []
  let where = ''

  if (projectId) {
    values.push(projectId)
    where = `WHERE id_proyecto = $${values.length}`
  }

  const result = await pool.query(
    `SELECT ${ACTIVITY_SELECT} FROM public.presupuesto_actividad
     ${where} ORDER BY id_actividad`,
    values
  )

  return res.json({ success: true, data: result.rows })
}

// GET /api/budgets/:id
export const getActivityById = async (req, res) => {
  const result = await pool.query(
    `SELECT ${ACTIVITY_SELECT} FROM public.presupuesto_actividad WHERE id_actividad = $1`,
    [req.params.id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Activity not found.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

// POST /api/budgets
export const createActivity = async (req, res) => {
  const { nombre, monto_planificado, monto_real, projectId } = req.body

  const project = await pool.query(
    'SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1',
    [projectId]
  )

  if (!project.rows.length) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const result = await pool.query(
    `INSERT INTO public.presupuesto_actividad
       (nombre, monto_planificado, monto_real, id_proyecto)
     VALUES ($1, $2, $3, $4)
     RETURNING ${ACTIVITY_SELECT}`,
    [nombre, monto_planificado, monto_real ?? null, projectId]
  )

  return res.status(201).json({ success: true, data: result.rows[0] })
}

// PUT /api/budgets/:id
export const updateActivity = async (req, res) => {
  const { id } = req.params
  const { nombre, monto_planificado, monto_real } = req.body

  const existing = await pool.query(
    'SELECT id_actividad FROM public.presupuesto_actividad WHERE id_actividad = $1',
    [id]
  )

  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Activity not found.' })
  }

  const setClauses = []
  const values = []

  if (nombre !== undefined) {
    values.push(nombre)
    setClauses.push(`nombre = $${values.length}`)
  }
  if (monto_planificado !== undefined) {
    values.push(monto_planificado)
    setClauses.push(`monto_planificado = $${values.length}`)
  }
  if (monto_real !== undefined) {
    values.push(monto_real)
    setClauses.push(`monto_real = $${values.length}`)
  }

  values.push(id)
  const result = await pool.query(
    `UPDATE public.presupuesto_actividad SET ${setClauses.join(', ')}
     WHERE id_actividad = $${values.length}
     RETURNING ${ACTIVITY_SELECT}`,
    values
  )

  return res.json({ success: true, data: result.rows[0] })
}

// DELETE /api/budgets/:id
export const deleteActivity = async (req, res) => {
  const result = await pool.query(
    'DELETE FROM public.presupuesto_actividad WHERE id_actividad = $1 RETURNING id_actividad',
    [req.params.id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Activity not found.' })
  }

  return res.json({ success: true, message: 'Activity deleted successfully.' })
}

// GET /api/budgets/project/:projectId/summary
export const getProjectBudgetSummary = async (req, res) => {
  const { projectId } = req.params

  const projectResult = await pool.query(
    `SELECT id_proyecto, nombre, presupuesto_total
     FROM public.proyecto WHERE id_proyecto = $1`,
    [projectId]
  )

  if (!projectResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const activitiesResult = await pool.query(
    `SELECT ${ACTIVITY_SELECT} FROM public.presupuesto_actividad
     WHERE id_proyecto = $1 ORDER BY id_actividad`,
    [projectId]
  )

  const project = projectResult.rows[0]
  const activities = activitiesResult.rows

  const totalBudget = parseFloat(project.presupuesto_total)
  const totalPlanned = activities.reduce((sum, activity) => sum + parseFloat(activity.monto_planificado || 0), 0)
  const totalSpent = activities.reduce((sum, activity) => sum + parseFloat(activity.monto_real || 0), 0)
  const available = totalBudget - totalSpent
  const usageRatio = totalBudget > 0 ? totalSpent / totalBudget : 0
  const completionPercentage = Math.min(100, Math.round(usageRatio * 100))

  let alert = null
  let alertLevel = null

  if (totalSpent >= totalBudget && totalBudget > 0) {
    alertLevel = 'CRITICO'
    alert = 'CRITICAL: The total project budget has been reached or exceeded.'
  } else if (usageRatio >= 0.8) {
    alertLevel = 'ADVERTENCIA'
    alert = 'WARNING: More than 80% of the available budget has been used.'
  }

  return res.json({
    success: true,
    data: {
      proyecto: {
        id_proyecto: project.id_proyecto,
        nombre: project.nombre,
      },
      presupuesto_total: totalBudget,
      total_planificado: totalPlanned,
      total_gastado: totalSpent,
      disponible: available,
      porcentaje_uso: Number(usageRatio.toFixed(4)),
      porcentaje_completado: completionPercentage,
      alerta: alert,
      alerta_nivel: alertLevel,
      actividades: activities,
    },
  })
}

// POST /api/budgets/register-expense
// Accumulates spending by activity name and returns updated budget totals.
export const registerExpense = async (req, res) => {
  const { projectId, activityName, expenseAmount } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const project = await client.query(
      'SELECT id_proyecto, presupuesto_total FROM public.proyecto WHERE id_proyecto = $1 FOR UPDATE',
      [projectId]
    )

    if (!project.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }

    const existing = await client.query(
      `SELECT id_actividad, monto_real FROM public.presupuesto_actividad
       WHERE id_proyecto = $1 AND nombre = $2`,
      [projectId, activityName]
    )

    if (existing.rows.length) {
      await client.query(
        `UPDATE public.presupuesto_actividad
         SET monto_real = COALESCE(monto_real, 0) + $1
         WHERE id_actividad = $2`,
        [expenseAmount, existing.rows[0].id_actividad]
      )
    } else {
      await client.query(
        `INSERT INTO public.presupuesto_actividad
           (nombre, monto_planificado, monto_real, id_proyecto)
         VALUES ($1, 0, $2, $3)`,
        [activityName, expenseAmount, projectId]
      )
    }

    const totals = await client.query(
      `SELECT COALESCE(SUM(monto_real), 0) AS total_acumulado
       FROM public.presupuesto_actividad WHERE id_proyecto = $1`,
      [projectId]
    )

    await client.query('COMMIT')

    const totalBudget = parseFloat(project.rows[0].presupuesto_total)
    const totalSpent = parseFloat(totals.rows[0].total_acumulado) || 0
    const usageRatio = totalBudget > 0 ? totalSpent / totalBudget : 0

    let alert = null
    let alertLevel = null
    if (totalSpent >= totalBudget && totalBudget > 0) {
      alertLevel = 'CRITICO'
      alert = 'CRITICAL: The total project budget has been reached or exceeded.'
    } else if (usageRatio >= 0.8) {
      alertLevel = 'ADVERTENCIA'
      alert = 'WARNING: More than 80% of the available budget has been used.'
    }

    return res.status(200).json({
      success: true,
      data: {
        total_proyecto: totalBudget,
        gasto_actual: totalSpent,
        disponible: totalBudget - totalSpent,
        porcentaje_uso: Number(usageRatio.toFixed(4)),
        alerta: alert,
        alerta_nivel: alertLevel,
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// GET /api/budgets/project/:projectId/trend
// Returns cumulative project spending based on inventory movements.
export const getProjectBudgetTrend = async (req, res) => {
  const { projectId } = req.params
  const companyId = getCompanyId(req)

  const projectResult = await pool.query(
    `SELECT id_proyecto, nombre, presupuesto_total, fecha_inicio, fecha_fin_planificada
     FROM public.proyecto
     WHERE id_proyecto = $1 AND id_empresa = $2`,
    [projectId, companyId]
  )

  if (!projectResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const project = projectResult.rows[0]

  const trendResult = await pool.query(
    `SELECT
       DATE(fecha) AS dia,
       SUM(COALESCE(cantidad, 1) * COALESCE(precio_unitario, 0))::numeric AS monto_dia
     FROM public.movimiento_inventario
     WHERE id_proyecto = $1
       AND id_empresa = $2
       AND tipo IN ('ENTRADA', 'GASTO_ADMIN')
     GROUP BY DATE(fecha)
     ORDER BY DATE(fecha) ASC`,
    [projectId, companyId]
  )

  let accumulated = 0
  const points = trendResult.rows.map((row) => {
    accumulated += Number(row.monto_dia)
    return {
      fecha: row.dia instanceof Date ? row.dia.toISOString().slice(0, 10) : row.dia,
      monto_dia: Number(row.monto_dia),
      acumulado: Number(accumulated.toFixed(2)),
    }
  })

  const totalActivity = await pool.query(
    `SELECT COALESCE(SUM(monto_real), 0) AS total_gastado
     FROM public.presupuesto_actividad WHERE id_proyecto = $1`,
    [projectId]
  )

  return res.json({
    success: true,
    data: {
      proyecto: {
        id_proyecto: project.id_proyecto,
        nombre: project.nombre,
        presupuesto_total: Number(project.presupuesto_total),
        fecha_inicio: project.fecha_inicio,
        fecha_fin_planificada: project.fecha_fin_planificada,
      },
      puntos: points,
      total_gastado_actividades: Number(totalActivity.rows[0].total_gastado),
      total_acumulado_movimientos: Number(accumulated.toFixed(2)),
    },
  })
}
