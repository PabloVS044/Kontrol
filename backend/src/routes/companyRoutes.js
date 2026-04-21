import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyOwner from '../middleware/requireCompanyOwner.js'
import validate from '../middleware/validate.js'
import {
  acceptCompanyInvitation,
  createCompany,
  createOrGetCompanyInvitation,
  deactivateCompanyInvitation,
  getCompanyAccessContext,
  getCompanyUsersPanel,
  getMyCompanies,
  getPublicCompanyInvitation,
  removeCompanyMember,
  removeCompanyMemberProjectAccess,
  upsertCompanyMemberProjectAccess,
  updateCompanyMemberRole,
} from '../controllers/companyController.js'
import {
  createCompanySchema,
  companyInvitationTokenParamSchema,
  companyMemberParamSchema,
  companyMemberProjectParamsSchema,
  updateCompanyMemberRoleSchema,
  updateCompanyMemberProjectAccessSchema,
} from '../schemas/companySchemas.js'

const router = Router()

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

export default router
