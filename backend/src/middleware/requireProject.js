import pool from '../db/pool.js'
import { ensureProjectAccess } from '../services/projectAccessService.js'

/**
 * Validates that the project in the X-Project-ID header exists and belongs
 * to the company already validated by requireCompany.
 * Keeps req.project and req.proyecto in sync.
 * Must run after requireCompany.
 */
const requireProject = async (req, res, next) => {
  const id_proyecto = req.headers['x-project-id'] ?? req.headers['x-proyecto-id']

  if (!id_proyecto) {
    return res.status(400).json({ success: false, message: 'Select a project to continue.' })
  }

  const access = await ensureProjectAccess({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    id_usuario: req.user.id_usuario,
    rol_empresa: req.empresa.rol_empresa,
    id_proyecto,
  })

  if (!access.allowed) {
    return res.status(403).json({ success: false, message: 'You do not have access to this project.' })
  }

  const projectContext = {
    id_proyecto: parseInt(id_proyecto),
    permisos: access.permissions,
  }
  req.project = projectContext
  req.proyecto = projectContext
  next()
}

export default requireProject
