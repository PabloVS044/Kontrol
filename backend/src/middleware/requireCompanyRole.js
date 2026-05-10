const requireCompanyRole = (...roles) => (req, res, next) => {
  if (req.user?.nombre_rol === 'super_user') return next()

  const companyRole = req.company?.rol_empresa ?? req.empresa?.rol_empresa

  if (!companyRole || !roles.includes(companyRole)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have sufficient permissions within this company.',
    })
  }

  next()
}

export default requireCompanyRole
