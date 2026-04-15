import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'

const SALT_ROUNDS = 10

const signToken = (user) =>
  jwt.sign(
    { id_usuario: user.id_usuario, email: user.email, nombre_rol: user.nombre_rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )

// POST /api/auth/register (validado por Zod)
export const register = async (req, res) => {
  const { nombre, apellido, email, password, role, telefono } = req.body

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
      `INSERT INTO public.usuario (nombre, apellido, email, password_hash, telefono, id_rol)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_usuario`,
      [nombre, apellido, email, password_hash, telefono ?? null, rolRow.rows[0].id_rol]
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

// POST /api/auth/login (validado por Zod)
export const login = async (req, res) => {
  const { email, password } = req.body

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

// GET /api/auth/me
export const getMe = async (req, res) => {
  const result = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono, u.activo, r.nombre_rol
     FROM public.usuario u
     JOIN public.rol r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = $1`,
    [req.user.id_usuario]
  )
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }
  return res.json({ success: true, data: result.rows[0] })
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * GET /api/auth/google
 * Redirects the browser to Google's consent screen.
 */
export const googleAuth = (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user grants (or denies) access.
 *
 * Happy path:
 *   1. Exchange authorization code for tokens
 *   2. Verify ID token and extract profile
 *   3. Find user by google_id → link → or create (find-or-create)
 *   4. Issue our own JWT and redirect to the frontend
 *
 * On any error the browser is redirected to /login?error=<reason>
 * so the frontend always receives a meaningful signal.
 */
export const googleCallback = async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
  const { code, error } = req.query

  if (error) {
    return res.redirect(`${FRONTEND_URL}/login?error=google_cancelado`)
  }

  try {
    // Exchange authorization code for tokens using native fetch (Node 18+)
    // — avoids node-fetch inside google-auth-library which ignores DNS settings
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  process.env.GOOGLE_CALLBACK_URL,
        grant_type:    'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || !tokens.id_token) {
      console.error('[Google OAuth] token exchange failed:', tokens)
      return res.redirect(`${FRONTEND_URL}/login?error=google_error`)
    }

    const { sub: google_id, email, given_name, family_name } = jwt.decode(tokens.id_token)
    const nombre   = given_name  || email.split('@')[0]
    const apellido = family_name || ''

    const client = await pool.connect()
    try {
      // 1. Look up by google_id
      let userRow = await client.query(
        `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, r.nombre_rol
         FROM public.usuario u
         JOIN public.rol r ON r.id_rol = u.id_rol
         WHERE u.google_id = $1`,
        [google_id]
      )

      // 2. Look up by email and link the Google account
      if (!userRow.rows.length) {
        const byEmail = await client.query(
          `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, r.nombre_rol
           FROM public.usuario u
           JOIN public.rol r ON r.id_rol = u.id_rol
           WHERE u.email = $1`,
          [email]
        )

        if (byEmail.rows.length) {
          await client.query(
            'UPDATE public.usuario SET google_id = $1 WHERE id_usuario = $2',
            [google_id, byEmail.rows[0].id_usuario]
          )
          userRow = byEmail
        }
      }

      // 3. Create a new user (first-time Google sign-up)
      if (!userRow.rows.length) {
        const rolRow = await client.query(
          "SELECT id_rol FROM public.rol WHERE nombre_rol = 'admin' LIMIT 1"
        )
        if (!rolRow.rows.length) {
          return res.redirect(`${FRONTEND_URL}/login?error=rol_no_encontrado`)
        }

        const inserted = await client.query(
          `INSERT INTO public.usuario (nombre, apellido, email, password_hash, google_id, id_rol)
           VALUES ($1, $2, $3, NULL, $4, $5)
           RETURNING id_usuario`,
          [nombre, apellido, email, google_id, rolRow.rows[0].id_rol]
        )

        userRow = await client.query(
          `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, r.nombre_rol
           FROM public.usuario u
           JOIN public.rol r ON r.id_rol = u.id_rol
           WHERE u.id_usuario = $1`,
          [inserted.rows[0].id_usuario]
        )
      }

      const user = userRow.rows[0]

      if (!user.activo) {
        return res.redirect(`${FRONTEND_URL}/login?error=cuenta_desactivada`)
      }

      const token = signToken(user)

      // onboarding=true si el usuario no pertenece a ninguna empresa todavía
      const empresaRow = await client.query(
        'SELECT 1 FROM public.empresa_usuario WHERE id_usuario = $1 LIMIT 1',
        [user.id_usuario]
      )
      const onboarding = empresaRow.rows.length === 0
      return res.redirect(
        `${FRONTEND_URL}/auth/callback?token=${token}&onboarding=${onboarding}`
      )
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[Google OAuth]', err)
    return res.redirect(`${FRONTEND_URL}/login?error=google_error`)
  }
}
