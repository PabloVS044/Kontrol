import bcrypt from 'bcrypt'
import pool from '../db/pool.js'

const SALT_ROUNDS = 10

// Columns returned in every user response (password_hash excluded)
const USER_SELECT = `
  u.id_usuario,
  u.nombre,
  u.apellido,
  u.email,
  u.telefono,
  u.activo,
  r.nombre_rol
`

/**
 * GET /api/users
 * Query params: page, limit, role, activo  (validated + coerced by Zod middleware)
 */
export const getUsers = async (req, res) => {
  const { page, limit, role, activo } = req.query
  const offset = (page - 1) * limit

  const filters = []
  const values = []

  if (role) {
    values.push(role)
    filters.push(`r.nombre_rol = $${values.length}`)
  }

  if (activo !== undefined) {
    values.push(activo !== 'false')
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
    return res.status(404).json({ success: false, message: 'User not found.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * POST /api/users
 * Body: { nombre, apellido, email, password, role, telefono?, id_empresa? }  (validated by Zod)
 */
export const createUser = async (req, res) => {
  const { nombre, apellido, email, password, role, telefono } = req.body

  const client = await pool.connect()
  try {
    // Business-rule checks that require DB state
    const duplicate = await client.query(
      'SELECT id_usuario FROM public.usuario WHERE email = $1',
      [email]
    )
    if (duplicate.rows.length) {
      return res.status(409).json({ success: false, message: 'This email is already registered.' })
    }

    const rolRow = await client.query(
      'SELECT id_rol FROM public.rol WHERE nombre_rol = $1',
      [role]
    )
    if (!rolRow.rows.length) {
      return res.status(400).json({ success: false, message: `The role "${role}" does not exist in the database.` })
    }
    const id_rol = rolRow.rows[0].id_rol

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

    const inserted = await client.query(
      `INSERT INTO public.usuario
         (nombre, apellido, email, password_hash, telefono, id_rol)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_usuario`,
      [nombre, apellido, email, password_hash, telefono ?? null, id_rol]
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
 * Body: { nombre?, apellido?, email?, role?, telefono?, id_empresa? }  (validated by Zod)
 */
export const updateUser = async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, email, role, telefono } = req.body

  const client = await pool.connect()
  try {
    const existing = await client.query(
      'SELECT id_usuario FROM public.usuario WHERE id_usuario = $1',
      [id]
    )
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    if (email) {
      const duplicate = await client.query(
        'SELECT id_usuario FROM public.usuario WHERE email = $1 AND id_usuario != $2',
        [email, id]
      )
      if (duplicate.rows.length) {
        return res.status(409).json({ success: false, message: 'This email is already registered.' })
      }
    }

    let id_rol
    if (role) {
      const rolRow = await client.query(
        'SELECT id_rol FROM public.rol WHERE nombre_rol = $1',
        [role]
      )
      if (!rolRow.rows.length) {
        return res.status(400).json({ success: false, message: `The role "${role}" does not exist in the database.` })
      }
      id_rol = rolRow.rows[0].id_rol
    }

    const setClauses = []
    const values = []

    if (nombre !== undefined)   { values.push(nombre);   setClauses.push(`nombre = $${values.length}`) }
    if (apellido !== undefined) { values.push(apellido); setClauses.push(`apellido = $${values.length}`) }
    if (email !== undefined)    { values.push(email);    setClauses.push(`email = $${values.length}`) }
    if (telefono !== undefined) { values.push(telefono); setClauses.push(`telefono = $${values.length}`) }
    if (id_rol !== undefined)   { values.push(id_rol);   setClauses.push(`id_rol = $${values.length}`) }

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
    return res.status(404).json({ success: false, message: 'User not found.' })
  }

  return res.json({ success: true, message: 'User deactivated successfully.' })
}
