import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import validate from '../middleware/validate.js'
import {
  expenseSchema,
  getActividadesQuerySchema,
  actividadIdParamSchema,
  proyectoIdParamSchema,
  createActividadSchema,
  updateActividadSchema,
} from '../schemas/budgetSchema.js'
import {
  getActividades,
  getActividadById,
  createActividad,
  updateActividad,
  deleteActividad,
  getProjectBudgetSummary,
  registerExpense,
} from '../controllers/budgetController.js'

const router = Router()

router.use(requireAuth)

// Resumen consolidado de presupuesto por proyecto (con alertas)
router.get(
  '/project/:id_proyecto/summary',
  requireRole('admin', 'manager', 'collaborator'),
  validate(proyectoIdParamSchema, 'params'),
  getProjectBudgetSummary
)

// Registro rápido de gastos (acumulativo por nombre_actividad)
router.post(
  '/register-expense',
  requireRole('admin', 'manager'),
  validate(expenseSchema),
  registerExpense
)

// CRUD de actividades de presupuesto
router.get(
  '/',
  requireRole('admin', 'manager', 'collaborator'),
  validate(getActividadesQuerySchema, 'query'),
  getActividades
)

router.get(
  '/:id',
  requireRole('admin', 'manager', 'collaborator'),
  validate(actividadIdParamSchema, 'params'),
  getActividadById
)

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate(createActividadSchema),
  createActividad
)

router.put(
  '/:id',
  requireRole('admin', 'manager'),
  validate(actividadIdParamSchema, 'params'),
  validate(updateActividadSchema),
  updateActividad
)

router.delete(
  '/:id',
  requireRole('admin'),
  validate(actividadIdParamSchema, 'params'),
  deleteActividad
)

export default router
