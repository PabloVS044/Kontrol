import { createRouter } from '../middleware/asyncHandler.js'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany, { requireCompanyAllowingClosure } from '../middleware/requireCompany.js'
import requireCompanyOwner from '../middleware/requireCompanyOwner.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import {
  companyClosureUserLimiter,
  companyExportConcurrencyLimiter,
  companyExportRateLimiter,
} from '../middleware/rateLimit.js'
import {
  cancelCompanyClosure,
  getCompanyClosure,
  listMyCompanyClosures,
  requestCompanyClosure,
} from '../controllers/companyClosureController.js'
import {
  acceptCompanyInvitation,
  createCompany,
  createOrGetCompanyInvitation,
  deactivateCompanyInvitation,
  getCompanyAccessContext,
  getCompanySaleConfig,
  getCompanyUsersPanel,
  getMyCompanies,
  getPublicCompanyInvitation,
  removeCompanyMember,
  removeCompanyMemberProjectAccess,
  upsertCompanyMemberProjectAccess,
  updateCompanyMemberRole,
  updateCompanySaleConfig,
} from '../controllers/companyController.js'
import { exportCompanyData } from '../controllers/privacyController.js'
import {
  companyClosureSchema,
  createCompanySchema,
  companyInvitationTokenParamSchema,
  companyMemberParamSchema,
  companyMemberProjectParamsSchema,
  updateCompanyMemberRoleSchema,
  updateCompanyMemberProjectAccessSchema,
  updateCompanySaleConfigSchema,
} from '../schemas/companySchemas.js'

const router = createRouter()

router.get(
  '/invitations/:token',
  validate(companyInvitationTokenParamSchema, 'params'),
  getPublicCompanyInvitation
)
router.post(
  '/invitations/:token/accept',
  requireAuth,
  validate(companyInvitationTokenParamSchema, 'params'),
  acceptCompanyInvitation
)

router.get('/my-companies', requireAuth, getMyCompanies)
// The export keeps working during the closure export window (addendum §10.4).
router.get(
  '/export',
  requireAuth,
  requireCompanyAllowingClosure,
  requireCompanyRole('owner', 'admin'),
  companyExportRateLimiter,
  companyExportConcurrencyLimiter,
  exportCompanyData
)
router.get('/closures/mine', requireAuth, listMyCompanyClosures)
router.get(
  '/closure',
  requireAuth,
  requireCompanyAllowingClosure,
  requireCompanyRole('owner', 'admin'),
  getCompanyClosure
)
router.post(
  '/closure',
  requireAuth,
  requireCompany,
  requireCompanyRole('owner'),
  companyClosureUserLimiter,
  validate(companyClosureSchema),
  requestCompanyClosure
)
router.delete(
  '/closure',
  requireAuth,
  requireCompanyAllowingClosure,
  requireCompanyRole('owner'),
  cancelCompanyClosure
)
router.post('/', requireAuth, validate(createCompanySchema), createCompany)
router.get('/access-context', requireAuth, requireCompany, getCompanyAccessContext)
router.get('/members-panel', requireAuth, requireCompany, requireCompanyOwner, getCompanyUsersPanel)
router.post('/invitation', requireAuth, requireCompany, requireCompanyOwner, createOrGetCompanyInvitation)
router.delete('/invitation', requireAuth, requireCompany, requireCompanyOwner, deactivateCompanyInvitation)
router.patch(
  '/members/:userId/role',
  requireAuth,
  requireCompany,
  requireCompanyOwner,
  validate(companyMemberParamSchema, 'params'),
  validate(updateCompanyMemberRoleSchema),
  updateCompanyMemberRole
)
router.put(
  '/members/:userId/projects/:projectId',
  requireAuth,
  requireCompany,
  requireCompanyOwner,
  validate(companyMemberProjectParamsSchema, 'params'),
  validate(updateCompanyMemberProjectAccessSchema),
  upsertCompanyMemberProjectAccess
)
router.delete(
  '/members/:userId/projects/:projectId',
  requireAuth,
  requireCompany,
  requireCompanyOwner,
  validate(companyMemberProjectParamsSchema, 'params'),
  removeCompanyMemberProjectAccess
)
router.delete(
  '/members/:userId',
  requireAuth,
  requireCompany,
  requireCompanyOwner,
  validate(companyMemberParamSchema, 'params'),
  removeCompanyMember
)

// Leerla es para cualquier miembro: el POS necesita saber si pedir descuento y
// qué IVA mostrar. Cambiarla mueve lo que se cobra, así que es solo del owner.
router.get(
  '/sale-config',
  requireAuth,
  requireCompany,
  getCompanySaleConfig
)
router.put(
  '/sale-config',
  requireAuth,
  requireCompany,
  requireCompanyOwner,
  validate(updateCompanySaleConfigSchema),
  updateCompanySaleConfig
)

export default router
