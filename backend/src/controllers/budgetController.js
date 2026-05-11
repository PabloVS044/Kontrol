import pool from '../db/pool.js'
import { notifyCompany } from '../services/notificationService.js'

const ACTIVITY_SELECT = `
  pa.id_actividad, pa.nombre, pa.monto_planificado, pa.monto_real, pa.id_proyecto
`

const PROJECT_SCOPE_JOIN = `
  JOIN public.proyecto p ON p.id_proyecto = pa.id_proyecto
`

// ── Alert levels ─────────────────────────────────────────────────────────────
// Granular thresholds let the UI surface a richer signal than just "warning".
const ALERT_LEVELS = {
  SALUDABLE:   { threshold: 0,    message: 'Budget on track.' },
  PRECAUCION:  { threshold: 0.6,  message: '60% of the budget has been used. Monitor spending.' },
  ADVERTENCIA: { threshold: 0.8,  message: 'More than 80% of the budget has been used.' },
  CRITICO:     { threshold: 1.0,  message: 'The project budget has been fully consumed.' },
  EXCEDIDO:    { threshold: 1.0001, message: 'Spending has exceeded the allocated budget.' },
}

const computeAlert = (usageRatio, totalBudget) => {
  if (!totalBudget || totalBudget <= 0) {
    return { alerta: null, alerta_nivel: null }
  }

  let level = 'SALUDABLE'
  if (usageRatio > ALERT_LEVELS.EXCEDIDO.threshold) level = 'EXCEDIDO'
  else if (usageRatio >= ALERT_LEVELS.CRITICO.threshold) level = 'CRITICO'
  else if (usageRatio >= ALERT_LEVELS.ADVERTENCIA.threshold) level = 'ADVERTENCIA'
  else if (usageRatio >= ALERT_LEVELS.PRECAUCION.threshold) level = 'PRECAUCION'

  if (level === 'SALUDABLE') {
    return { alerta: null, alerta_nivel: 'SALUDABLE' }
  }

  return { alerta: ALERT_LEVELS[level].message, alerta_nivel: level }
}

// ── Project scope helper ─────────────────────────────────────────────────────
const ensureProjectInCompany = async (client, projectId, id_empresa) => {
  const result = await client.query(
    `SELECT id_proyecto, nombre, presupuesto_total
     FROM public.proyecto
     WHERE id_proyecto = $1 AND id_empresa = $2
     LIMIT 1`,
    [projectId, id_empresa]
  )
  return result.rows[0] ?? null
}

const ensureActivityInCompany = async (client, activityId, id_empresa) => {
  const result = await client.query(
    `SELECT pa.id_actividad, pa.id_proyecto
     FROM public.presupuesto_actividad pa
     JOIN public.proyecto p ON p.id_proyecto = pa.id_proyecto
     WHERE pa.id_actividad = $1 AND p.id_empresa = $2
     LIMIT 1`,
    [activityId, id_empresa]
  )
  return result.rows[0] ?? null
}

