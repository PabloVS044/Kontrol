import pool from '../db/pool.js'

/**
 * GET /api/admin/stats
 * Global platform counts for the admin dashboard.
 */
export const getAdminStats = async (req, res) => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM public.empresa)                          AS total_empresas,
      (SELECT COUNT(*)::int FROM public.usuario WHERE activo = true)      AS total_usuarios,
      (SELECT COUNT(*)::int FROM public.proyecto)                         AS total_proyectos,
      (SELECT COUNT(*)::int FROM public.usuario WHERE activo = false)     AS total_usuarios_inactivos
  `)

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * GET /api/admin/companies
 * All companies with member and project counts.
 */
export const getAdminCompanies = async (req, res) => {
  const result = await pool.query(`
    SELECT
      e.id_empresa,
      e.nombre,
      e.industria,
      e.email,
      e.telefono,
      COUNT(DISTINCT eu.id_usuario)::int  AS total_miembros,
      COUNT(DISTINCT p.id_proyecto)::int  AS total_proyectos
    FROM public.empresa e
    LEFT JOIN public.empresa_usuario eu ON eu.id_empresa = e.id_empresa
    LEFT JOIN public.proyecto p         ON p.id_empresa  = e.id_empresa
    GROUP BY e.id_empresa
    ORDER BY e.id_empresa DESC
  `)

  return res.json({ success: true, data: result.rows })
}

/**
 * GET /api/admin/users
 * All platform users with system role and company count.
 */
export const getAdminUsers = async (req, res) => {
  const result = await pool.query(`
    SELECT
      u.id_usuario,
      u.nombre,
      u.apellido,
      u.email,
      u.telefono,
      u.activo,
      r.nombre_rol,
      COUNT(eu.id_empresa)::int AS total_empresas
    FROM public.usuario u
    JOIN public.rol r            ON r.id_rol      = u.id_rol
    LEFT JOIN public.empresa_usuario eu ON eu.id_usuario = u.id_usuario
    GROUP BY u.id_usuario, r.nombre_rol
    ORDER BY u.id_usuario DESC
  `)

  return res.json({ success: true, data: result.rows })
}
