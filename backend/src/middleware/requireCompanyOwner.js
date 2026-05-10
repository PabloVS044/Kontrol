const requireCompanyOwner = (req, res, next) => {
  if (req.user?.nombre_rol === 'super_user') return next()

  const companyRole = req.company?.rol_empresa ?? req.empresa?.rol_empresa

  if (companyRole !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Only the company owner can manage users and invitations.',
    })
  }

  next()
}

export default requireCompanyOwner
