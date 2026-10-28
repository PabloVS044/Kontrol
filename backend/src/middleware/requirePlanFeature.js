import { minimumPlanFor, planAllows } from '../billing/plans.js'
import { getCompanyPlan } from '../services/billingService.js'

/**
 * PAY-1 — Plan de la empresa ya validada por requireCompany. Se resuelve una
 * vez por petición, siempre desde la base (actualizada solo por eventos
 * verificados de la pasarela), y queda en req.company.plan.
 */
export const loadCompanyPlan = async (req) => {
  const company = req.company ?? req.empresa
  if (!company.plan) company.plan = await getCompanyPlan(company.id_empresa)
  return company.plan
}

/**
 * Exige que el plan de la empresa incluya el módulo. Va después de
 * requireCompany, en la misma cadena que requireCompanyRole: es la capa de
 * autorización de DT-05 extendida con el plan, no una capa aparte.
 */
const requirePlanFeature = (feature) => async (req, res, next) => {
  if (req.user?.nombre_rol === 'super_user') return next()

  const plan = await loadCompanyPlan(req)
  if (planAllows(plan, feature)) return next()

  return res.status(403).json({
    success: false,
    code: 'PLAN_FEATURE_REQUIRED',
    message: 'Your current plan does not include this module. Upgrade the plan to use it.',
    feature,
    currentPlan: plan,
    requiredPlan: minimumPlanFor(feature),
  })
}

export default requirePlanFeature
