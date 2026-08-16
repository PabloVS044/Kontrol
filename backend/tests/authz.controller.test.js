import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mockeamos el pool para no tocar Postgres: controlamos cada consulta.
vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

import request from 'supertest'
import pool from '../src/db/pool.js'
import {
  buildTestApp,
  signToken,
  companyMembership,
  noMembership,
  dbRows,
} from './helpers/authTestApp.js'

const app = buildTestApp()
const validReport = { titulo: 'Reporte de avance', tipo: 'AVANCE', id_proyecto: 10 }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Autenticación y permisos a nivel de controller (HU-31)', () => {
  describe('Autenticación (requireAuth)', () => {
    it('caso 1 · petición sin token → 401', async () => {
      const res = await request(app).get('/api/reports').set('X-Company-ID', '1')

      expect(res.status).toBe(401)
      expect(pool.query).not.toHaveBeenCalled()
    })

    it('caso 2a · token inválido → 401', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', 'Bearer token-basura')
        .set('X-Company-ID', '1')

      expect(res.status).toBe(401)
    })

    it('caso 2b · token expirado → 401', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${signToken({}, { expiresIn: '-1s' })}`)
        .set('X-Company-ID', '1')

      expect(res.status).toBe(401)
    })
  })

  // Endpoint de management (owner/admin/manager): POST /api/reports
  describe('Acceso permitido por rol', () => {
    it('caso 3 · Administrador en endpoint restringido → 201', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValue(dbRows())

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${signToken()}`)
        .set('X-Company-ID', '1')
        .send(validReport)

      expect(res.status).toBe(201)
    })

    it('caso 4 · Encargado (manager) en endpoint permitido → 201', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('manager'))
        .mockResolvedValue(dbRows())

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${signToken()}`)
        .set('X-Company-ID', '1')
        .send(validReport)

      expect(res.status).toBe(201)
    })
  })

  describe('Acceso denegado por rol', () => {
    it('caso 5 · Colaborador en endpoint de administrador → 403', async () => {
      pool.query.mockResolvedValueOnce(companyMembership('collaborator'))

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${signToken()}`)
        .set('X-Company-ID', '1')
        .send(validReport)

      expect(res.status).toBe(403)
    })

    // DELETE /api/reports/:id es solo owner/admin (NO manager).
    it('caso 6 · Encargado (manager) en endpoint solo-admin → 403', async () => {
      pool.query.mockResolvedValueOnce(companyMembership('manager'))

      const res = await request(app)
        .delete('/api/reports/1')
        .set('Authorization', `Bearer ${signToken()}`)
        .set('X-Company-ID', '1')

      expect(res.status).toBe(403)
    })
  })

  describe('Aislamiento entre empresas', () => {
    it('caso 7 · usuario de empresa A pide recurso de empresa B → 403', async () => {
      pool.query.mockResolvedValueOnce(noMembership())

      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${signToken()}`)
        .set('X-Company-ID', '999')

      expect(res.status).toBe(403)
    })
  })

  describe('Tareas del colaborador', () => {
    // Brecha: getTasks no filtra por usuario asignado. Este test evidencia el
    // comportamiento actual (devuelve todas). Escalar como ticket.
    it('caso 8 · hoy el colaborador recibe TODAS las tareas, no solo las suyas', async () => {
      const tareas = [
        { id_tarea: 1, asignado_id: 7 },
        { id_tarea: 2, asignado_id: 99 },
      ]
      pool.query.mockResolvedValueOnce(dbRows(tareas))

      const res = await request(app)
        .get('/api/projects/5/tasks')
        .set('Authorization', `Bearer ${signToken({ id_usuario: 7 })}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.data.some((t) => t.asignado_id === 99)).toBe(true)
    })
  })

  describe('Permiso efectivo tras cambio de rol', () => {
    // Mismo token; solo cambia el rol que reporta la BD → cambia el permiso.
    it('caso 9 · el mismo usuario pasa de 403 a 200 al cambiar de colaborador a admin', async () => {
      const token = signToken()

      pool.query
        .mockResolvedValueOnce(companyMembership('collaborator'))
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValue(dbRows())

      const denegado = await request(app)
        .delete('/api/reports/1')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-ID', '1')

      const permitido = await request(app)
        .delete('/api/reports/1')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-ID', '1')

      expect(denegado.status).toBe(403)
      expect(permitido.status).toBe(200)
    })
  })
})
