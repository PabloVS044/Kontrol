const requireCompanyRole = (...roles) => (req, res, next) => {
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
