import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import requireProjectPermission from '../middleware/requireProjectPermission.js'
import validate from '../middleware/validate.js'
import {
  createProjectSchema,
  getProjectsQuerySchema,
  projectInvitationTokenParamSchema,
  projectIdParamSchema,
  projectMemberParamSchema,
  updateProjectMemberAccessSchema,
  updateProjectSchema,
  upsertProjectInvitationSchema,
} from '../schemas/projectSchemas.js'
import {
  createProjectProgressEntrySchema,
  projectProgressEntryParamSchema,
  updateProjectProgressEntrySchema,
} from '../schemas/projectProgressSchemas.js'
import {
  acceptProjectInvitation,
  getProjects,
  getProjectById,
  createProject,
  createOrGetProjectInvitation,
  deactivateProjectInvitation,
  updateProject,
  deleteProject,
  getProjectMembers,
  getProjectMembersPanel,
  getPublicProjectInvitation,
  removeProjectMemberAccess,
  upsertProjectMemberAccess,
} from '../controllers/projectController.js'
import { getProjectMetrics } from '../controllers/projectMetricsController.js'
import {
  createProjectProgressEntry,
  deleteProjectProgressEntry,
  getProjectProgress,
  updateProjectProgressEntry,
} from '../controllers/projectProgressController.js'

const router = Router()

router.get('/invitations/:token', validate(projectInvitationTokenParamSchema, 'params'), getPublicProjectInvitation)
router.post('/invitations/:token/accept', requireAuth, validate(projectInvitationTokenParamSchema, 'params'), acceptProjectInvitation)
router.get('/', requireAuth, requireCompany, validate(getProjectsQuerySchema, 'query'), getProjects)
router.get('/:id', requireAuth, requireCompany, validate(projectIdParamSchema, 'params'), getProjectById)
router.post('/', requireAuth, requireCompany, requireCompanyRole('owner', 'admin', 'manager'), validate(createProjectSchema), createProject)
router.put('/:id', requireAuth, requireCompany, requireCompanyRole('owner', 'admin', 'manager'), validate(projectIdParamSchema, 'params'), validate(updateProjectSchema), updateProject)
router.delete('/:id', requireAuth, requireCompany, requireCompanyRole('owner', 'admin', 'manager'), validate(projectIdParamSchema, 'params'), deleteProject)
router.get('/:id/metrics', requireAuth, requireCompany, validate(projectIdParamSchema, 'params'), requireProjectPermission(), getProjectMetrics)
router.get('/:id/progress', requireAuth, requireCompany, validate(projectIdParamSchema, 'params'), requireProjectPermission(), getProjectProgress)
router.post('/:id/progress', requireAuth, requireCompany, validate(projectIdParamSchema, 'params'), requireProjectPermission(), validate(createProjectProgressEntrySchema), createProjectProgressEntry)
router.put('/:id/progress/:entryId', requireAuth, requireCompany, validate(projectProgressEntryParamSchema, 'params'), requireProjectPermission(), validate(updateProjectProgressEntrySchema), updateProjectProgressEntry)
router.delete('/:id/progress/:entryId', requireAuth, requireCompany, validate(projectProgressEntryParamSchema, 'params'), requireProjectPermission(), deleteProjectProgressEntry)
router.get('/:id/members', requireAuth, requireCompany, validate(projectIdParamSchema, 'params'), requireProjectPermission(), getProjectMembers)
router.get('/:id/members-panel', requireAuth, requireCompany, validate(projectIdParamSchema, 'params'), requireProjectPermission(), getProjectMembersPanel)
router.post('/:id/invitation', requireAuth, requireCompany, validate(projectIdParamSchema, 'params'), requireProjectPermission('asignar_usuarios'), validate(upsertProjectInvitationSchema), createOrGetProjectInvitation)
router.delete('/:id/invitation', requireAuth, requireCompany, validate(projectIdParamSchema, 'params'), requireProjectPermission('asignar_usuarios'), deactivateProjectInvitation)
router.put('/:id/members/:userId', requireAuth, requireCompany, validate(projectMemberParamSchema, 'params'), requireProjectPermission('asignar_usuarios'), validate(updateProjectMemberAccessSchema), upsertProjectMemberAccess)
router.delete('/:id/members/:userId', requireAuth, requireCompany, validate(projectMemberParamSchema, 'params'), requireProjectPermission('asignar_usuarios'), removeProjectMemberAccess)

export default router
