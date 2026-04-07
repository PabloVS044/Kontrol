import bcrypt from 'bcrypt'
import pool from '../db/pool.js'

const SALT_ROUNDS = 10
const VALID_ROLES = ['admin', 'manager', 'collaborator']

// Columns returned in every user response (password_hash excluded)
const USER_SELECT = `
  u.id_usuario,
  u.nombre,
  u.apellido,
  u.email,
  u.telefono,
  u.id_empresa,
  u.activo,
  r.nombre_rol
`

/**
 * GET /api/users
 * Query params: page (default 1), limit (default 20), role, activo
 */
export const getUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
  const offset = (page - 1) * limit

  const filters = []
  const values = []

  if (req.query.role) {
    if (!VALID_ROLES.includes(req.query.role)) {
      return res.status(400).json({ success: false, message: 'Rol inválido.' })
    }
    values.push(req.query.role)
    filters.push(`r.nombre_rol = $${values.length}`)
  }

  if (req.query.activo !== undefined) {
    values.push(req.query.activo !== 'false')
    filters.push(`u.activo = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const countQuery = `
    SELECT COUNT(*) FROM public.usuario u
    JOIN public.rol r ON r.id_rol = u.id_rol
    ${where}
  `
  const dataQuery = `
    SELECT ${USER_SELECT}
    FROM public.usuario u
    JOIN public.rol r ON r.id_rol = u.id_rol
    ${where}
    ORDER BY u.id_usuario
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, values),
    pool.query(dataQuery, [...values, limit, offset]),
  ])

  const total = parseInt(countResult.rows[0].count)

  return res.json({
    success: true,
    data: dataResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

/**
 * GET /api/users/:id
 */
export const getUserById = async (req, res) => {
  const { id } = req.params

  const result = await pool.query(
    `SELECT ${USER_SELECT}
     FROM public.usuario u
     JOIN public.rol r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = $1`,
    [id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * POST /api/users
 * Body: { nombre, apellido, email, password, role, telefono?, id_empresa? }
 */
export const createUser = async (req, res) => {
  const { nombre, apellido, email, password, role, telefono, id_empresa } = req.body

  // Validation
  if (!nombre || !apellido || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'nombre, apellido, email, password y role son requeridos.',
    })
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: `role debe ser uno de: ${VALID_ROLES.join(', ')}.` })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Formato de email inválido.' })
  }

  const client = await pool.connect()
  try {
    // Check duplicate email
    const duplicate = await client.query(
      'SELECT id_usuario FROM public.usuario WHERE email = $1',
      [email]
    )
    if (duplicate.rows.length) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado.' })
    }

    // Resolve role id
    const rolRow = await client.query(
      'SELECT id_rol FROM public.rol WHERE nombre_rol = $1',
      [role]
    )
    if (!rolRow.rows.length) {
      return res.status(400).json({ success: false, message: `El rol "${role}" no existe en la base de datos.` })
    }
    const id_rol = rolRow.rows[0].id_rol

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

    const inserted = await client.query(
      `INSERT INTO public.usuario
         (nombre, apellido, email, password_hash, telefono, id_empresa, id_rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_usuario`,
      [nombre, apellido, email, password_hash, telefono || null, id_empresa || null, id_rol]
    )

    const newUser = await client.query(
      `SELECT ${USER_SELECT}
       FROM public.usuario u
       JOIN public.rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [inserted.rows[0].id_usuario]
    )

    return res.status(201).json({ success: true, data: newUser.rows[0] })
  } finally {
    client.release()
  }
}

/**
 * PUT /api/users/:id
 * Body: { nombre?, apellido?, email?, role?, telefono?, id_empresa? }
 */
export const updateUser = async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, email, role, telefono, id_empresa } = req.body

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Formato de email inválido.' })
    }
  }

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: `role debe ser uno de: ${VALID_ROLES.join(', ')}.` })
  }

  const client = await pool.connect()
  try {
    const existing = await client.query(
      'SELECT id_usuario FROM public.usuario WHERE id_usuario = $1',
      [id]
    )
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
    }

    if (email) {
      const duplicate = await client.query(
        'SELECT id_usuario FROM public.usuario WHERE email = $1 AND id_usuario != $2',
        [email, id]
      )
      if (duplicate.rows.length) {
        return res.status(409).json({ success: false, message: 'El email ya está registrado.' })
      }
    }

    let id_rol
    if (role) {
      const rolRow = await client.query(
        'SELECT id_rol FROM public.rol WHERE nombre_rol = $1',
        [role]
      )
      if (!rolRow.rows.length) {
        return res.status(400).json({ success: false, message: `El rol "${role}" no existe en la base de datos.` })
      }
      id_rol = rolRow.rows[0].id_rol
    }

    const setClauses = []
    const values = []

    if (nombre !== undefined)     { values.push(nombre);     setClauses.push(`nombre = $${values.length}`) }
    if (apellido !== undefined)   { values.push(apellido);   setClauses.push(`apellido = $${values.length}`) }
    if (email !== undefined)      { values.push(email);      setClauses.push(`email = $${values.length}`) }
    if (telefono !== undefined)   { values.push(telefono);   setClauses.push(`telefono = $${values.length}`) }
    if (id_empresa !== undefined) { values.push(id_empresa); setClauses.push(`id_empresa = $${values.length}`) }
    if (id_rol !== undefined)     { values.push(id_rol);     setClauses.push(`id_rol = $${values.length}`) }

    if (!setClauses.length) {
      return res.status(400).json({ success: false, message: 'No se proporcionaron campos para actualizar.' })
    }

    values.push(id)
    await client.query(
      `UPDATE public.usuario SET ${setClauses.join(', ')} WHERE id_usuario = $${values.length}`,
      values
    )

    const updated = await client.query(
      `SELECT ${USER_SELECT}
       FROM public.usuario u
       JOIN public.rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [id]
    )

    return res.json({ success: true, data: updated.rows[0] })
  } finally {
    client.release()
  }
}

/**
 * DELETE /api/users/:id
 * Soft delete: sets activo = false
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params

  const result = await pool.query(
    'UPDATE public.usuario SET activo = false WHERE id_usuario = $1 RETURNING id_usuario',
    [id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  return res.json({ success: true, message: 'Usuario desactivado correctamente.' })
}
