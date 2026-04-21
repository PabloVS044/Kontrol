import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import {
  expenseSchema,
  getActivitiesQuerySchema,
  activityIdParamSchema,
  projectIdParamSchema,
  createActivitySchema,
  updateActivitySchema,
} from '../schemas/budgetSchema.js'
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getProjectBudgetSummary,
  getProjectBudgetTrend,
  registerExpense,
} from '../controllers/budgetController.js'

const router = Router()

router.use(requireAuth, requireCompany)

// Consolidated project budget summary with alerts.
router.get(
  '/project/:projectId/summary',
  validate(projectIdParamSchema, 'params'),
  getProjectBudgetSummary
)

// Time series for actual spending against project plan.
router.get(
  '/project/:projectId/trend',
  validate(projectIdParamSchema, 'params'),
  getProjectBudgetTrend
)

// Quick expense registration, cumulative by activity name.
router.post(
  '/register-expense',
  requireCompanyRole('owner', 'admin', 'manager'),
  validate(expenseSchema),
  registerExpense
)

// Budget activity CRUD.
router.get(
  '/',
  validate(getActivitiesQuerySchema, 'query'),
  getActivities
)

router.get(
  '/:id',
  validate(activityIdParamSchema, 'params'),
  getActivityById
)

router.post(
  '/',
  requireCompanyRole('owner', 'admin', 'manager'),
  validate(createActivitySchema),
  createActivity
)

router.put(
  '/:id',
  requireCompanyRole('owner', 'admin', 'manager'),
  validate(activityIdParamSchema, 'params'),
  validate(updateActivitySchema),
  updateActivity
)

router.delete(
  '/:id',
  requireCompanyRole('owner', 'admin'),
  validate(activityIdParamSchema, 'params'),
  deleteActivity
)

export default router
