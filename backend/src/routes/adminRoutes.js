import { createRouter } from '../middleware/asyncHandler.js'
import requireAuth from '../middleware/requireAuth.js'
import requireSuperUser from '../middleware/requireSuperUser.js'
import { getAdminStats, getAdminCompanies, getAdminUsers, toggleUserStatus } from '../controllers/adminController.js'

const router = createRouter()

router.get('/stats',              requireAuth, requireSuperUser, getAdminStats)
router.get('/companies',          requireAuth, requireSuperUser, getAdminCompanies)
router.get('/users',              requireAuth, requireSuperUser, getAdminUsers)
router.patch('/users/:id/status', requireAuth, requireSuperUser, toggleUserStatus)

export default router
