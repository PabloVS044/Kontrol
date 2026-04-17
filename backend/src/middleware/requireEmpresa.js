import pool from '../db/pool.js'

/**
 * Valida que el usuario autenticado pertenezca a la empresa indicada
 * en el header X-Empresa-ID. Adjunta req.empresa = { id_empresa, rol_empresa }.
 */
const requireEmpresa = async (req, res, next) => {
  const id_empresa = req.headers['x-empresa-id']

  if (!id_empresa) {
    return res.status(400).json({ success: false, message: 'Selecciona una empresa antes de continuar.' })
  }

  const result = await pool.query(
    `SELECT eu.id_rol_empresa, re.nombre AS rol_empresa
     FROM public.empresa_usuario eu
     JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
     WHERE eu.id_empresa = $1 AND eu.id_usuario = $2`,
    [id_empresa, req.user.id_usuario]
  )

  if (!result.rows.length) {
    return res.status(403).json({ success: false, message: 'No tienes acceso a esta empresa.' })
  }

  req.empresa = {
    id_empresa: parseInt(id_empresa),
    rol_empresa: result.rows[0].rol_empresa,
  }

  next()
}

export default requireEmpresa
