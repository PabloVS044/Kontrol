import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import pool from '../db/pool.js'
import { isReauthAction, REAUTH_ACTIONS } from '../auth/reauthentication.js'
import {
  acceptCompanyInvitation,
  getInvitationByToken as getCompanyInvitationByToken,
} from '../services/companyInvitationService.js'
import {
  acceptProjectInvitation,
  getProjectInvitationByToken,
} from '../services/projectInvitationService.js'
import { getFrontendBaseUrl } from '../utils/frontendUrl.js'
import { logger } from '../utils/logger.js'

// Configurable so the test environment can trade hash strength for CPU
// headroom under load — see docs/pruebas-carga-estres.md. Production never
// sets BCRYPT_SALT_ROUNDS, so it always falls back to 10.
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10

const signToken = (user) =>
  jwt.sign(
    {
      id_usuario: user.id_usuario,
      email: user.email,
      nombre_rol: user.nombre_rol,
      token_version: user.token_version ?? 1,
    },
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

  const companyInvitation = await getCompanyInvitationByToken(client, inviteToken)
  if (companyInvitation) {
    return acceptCompanyInvitation({
      client,
      inviteToken,
      id_usuario,
      req,
    })
  }

  const projectInvitation = await getProjectInvitationByToken(client, inviteToken)
  if (projectInvitation) {
    return acceptProjectInvitation({
      client,
      inviteToken,
      id_usuario,
      req,
    })
  }

  return {
    success: false,
    code: 'invite_not_found',
    message: 'The invitation does not exist.',
    invitation: null,
    empresa: null,
    proyecto: null,
  }
}

