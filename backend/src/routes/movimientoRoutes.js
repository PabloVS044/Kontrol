import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireProjectPermission from '../middleware/requireProjectPermission.js'
import validate from '../middleware/validate.js'
import {
  getMovimientosQuerySchema,
  movimientoIdParamSchema,
  createMovimientoSchema,
} from '../schemas/movimientoSchemas.js'
import {
  getMovimientos,
  getMovimientoById,
  createMovimiento,
} from '../controllers/movimientoController.js'

const router = Router()

router.use(requireAuth)
router.use(requireEmpresa)

router.get(
  '/',
  validate(getMovimientosQuerySchema, 'query'),
  getMovimientos
)

router.get(
  '/:id',
  validate(movimientoIdParamSchema, 'params'),
  getMovimientoById
)

router.post(
  '/',
  requireProjectPermission('gestionar_inventario'),
  validate(createMovimientoSchema),
  createMovimiento
)

export default router
