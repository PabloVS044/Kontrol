import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'

const SALT_ROUNDS = 10
const VALID_ROLES = ['admin', 'manager', 'collaborator']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Genera un JWT con el payload del usuario
const signToken = (user) =>
  jwt.sign(
    { id_usuario: user.id_usuario, email: user.email, nombre_rol: user.nombre_rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )

// POST /api/auth/register
export const register = async (req, res) => {
  const { nombre, apellido, email, password, role, telefono, id_empresa } = req.body

  if (!nombre || !apellido || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'nombre, apellido, email, password y role son requeridos.' })
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: `role debe ser uno de: ${VALID_ROLES.join(', ')}.` })
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, message: 'Formato de email inválido.' })
  }

  const client = await pool.connect()
  try {
    const dup = await client.query('SELECT id_usuario FROM public.usuario WHERE email = $1', [email])
    if (dup.rows.length) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado.' })
    }

    const rolRow = await client.query('SELECT id_rol FROM public.rol WHERE nombre_rol = $1', [role])
    if (!rolRow.rows.length) {
      return res.status(400).json({ success: false, message: `El rol "${role}" no existe.` })
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

    const inserted = await client.query(
      `INSERT INTO public.usuario (nombre, apellido, email, password_hash, telefono, id_empresa, id_rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_usuario`,
      [nombre, apellido, email, password_hash, telefono || null, id_empresa || null, rolRow.rows[0].id_rol]
    )

    const user = await client.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, r.nombre_rol
       FROM public.usuario u JOIN public.rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [inserted.rows[0].id_usuario]
    )

    const token = signToken(user.rows[0])
    return res.status(201).json({ success: true, token, data: user.rows[0] })
  } finally {
    client.release()
  }
}

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'email y password son requeridos.' })
  }

  const result = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.password_hash, u.activo, r.nombre_rol
     FROM public.usuario u JOIN public.rol r ON r.id_rol = u.id_rol
     WHERE u.email = $1`,
    [email]
  )

  if (!result.rows.length) {
    return res.status(401).json({ success: false, message: 'Credenciales inválidas.' })
  }

  const user = result.rows[0]

  if (!user.activo) {
    return res.status(403).json({ success: false, message: 'Cuenta desactivada.' })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Credenciales inválidas.' })
  }

  const token = signToken(user)
  const { password_hash, activo, ...userData } = user
  return res.json({ success: true, token, data: userData })
}
