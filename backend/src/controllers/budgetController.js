import pool from '../db/pool.js'

const ACTIVIDAD_SELECT = `
  id_actividad, nombre, monto_planificado, monto_real, id_proyecto
`

// GET /api/budgets
// Lista de actividades de presupuesto. Opcional filtro por id_proyecto.
export const getActividades = async (req, res) => {
  const { id_proyecto } = req.query
  const values = []
  let where = ''

  if (id_proyecto) {
    values.push(id_proyecto)
    where = `WHERE id_proyecto = $${values.length}`
  }

  const result = await pool.query(
    `SELECT ${ACTIVIDAD_SELECT} FROM public.presupuesto_actividad
     ${where} ORDER BY id_actividad`,
    values
  )

  return res.json({ success: true, data: result.rows })
}

// GET /api/budgets/:id
export const getActividadById = async (req, res) => {
  const result = await pool.query(
    `SELECT ${ACTIVIDAD_SELECT} FROM public.presupuesto_actividad WHERE id_actividad = $1`,
    [req.params.id]
  )
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Actividad no encontrada.' })
  }
  return res.json({ success: true, data: result.rows[0] })
}

// POST /api/budgets
export const createActividad = async (req, res) => {
  const { nombre, monto_planificado, monto_real, id_proyecto } = req.body

  const proyecto = await pool.query(
    'SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1',
    [id_proyecto]
  )
  if (!proyecto.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }

  const result = await pool.query(
    `INSERT INTO public.presupuesto_actividad
       (nombre, monto_planificado, monto_real, id_proyecto)
     VALUES ($1, $2, $3, $4)
     RETURNING ${ACTIVIDAD_SELECT}`,
    [nombre, monto_planificado, monto_real ?? null, id_proyecto]
  )

  return res.status(201).json({ success: true, data: result.rows[0] })
}

// PUT /api/budgets/:id
export const updateActividad = async (req, res) => {
  const { id } = req.params
  const { nombre, monto_planificado, monto_real } = req.body

  const existing = await pool.query(
    'SELECT id_actividad FROM public.presupuesto_actividad WHERE id_actividad = $1',
    [id]
  )
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Actividad no encontrada.' })
  }

  const setClauses = []
  const values = []

  if (nombre !== undefined)            { values.push(nombre);            setClauses.push(`nombre = $${values.length}`) }
  if (monto_planificado !== undefined) { values.push(monto_planificado); setClauses.push(`monto_planificado = $${values.length}`) }
  if (monto_real !== undefined)        { values.push(monto_real);        setClauses.push(`monto_real = $${values.length}`) }

  values.push(id)
  const result = await pool.query(
    `UPDATE public.presupuesto_actividad SET ${setClauses.join(', ')}
     WHERE id_actividad = $${values.length}
     RETURNING ${ACTIVIDAD_SELECT}`,
    values
  )

  return res.json({ success: true, data: result.rows[0] })
}

// DELETE /api/budgets/:id
export const deleteActividad = async (req, res) => {
  const result = await pool.query(
    'DELETE FROM public.presupuesto_actividad WHERE id_actividad = $1 RETURNING id_actividad',
    [req.params.id]
  )
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Actividad no encontrada.' })
  }
  return res.json({ success: true, message: 'Actividad eliminada correctamente.' })
}

// GET /api/budgets/project/:id_proyecto/summary
// Resumen del presupuesto del proyecto con alertas (consolidado).
export const getProjectBudgetSummary = async (req, res) => {
  const { id_proyecto } = req.params

  const projectResult = await pool.query(
    `SELECT id_proyecto, nombre, presupuesto_total
     FROM public.proyecto WHERE id_proyecto = $1`,
    [id_proyecto]
  )
  if (!projectResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }

  const actividadesResult = await pool.query(
    `SELECT ${ACTIVIDAD_SELECT} FROM public.presupuesto_actividad
     WHERE id_proyecto = $1 ORDER BY id_actividad`,
    [id_proyecto]
  )

  const proyecto = projectResult.rows[0]
  const actividades = actividadesResult.rows

  const presupuestoTotal = parseFloat(proyecto.presupuesto_total)
  const totalPlanificado = actividades.reduce((sum, a) => sum + parseFloat(a.monto_planificado || 0), 0)
  const totalGastado     = actividades.reduce((sum, a) => sum + parseFloat(a.monto_real || 0), 0)
  const disponible       = presupuestoTotal - totalGastado
  const porcentajeUso    = presupuestoTotal > 0 ? totalGastado / presupuestoTotal : 0
  const porcentajeCompletado = Math.min(100, Math.round(porcentajeUso * 100))

  let alerta = null
  let alertaNivel = null
  if (totalGastado >= presupuestoTotal && presupuestoTotal > 0) {
    alertaNivel = 'CRITICO'
    alerta = 'CRÍTICO: Se ha alcanzado o superado el presupuesto total del proyecto.'
  } else if (porcentajeUso >= 0.8) {
    alertaNivel = 'ADVERTENCIA'
    alerta = 'ADVERTENCIA: Se ha utilizado más del 80% del presupuesto disponible.'
  }

  return res.json({
    success: true,
    data: {
      proyecto: {
        id_proyecto: proyecto.id_proyecto,
        nombre: proyecto.nombre,
      },
      presupuesto_total:     presupuestoTotal,
      total_planificado:     totalPlanificado,
      total_gastado:         totalGastado,
      disponible,
      porcentaje_uso:        Number(porcentajeUso.toFixed(4)),
      porcentaje_completado: porcentajeCompletado,
      alerta,
      alerta_nivel:          alertaNivel,
      actividades,
    },
  })
}

