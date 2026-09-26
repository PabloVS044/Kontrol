import { describe, it, expect, beforeEach, vi } from 'vitest'

// DT-01 · T-01 — Pruebas de caracterización del contrato de error actual.
// Fijan el status y el cuerpo que hoy devuelven los errores que la API ya
// controla, para que la capa central de errores (T-02) no los altere.

const client = { query: vi.fn(), release: vi.fn() }

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import express from 'express'
import request from 'supertest'
import pool from '../src/db/pool.js'
import supplierRoutes from '../src/routes/supplierRoutes.js'
import companyRoutes from '../src/routes/companyRoutes.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import { signToken, companyMembership } from './helpers/authTestApp.js'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/suppliers', supplierRoutes)
  app.use('/api/companies', companyRoutes)
  app.use(errorHandler)
  return app
}

const app = buildApp()
const auth = { Authorization: `Bearer ${signToken()}`, 'X-Company-ID': '1', 'X-Project-ID': '10' }

// `supplierRoutes` valida el acceso al proyecto (requireProject) y luego el
// permiso concreto (requireProjectPermission) antes de llegar al controlador.
// Para un rol de gestión de empresa (owner/admin/manager) ambas capas solo
// verifican que el proyecto exista, así que basta con encolar dos filas.
const projectExists = { rows: [{ id_proyecto: 10, nombre: 'Proyecto A', estado: 'activo', id_encargado: null }] }
const queueManagementProjectAccess = () =>
  pool.query.mockResolvedValueOnce(projectExists).mockResolvedValueOnce(projectExists)

const pgError = (code) => Object.assign(new Error(`pg error ${code}`), { code })

beforeEach(() => {
  vi.resetAllMocks()
  pool.connect.mockResolvedValue(client)
})

describe('DT-01 · Contrato de error actual de la API', () => {
  it('sin token → 401 { success: false, message }', async () => {
    const res = await request(app).get('/api/suppliers')

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ success: false, message: 'Token required.' })
  })

  it('sin empresa seleccionada → 400 { success: false, message }', async () => {
    const res = await request(app).get('/api/suppliers').set('Authorization', auth.Authorization)

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ success: false, message: 'Select a company before continuing.' })
  })

  it('rol insuficiente → 403 { success: false, message }', async () => {
    // Miembro con acceso al proyecto pero sin el permiso 'gestionar_proveedores'.
    const assignment = {
      rows: [{
        id_usuario: 7,
        id_proyecto: 10,
        proyecto_nombre: 'Proyecto A',
        proyecto_estado: 'activo',
        id_encargado: null,
        rol_proyecto: 'member',
        permisos: ['ver_proveedores'],
      }],
    }
    pool.query
      .mockResolvedValueOnce(companyMembership('member'))
      .mockResolvedValueOnce(assignment) // requireProject
      .mockResolvedValueOnce(assignment) // requireProjectPermission

    const res = await request(app).delete('/api/suppliers/5').set(auth)

    expect(res.status).toBe(403)
    expect(res.body).toEqual({
      success: false,
      message: 'You do not have sufficient permissions to operate in this project.',
    })
  })

  it('validación Zod → 400 { success: false, message, errors[] }', async () => {
    pool.query.mockResolvedValueOnce(companyMembership('owner'))
    queueManagementProjectAccess()

    const res = await request(app).post('/api/suppliers').set(auth).send({ nombre: '' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      success: false,
      message: 'Invalid data.',
      errors: [{ field: 'nombre', message: 'Supplier name is required.' }],
    })
  })

  it('recurso inexistente → 404 { success: false, message }', async () => {
    pool.query.mockResolvedValueOnce(companyMembership('owner'))
    queueManagementProjectAccess()
    pool.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app).delete('/api/suppliers/5').set(auth)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ success: false, message: 'Supplier not found.' })
  })

  it('violación de FK que el controlador ya maneja (23503) → 409 con mensaje propio', async () => {
    pool.query.mockResolvedValueOnce(companyMembership('owner'))
    queueManagementProjectAccess()
    pool.query.mockRejectedValueOnce(pgError('23503'))

    const res = await request(app).delete('/api/suppliers/5').set(auth)

    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      success: false,
      message: 'Cannot delete the supplier because it has movements or other references.',
    })
  })

  it('violación de unicidad que el controlador ya maneja (23505) → 409 y hace ROLLBACK', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ email: 'ivana@kontrol.gt' }] })
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(pgError('23505')) // INSERT empresa
      .mockResolvedValueOnce({}) // ROLLBACK

    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', auth.Authorization)
      .send({ nombre: 'Empresa duplicada' })

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ success: false, message: 'A company with that email already exists.' })
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalledOnce()
  })
})
