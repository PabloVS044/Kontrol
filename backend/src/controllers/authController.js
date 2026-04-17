import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'
import { acceptCompanyInvitation } from '../services/empresaInvitacionService.js'
import { getFrontendBaseUrl } from '../utils/frontendUrl.js'

const SALT_ROUNDS = 10

const signToken = (user) =>
  jwt.sign(
    { id_usuario: user.id_usuario, email: user.email, nombre_rol: user.nombre_rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )

const encodeOAuthState = (payload) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url')

const decodeOAuthState = (value) => {
  if (!value || typeof value !== 'string') return {}

  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

const maybeResolveInvite = async ({ client, inviteToken, id_usuario, req }) => {
  if (!inviteToken) return null

  return acceptCompanyInvitation({
    client,
    inviteToken,
    id_usuario,
    req,
  })
}

const getAuthRedirectForGoogle = async ({ client, user, req, inviteToken }) => {
  const frontendUrl = getFrontendBaseUrl(req)
  const token = signToken(user)
  const inviteResult = await maybeResolveInvite({
    client,
    inviteToken,
    id_usuario: user.id_usuario,
    req,
  })

  const empresaRow = await client.query(
    'SELECT 1 FROM public.empresa_usuario WHERE id_usuario = $1 LIMIT 1',
    [user.id_usuario]
  )

  const params = new URLSearchParams({
    token,
    onboarding: String(empresaRow.rows.length === 0),
  })

  if (inviteResult?.empresa?.id_empresa) {
    params.set('joinedEmpresaId', String(inviteResult.empresa.id_empresa))
  }

  if (inviteResult && !inviteResult.success && inviteToken) {
    params.set('inviteToken', inviteToken)
    params.set('inviteError', inviteResult.code)
  }

  return `${frontendUrl}/auth/callback?${params}`
}

// POST /api/auth/register (validado por Zod)
export const register = async (req, res) => {
  const { nombre, apellido, email, password, role, telefono, inviteToken } = req.body
  const platformRole = inviteToken ? 'usuario' : role

  const client = await pool.connect()
  try {
    const dup = await client.query('SELECT id_usuario FROM public.usuario WHERE email = $1', [email])
    if (dup.rows.length) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado.' })
    }

    const rolRow = await client.query('SELECT id_rol FROM public.rol WHERE nombre_rol = $1', [platformRole])
    if (!rolRow.rows.length) {
      return res.status(400).json({ success: false, message: `El rol "${platformRole}" no existe.` })
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
       FROM public.usuario u
       JOIN public.rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [inserted.rows[0].id_usuario]
    )

    const invite = await maybeResolveInvite({
      client,
      inviteToken,
      id_usuario: inserted.rows[0].id_usuario,
      req,
    })

    const token = signToken(user.rows[0])
    return res.status(201).json({ success: true, token, data: user.rows[0], invite })
  } finally {
    client.release()
  }
}

// POST /api/auth/login (validado por Zod)
export const login = async (req, res) => {
  const { email, password, inviteToken } = req.body

  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.password_hash, u.activo, r.nombre_rol
       FROM public.usuario u
       JOIN public.rol r ON r.id_rol = u.id_rol
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

    const invite = await maybeResolveInvite({
      client,
      inviteToken,
      id_usuario: user.id_usuario,
      req,
    })

    const token = signToken(user)
    const { password_hash, activo, ...userData } = user
    return res.json({ success: true, token, data: userData, invite })
  } finally {
    client.release()
  }
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
  const inviteToken = typeof req.query.invite === 'string' ? req.query.invite : null

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  })

  if (inviteToken) {
    params.set('state', encodeOAuthState({ inviteToken }))
  }

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user grants (or denies) access.
 */
export const googleCallback = async (req, res) => {
  const frontendUrl = getFrontendBaseUrl(req)
  const { code, error, state } = req.query
  const { inviteToken } = decodeOAuthState(state)

  if (error) {
    return res.redirect(`${frontendUrl}/login?error=google_cancelado`)
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || !tokens.id_token) {
      console.error('[Google OAuth] token exchange failed:', tokens)
      return res.redirect(`${frontendUrl}/login?error=google_error`)
    }

    const { sub: google_id, email, given_name, family_name } = jwt.decode(tokens.id_token)
    const nombre = given_name || email.split('@')[0]
    const apellido = family_name || ''

    const client = await pool.connect()
    try {
      let userRow = await client.query(
        `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, r.nombre_rol
         FROM public.usuario u
         JOIN public.rol r ON r.id_rol = u.id_rol
         WHERE u.google_id = $1`,
        [google_id]
      )

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

      if (!userRow.rows.length) {
        const rolRow = await client.query(
          "SELECT id_rol FROM public.rol WHERE nombre_rol = 'usuario' LIMIT 1"
        )
        if (!rolRow.rows.length) {
          return res.redirect(`${frontendUrl}/login?error=rol_no_encontrado`)
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
        return res.redirect(`${frontendUrl}/login?error=cuenta_desactivada`)
      }

      const redirectUrl = await getAuthRedirectForGoogle({
        client,
        user,
        req,
        inviteToken,
      })

      return res.redirect(redirectUrl)
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[Google OAuth]', err)
    return res.redirect(`${frontendUrl}/login?error=google_error`)
  }
}
