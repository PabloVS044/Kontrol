import { createRouter } from '../middleware/asyncHandler.js'
import validate from '../middleware/validate.js'
import requireAuth from '../middleware/requireAuth.js'
import { legalAcceptanceSchema } from '../schemas/authSchemas.js'
import { acceptPendingDocuments, getAcceptanceStatus } from '../controllers/legalController.js'

const router = createRouter()

router.get('/acceptances', requireAuth, getAcceptanceStatus)
router.post('/acceptances', requireAuth, validate(legalAcceptanceSchema), acceptPendingDocuments)

export default router
