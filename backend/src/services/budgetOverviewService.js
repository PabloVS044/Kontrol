import { getAccessibleProjectIds } from './projectAccessService.js'
import { calculateUsageRatio, computeAlert } from '../utils/budgetCalculations.js'
import { getCachedBudgetSummary, setCachedBudgetSummary } from '../utils/budgetSummaryCache.js'

// Activities and movements are aggregated apart: joining them would multiply monto_real.
// ENTRADA and GASTO_ADMIN stay separate so JS adds them in the same order as the per-project summary.
const BUDGET_OVERVIEW_SQL = `
  WITH scoped AS (
    SELECT id_proyecto, presupuesto_total
    FROM public.proyecto
    WHERE id_empresa = $1 AND id_proyecto = ANY($2::int[])
  ),
  activity_totals AS (
    SELECT pa.id_proyecto, COALESCE(SUM(pa.monto_real), 0)::numeric AS gasto_actividades
    FROM public.presupuesto_actividad pa
    JOIN scoped s ON s.id_proyecto = pa.id_proyecto
    GROUP BY pa.id_proyecto
  ),
  movement_totals AS (
    SELECT
      mi.id_proyecto,
      COALESCE(SUM(mi.precio_unitario * COALESCE(mi.cantidad, 1)) FILTER (WHERE mi.tipo = 'ENTRADA'), 0)::numeric AS gasto_entrada,
      COALESCE(SUM(mi.precio_unitario * COALESCE(mi.cantidad, 1)) FILTER (WHERE mi.tipo = 'GASTO_ADMIN'), 0)::numeric AS gasto_admin
    FROM public.movimiento_inventario mi
    JOIN scoped s ON s.id_proyecto = mi.id_proyecto
    WHERE mi.id_empresa = $1
      AND mi.tipo IN ('ENTRADA', 'GASTO_ADMIN')
    GROUP BY mi.id_proyecto
  ),
  adjustment_totals AS (
    SELECT aj.id_proyecto, COALESCE(SUM(aj.monto), 0)::numeric AS total_ajustes
    FROM public.presupuesto_ajuste aj
    JOIN scoped s ON s.id_proyecto = aj.id_proyecto
    GROUP BY aj.id_proyecto
  )
  SELECT
    s.id_proyecto,
    s.presupuesto_total AS presupuesto_base,
    COALESCE(j.total_ajustes, 0)     AS total_ajustes,
    COALESCE(a.gasto_actividades, 0) AS gasto_actividades,
    COALESCE(m.gasto_entrada, 0)     AS gasto_entrada,
    COALESCE(m.gasto_admin, 0)       AS gasto_admin
  FROM scoped s
  LEFT JOIN activity_totals a   ON a.id_proyecto = s.id_proyecto
  LEFT JOIN movement_totals m   ON m.id_proyecto = s.id_proyecto
  LEFT JOIN adjustment_totals j ON j.id_proyecto = s.id_proyecto
  ORDER BY s.id_proyecto
`

// Same operations and order as buildProjectBudgetSummaryData.
export function toBudgetOverviewRow(row) {
  const presupuestoBase = parseFloat(row.presupuesto_base) || 0
  const totalAjustes = parseFloat(row.total_ajustes) || 0
  const totalBudget = presupuestoBase + totalAjustes
  const totalActividades = Number((parseFloat(row.gasto_actividades) || 0).toFixed(2))
  const egresosInventario = (parseFloat(row.gasto_entrada) || 0) + (parseFloat(row.gasto_admin) || 0)
  const egresosTotales = totalActividades + egresosInventario
  const usageRatio = calculateUsageRatio(egresosTotales, totalBudget)
  const { alerta_nivel } = computeAlert(usageRatio, totalBudget)

  return {
    id_proyecto: row.id_proyecto,
    presupuesto_total: Number(totalBudget.toFixed(2)),
    total_gastado: Number(egresosTotales.toFixed(2)),
    alerta_nivel,
    porcentaje_uso: Number(usageRatio.toFixed(4)),
  }
}

export async function getBudgetOverview(client, { id_empresa, id_usuario, rol_empresa, projectIds }) {
  // Access is filtered before the cache so keys only hold allowed ids.
  const accessible = new Set(
    await getAccessibleProjectIds({ client, id_empresa, id_usuario, rol_empresa })
  )
  const allowedIds = projectIds.filter((id) => accessible.has(id))
  if (!allowedIds.length) return []

  const cached = getCachedBudgetSummary(id_empresa, allowedIds)
  if (cached) return cached

  const result = await client.query(BUDGET_OVERVIEW_SQL, [id_empresa, allowedIds])
  const data = result.rows.map(toBudgetOverviewRow)
  setCachedBudgetSummary(id_empresa, allowedIds, data)
  return data
}
