import pool from '../db/pool.js'

// Columns returned in admin user listings
const ADMIN_USER_SELECT = `
  u.id_usuario,
  u.nombre,
  u.apellido,
  u.email,
  u.telefono,
  u.activo,
  u.token_version,
  r.nombre_rol,
  CASE WHEN u.google_id IS NOT NULL THEN true ELSE false END AS google_auth,
  CASE WHEN u.password_hash IS NOT NULL THEN true ELSE false END AS password_auth
`

/**
 * GET /api/admin/stats
 * Returns summary numbers for the admin dashboard cards.
 */
export const getStats = async (req, res) => {
  const result = await pool.query(`
    SELECT
      COUNT(*)                                                      AS total,
      COUNT(*) FILTER (WHERE u.activo = true)                      AS activos,
      COUNT(*) FILTER (WHERE u.activo = false)                     AS inactivos,
      COUNT(*) FILTER (WHERE u.google_id IS NOT NULL)              AS google_users,
      COUNT(*) FILTER (WHERE u.password_hash IS NOT NULL
                         AND u.google_id IS NULL)                  AS password_users,
      COUNT(*) FILTER (WHERE r.nombre_rol = 'admin')               AS admins,
      COUNT(*) FILTER (WHERE r.nombre_rol = 'manager')             AS managers,
      COUNT(*) FILTER (WHERE r.nombre_rol = 'collaborator')        AS collaborators
    FROM public.usuario u
    JOIN public.rol r ON r.id_rol = u.id_rol
  `)

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * GET /api/admin/users
 * Query params: page, limit, role, activo, search
 */
export const getAdminUsers = async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1)
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
  const offset = (page - 1) * limit

  const filters = []
  const values  = []

  if (req.query.role) {
    values.push(req.query.role)
    filters.push(`r.nombre_rol = $${values.length}`)
  }

  if (req.query.activo !== undefined && req.query.activo !== '') {
    values.push(req.query.activo !== 'false')
    filters.push(`u.activo = $${values.length}`)
  }

  if (req.query.search) {
    values.push(`%${req.query.search}%`)
    const idx = values.length
    filters.push(`(u.nombre ILIKE $${idx} OR u.apellido ILIKE $${idx} OR u.email ILIKE $${idx})`)
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const [countResult, dataResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FROM public.usuario u JOIN public.rol r ON r.id_rol = u.id_rol ${where}`,
      values
    ),
    pool.query(
      `SELECT ${ADMIN_USER_SELECT}
       FROM public.usuario u
       JOIN public.rol r ON r.id_rol = u.id_rol
       ${where}
       ORDER BY u.id_usuario
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
  ])

  const total = parseInt(countResult.rows[0].count)

  return res.json({
    success: true,
    data: dataResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

/**
 * POST /api/admin/users/:id/revoke-token
 * Increments token_version, immediately invalidating all active JWTs for the user.
 */
export const revokeUserToken = async (req, res) => {
  const { id } = req.params

  // Prevent admin from revoking their own token via this endpoint
  if (parseInt(id) === req.user.id_usuario) {
    return res.status(400).json({ success: false, message: 'No puedes revocar tu propia sesión desde aquí.' })
  }

  const result = await pool.query(
    `UPDATE public.usuario
     SET token_version = token_version + 1
     WHERE id_usuario = $1
     RETURNING id_usuario, token_version`,
    [id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  return res.json({
    success: true,
    message: 'Sesiones revocadas. El usuario deberá iniciar sesión nuevamente.',
    data: result.rows[0],
  })
}

/**
 * PUT /api/admin/users/:id/toggle-active
 * Flips the activo flag and also revokes sessions if deactivating.
 */
export const toggleUserActive = async (req, res) => {
  const { id } = req.params

  if (parseInt(id) === req.user.id_usuario) {
    return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta.' })
  }

  const current = await pool.query(
    'SELECT activo FROM public.usuario WHERE id_usuario = $1',
    [id]
  )

  if (!current.rows.length) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  const newActivo = !current.rows[0].activo

  // When deactivating, also bump token_version to immediately invalidate any active sessions
  const result = await pool.query(
    `UPDATE public.usuario
     SET activo = $1,
         token_version = CASE WHEN $1 = false THEN token_version + 1 ELSE token_version END
     WHERE id_usuario = $2
     RETURNING id_usuario, activo, token_version`,
    [newActivo, id]
  )

  return res.json({
    success: true,
    message: newActivo ? 'Usuario activado.' : 'Usuario desactivado y sesiones revocadas.',
    data: result.rows[0],
  })
}

/**
 * PUT /api/admin/users/:id/role
 * Body: { role: 'admin' | 'manager' | 'collaborator' }
 */
export const changeUserRole = async (req, res) => {
  const { id } = req.params
  const { role } = req.body

  if (!role) {
    return res.status(400).json({ success: false, message: 'El campo role es requerido.' })
  }

  const rolRow = await pool.query(
    'SELECT id_rol FROM public.rol WHERE nombre_rol = $1',
    [role]
  )

  if (!rolRow.rows.length) {
    return res.status(400).json({ success: false, message: `El rol "${role}" no existe.` })
  }

  const result = await pool.query(
    `UPDATE public.usuario SET id_rol = $1 WHERE id_usuario = $2
     RETURNING id_usuario`,
    [rolRow.rows[0].id_rol, id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  return res.json({ success: true, message: `Rol actualizado a "${role}".` })
}
