import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireSuperUser from '../middleware/requireSuperUser.js'
import { getAdminStats, getAdminCompanies, getAdminUsers } from '../controllers/adminController.js'

const router = Router()

router.get('/stats',     requireAuth, requireSuperUser, getAdminStats)
router.get('/companies', requireAuth, requireSuperUser, getAdminCompanies)
router.get('/users',     requireAuth, requireSuperUser, getAdminUsers)

export default router
