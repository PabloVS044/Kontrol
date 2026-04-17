const requireEmpresaRole = (...roles) => (req, res, next) => {
  const empresaRole = req.empresa?.rol_empresa

  if (!empresaRole || !roles.includes(empresaRole)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos suficientes dentro de esta empresa.',
    })
  }

  next()
}

export default requireEmpresaRole
