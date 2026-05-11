const requireSuperUser = (req, res, next) => {
  if (req.user?.nombre_rol !== 'super_user') {
    return res.status(403).json({ success: false, message: 'Super user access required.' })
  }
  next()
}

export default requireSuperUser
