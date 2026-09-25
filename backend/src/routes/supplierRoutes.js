import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireProject from '../middleware/requireProject.js'
import requireProjectPermission from '../middleware/requireProjectPermission.js'
import validate from '../middleware/validate.js'
import {
  supplierIdParamSchema,
  createSupplierSchema,
  updateSupplierSchema,
} from '../schemas/supplierSchemas.js'
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js'

const router = Router()

router.use(requireAuth)
router.use(requireCompany)
router.use(requireProject)

router.get(
  '/',
  requireProjectPermission('ver_proveedores'),
  getSuppliers
)

router.get(
  '/:id',
  requireProjectPermission('ver_proveedores'),
  validate(supplierIdParamSchema, 'params'),
  getSupplierById
)

router.post(
  '/',
  requireProjectPermission('gestionar_proveedores'),
  validate(createSupplierSchema),
  createSupplier
)

router.put(
  '/:id',
  requireProjectPermission('gestionar_proveedores'),
  validate(supplierIdParamSchema, 'params'),
  validate(updateSupplierSchema),
  updateSupplier
)

router.delete(
  '/:id',
  requireProjectPermission('gestionar_proveedores'),
  validate(supplierIdParamSchema, 'params'),
  deleteSupplier
)

export default router
