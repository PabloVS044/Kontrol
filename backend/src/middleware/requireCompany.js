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

  const result = await pool.query(
    `SELECT eu.id_rol_empresa, re.nombre AS rol_empresa
     FROM public.empresa_usuario eu
     JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
     WHERE eu.id_empresa = $1 AND eu.id_usuario = $2`,
    [id_empresa, req.user.id_usuario]
  )

  if (!result.rows.length) {
    return res.status(403).json({ success: false, message: 'You do not have access to this company.' })
  }

  const companyContext = {
    id_empresa: parseInt(id_empresa),
    rol_empresa: result.rows[0].rol_empresa,
  }
  req.company = companyContext
  req.empresa = companyContext

  next()
}

export default requireCompany
