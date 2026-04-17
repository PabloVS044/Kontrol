import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireRole from '../middleware/requireRole.js'
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
  requireRole('admin', 'manager', 'collaborator'),
  validate(getMovimientosQuerySchema, 'query'),
  getMovimientos
)

router.get(
  '/:id',
  requireRole('admin', 'manager', 'collaborator'),
  validate(movimientoIdParamSchema, 'params'),
  getMovimientoById
)

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate(createMovimientoSchema),
  createMovimiento
)

export default router
