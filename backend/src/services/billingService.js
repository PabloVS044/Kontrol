import pool from '../db/pool.js'
import { PLAN_CODES, getPlan, RESOURCES } from '../billing/plans.js'

// PAY-1 — Estados del proveedor en los que la empresa conserva el plan pagado.
// `past_due` entra a propósito: mientras el proveedor reintenta el cobro la
// empresa sigue con su plan y ve un aviso. Cuando agota los reintentos cancela
// la suscripción y el evento la devuelve al plan gratuito.
export const ENTITLED_STATUSES = ['active', 'trialing', 'past_due']

export const resolveEffectivePlan = (subscription) => {
  if (!subscription) return 'free'
  if (!ENTITLED_STATUSES.includes(subscription.estado)) return 'free'
  return PLAN_CODES.includes(subscription.plan) ? subscription.plan : 'free'
}

export const getCompanySubscription = async (companyId, db = pool) => {
  const result = await db.query(
    `SELECT id_empresa, proveedor, id_cliente_proveedor, id_suscripcion_proveedor,
            plan, intervalo, estado, fin_periodo_actual, cancelar_al_final
     FROM public.empresa_suscripcion
     WHERE id_empresa = $1`,
    [companyId]
  )
  return result.rows[0] ?? null
}

export const getCompanyPlan = async (companyId, db = pool) =>
  resolveEffectivePlan(await getCompanySubscription(companyId, db))

// Un solo viaje a la base para los tres contadores. Los productos cuelgan del
// proyecto, no de la empresa, así que se cuentan a través de él.
export const getUsage = async (companyId, db = pool) => {
  const result = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM public.empresa_usuario WHERE id_empresa = $1)::int AS members,
       (SELECT COUNT(*) FROM public.proyecto WHERE id_empresa = $1)::int AS projects,
       (SELECT COUNT(*)
          FROM public.producto p
          JOIN public.proyecto pr ON pr.id_proyecto = p.id_proyecto
         WHERE pr.id_empresa = $1)::int AS products`,
    [companyId]
  )
  const row = result.rows[0] ?? {}
  return Object.fromEntries(RESOURCES.map((resource) => [resource, Number(row[resource] ?? 0)]))
}

// `incoming` es cuántos se van a agregar (aceptar una invitación suma uno).
export const isWithinLimit = (planCode, resource, current, incoming = 1) => {
  const limit = getPlan(planCode).limits[resource]
  return limit === null || limit === undefined || current + incoming <= limit
}
