import { Router } from 'express'
import { z } from 'zod'
import requireAuth from '../middleware/requireAuth.js'
import requireSuperUser from '../middleware/requireSuperUser.js'
import validate from '../middleware/validate.js'
import { getAllCompanies, toggleCompanyStatus, getPlatformStats } from '../controllers/globalController.js'

const companyIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'id must be a positive integer.' }),
})

const toggleCompanyStatusSchema = z.object({
  activo: z.boolean({ required_error: 'activo is required.' }),
})

const router = Router()

router.use(requireAuth, requireSuperUser)

router.get('/companies', getAllCompanies)
router.patch(
  '/companies/:id/status',
  validate(companyIdParamSchema, 'params'),
  validate(toggleCompanyStatusSchema),
  toggleCompanyStatus
)
router.get('/stats', getPlatformStats)

export default router
