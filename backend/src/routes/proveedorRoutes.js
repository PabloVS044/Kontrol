import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireEmpresaRole from '../middleware/requireEmpresaRole.js'
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
  getProveedores
)

router.get(
  '/:id',
  validate(proveedorIdParamSchema, 'params'),
  getProveedorById
)

router.post(
  '/',
  requireEmpresaRole('owner', 'admin', 'manager'),
  validate(createProveedorSchema),
  createProveedor
)

router.put(
  '/:id',
  requireEmpresaRole('owner', 'admin', 'manager'),
  validate(proveedorIdParamSchema, 'params'),
  validate(updateProveedorSchema),
  updateProveedor
)

router.delete(
  '/:id',
  requireEmpresaRole('owner', 'admin', 'manager'),
  validate(proveedorIdParamSchema, 'params'),
  deleteProveedor
)

export default router
