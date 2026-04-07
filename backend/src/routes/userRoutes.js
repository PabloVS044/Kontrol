import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js'

const router = Router()

// All user management endpoints require authentication and admin role
router.get('/',     requireAuth, requireRole('admin'), getUsers)
router.get('/:id',  requireAuth, requireRole('admin'), getUserById)
router.post('/',    requireAuth, requireRole('admin'), createUser)
router.put('/:id',  requireAuth, requireRole('admin'), updateUser)
router.delete('/:id', requireAuth, requireRole('admin'), deleteUser)

export default router
