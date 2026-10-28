import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

import pool from '../src/db/pool.js'
import { getProjectMetrics } from '../src/controllers/projectMetricsController.js'

/**
 * DT-30 (RTF 2, PERF-02). La paridad con las siete consultas anteriores la
 * fija `tests/integration/projectMetrics.int.test.js` contra Postgres real;
 * aquí, que sea una sola consulta y cómo se arma la respuesta.
 */
const respuesta = () => {
  const res = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

const fila = (over = {}) => ({
  tareas: [{ estado: 'COMPLETADA', count: 1 }, { estado: 'PENDIENTE', count: 3 }],
  total_planificado: '100.00',
  total_real: '40.00',
  movimientos: [{ tipo: 'SALIDA', count: 2, total: '24.00' }],
  equipo: [{ rol: 'Supervisor', total: 1 }],
  entries_total: 0,
  milestones_total: 0,
  blockers_total: 0,
  last_update_at: null,
  latest_progress_percentage: null,
  ...over,
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getProjectMetrics', () => {
  it('hace una sola consulta y deriva el avance de las tareas si no hay entradas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [fila()] })
    const res = respuesta()

    await getProjectMetrics({ params: { id: 7 } }, res)

    expect(pool.query).toHaveBeenCalledTimes(1)
    expect(pool.query.mock.calls[0][1]).toEqual([7])
    expect(res.status).toHaveBeenCalledWith(200)
    const { data } = res.json.mock.calls[0][0]
    expect(data.presupuesto).toEqual({ total_planificado: '100.00', total_real: '40.00' })
    expect(data.progress).toMatchObject({ current_percentage: 25, derived_from: 'tasks', task_completion_percentage: 25 })
  })

  it('usa la última entrada de avance cuando existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [fila({ latest_progress_percentage: '62.50', entries_total: 4 })] })
    const res = respuesta()

    await getProjectMetrics({ params: { id: 7 } }, res)

    expect(res.json.mock.calls[0][0].data.progress).toMatchObject({
      current_percentage: 62.5,
      derived_from: 'progress_entry',
      entries_total: 4,
    })
  })

  it('responde 404 si el proyecto no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })
    const res = respuesta()

    await getProjectMetrics({ params: { id: 999 } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('responde 500 sin detalle si la consulta falla', async () => {
    pool.query.mockRejectedValueOnce(new Error('boom'))
    const res = respuesta()

    await getProjectMetrics({ params: { id: 7 } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Server error.' })
  })
})
