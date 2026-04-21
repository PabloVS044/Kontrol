import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireEmpresaRole from '../middleware/requireEmpresaRole.js'
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
import { getProyectsMetrics } from '../controllers/metricasProyectoController.js'

const router = Router()

router.get('/invitaciones/:token', validate(projectInvitationTokenParamSchema, 'params'), getPublicProjectInvitation)
router.post('/invitaciones/:token/accept', requireAuth, validate(projectInvitationTokenParamSchema, 'params'), acceptProjectInvitation)
router.get('/', requireAuth, requireEmpresa, validate(getProjectsQuerySchema, 'query'), getProjects)
router.get('/:id', requireAuth, requireEmpresa, validate(projectIdParamSchema, 'params'), getProjectById)
router.post('/', requireAuth, requireEmpresa, requireEmpresaRole('owner', 'admin', 'manager'), validate(createProjectSchema), createProject)
router.put('/:id', requireAuth, requireEmpresa, requireEmpresaRole('owner', 'admin', 'manager'), validate(projectIdParamSchema, 'params'), validate(updateProjectSchema), updateProject)
router.delete('/:id', requireAuth, requireEmpresa, requireEmpresaRole('owner', 'admin', 'manager'), validate(projectIdParamSchema, 'params'), deleteProject)
router.get('/:id/metrics', requireAuth, requireEmpresa, getProyectsMetrics)
router.get('/:id/members', requireAuth, requireEmpresa, validate(projectIdParamSchema, 'params'), requireProjectPermission(), getProjectMembers)
router.get('/:id/members-panel', requireAuth, requireEmpresa, validate(projectIdParamSchema, 'params'), requireProjectPermission(), getProjectMembersPanel)
router.post('/:id/invitacion', requireAuth, requireEmpresa, validate(projectIdParamSchema, 'params'), requireProjectPermission('asignar_usuarios'), validate(upsertProjectInvitationSchema), createOrGetProjectInvitation)
router.delete('/:id/invitacion', requireAuth, requireEmpresa, validate(projectIdParamSchema, 'params'), requireProjectPermission('asignar_usuarios'), deactivateProjectInvitation)
router.put('/:id/members/:id_usuario', requireAuth, requireEmpresa, validate(projectMemberParamSchema, 'params'), requireProjectPermission('asignar_usuarios'), validate(updateProjectMemberAccessSchema), upsertProjectMemberAccess)
router.delete('/:id/members/:id_usuario', requireAuth, requireEmpresa, validate(projectMemberParamSchema, 'params'), requireProjectPermission('asignar_usuarios'), removeProjectMemberAccess)

export default router