// POST /api/budgets/register-expense
// Endpoint original (a9c8551): registra/acumula gasto por nombre de actividad
// y devuelve totales + alertas del proyecto.
export const registerExpense = async (req, res) => {
  const { id_proyecto, nombre_actividad, monto_gasto } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const proyecto = await client.query(
      'SELECT id_proyecto, presupuesto_total FROM public.proyecto WHERE id_proyecto = $1 FOR UPDATE',
      [id_proyecto]
    )
    if (!proyecto.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
    }

    // Buscar actividad existente por (id_proyecto, nombre)
    const existing = await client.query(
      `SELECT id_actividad, monto_real FROM public.presupuesto_actividad
       WHERE id_proyecto = $1 AND nombre = $2`,
      [id_proyecto, nombre_actividad]
    )

    if (existing.rows.length) {
      await client.query(
        `UPDATE public.presupuesto_actividad
         SET monto_real = COALESCE(monto_real, 0) + $1
         WHERE id_actividad = $2`,
        [monto_gasto, existing.rows[0].id_actividad]
      )
    } else {
      await client.query(
        `INSERT INTO public.presupuesto_actividad
           (nombre, monto_planificado, monto_real, id_proyecto)
         VALUES ($1, 0, $2, $3)`,
        [nombre_actividad, monto_gasto, id_proyecto]
      )
    }

    const totals = await client.query(
      `SELECT COALESCE(SUM(monto_real), 0) AS total_acumulado
       FROM public.presupuesto_actividad WHERE id_proyecto = $1`,
      [id_proyecto]
    )

    await client.query('COMMIT')

    const presupuestoTotal = parseFloat(proyecto.rows[0].presupuesto_total)
    const totalAcumulado   = parseFloat(totals.rows[0].total_acumulado) || 0
    const porcentajeUso    = presupuestoTotal > 0 ? totalAcumulado / presupuestoTotal : 0

    let alerta = null
    let alertaNivel = null
    if (totalAcumulado >= presupuestoTotal && presupuestoTotal > 0) {
      alertaNivel = 'CRITICO'
      alerta = 'CRÍTICO: Se ha alcanzado o superado el presupuesto total del proyecto.'
    } else if (porcentajeUso >= 0.8) {
      alertaNivel = 'ADVERTENCIA'
      alerta = 'ADVERTENCIA: Se ha utilizado más del 80% del presupuesto disponible.'
    }

    return res.status(200).json({
      success: true,
      data: {
        total_proyecto: presupuestoTotal,
        gasto_actual:   totalAcumulado,
        disponible:     presupuestoTotal - totalAcumulado,
        porcentaje_uso: Number(porcentajeUso.toFixed(4)),
        alerta,
        alerta_nivel:   alertaNivel,
      },
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// GET /api/budgets/project/:id_proyecto/trend
// Serie temporal de gasto acumulado (proxy: movimiento_inventario tipo ENTRADA / GASTO_ADMIN)
// junto con el plan del proyecto (fecha_inicio, fecha_fin_planificada, presupuesto_total).
export const getProjectBudgetTrend = async (req, res) => {
  const { id_proyecto } = req.params
  const { id_empresa } = req.empresa

  const projectResult = await pool.query(
    `SELECT id_proyecto, nombre, presupuesto_total, fecha_inicio, fecha_fin_planificada
     FROM public.proyecto
     WHERE id_proyecto = $1 AND id_empresa = $2`,
    [id_proyecto, id_empresa]
  )
  if (!projectResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }
  const proyecto = projectResult.rows[0]

  // Gasto diario agregado: ENTRADA (compras) y GASTO_ADMIN
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
    [id_proyecto, id_empresa]
  )

  let acumulado = 0
  const puntos = trendResult.rows.map(r => {
    acumulado += Number(r.monto_dia)
    return {
      fecha: r.dia instanceof Date ? r.dia.toISOString().slice(0, 10) : r.dia,
      monto_dia: Number(r.monto_dia),
      acumulado: Number(acumulado.toFixed(2)),
    }
  })

  // Total actual registrado en presupuesto_actividad (source of truth del Budget module)
  const totalActivity = await pool.query(
    `SELECT COALESCE(SUM(monto_real), 0) AS total_gastado
     FROM public.presupuesto_actividad WHERE id_proyecto = $1`,
    [id_proyecto]
  )

  return res.json({
    success: true,
    data: {
      proyecto: {
        id_proyecto:           proyecto.id_proyecto,
        nombre:                proyecto.nombre,
        presupuesto_total:     Number(proyecto.presupuesto_total),
        fecha_inicio:          proyecto.fecha_inicio,
        fecha_fin_planificada: proyecto.fecha_fin_planificada,
      },
      puntos,
      total_gastado_actividades: Number(totalActivity.rows[0].total_gastado),
      total_acumulado_movimientos: Number(acumulado.toFixed(2)),
    },
  })
}
