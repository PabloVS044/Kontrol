import { createRouter } from '../middleware/asyncHandler.js'
import requireAuth from '../middleware/requireAuth.js'
import { expensiveLimiter } from '../middleware/rateLimit.js'
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

const router = createRouter()

// All routes require authentication + company context + project context
router.use(requireAuth)
router.use(requireCompany)
router.use(requireProject)

// ── Products ──────────────────────────────────────────────────────────────────

// /alerts/low-stock must come before /:id to avoid "alerts" matching as an id
router.get(
  '/alerts/low-stock',
  requireProjectPermission('ver_inventario'),
  getLowStockAlerts
)

router.get(
  '/',
  expensiveLimiter,
  requireProjectPermission('ver_inventario'),
  validate(getProductsQuerySchema, 'query'),
  getProducts
)

router.get(
  '/:id',
  requireProjectPermission('ver_inventario'),
  validate(productIdParamSchema, 'params'),
  getProductById
)

router.post(
  '/',
  requireProjectPermission('gestionar_inventario'),
  validate(createProductSchema),
  createProduct
)

router.put(
  '/:id',
  requireProjectPermission('gestionar_inventario'),
  validate(productIdParamSchema, 'params'),
  validate(updateProductSchema),
  updateProduct
)

router.delete(
  '/:id',
  requireProjectPermission('gestionar_inventario'),
  validate(productIdParamSchema, 'params'),
  deleteProduct
)

// ── Product ↔ Supplier ────────────────────────────────────────────────────────

router.post(
  '/:id/suppliers',
  requireProjectPermission('gestionar_inventario'),
  validate(productIdParamSchema, 'params'),
  validate(linkSupplierSchema),
  linkSupplier
)

router.put(
  '/:id/suppliers/:supplierId',
  requireProjectPermission('gestionar_inventario'),
  validate(productSupplierParamsSchema, 'params'),
  validate(updateSupplierLinkSchema),
  updateSupplierLink
)

router.delete(
  '/:id/suppliers/:supplierId',
  requireProjectPermission('gestionar_inventario'),
  validate(productSupplierParamsSchema, 'params'),
  unlinkSupplier
)

export default router