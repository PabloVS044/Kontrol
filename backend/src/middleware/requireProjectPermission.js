import pool from '../db/pool.js'
import { ensureProjectAccess } from '../services/projectAccessService.js'

const resolveProjectId = (req) =>
  req.proyecto?.id_proyecto ??
  req.body?.id_proyecto ??
  req.query?.id_proyecto ??
  req.params?.id_proyecto ??
  req.params?.id ??
  req.headers['x-proyecto-id']

const requireProjectPermission = (...permissions) => async (req, res, next) => {
  const id_proyecto = resolveProjectId(req)

  if (!id_proyecto) {
    return res.status(400).json({
      success: false,
      message: 'Selecciona un proyecto para continuar.',
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
      ? 'No tienes permisos suficientes para operar en este proyecto.'
      : 'No tienes acceso a este proyecto.'

    return res.status(403).json({ success: false, message })
  }

  req.proyecto = {
    ...(req.proyecto ?? {}),
    id_proyecto: Number(id_proyecto),
    permisos: access.permissions,
  }

  next()
}

export default requireProjectPermission
