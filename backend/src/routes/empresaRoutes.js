import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireEmpresaOwner from '../middleware/requireEmpresaOwner.js'
import validate from '../middleware/validate.js'
import {
  acceptEmpresaInvitation,
  createEmpresa,
  createOrGetEmpresaInvitation,
  deactivateEmpresaInvitation,
  getEmpresaAccessContext,
  getEmpresaUsersPanel,
  getMisEmpresas,
  getPublicEmpresaInvitation,
  removeEmpresaMember,
  removeEmpresaMemberProjectAccess,
  upsertEmpresaMemberProjectAccess,
  updateEmpresaMemberRole,
} from '../controllers/empresaController.js'
import {
  createEmpresaSchema,
  empresaInvitationTokenParamSchema,
  empresaMemberParamSchema,
  empresaMemberProjectParamsSchema,
  updateEmpresaMemberRoleSchema,
  updateEmpresaMemberProjectAccessSchema,
} from '../schemas/empresaSchemas.js'

const router = Router()

router.get(
  '/invitaciones/:token',
  validate(empresaInvitationTokenParamSchema, 'params'),
  getPublicEmpresaInvitation
)
router.post(
  '/invitaciones/:token/accept',
  requireAuth,
  validate(empresaInvitationTokenParamSchema, 'params'),
  acceptEmpresaInvitation
)

router.get('/mis-empresas', requireAuth, getMisEmpresas)
router.post('/', requireAuth, validate(createEmpresaSchema), createEmpresa)
router.get('/contexto-acceso', requireAuth, requireEmpresa, getEmpresaAccessContext)
router.get('/panel-usuarios', requireAuth, requireEmpresa, requireEmpresaOwner, getEmpresaUsersPanel)
router.post('/invitacion', requireAuth, requireEmpresa, requireEmpresaOwner, createOrGetEmpresaInvitation)
router.delete('/invitacion', requireAuth, requireEmpresa, requireEmpresaOwner, deactivateEmpresaInvitation)
router.patch(
  '/miembros/:id_usuario/rol',
  requireAuth,
  requireEmpresa,
  requireEmpresaOwner,
  validate(empresaMemberParamSchema, 'params'),
  validate(updateEmpresaMemberRoleSchema),
  updateEmpresaMemberRole
)
router.put(
  '/miembros/:id_usuario/proyectos/:id_proyecto',
  requireAuth,
  requireEmpresa,
  requireEmpresaOwner,
  validate(empresaMemberProjectParamsSchema, 'params'),
  validate(updateEmpresaMemberProjectAccessSchema),
  upsertEmpresaMemberProjectAccess
)
router.delete(
  '/miembros/:id_usuario/proyectos/:id_proyecto',
  requireAuth,
  requireEmpresa,
  requireEmpresaOwner,
  validate(empresaMemberProjectParamsSchema, 'params'),
  removeEmpresaMemberProjectAccess
)
router.delete(
  '/miembros/:id_usuario',
  requireAuth,
  requireEmpresa,
  requireEmpresaOwner,
  validate(empresaMemberParamSchema, 'params'),
  removeEmpresaMember
)

export default router
