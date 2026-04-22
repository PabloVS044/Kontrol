import pool from '../db/pool.js'
import { ensureProjectAccess } from '../services/projectAccessService.js'

const resolveProjectId = (req) =>
  req.project?.id_proyecto ??
  req.proyecto?.id_proyecto ??
  req.body?.projectId ??
  req.body?.id_proyecto ??
  req.query?.projectId ??
  req.query?.id_proyecto ??
  req.params?.projectId ??
  req.params?.id_proyecto ??
  req.params?.id ??
  req.headers['x-project-id'] ??
  req.headers['x-proyecto-id']

const requireProjectPermission = (...permissions) => async (req, res, next) => {
  const id_proyecto = resolveProjectId(req)

  if (!id_proyecto) {
    return res.status(400).json({
      success: false,
      message: 'Select a project to continue.',
    })
  }

  const access = await ensureProjectAccess({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    id_usuario: req.user.id_usuario,
    rol_empresa: req.empresa.rol_empresa,
    id_proyecto,
    requiredPermissions: permissions,
  })

  if (!access.allowed) {
    const message = access.reason === 'missing_permissions'
      ? 'You do not have sufficient permissions to operate in this project.'
      : 'You do not have access to this project.'

    return res.status(403).json({ success: false, message })
  }

  const projectContext = {
    ...(req.proyecto ?? {}),
    id_proyecto: Number(id_proyecto),
    permisos: access.permissions,
  }
  req.project = projectContext
  req.proyecto = projectContext

  next()
}

export default requireProjectPermission
