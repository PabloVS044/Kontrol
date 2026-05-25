import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import { saveIntegrationSchema, toggleIntegrationSchema } from '../schemas/integrationSchemas.js'
import {
  listIntegrations,
  getIntegrationConfig,
  saveIntegrationConfig,
  toggleIntegration,
  testIntegration,
  deleteIntegrationConfig,
} from '../controllers/integrationController.js'

const router = Router()

const base = [requireAuth, requireCompany]
const admin = [...base, requireCompanyRole('owner', 'admin')]

router.get('/', ...base, listIntegrations)
router.get('/:slug', ...admin, getIntegrationConfig)
router.put('/:slug', ...admin, validate(saveIntegrationSchema), saveIntegrationConfig)
router.patch('/:slug/toggle', ...admin, validate(toggleIntegrationSchema), toggleIntegration)
router.post('/:slug/test', ...admin, testIntegration)
router.delete('/:slug', ...admin, deleteIntegrationConfig)

export default router
