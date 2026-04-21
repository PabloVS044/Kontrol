import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
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

router.get(
  '/',
  getSuppliers
)

router.get(
  '/:id',
  validate(supplierIdParamSchema, 'params'),
  getSupplierById
)

router.post(
  '/',
  requireCompanyRole('owner', 'admin', 'manager'),
  validate(createSupplierSchema),
  createSupplier
)

router.put(
  '/:id',
  requireCompanyRole('owner', 'admin', 'manager'),
  validate(supplierIdParamSchema, 'params'),
  validate(updateSupplierSchema),
  updateSupplier
)

router.delete(
  '/:id',
  requireCompanyRole('owner', 'admin', 'manager'),
  validate(supplierIdParamSchema, 'params'),
  deleteSupplier
)

export default router
