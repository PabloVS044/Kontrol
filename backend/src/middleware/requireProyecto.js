import pool from '../db/pool.js'

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

  const result = await pool.query(
    'SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2',
    [id_proyecto, req.empresa.id_empresa]
  )

  if (!result.rows.length) {
    return res.status(403).json({ success: false, message: 'No tienes acceso a este proyecto.' })
  }

  req.proyecto = { id_proyecto: parseInt(id_proyecto) }
  next()
}

export default requireProyecto
