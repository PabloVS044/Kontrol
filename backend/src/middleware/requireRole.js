/**
 * RBAC middleware factory.
 * Usage: router.get('/users', requireAuth, requireRole('admin'), getUsers)
 *
 * Reads req.user.nombre_rol (populated by requireAuth) and rejects
 * requests whose role is not in the allowed list.
 */
const requireRole = (...roles) => (req, res, next) => {
  const userRole = req.user?.nombre_rol

  if (!userRole || !roles.includes(userRole)) {
    return res.status(403).json({ success: false, message: 'Access denied.' })
  }

  next()
}

export default requireRole
