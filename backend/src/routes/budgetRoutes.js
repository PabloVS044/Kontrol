import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireEmpresaRole from '../middleware/requireEmpresaRole.js'
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

router.use(requireAuth, requireEmpresa)

// Resumen consolidado de presupuesto por proyecto (con alertas)
router.get(
  '/project/:id_proyecto/summary',
  validate(proyectoIdParamSchema, 'params'),
  getProjectBudgetSummary
)

// Registro rápido de gastos (acumulativo por nombre_actividad)
router.post(
  '/register-expense',
  requireEmpresaRole('owner', 'admin', 'manager'),
  validate(expenseSchema),
  registerExpense
)

// CRUD de actividades de presupuesto
router.get(
  '/',
  validate(getActividadesQuerySchema, 'query'),
  getActividades
)

router.get(
  '/:id',
  validate(actividadIdParamSchema, 'params'),
  getActividadById
)

router.post(
  '/',
  requireEmpresaRole('owner', 'admin', 'manager'),
  validate(createActividadSchema),
  createActividad
)

router.put(
  '/:id',
  requireEmpresaRole('owner', 'admin', 'manager'),
  validate(actividadIdParamSchema, 'params'),
  validate(updateActividadSchema),
  updateActividad
)

router.delete(
  '/:id',
  requireEmpresaRole('owner', 'admin'),
  validate(actividadIdParamSchema, 'params'),
  deleteActividad
)

export default router
