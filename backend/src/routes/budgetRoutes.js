import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import {
  expenseSchema,
  fundingSchema,
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
  getProductsFinancials,
  registerExpense,
  addProjectFunding,
  getProjectFundingHistory,
  getActivityExpenses,
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

// Per-product purchase vs sale revenue derived from inventory movements.
router.get(
  '/project/:projectId/products-financial',
  validate(projectIdParamSchema, 'params'),
  getProductsFinancials
)

// Project funding adjustments (add/withdraw against allocated budget).
router.get(
  '/project/:projectId/funding',
  validate(projectIdParamSchema, 'params'),
  getProjectFundingHistory
)

router.post(
  '/project/:projectId/funding',
  requireCompanyRole('owner', 'admin'),
  validate(projectIdParamSchema, 'params'),
  validate(fundingSchema),
  addProjectFunding
)

// Per-activity expense history (GASTO_ADMIN movements linked to the activity).
router.get(
  '/:id/expenses',
  validate(activityIdParamSchema, 'params'),
  getActivityExpenses
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