const buildProjectBudgetSummaryData = async (client, projectId, id_empresa) => {
  const project = await ensureProjectInCompany(client, projectId, id_empresa)
  if (!project) return null

  const [activitiesResult, inventoryResult, adjustmentsResult] = await Promise.all([
    client.query(
      `SELECT
         pa.id_actividad,
         pa.nombre,
         pa.monto_planificado,
         pa.monto_real,
         pa.id_proyecto,
         COALESCE(SUM(m.precio_unitario) FILTER (WHERE m.tipo = 'GASTO_ADMIN'), 0)::numeric AS monto_movimientos,
         COUNT(m.id_movimiento) FILTER (WHERE m.tipo = 'GASTO_ADMIN')::int AS gastos_count
       FROM public.presupuesto_actividad pa
       LEFT JOIN public.movimiento_inventario m
         ON m.id_actividad = pa.id_actividad
       WHERE pa.id_proyecto = $1
       GROUP BY pa.id_actividad
       ORDER BY pa.id_actividad`,
      [projectId]
    ),
    client.query(
      `SELECT
         tipo,
         COUNT(*)::int AS movimientos,
         COALESCE(SUM(precio_unitario * COALESCE(cantidad, 1)), 0)::numeric AS total
       FROM public.movimiento_inventario
       WHERE id_proyecto = $1
         AND id_empresa = $2
         AND tipo IN ('ENTRADA', 'SALIDA', 'GASTO_ADMIN')
       GROUP BY tipo`,
      [projectId, id_empresa]
    ),
    client.query(
      `SELECT
         COALESCE(SUM(monto), 0)::numeric AS total_ajustes,
         COUNT(*)::int AS ajustes_count
       FROM public.presupuesto_ajuste
       WHERE id_proyecto = $1`,
      [projectId]
    ),
  ])

  const activities = activitiesResult.rows.map((row) => {
    const manual = parseFloat(row.monto_real || 0)
    const auto = parseFloat(row.monto_movimientos || 0)

    return {
      id_actividad: row.id_actividad,
      nombre: row.nombre,
      monto_planificado: parseFloat(row.monto_planificado || 0),
      monto_real: manual,
      monto_movimientos: Number(auto.toFixed(2)),
      monto_real_efectivo: Number((manual + auto).toFixed(2)),
      gastos_count: Number(row.gastos_count) || 0,
      id_proyecto: row.id_proyecto,
    }
  })

  const totalAjustes = parseFloat(adjustmentsResult.rows[0]?.total_ajustes) || 0
  const ajustesCount = Number(adjustmentsResult.rows[0]?.ajustes_count) || 0

  const presupuestoBase = parseFloat(project.presupuesto_total) || 0
  const totalBudget = presupuestoBase + totalAjustes
  const totalPlanned = activities.reduce(
    (sum, activity) => sum + activity.monto_planificado, 0
  )
  const totalActividades = activities.reduce(
    (sum, activity) => sum + activity.monto_real, 0
  )

  const inv = {
    ENTRADA: { total: 0, movimientos: 0 },
    SALIDA: { total: 0, movimientos: 0 },
    GASTO_ADMIN: { total: 0, movimientos: 0 },
  }
  for (const row of inventoryResult.rows) {
    inv[row.tipo] = {
      total: parseFloat(row.total) || 0,
      movimientos: Number(row.movimientos) || 0,
    }
  }

  const egresosInventario = inv.ENTRADA.total + inv.GASTO_ADMIN.total
  const egresosTotales = totalActividades + egresosInventario
  const ingresosTotales = inv.SALIDA.total
  const resultadoNeto = ingresosTotales - egresosTotales
  const disponible = totalBudget - egresosTotales
  const usageRatio = totalBudget > 0 ? egresosTotales / totalBudget : 0

  const { alerta, alerta_nivel } = computeAlert(usageRatio, totalBudget)

  return {
    proyecto: {
      id_proyecto: project.id_proyecto,
      nombre: project.nombre,
    },
    presupuesto_total: Number(totalBudget.toFixed(2)),
    presupuesto_base: Number(presupuestoBase.toFixed(2)),
    total_ajustes: Number(totalAjustes.toFixed(2)),
    ajustes_count: ajustesCount,
    total_planificado: Number(totalPlanned.toFixed(2)),
    total_gastado: Number(egresosTotales.toFixed(2)),
    total_gastado_actividades: Number(totalActividades.toFixed(2)),
    total_gastado_inventario: Number(egresosInventario.toFixed(2)),
    gasto_inventario_compras: Number(inv.ENTRADA.total.toFixed(2)),
    gasto_inventario_admin: Number(inv.GASTO_ADMIN.total.toFixed(2)),
    total_ingresos: Number(ingresosTotales.toFixed(2)),
    ingresos_ventas: Number(inv.SALIDA.total.toFixed(2)),
    resultado_neto: Number(resultadoNeto.toFixed(2)),
    movimientos_compra: inv.ENTRADA.movimientos,
    movimientos_venta: inv.SALIDA.movimientos,
    movimientos_admin: inv.GASTO_ADMIN.movimientos,
    disponible: Number(disponible.toFixed(2)),
    porcentaje_uso: Number(usageRatio.toFixed(4)),
    porcentaje_completado: Math.min(100, Math.round(usageRatio * 100)),
    alerta,
    alerta_nivel,
    actividades: activities,
  }
}

