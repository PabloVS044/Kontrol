import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import validate from '../middleware/validate.js'
import {
  getUsersQuerySchema,
  userIdParamSchema,
  createUserSchema,
  updateUserSchema,
} from '../schemas/userSchemas.js'
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js'

const router = Router()

// All user management endpoints require authentication and admin role
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(getUsersQuerySchema, 'query'),
  getUsers
)

router.get(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(userIdParamSchema, 'params'),
  getUserById
)

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(createUserSchema),
  createUser
)

router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema),
  updateUser
)

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(userIdParamSchema, 'params'),
  deleteUser
)

export default router
