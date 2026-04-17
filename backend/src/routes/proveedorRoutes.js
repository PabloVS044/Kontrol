import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireRole from '../middleware/requireRole.js'
import validate from '../middleware/validate.js'
import {
  proveedorIdParamSchema,
  createProveedorSchema,
  updateProveedorSchema,
} from '../schemas/proveedorSchemas.js'
import {
  getProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from '../controllers/proveedorController.js'

const router = Router()

router.use(requireAuth)
router.use(requireEmpresa)

router.get(
  '/',
  requireRole('admin', 'manager', 'collaborator'),
  getProveedores
)

router.get(
  '/:id',
  requireRole('admin', 'manager', 'collaborator'),
  validate(proveedorIdParamSchema, 'params'),
  getProveedorById
)

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate(createProveedorSchema),
  createProveedor
)

router.put(
  '/:id',
  requireRole('admin', 'manager'),
  validate(proveedorIdParamSchema, 'params'),
  validate(updateProveedorSchema),
  updateProveedor
)

router.delete(
  '/:id',
  requireRole('admin'),
  validate(proveedorIdParamSchema, 'params'),
  deleteProveedor
)

export default router
