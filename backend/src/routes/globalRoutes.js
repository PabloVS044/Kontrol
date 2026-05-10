import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireSuperUser from '../middleware/requireSuperUser.js'
import { getAllCompanies, getPlatformStats } from '../controllers/globalController.js'

const router = Router()

router.use(requireAuth, requireSuperUser)

router.get('/companies', getAllCompanies)
router.get('/stats', getPlatformStats)

export default router
