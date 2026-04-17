const requireEmpresaOwner = (req, res, next) => {
  if (req.empresa?.rol_empresa !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Solo el owner de la empresa puede gestionar usuarios e invitaciones.',
    })
  }

  next()
}

export default requireEmpresaOwner
