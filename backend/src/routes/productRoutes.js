import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireProject from '../middleware/requireProject.js'
import requireProjectPermission from '../middleware/requireProjectPermission.js'
import validate from '../middleware/validate.js'
import {
  getProductsQuerySchema,
  productIdParamSchema,
  productSupplierParamsSchema,
  createProductSchema,
  updateProductSchema,
  linkSupplierSchema,
  updateSupplierLinkSchema,
} from '../schemas/productSchemas.js'
import {
  getProducts,
  getLowStockAlerts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  linkSupplier,
  updateSupplierLink,
  unlinkSupplier,
} from '../controllers/productController.js'

const router = Router()

// All routes require authentication + company context
router.use(requireAuth)
router.use(requireCompany)

// ── Products ──────────────────────────────────────────────────────────────────

// /alerts/low-stock must come before /:id to avoid "alerts" matching as an id
router.get(
  '/alerts/low-stock',
  getLowStockAlerts
)

router.get(
  '/',
  validate(getProductsQuerySchema, 'query'),
  getProducts
)

router.get(
  '/:id',
  validate(productIdParamSchema, 'params'),
  getProductById
)

router.post(
  '/',
  requireProject,
  requireProjectPermission('gestionar_inventario'),
  validate(createProductSchema),
  createProduct
)

router.put(
  '/:id',
  validate(productIdParamSchema, 'params'),
  validate(updateProductSchema),
  updateProduct
)

router.delete(
  '/:id',
  validate(productIdParamSchema, 'params'),
  deleteProduct
)

// ── Product ↔ Supplier ────────────────────────────────────────────────────────

router.post(
  '/:id/suppliers',
  validate(productIdParamSchema, 'params'),
  validate(linkSupplierSchema),
  linkSupplier
)

router.put(
  '/:id/suppliers/:supplierId',
  validate(productSupplierParamsSchema, 'params'),
  validate(updateSupplierLinkSchema),
  updateSupplierLink
)

router.delete(
  '/:id/suppliers/:supplierId',
  validate(productSupplierParamsSchema, 'params'),
  unlinkSupplier
)

export default router
