import pool from '../db/pool.js'
import { ensureProjectAccess } from '../services/projectAccessService.js'

/**
 * Validates that the project in X-Proyecto-ID header exists and belongs
 * to the empresa already validated by requireEmpresa.
 * Attaches req.proyecto = { id_proyecto }.
 * Must run after requireEmpresa.
 */
const requireProyecto = async (req, res, next) => {
  const id_proyecto = req.headers['x-proyecto-id']

  if (!id_proyecto) {
    return res.status(400).json({ success: false, message: 'Selecciona un proyecto para continuar.' })
  }

  const access = await ensureProjectAccess({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    id_usuario: req.user.id_usuario,
    rol_empresa: req.empresa.rol_empresa,
    id_proyecto,
  })

  if (!access.allowed) {
    return res.status(403).json({ success: false, message: 'No tienes acceso a este proyecto.' })
  }

  req.proyecto = {
    id_proyecto: parseInt(id_proyecto),
    permisos: access.permissions,
  }
  next()
}

export default requireProyecto