const getAuthRedirectForGoogle = async ({ client, user, req, inviteToken, frontendUrl }) => {
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
      return res.status(409).json({ success: false, message: 'This email is already registered.' })
    }

    const rolRow = await client.query('SELECT id_rol FROM public.rol WHERE nombre_rol = $1', [platformRole])
    if (!rolRow.rows.length) {
      return res.status(400).json({ success: false, message: `The role "${platformRole}" does not exist.` })
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
//
// RTF 2 (PERF-01): el cliente del pool se tomaba al entrar y se retenía
// durante bcrypt.compare, que es CPU pura. Bajo carga, los logins ocupaban
// las 10 conexiones esperando al hash y el resto de la API hacía cola detrás.
// Ahora la consulta no reserva cliente y solo se toma uno si hay invitación.
//
// Bajar BCRYPT_SALT_ROUNDS no acelera este camino: compare usa el costo
// guardado en cada hash, no el configurado.
export const login = async (req, res) => {
  const { email, password, inviteToken } = req.body

  const result = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.password_hash, u.activo, u.token_version, r.nombre_rol
     FROM public.usuario u
     JOIN public.rol r ON r.id_rol = u.id_rol
     WHERE u.email = $1`,
    [email]
  )

  if (!result.rows.length) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' })
  }

  const user = result.rows[0]

  if (!user.activo) {
    return res.status(403).json({ success: false, message: 'Account disabled.' })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' })
  }

  let invite = null
  if (inviteToken) {
    const client = await pool.connect()
    try {
      invite = await maybeResolveInvite({
        client,
        inviteToken,
        id_usuario: user.id_usuario,
        req,
      })
    } finally {
      client.release()
    }
  }

  const token = signToken(user)
  const { password_hash, activo, ...userData } = user
  delete userData.token_version
  return res.json({ success: true, token, data: userData, invite })
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
    return res.status(404).json({ success: false, message: 'User not found.' })
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
  // Con varios frontends en FRONTEND_URL, el callback de Google no trae Origin:
  // el frontend que inició el login viaja en el state y se revalida al volver.
  const frontend = getFrontendBaseUrl(req, req.query.return_to)

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: encodeOAuthState(inviteToken ? { inviteToken, frontend } : { frontend }),
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

export const googleDeletionReauthentication = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CALLBACK_URL) {
    return res.status(503).json({ success: false, message: 'Google reauthentication is not configured.' })
  }

  const frontend = getFrontendBaseUrl(req, req.headers.origin)
  const nonce = randomUUID()
  // The same Google round trip serves every destructive action; `action`
  // decides the purpose of the proof it returns.
  const action = isReauthAction(req.body?.action) ? req.body.action : REAUTH_ACTIONS.ACCOUNT_DELETION
  const state = jwt.sign(
    { purpose: 'account-deletion-reauth', action, id_usuario: req.user.id_usuario, frontend, nonce },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  )
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'login select_account',
    max_age: '0',
    nonce,
    state,
  })

  return res.json({
    success: true,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  })
}

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user grants (or denies) access.
 */
export const googleCallback = async (req, res) => {
  const { code, error, state } = req.query
  let deletionState = null
  if (typeof state === 'string' && state.includes('.')) {
    try {
      const payload = jwt.verify(state, process.env.JWT_SECRET)
      if (payload.purpose === 'account-deletion-reauth') deletionState = payload
    } catch {
      deletionState = null
    }
  }

  if (deletionState) {
    const frontendUrl = getFrontendBaseUrl(req, deletionState.frontend)
    const action = isReauthAction(deletionState.action)
      ? deletionState.action
      : REAUTH_ACTIONS.ACCOUNT_DELETION
    const closure = action === REAUTH_ACTIONS.COMPANY_CLOSURE
    const failed = (reason) => res.redirect(
      `${frontendUrl}/settings?reauth_error=${reason}${closure ? '&reauth_for=company-closure' : ''}`
    )
    if (error) return failed('google_cancelled')
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
      const tokens = await tokenResponse.json()
      if (!tokenResponse.ok || !tokens.id_token) {
        logger.error('[Google account deletion reauthentication] token exchange failed.')
        return failed('google_error')
      }

      const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      const googleUser = ticket.getPayload()
      const userResult = await pool.query(
        `SELECT google_id
         FROM public.usuario
         WHERE id_usuario = $1 AND activo = true`,
        [deletionState.id_usuario]
      )
      if (
        !googleUser ||
        googleUser.sub !== userResult.rows[0]?.google_id ||
        googleUser.nonce !== deletionState.nonce
      ) {
        return failed('google_account_mismatch')
      }

      const proof = jwt.sign(
        { id_usuario: deletionState.id_usuario, purpose: action },
        process.env.JWT_SECRET,
        { expiresIn: '2m' }
      )
      const fragment = closure ? 'closure_proof' : 'deletion_proof'
      return res.redirect(`${frontendUrl}/settings#${fragment}=${encodeURIComponent(proof)}`)
    } catch (err) {
      logger.error('[Google account deletion reauthentication]', err)
      return failed('google_error')
    }
  }

  const { inviteToken, frontend } = decodeOAuthState(state)
  const frontendUrl = getFrontendBaseUrl(req, frontend)

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
      logger.error('[Google OAuth] token exchange failed:', tokens)
      return res.redirect(`${frontendUrl}/login?error=google_error`)
    }

    const { sub: google_id, email, given_name, family_name } = jwt.decode(tokens.id_token)
    const nombre = given_name || email.split('@')[0]
    const apellido = family_name || ''

    const client = await pool.connect()
    try {
      let userRow = await client.query(
        `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, u.token_version, r.nombre_rol
         FROM public.usuario u
         JOIN public.rol r ON r.id_rol = u.id_rol
         WHERE u.google_id = $1`,
        [google_id]
      )

      if (!userRow.rows.length) {
        const byEmail = await client.query(
          `          SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, u.token_version, r.nombre_rol
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
          `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, u.token_version, r.nombre_rol
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
        frontendUrl,
      })

      return res.redirect(redirectUrl)
    } finally {
      client.release()
    }
  } catch (err) {
    logger.error('[Google OAuth]', err)
    return res.redirect(`${frontendUrl}/login?error=google_error`)
  }
}
