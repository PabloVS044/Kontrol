import express from 'express'
import jwt from 'jsonwebtoken'

import reportsRoutes from '../../src/routes/reportsRoutes.js'
import projectRoutes from '../../src/routes/projectRoutes.js'
import taskRoutes from '../../src/routes/taskRoutes.js'
import companyRoutes from '../../src/routes/companyRoutes.js'

export const JWT_SECRET = 'secreto-de-pruebas-hu31'
process.env.JWT_SECRET = JWT_SECRET

// Firma un JWT de prueba.
export function signToken(overrides = {}, options = {}) {
  return jwt.sign(
    { id_usuario: 7, email: 'ivana@kontrol.gt', nombre_rol: 'user', ...overrides },
    JWT_SECRET,
    options
  )
}

// Usuario SÍ pertenece a la empresa.
export function companyMembership(rol_empresa, { activo = true, nombre = 'Empresa A' } = {}) {
  return { rows: [{ id_rol_empresa: 1, rol_empresa, activo, nombre }] }
}

// Usuario NO pertenece a la empresa.
export function noMembership() {
  return { rows: [] }
}

// Filas genéricas para que el controller no responda 404.
export function dbRows(rows = [{ id_proyecto: 10, id_reporte: 1 }]) {
  return { rows, rowCount: rows.length }
}

// App con los routers reales bajo los mismos paths que producción.
export function buildTestApp() {
  const app = express()
  app.use(express.json())

  app.use('/api/reports', reportsRoutes)
  app.use('/api/projects', projectRoutes)
  app.use('/api/projects/:projectId/tasks', taskRoutes)
  app.use('/api/companies', companyRoutes)

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(500).json({ success: false, message: err.message })
  })

  return app
}
