import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import {
  getStats,
  getAdminUsers,
  revokeUserToken,
  toggleUserActive,
  changeUserRole,
} from '../controllers/adminController.js'

const router = Router()

// All admin endpoints require auth + admin role
router.use(requireAuth, requireRole('admin'))

router.get('/stats',        getStats)
router.get('/users',        getAdminUsers)
router.post('/users/:id/revoke-token',  revokeUserToken)
router.put('/users/:id/toggle-active',  toggleUserActive)
router.put('/users/:id/role',           changeUserRole)

export default router
