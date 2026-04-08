import jwt from 'jsonwebtoken'

/**
 * Verifies the Bearer JWT in the Authorization header and attaches
 * the decoded payload to req.user.
 * Expected payload shape (set during login in T-04):
 *   { id_usuario, email, nombre_rol }
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token requerido.' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.' })
  }
}

export default requireAuth
