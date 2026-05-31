import pool from '../db/pool.js'

/**
 * Validates that the authenticated user belongs to the company selected
 * in the X-Company-ID header. Keeps req.company and req.empresa in sync.
 */
const requireCompany = async (req, res, next) => {
  const id_empresa = req.headers['x-company-id'] ?? req.headers['x-empresa-id']

  if (!id_empresa) {
    return res.status(400).json({ success: false, message: 'Select a company before continuing.' })
  }

  if (req.user?.nombre_rol === 'super_user') {
    const companyCheck = await pool.query(
      'SELECT id_empresa, nombre FROM public.empresa WHERE id_empresa = $1',
      [id_empresa]
    )
    if (!companyCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Company not found.' })
    }
    const companyContext = {
      id_empresa: parseInt(id_empresa),
      nombre: companyCheck.rows[0].nombre,
      rol_empresa: 'super_user',
    }
    req.company = companyContext
    req.empresa = companyContext
    return next()
  }

  const result = await pool.query(
    `SELECT eu.id_rol_empresa, re.nombre AS rol_empresa, e.activo, e.nombre
     FROM public.empresa_usuario eu
     JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
     JOIN public.empresa e ON e.id_empresa = eu.id_empresa
     WHERE eu.id_empresa = $1 AND eu.id_usuario = $2`,
    [id_empresa, req.user.id_usuario]
  )

  if (!result.rows.length) {
    return res.status(403).json({ success: false, message: 'You do not have access to this company.' })
  }

  if (!result.rows[0].activo) {
    return res.status(403).json({ success: false, message: 'This company is currently inactive.' })
  }

  const companyContext = {
    id_empresa: parseInt(id_empresa),
    nombre: result.rows[0].nombre,
    rol_empresa: result.rows[0].rol_empresa,
  }
  req.company = companyContext
  req.empresa = companyContext

  next()
}

export default requireCompany
