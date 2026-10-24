import { checkPlanCapacity, planLimitBody } from '../services/billingService.js'

/**
 * PAY-1 — Impide crear un recurso más (members, projects, products) cuando la
 * empresa ya está en el tope de su plan. Va después de requireCompany.
 */
const requirePlanLimit = (resource) => async (req, res, next) => {
  if (req.user?.nombre_rol === 'super_user') return next()

  const company = req.company ?? req.empresa
  const capacity = await checkPlanCapacity(company.id_empresa, resource)
  company.plan = capacity.plan
  if (capacity.allowed) return next()

  return res.status(403).json(planLimitBody(resource, capacity))
}

export default requirePlanLimit
