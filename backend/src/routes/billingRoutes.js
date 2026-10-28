import { createRouter } from '../middleware/asyncHandler.js'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import { billingLimiter } from '../middleware/rateLimit.js'
import { planSelectionSchema } from '../schemas/billingSchemas.js'
import {
  billingErrorHandler,
  changeSubscription,
  createCheckout,
  createPortal,
  getPlans,
  getSubscription,
} from '../controllers/billingController.js'

// PAY-1 — El webhook no está aquí: necesita el cuerpo crudo y se monta antes de
// express.json() (src/billing/webhook.js).
const router = createRouter()

router.get('/plans', getPlans)

router.use(requireAuth, requireCompany)

// Ver el plan: cualquier miembro. Contratar, cambiar o cancelar: solo el owner,
// que es quien paga la suscripción de la empresa.
const owner = [requireCompanyRole('owner'), billingLimiter]

router.get('/subscription', getSubscription)
router.post('/checkout', ...owner, validate(planSelectionSchema), createCheckout)
router.post('/subscription/change', ...owner, validate(planSelectionSchema), changeSubscription)
router.post('/portal', ...owner, createPortal)

router.use(billingErrorHandler)

export default router
