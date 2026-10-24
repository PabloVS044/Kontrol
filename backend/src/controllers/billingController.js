import { getBillingProvider } from '../billing/provider.js'
import { publicCatalog } from '../billing/plans.js'
import { changePlan, getBillingSummary, openPortal, startCheckout } from '../services/billingService.js'
import { getFrontendBaseUrl } from '../utils/frontendUrl.js'

// PAY-1 — Todo el módulo corre en modo de prueba. La interfaz lo usa para
// mostrar el aviso de que no hay cobros reales.
const TEST_MODE = true

const billingPageUrl = (req, query = '') => `${getFrontendBaseUrl(req)}/billing${query}`

const canManageBilling = (req) =>
  req.user?.nombre_rol === 'super_user' || req.company?.rol_empresa === 'owner'

/** GET /api/billing/plans — catálogo público de planes. */
export const getPlans = async (req, res) => {
  res.json({ success: true, data: { testMode: TEST_MODE, plans: publicCatalog() } })
}

/** GET /api/billing/subscription — plan efectivo de la empresa seleccionada. */
export const getSubscription = async (req, res) => {
  const summary = await getBillingSummary(req.company.id_empresa)
  res.json({
    success: true,
    data: {
      ...summary,
      testMode: TEST_MODE,
      billingConfigured: Boolean(getBillingProvider().configured),
      canManage: canManageBilling(req),
    },
  })
}

/** POST /api/billing/checkout — devuelve la URL del Checkout hospedado. */
export const createCheckout = async (req, res) => {
  const session = await startCheckout({
    companyId: req.company.id_empresa,
    plan: req.body.plan,
    interval: req.body.interval,
    successUrl: billingPageUrl(req, '?checkout=success'),
    cancelUrl: billingPageUrl(req, '?checkout=cancel'),
  })
  res.status(201).json({ success: true, data: { url: session.url } })
}

/** POST /api/billing/subscription/change — cambia entre planes pagados. */
export const changeSubscription = async (req, res) => {
  const result = await changePlan({
    companyId: req.company.id_empresa,
    plan: req.body.plan,
    interval: req.body.interval,
  })
  res.status(202).json({ success: true, data: result })
}

/** POST /api/billing/portal — devuelve la URL del portal hospedado. */
export const createPortal = async (req, res) => {
  const session = await openPortal({ companyId: req.company.id_empresa, returnUrl: billingPageUrl(req) })
  res.status(201).json({ success: true, data: { url: session.url } })
}

// El errorHandler central oculta todo 5xx. "Pagos no configurados" (503) es
// un estado esperado del servidor, no un fallo, y la interfaz lo muestra.
// eslint-disable-next-line no-unused-vars
export const billingErrorHandler = (err, req, res, next) => {
  if (err?.status === 503) return res.status(503).json({ success: false, message: err.message })
  return next(err)
}
