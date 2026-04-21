import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireProjectPermission from '../middleware/requireProjectPermission.js'
import validate from '../middleware/validate.js'
import {
  getInventoryMovementsQuerySchema,
  inventoryMovementIdParamSchema,
  createInventoryMovementSchema,
} from '../schemas/inventoryMovementSchemas.js'
import {
  getInventoryMovements,
  getInventoryMovementById,
  createInventoryMovement,
} from '../controllers/inventoryMovementController.js'

const router = Router()

router.use(requireAuth)
router.use(requireCompany)

router.get(
  '/',
  validate(getInventoryMovementsQuerySchema, 'query'),
  getInventoryMovements
)

router.get(
  '/:id',
  validate(inventoryMovementIdParamSchema, 'params'),
  getInventoryMovementById
)

router.post(
  '/',
  requireProjectPermission('gestionar_inventario'),
  validate(createInventoryMovementSchema),
  createInventoryMovement
)

export default router
