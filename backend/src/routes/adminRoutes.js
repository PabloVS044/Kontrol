import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import { getAdminStats, getAdminCompanies, getAdminUsers } from '../controllers/adminController.js'

const router = Router()

// TODO(T-37): replace 'admin' with 'super_user' once that role is added to the DB and JWT
const requireSuperUser = requireRole('admin')

router.get('/stats',     requireAuth, requireSuperUser, getAdminStats)
router.get('/companies', requireAuth, requireSuperUser, getAdminCompanies)
router.get('/users',     requireAuth, requireSuperUser, getAdminUsers)

export default router
