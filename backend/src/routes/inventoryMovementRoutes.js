import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireProjectPermission from '../middleware/requireProjectPermission.js'
import validate from '../middleware/validate.js'
import {
  getInventoryMovementsQuerySchema,
  getInventorySalesStatsQuerySchema,
  inventoryMovementIdParamSchema,
  createInventoryMovementSchema,
  createSaleSchema,
} from '../schemas/inventoryMovementSchemas.js'
import {
  getInventoryMovements,
  getInventorySalesStats,
  getInventoryMovementById,
  createInventoryMovement,
  createSale,
} from '../controllers/inventoryMovementController.js'

const router = Router()

router.use(requireAuth)
router.use(requireCompany)

router.get(
  '/',
  validate(getInventoryMovementsQuerySchema, 'query'),
  getInventoryMovements
)

// Must be registered before '/:id' so the literal path wins over the param.
router.get(
  '/stats',
  validate(getInventorySalesStatsQuerySchema, 'query'),
  getInventorySalesStats
)

router.get(
  '/:id',
  validate(inventoryMovementIdParamSchema, 'params'),
  getInventoryMovementById
)

// SALIDA (sales) is open to any project member; other movement types still
// require the gestionar_inventario permission.
const movementPermissionGate = (req, res, next) => {
  const middleware = req.body?.tipo === 'SALIDA'
    ? requireProjectPermission()
    : requireProjectPermission('gestionar_inventario')
  return middleware(req, res, next)
}

router.post(
  '/',
  movementPermissionGate,
  validate(createInventoryMovementSchema),
  createInventoryMovement
)

// Atomic multi-line POS sale. Project access is validated per-item in the
// controller (cart may span projects), so no single-project gate here.
router.post(
  '/sale',
  validate(createSaleSchema),
  createSale
)

export default router
