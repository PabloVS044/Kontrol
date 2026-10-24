import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'

/**
 * Verifies the Bearer JWT in the Authorization header and attaches
 * the decoded payload to req.user.
 * Expected payload shape (set during login in T-04):
 *   { id_usuario, email, nombre_rol }
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token required.' })
  }

  const token = authHeader.slice(7)

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' })
  }

  if (payload.token_version === undefined) {
    req.user = payload
    return next()
  }

  try {
    const account = await pool.query(
      'SELECT activo, token_version FROM public.usuario WHERE id_usuario = $1',
      [payload.id_usuario]
    )
    const row = account.rows[0]
    if (!row?.activo || (payload.token_version !== undefined && row.token_version !== payload.token_version)) {
      return res.status(401).json({ success: false, message: 'Account is unavailable.' })
    }
    req.user = payload
    next()
  } catch (error) {
    next(error)
  }
}

export default requireAuth
