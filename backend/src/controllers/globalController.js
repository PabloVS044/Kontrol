import pool from '../db/pool.js'

export const getAllCompanies = async (req, res) => {
  const result = await pool.query(`
    SELECT
      e.id_empresa,
      e.nombre,
      COUNT(DISTINCT eu.id_usuario)  AS total_usuarios,
      COUNT(DISTINCT p.id_proyecto)  AS total_proyectos
    FROM public.empresa e
    LEFT JOIN public.empresa_usuario eu ON eu.id_empresa = e.id_empresa
    LEFT JOIN public.proyecto p          ON p.id_empresa  = e.id_empresa
    GROUP BY e.id_empresa, e.nombre
    ORDER BY e.id_empresa
  `)
  return res.json({ success: true, data: result.rows })
}

export const getPlatformStats = async (req, res) => {
  const [usersResult, companiesResult, projectsResult, activeUsersResult] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM public.usuario'),
    pool.query('SELECT COUNT(*) FROM public.empresa'),
    pool.query('SELECT COUNT(*) FROM public.proyecto'),
    pool.query("SELECT COUNT(*) FROM public.usuario WHERE activo = true"),
  ])

  return res.json({
    success: true,
    data: {
      total_users:        parseInt(usersResult.rows[0].count),
      active_users:       parseInt(activeUsersResult.rows[0].count),
      total_companies:    parseInt(companiesResult.rows[0].count),
      total_projects:     parseInt(projectsResult.rows[0].count),
    },
  })
}
