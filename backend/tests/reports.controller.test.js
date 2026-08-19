import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mockeamos el pool para no tocar Postgres: controlamos cada consulta.
vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

import request from 'supertest'
import pool from '../src/db/pool.js'
import { buildTestApp, signToken, companyMembership, dbRows } from './helpers/authTestApp.js'

const app = buildTestApp()

// Cabeceras comunes: usuario autenticado sobre la empresa 1.
const auth = (req) => req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', '1')

const reportRow = {
  id_reporte: 1,
  titulo: 'Reporte de avance',
  tipo: 'AVANCE',
  contenido_url: null,
  id_proyecto: 10,
  id_usuario: 7,
}

beforeEach(() => {
  vi.resetAllMocks()
  // Los handlers loguean el error antes de responder 500; silenciamos el ruido.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

/**
 * Lógica del controller de reportes (SCRUM-23).
 *
 * El módulo de reportes es uno de los cuatro críticos del trinquete de
 * cobertura, así que cada handler se prueba en sus tres caminos: éxito,
 * recurso inexistente y fallo de base de datos.
 *
 * La primera consulta de cada petición siempre la consume `requireCompany`
 * (verificación de pertenencia a la empresa); las siguientes son del handler.
 */
describe('Reportes · controller', () => {
  describe('GET /api/reports', () => {
    it('devuelve 200 con los reportes de la empresa', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([reportRow]))

      const res = await auth(request(app).get('/api/reports'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual([reportRow])
    })

    it('devuelve lista vacía cuando la empresa no tiene reportes', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([]))

      const res = await auth(request(app).get('/api/reports'))

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('devuelve 500 si la consulta falla', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockRejectedValueOnce(new Error('db caída'))

      const res = await auth(request(app).get('/api/reports'))

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/reports/:id', () => {
    it('devuelve 200 con el reporte pedido', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([reportRow]))

      const res = await auth(request(app).get('/api/reports/1'))

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual(reportRow)
    })

    it('devuelve 404 si el reporte no existe en esa empresa', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([]))

      const res = await auth(request(app).get('/api/reports/999'))

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Report not found.')
    })

    it('devuelve 500 si la consulta falla', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockRejectedValueOnce(new Error('db caída'))

      const res = await auth(request(app).get('/api/reports/1'))

      expect(res.status).toBe(500)
    })
  })

  describe('POST /api/reports', () => {
    const nuevoReporte = { titulo: 'Reporte de avance', tipo: 'AVANCE', id_proyecto: 10 }

    it('devuelve 201 y el reporte creado', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin')) // pertenencia
        .mockResolvedValueOnce(dbRows([{ id_proyecto: 10 }])) // proyecto existe
        .mockResolvedValueOnce(dbRows([reportRow])) // insert

      const res = await auth(request(app).post('/api/reports')).send(nuevoReporte)

      expect(res.status).toBe(201)
      expect(res.body.data).toEqual(reportRow)
    })

    it('devuelve 404 si el proyecto no pertenece a la empresa', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([])) // proyecto inexistente

      const res = await auth(request(app).post('/api/reports')).send(nuevoReporte)

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Project not found.')
    })

    it('devuelve 500 si el insert falla', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([{ id_proyecto: 10 }]))
        .mockRejectedValueOnce(new Error('db caída'))

      const res = await auth(request(app).post('/api/reports')).send(nuevoReporte)

      expect(res.status).toBe(500)
    })
  })

  describe('PUT /api/reports/:id', () => {
    it('devuelve 200 con el reporte actualizado', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([{ ...reportRow, titulo: 'Título nuevo' }]))

      const res = await auth(request(app).put('/api/reports/1')).send({ titulo: 'Título nuevo' })

      expect(res.status).toBe(200)
      expect(res.body.data.titulo).toBe('Título nuevo')
    })

    it('devuelve 404 si el reporte no existe en esa empresa', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([]))

      const res = await auth(request(app).put('/api/reports/999')).send({ titulo: 'Título nuevo' })

      expect(res.status).toBe(404)
    })

    // Cubre el `.refine()` de updateReportSchema: sin campos no hay nada que actualizar.
    it('devuelve 400 si no se envía ningún campo', async () => {
      pool.query.mockResolvedValueOnce(companyMembership('admin'))

      const res = await auth(request(app).put('/api/reports/1')).send({})

      expect(res.status).toBe(400)
    })

    it('devuelve 500 si el update falla', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockRejectedValueOnce(new Error('db caída'))

      const res = await auth(request(app).put('/api/reports/1')).send({ titulo: 'Título nuevo' })

      expect(res.status).toBe(500)
    })
  })

  describe('DELETE /api/reports/:id', () => {
    it('devuelve 200 al borrar el reporte', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([{ id_reporte: 1 }]))

      const res = await auth(request(app).delete('/api/reports/1'))

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Report deleted.')
    })

    it('devuelve 404 si el reporte no existe en esa empresa', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([]))

      const res = await auth(request(app).delete('/api/reports/999'))

      expect(res.status).toBe(404)
    })

    it('devuelve 500 si el delete falla', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockRejectedValueOnce(new Error('db caída'))

      const res = await auth(request(app).delete('/api/reports/1'))

      expect(res.status).toBe(500)
    })
  })

  describe('GET /api/reports/summary', () => {
    // Fila tal como la devuelve la consulta agregada del resumen.
    const proyecto = (over = {}) => ({
      id_proyecto: 10,
      nombre: 'Proyecto A',
      descripcion: null,
      estado: 'EN_PROGRESO',
      presupuesto_total: '1000',
      total_tareas: 4,
      tareas_completadas: 2,
      tareas_en_progreso: 1,
      tareas_pendientes: 1,
      presupuesto_planificado: '800',
      presupuesto_real: '600',
      progreso_actual: 0,
      ...over,
    })

    it('usa el progreso registrado cuando existe una entrada de avance', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([proyecto({ progreso_actual: 75 })]))

      const res = await auth(request(app).get('/api/reports/summary'))

      expect(res.status).toBe(200)
      expect(res.body.data.proyectos[0].progreso_actual).toBe(75)
    })

    // Sin entrada de avance, el progreso se deriva de las tareas completadas.
    it('deriva el progreso de las tareas cuando no hay entrada de avance', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([proyecto()])) // 2 de 4 tareas → 50 %

      const res = await auth(request(app).get('/api/reports/summary'))

      expect(res.body.data.proyectos[0].progreso_actual).toBe(50)
    })

    it('devuelve progreso 0 cuando el proyecto no tiene tareas ni avance', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockResolvedValueOnce(dbRows([proyecto({ total_tareas: 0, tareas_completadas: 0 })]))

      const res = await auth(request(app).get('/api/reports/summary'))

      expect(res.body.data.proyectos[0].progreso_actual).toBe(0)
    })

    it('agrega los totales de la empresa', async () => {
      pool.query.mockResolvedValueOnce(companyMembership('admin')).mockResolvedValueOnce(
        dbRows([
          proyecto({ id_proyecto: 10, estado: 'EN_PROGRESO', presupuesto_total: '1000' }),
          proyecto({ id_proyecto: 11, estado: 'COMPLETADO', presupuesto_total: '2500' }),
          proyecto({ id_proyecto: 12, estado: 'PLANIFICADO', presupuesto_total: null }),
        ])
      )

      const res = await auth(request(app).get('/api/reports/summary'))

      expect(res.body.data.totales).toEqual({
        total_proyectos: 3,
        proyectos_activos: 1,
        proyectos_completados: 1,
        // El proyecto sin presupuesto cuenta como 0, no como NaN.
        presupuesto_total: 3500,
      })
    })

    it('devuelve 500 si la consulta falla', async () => {
      pool.query
        .mockResolvedValueOnce(companyMembership('admin'))
        .mockRejectedValueOnce(new Error('db caída'))

      const res = await auth(request(app).get('/api/reports/summary'))

      expect(res.status).toBe(500)
    })
  })
})