// GET /api/budgets
// List budget activities scoped to current empresa, optionally filtered by project.
export const getActivities = async (req, res) => {
  const { id_empresa } = req.empresa
  const projectId = req.query.projectId

  const values = [id_empresa]
  let where = 'WHERE p.id_empresa = $1'

  if (projectId) {
    values.push(projectId)
    where += ` AND pa.id_proyecto = $${values.length}`
  }

  const result = await pool.query(
    `SELECT ${ACTIVITY_SELECT}
     FROM public.presupuesto_actividad pa
     ${PROJECT_SCOPE_JOIN}
     ${where}
     ORDER BY pa.id_actividad`,
    values
  )

  return res.json({ success: true, data: result.rows })
}

// GET /api/budgets/:id
export const getActivityById = async (req, res) => {
  const { id_empresa } = req.empresa
  const result = await pool.query(
    `SELECT ${ACTIVITY_SELECT}
     FROM public.presupuesto_actividad pa
     ${PROJECT_SCOPE_JOIN}
     WHERE pa.id_actividad = $1 AND p.id_empresa = $2`,
    [req.params.id, id_empresa]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Activity not found.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

// POST /api/budgets
export const createActivity = async (req, res) => {
  const { id_empresa } = req.empresa
  const { nombre, monto_planificado, monto_real, projectId } = req.body

  const project = await ensureProjectInCompany(pool, projectId, id_empresa)
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const result = await pool.query(
    `INSERT INTO public.presupuesto_actividad
       (nombre, monto_planificado, monto_real, id_proyecto)
     VALUES ($1, $2, $3, $4)
     RETURNING id_actividad, nombre, monto_planificado, monto_real, id_proyecto`,
    [nombre, monto_planificado, monto_real ?? null, projectId]
  )

  return res.status(201).json({ success: true, data: result.rows[0] })
}

// PUT /api/budgets/:id
export const updateActivity = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa
  const { nombre, monto_planificado, monto_real } = req.body

  const existing = await ensureActivityInCompany(pool, id, id_empresa)
  if (!existing) {
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
     RETURNING id_actividad, nombre, monto_planificado, monto_real, id_proyecto`,
    values
  )

  return res.json({ success: true, data: result.rows[0] })
}

// DELETE /api/budgets/:id
export const deleteActivity = async (req, res) => {
  const { id_empresa } = req.empresa
  const existing = await ensureActivityInCompany(pool, req.params.id, id_empresa)
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Activity not found.' })
  }

  await pool.query(
    'DELETE FROM public.presupuesto_actividad WHERE id_actividad = $1',
    [req.params.id]
  )

  return res.json({ success: true, message: 'Activity deleted successfully.' })
}

// GET /api/budgets/project/:projectId/summary
// Consolidates planned activities, manual real spending, automatic inventory
// expenses (purchases + admin) and sales income (SALIDA movements).
//
// Expense semantics:
//   - ENTRADA  → automatic purchase expense (cantidad × precio_unitario)
//   - GASTO_ADMIN → automatic admin expense (precio_unitario, cantidad defaults to 1)
//   - presupuesto_actividad.monto_real → manual tracking for non-inventory spend
//                                        (services, labor, etc.)
//   Totals are summed assuming the user picks ONE mechanism per kind of expense;
//   the breakdown is exposed so any overlap is visible.
//
// Income semantics:
//   - SALIDA → sale revenue (cantidad × precio_unitario at sale price)
export const getProjectBudgetSummary = async (req, res) => {
  const { projectId } = req.params
  const { id_empresa } = req.empresa

  const summary = await buildProjectBudgetSummaryData(pool, projectId, id_empresa)
  if (!summary) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  return res.json({ success: true, data: summary })
}

// GET /api/budgets/project/:projectId/products-financial
// Per-product purchase cost vs sale revenue, derived directly from inventory
// movements. The POS module (other branch) will populate SALIDA rows with the
// sale price as precio_unitario — this endpoint joins both directions to give
// a clear per-product P&L.
export const getProductsFinancials = async (req, res) => {
  const { projectId } = req.params
  const { id_empresa } = req.empresa

  const project = await ensureProjectInCompany(pool, projectId, id_empresa)
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const result = await pool.query(
    `WITH movs AS (
       SELECT
         p.id_producto,
         p.nombre,
         p.stock_actual,
         p.costo_promedio_ponderado,
         p.precio_venta,
         m.tipo,
         m.cantidad,
         m.precio_unitario
       FROM public.producto p
       LEFT JOIN public.movimiento_inventario m
         ON m.id_producto = p.id_producto
        AND m.id_proyecto = p.id_proyecto
       WHERE p.id_proyecto = $1
     )
     SELECT
       id_producto,
       nombre,
       MAX(stock_actual)              AS stock_actual,
       MAX(costo_promedio_ponderado)  AS costo_promedio_ponderado,
       MAX(precio_venta)              AS precio_venta,
       COALESCE(SUM(cantidad) FILTER (WHERE tipo = 'ENTRADA'), 0)::int AS unidades_compradas,
       COALESCE(SUM(cantidad) FILTER (WHERE tipo = 'SALIDA'),  0)::int AS unidades_vendidas,
       COALESCE(SUM(precio_unitario * cantidad) FILTER (WHERE tipo = 'ENTRADA'), 0)::numeric AS total_invertido,
       COALESCE(SUM(precio_unitario * cantidad) FILTER (WHERE tipo = 'SALIDA'),  0)::numeric AS total_vendido
     FROM movs
     GROUP BY id_producto, nombre
     ORDER BY total_vendido DESC, nombre ASC`,
    [projectId]
  )

  const products = result.rows.map((row) => {
    const totalInvertido = parseFloat(row.total_invertido) || 0
    const totalVendido   = parseFloat(row.total_vendido)   || 0
    const cpp            = parseFloat(row.costo_promedio_ponderado) || 0
    const unidadesVendidas = Number(row.unidades_vendidas) || 0
    // Approximate COGS using weighted average cost — gives a more accurate
    // gross margin than naive (revenue - all purchases) when stock remains.
    const costoVentas = cpp * unidadesVendidas
    const utilidadBruta = totalVendido - costoVentas
    const margenPct = totalVendido > 0
      ? (utilidadBruta / totalVendido) * 100
      : 0

    return {
      id_producto: row.id_producto,
      nombre: row.nombre,
      stock_actual: Number(row.stock_actual) || 0,
      precio_venta: Number(row.precio_venta) || 0,
      costo_promedio_ponderado: Number(cpp.toFixed(2)),
      unidades_compradas: Number(row.unidades_compradas) || 0,
      unidades_vendidas:  unidadesVendidas,
      total_invertido: Number(totalInvertido.toFixed(2)),
      total_vendido:   Number(totalVendido.toFixed(2)),
      costo_ventas:    Number(costoVentas.toFixed(2)),
      utilidad_bruta:  Number(utilidadBruta.toFixed(2)),
      margen_pct:      Number(margenPct.toFixed(1)),
    }
  })

  const totals = products.reduce(
    (acc, p) => ({
      total_invertido: acc.total_invertido + p.total_invertido,
      total_vendido:   acc.total_vendido   + p.total_vendido,
      costo_ventas:    acc.costo_ventas    + p.costo_ventas,
      utilidad_bruta:  acc.utilidad_bruta  + p.utilidad_bruta,
    }),
    { total_invertido: 0, total_vendido: 0, costo_ventas: 0, utilidad_bruta: 0 }
  )

  return res.json({
    success: true,
    data: {
      proyecto: { id_proyecto: project.id_proyecto, nombre: project.nombre },
      productos: products,
      totales: {
        total_invertido: Number(totals.total_invertido.toFixed(2)),
        total_vendido:   Number(totals.total_vendido.toFixed(2)),
        costo_ventas:    Number(totals.costo_ventas.toFixed(2)),
        utilidad_bruta:  Number(totals.utilidad_bruta.toFixed(2)),
        margen_pct: totals.total_vendido > 0
          ? Number(((totals.utilidad_bruta / totals.total_vendido) * 100).toFixed(1))
          : 0,
      },
    },
  })
}

// POST /api/budgets/register-expense
// Registers a project expense linked to a budget activity. Writes a
// GASTO_ADMIN movement in movimiento_inventario (id_producto=NULL) and links
// it to the activity via id_actividad — the activity gains an automatic
// expense history without a parallel audit table.
export const registerExpense = async (req, res) => {
  const { id_empresa } = req.empresa
  const id_usuario = req.user.id_usuario
  const { projectId, activityName, expenseAmount, motivo } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const projectLock = await client.query(
      `SELECT id_proyecto
       FROM public.proyecto
       WHERE id_proyecto = $1 AND id_empresa = $2
       FOR UPDATE`,
      [projectId, id_empresa]
    )

    if (!projectLock.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }

    const existing = await client.query(
      `SELECT id_actividad FROM public.presupuesto_actividad
       WHERE id_proyecto = $1 AND LOWER(TRIM(nombre)) = LOWER(TRIM($2))`,
      [projectId, activityName]
    )

    let id_actividad
    if (existing.rows.length) {
      id_actividad = existing.rows[0].id_actividad
    } else {
      const inserted = await client.query(
        `INSERT INTO public.presupuesto_actividad
           (nombre, monto_planificado, monto_real, id_proyecto)
         VALUES ($1, 0, 0, $2)
         RETURNING id_actividad`,
        [activityName, projectId]
      )
      id_actividad = inserted.rows[0].id_actividad
    }

    await client.query(
      `INSERT INTO public.movimiento_inventario
         (tipo, precio_unitario, motivo, id_empresa, id_usuario, id_proyecto, id_actividad)
       VALUES ('GASTO_ADMIN', $1, $2, $3, $4, $5, $6)`,
      [expenseAmount, motivo ?? null, id_empresa, id_usuario, projectId, id_actividad]
    )

    await client.query('COMMIT')
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures once the transaction has already finished.
    }
    throw error
  } finally {
    client.release()
  }

  const summary = await buildProjectBudgetSummaryData(pool, projectId, id_empresa)
  if (!summary) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const alertLevel = summary.alerta_nivel
  if (['ADVERTENCIA', 'CRITICO', 'EXCEDIDO'].includes(alertLevel)) {
    const projectName = summary.proyecto?.nombre ?? `#${projectId}`
    const pct = Math.round(summary.porcentaje_uso * 100)
    const isCritical = alertLevel === 'CRITICO' || alertLevel === 'EXCEDIDO'

    notifyCompany(id_empresa, {
      title: isCritical
        ? `🚨 Presupuesto crítico — ${projectName}`
        : `⚠️ Alerta de presupuesto — ${projectName}`,
      text: alertLevel === 'EXCEDIDO'
        ? `El proyecto *${projectName}* ha superado su presupuesto total (${pct}% usado).`
        : isCritical
          ? `El proyecto *${projectName}* ha alcanzado su presupuesto total (${pct}% usado).`
          : `El proyecto *${projectName}* ha consumido el ${pct}% de su presupuesto.`,
      event: 'budget.alert',
      data: {
        projectId,
        alertLevel,
        usageRatio: summary.porcentaje_uso,
        totalBudget: summary.presupuesto_total,
        totalSpent: summary.total_gastado,
      },
    })
  }

  return res.status(200).json({
    success: true,
    data: {
      ...summary,
      total_proyecto: summary.presupuesto_total,
      gasto_actual: summary.total_gastado,
    },
  })
}

// POST /api/budgets/project/:projectId/funding
// Top-up (or correct) a project's allocated budget. Records an audit row
// in presupuesto_ajuste so the addition is preserved across the project life.
export const addProjectFunding = async (req, res) => {
  const { projectId } = req.params
  const { id_empresa } = req.empresa
  const id_usuario = req.user.id_usuario
  const { monto, motivo } = req.body

  const project = await ensureProjectInCompany(pool, projectId, id_empresa)
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  await pool.query(
    `INSERT INTO public.presupuesto_ajuste (id_proyecto, monto, motivo, id_usuario)
     VALUES ($1, $2, $3, $4)`,
    [projectId, monto, motivo ?? null, id_usuario]
  )

  req.params = { projectId }
  return getProjectBudgetSummary(req, res)
}

// GET /api/budgets/project/:projectId/funding
// Returns the full history of budget adjustments for the project.
export const getProjectFundingHistory = async (req, res) => {
  const { projectId } = req.params
  const { id_empresa } = req.empresa

  const project = await ensureProjectInCompany(pool, projectId, id_empresa)
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const result = await pool.query(
    `SELECT
       pa.id_ajuste,
       pa.monto,
       pa.motivo,
       pa.fecha,
       pa.id_usuario,
       u.nombre   AS usuario_nombre,
       u.apellido AS usuario_apellido
     FROM public.presupuesto_ajuste pa
     LEFT JOIN public.usuario u ON u.id_usuario = pa.id_usuario
     WHERE pa.id_proyecto = $1
     ORDER BY pa.fecha DESC, pa.id_ajuste DESC`,
    [projectId]
  )

  return res.json({
    success: true,
    data: result.rows.map((row) => ({
      id_ajuste: row.id_ajuste,
      monto: Number(parseFloat(row.monto).toFixed(2)),
      motivo: row.motivo,
      fecha: row.fecha,
      usuario: row.usuario_nombre
        ? `${row.usuario_nombre} ${row.usuario_apellido ?? ''}`.trim()
        : null,
    })),
  })
}

// GET /api/budgets/:id/expenses
// Per-activity expense history: every linked GASTO_ADMIN movement plus the
// manual monto_real (returned as a synthetic row when present, so the UI
// shows a complete picture even before any movement-based expense exists).
export const getActivityExpenses = async (req, res) => {
  const { id_empresa } = req.empresa
  const activityId = req.params.id

  const activity = await ensureActivityInCompany(pool, activityId, id_empresa)
  if (!activity) {
    return res.status(404).json({ success: false, message: 'Activity not found.' })
  }

  const [movsResult, actResult] = await Promise.all([
    pool.query(
      `SELECT
         m.id_movimiento,
         m.precio_unitario AS monto,
         m.motivo,
         m.fecha,
         m.id_usuario,
         u.nombre   AS usuario_nombre,
         u.apellido AS usuario_apellido
       FROM public.movimiento_inventario m
       LEFT JOIN public.usuario u ON u.id_usuario = m.id_usuario
       WHERE m.id_actividad = $1
         AND m.tipo = 'GASTO_ADMIN'
       ORDER BY m.fecha DESC, m.id_movimiento DESC`,
      [activityId]
    ),
    pool.query(
      `SELECT monto_real FROM public.presupuesto_actividad WHERE id_actividad = $1`,
      [activityId]
    ),
  ])

  const movs = movsResult.rows.map((row) => ({
    id_movimiento: row.id_movimiento,
    monto: Number(parseFloat(row.monto).toFixed(2)),
    motivo: row.motivo,
    fecha: row.fecha,
    usuario: row.usuario_nombre
      ? `${row.usuario_nombre} ${row.usuario_apellido ?? ''}`.trim()
      : null,
  }))

  const totalMovs = movs.reduce((acc, m) => acc + m.monto, 0)
  const manualReal = parseFloat(actResult.rows[0]?.monto_real || 0)

  return res.json({
    success: true,
    data: {
      gastos: movs,
      total_movimientos: Number(totalMovs.toFixed(2)),
      monto_real_manual: Number(manualReal.toFixed(2)),
      total_efectivo: Number((totalMovs + manualReal).toFixed(2)),
    },
  })
}

// GET /api/budgets/project/:projectId/trend
// Returns cumulative project spending based on inventory movements.
export const getProjectBudgetTrend = async (req, res) => {
  const { projectId } = req.params
  const { id_empresa } = req.empresa

  const projectResult = await pool.query(
    `SELECT id_proyecto, nombre, presupuesto_total, fecha_inicio, fecha_fin_planificada
     FROM public.proyecto
     WHERE id_proyecto = $1 AND id_empresa = $2`,
    [projectId, id_empresa]
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
    [projectId, id_empresa]
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
