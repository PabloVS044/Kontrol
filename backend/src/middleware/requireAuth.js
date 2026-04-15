import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'

/**
 * Verifies the Bearer JWT in the Authorization header, attaches the decoded
 * payload to req.user, and validates the token_version against the database.
 *
 * token_version lets admins invalidate all active sessions for a user by
 * incrementing that column — any JWT carrying an older version is rejected.
 *
 * Payload shape: { id_usuario, email, nombre_rol, token_version }
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token requerido.' })
  }

  const token = authHeader.slice(7)

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.' })
  }

  // Verify token_version matches current DB value so revoked sessions are rejected
  try {
    const result = await pool.query(
      'SELECT token_version, activo FROM public.usuario WHERE id_usuario = $1',
      [payload.id_usuario]
    )

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado.' })
    }

    const { token_version, activo } = result.rows[0]

    if (!activo) {
      return res.status(403).json({ success: false, message: 'Cuenta desactivada.' })
    }

    if (payload.token_version !== token_version) {
      return res.status(401).json({ success: false, message: 'Sesión revocada. Por favor inicia sesión nuevamente.' })
    }
  } catch (err) {
    console.error('[requireAuth] DB error:', err)
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' })
  }

  req.user = payload
  next()
}

export default requireAuth
