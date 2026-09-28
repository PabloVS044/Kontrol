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

// Auth + company context for everything. El contexto de PROYECTO se aplica ruta
// por ruta, no en bloque: los dos listados agregan varios proyectos a la vez y
// un guard de un solo proyecto no puede expresar eso (ver más abajo).
router.use(requireAuth)
router.use(requireCompany)

// ── Products ──────────────────────────────────────────────────────────────────

/*
 * Los dos listados NO llevan requireProject ni requireProjectPermission.
 *
 * Están hechos para responder a nivel de empresa —"todos los proyectos" es la
 * vista por defecto del inventario— y hacen su propio control dentro del
 * controller con `getInventoryAccessibleProjectIds`: un owner/admin ve toda la
 * empresa, cualquier otro solo los proyectos donde tiene `ver_inventario`, la
 * lista vacía devuelve [], y pedir un projectId al que no se tiene acceso da 403.
 *
 * Exigirles la cabecera X-Project-ID los rompía por completo: el frontend no la
 * envía en la vista de todos los proyectos —usa ?projectId cuando filtra—, así
 * que el inventario respondía 400 "Select a project to continue." siempre. Un
 * guard por cabecera no puede autorizar una consulta que abarca N proyectos;
 * eso solo se resuelve filtrando por los accesibles, que es lo que ya hace.
 */
router.get(
  '/alerts/low-stock',
  getLowStockAlerts
)

router.get(
  '/',
  expensiveLimiter,
  validate(getProductsQuerySchema, 'query'),
  getProducts
)

// El detalle tampoco lleva contexto de proyecto: se abre desde el catálogo de
// "todos los proyectos", donde no hay ninguno seleccionado, y el proyecto se
// deduce del propio producto. Autoriza dentro del controller como los listados.
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
  requireProject,
  requireProjectPermission('gestionar_inventario'),
  validate(productIdParamSchema, 'params'),
  validate(updateProductSchema),
  updateProduct
)

router.delete(
  '/:id',
  requireProject,
  requireProjectPermission('gestionar_inventario'),
  validate(productIdParamSchema, 'params'),
  deleteProduct
)

// ── Product ↔ Supplier ────────────────────────────────────────────────────────

router.post(
  '/:id/suppliers',
  requireProject,
  requireProjectPermission('gestionar_inventario'),
  validate(productIdParamSchema, 'params'),
  validate(linkSupplierSchema),
  linkSupplier
)

router.put(
  '/:id/suppliers/:supplierId',
  requireProject,
  requireProjectPermission('gestionar_inventario'),
  validate(productSupplierParamsSchema, 'params'),
  validate(updateSupplierLinkSchema),
  updateSupplierLink
)

router.delete(
  '/:id/suppliers/:supplierId',
  requireProject,
  requireProjectPermission('gestionar_inventario'),
  validate(productSupplierParamsSchema, 'params'),
  unlinkSupplier
)

export default router