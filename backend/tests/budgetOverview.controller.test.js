import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => {
  const client = { query: vi.fn(), release: vi.fn() }
  return {
    default: {
      query: vi.fn(),
      connect: vi.fn(async () => client),
      __client: client,
    },
  }
})

vi.mock('../src/services/notificationService.js', () => ({
  notifyCompany: vi.fn(),
}))

import express from 'express'
import request from 'supertest'
import pool from '../src/db/pool.js'
import budgetRoutes from '../src/routes/budgetRoutes.js'
import inventoryMovementRoutes from '../src/routes/inventoryMovementRoutes.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import { clearBudgetCache } from '../src/utils/budgetSummaryCache.js'
import { BUDGET_CACHE_TTL_MS } from '../src/utils/budgetSummaryCache.js'
import { signToken, companyMembership, noMembership } from './helpers/authTestApp.js'

const app = express()
app.use(express.json())
app.use('/api/budgets', budgetRoutes)
app.use('/api/inventory-movements', inventoryMovementRoutes)
app.use(errorHandler)

const client = pool.__client

// El limitador cortaría la suite.
let previousRateLimit
beforeAll(() => {
  previousRateLimit = process.env.RATE_LIMIT_ENABLED
  process.env.RATE_LIMIT_ENABLED = 'false'
})
afterAll(() => {
  if (previousRateLimit === undefined) delete process.env.RATE_LIMIT_ENABLED
  else process.env.RATE_LIMIT_ENABLED = previousRateLimit
})

// Ambos endpoints leen los mismos datos de origen.
const toCents = (value) => Math.round(Number(value) * 100)
const money = (cents) => (cents / 100).toFixed(2)
const sumCents = (values) => values.reduce((s, v) => s + v, 0)

const movementCents = (m) => toCents(m.precio) * (m.cantidad ?? 1)
const movementTotal = (d, tipo) => sumCents(d.movimientos.filter((m) => m.tipo === tipo).map(movementCents))

function oldEndpointRows(id, d) {
  return {
    project: { id_proyecto: id, nombre: `Proyecto ${id}`, presupuesto_total: d.base },
    activities: d.actividades.map((monto_real, i) => ({
      id_actividad: i + 1,
      nombre: `Actividad ${i + 1}`,
      monto_planificado: '0',
      monto_real,
      id_proyecto: id,
      monto_movimientos: '0',
      gastos_count: 0,
    })),
    inventory: ['ENTRADA', 'SALIDA', 'GASTO_ADMIN']
      .filter((tipo) => d.movimientos.some((m) => m.tipo === tipo))
      .map((tipo) => ({
        tipo,
        movimientos: d.movimientos.filter((m) => m.tipo === tipo).length,
        total: money(movementTotal(d, tipo)),
      })),
    adjustments: {
      total_ajustes: money(sumCents(d.ajustes.map(toCents))),
      ajustes_count: d.ajustes.length,
    },
  }
}

function aggregateRow(id, d) {
  return {
    id_proyecto: id,
    presupuesto_base: d.base,
    total_ajustes: money(sumCents(d.ajustes.map(toCents))),
    gasto_actividades: money(sumCents(d.actividades.filter((m) => m != null).map(toCents))),
    gasto_entrada: money(movementTotal(d, 'ENTRADA')),
    gasto_admin: money(movementTotal(d, 'GASTO_ADMIN')),
  }
}

// El pool simulado responde según el SQL.
let db

function resetDb() {
  db = {
    role: 'admin',
    membership: true,
    companyProjects: [],
    assignments: [],
    datasets: {},
  }
}

function mockPool() {
  pool.query.mockImplementation(async (sql, params = []) => {
    const q = String(sql)

    if (q.includes('FROM public.empresa_usuario eu')) {
      return db.membership ? companyMembership(db.role) : noMembership()
    }
    if (q.includes('WITH scoped AS')) {
      const [, ids] = params
      return { rows: ids.filter((id) => db.datasets[id]).sort((a, b) => a - b).map((id) => aggregateRow(id, db.datasets[id])) }
    }
    if (q.includes('ORDER BY LOWER(nombre), id_proyecto')) {
      return { rows: db.companyProjects.map((id) => ({ id_proyecto: id, nombre: `Proyecto ${id}`, estado: 'EN_PROGRESO', id_encargado: 7 })) }
    }
    if (q.includes('FROM public.proyecto_usuario pu')) {
      return { rows: db.assignments.map((id) => ({ id_usuario: 7, id_proyecto: id, proyecto_nombre: `Proyecto ${id}`, proyecto_estado: 'EN_PROGRESO', id_encargado: 1, rol_proyecto: 'colaborador', permisos: [] })) }
    }
    // ensureProjectAccess (gestión) antes de una venta.
    if (q.includes('WHERE id_empresa = $1 AND id_proyecto = $2')) {
      return { rows: [{ id_proyecto: params[1], nombre: 'Proyecto', estado: 'EN_PROGRESO', id_encargado: 7 }] }
    }

    // Consultas del resumen individual (/project/:id/summary).
    const id = Number(params[0])
    const d = db.datasets[id]
    if (q.includes('SELECT id_proyecto, nombre, presupuesto_total')) {
      return { rows: d ? [oldEndpointRows(id, d).project] : [] }
    }
    if (q.includes('FROM public.presupuesto_actividad pa') && q.includes('gastos_count')) {
      return { rows: oldEndpointRows(id, d).activities }
    }
    if (q.includes('GROUP BY tipo')) {
      return { rows: oldEndpointRows(id, d).inventory }
    }
    if (q.includes('ajustes_count')) {
      return { rows: [oldEndpointRows(id, d).adjustments] }
    }
    return { rows: [], rowCount: 0 }
  })
}

const aggregateCalls = () => pool.query.mock.calls.filter(([sql]) => String(sql).includes('WITH scoped AS'))

const auth = (req, company = '1') =>
  req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', company)

const getOverview = (ids, company) =>
  auth(request(app).get(`/api/budgets/summary?projectIds=${ids}`), company)

const dataset = (over = {}) => ({ base: '1000.00', ajustes: [], actividades: [], movimientos: [], ...over })

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  clearBudgetCache()
  resetDb()
  mockPool()
  client.release.mockReturnValue(undefined)
  pool.connect.mockResolvedValue(client)
})

afterEach(() => {
  vi.useRealTimers()
})

/**
 * GET /api/budgets/summary?projectIds=
 *
 * Debe dar las mismas cifras que /project/:id/summary, respetar el acceso
 * y no repetir la consulta mientras la caché esté vigente.
 */
describe('Resumen agregado de presupuesto · validación', () => {
  it.each([
    ['sin projectIds', ''],
    ['vacío', '?projectIds='],
    ['con texto', '?projectIds=abc'],
    ['con cero', '?projectIds=0'],
    ['con negativo', '?projectIds=-3'],
    ['con decimal', '?projectIds=1.5'],
    ['con separador vacío', '?projectIds=1,,2'],
    ['repetido como arreglo', '?projectIds=1&projectIds=2'],
  ])('responde 400 %s', async (_, query) => {
    const res = await auth(request(app).get(`/api/budgets/summary${query}`))

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(aggregateCalls()).toHaveLength(0)
  })

  it('acepta 100 ids y rechaza 101', async () => {
    const hundred = Array.from({ length: 100 }, (_, i) => i + 1).join(',')
    const res100 = await getOverview(hundred)
    const res101 = await getOverview(`${hundred},101`)

    expect(res100.status).toBe(200)
    expect(res101.status).toBe(400)
  })

  it('el tope cuenta ids únicos: 101 entradas con un repetido pasan', async () => {
    const hundred = Array.from({ length: 100 }, (_, i) => i + 1).join(',')
    const res = await getOverview(`${hundred},1`)

    expect(res.status).toBe(200)
  })

  it('quita los repetidos antes de consultar', async () => {
    db.companyProjects = [3, 7]
    db.datasets = { 3: dataset(), 7: dataset() }

    await getOverview('7,3,7,3')

    const [, params] = aggregateCalls()[0]
    expect(params[1]).toEqual([7, 3])
  })

  it('no cae en GET /:id (que respondería 400 por id de actividad)', async () => {
    db.companyProjects = [3]
    db.datasets = { 3: dataset() }

    const res = await getOverview('3')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('Resumen agregado de presupuesto · autenticación y acceso', () => {
  it('sin token responde 401', async () => {
    const res = await request(app).get('/api/budgets/summary?projectIds=1').set('X-Company-ID', '1')
    expect(res.status).toBe(401)
  })

  it('sin pertenencia a la empresa responde 403', async () => {
    db.membership = false
    const res = await getOverview('1')
    expect(res.status).toBe(403)
    expect(aggregateCalls()).toHaveLength(0)
  })

  it('un admin recibe los proyectos pedidos de su empresa', async () => {
    db.companyProjects = [3, 7, 9]
    db.datasets = { 3: dataset(), 7: dataset(), 9: dataset() }

    const res = await getOverview('3,7')

    expect(res.body.data.map((r) => r.id_proyecto)).toEqual([3, 7])
    const [, params] = aggregateCalls()[0]
    expect(params).toEqual([1, [3, 7]])
  })

  it('un colaborador solo recibe sus proyectos asignados', async () => {
    db.role = 'collaborator'
    db.assignments = [7]
    db.datasets = { 3: dataset(), 7: dataset() }

    const res = await getOverview('3,7')

    expect(res.status).toBe(200)
    expect(res.body.data.map((r) => r.id_proyecto)).toEqual([7])
    const [, params] = aggregateCalls()[0]
    expect(params[1]).toEqual([7])
  })

  it('los ids de otra empresa o inexistentes no llegan a la consulta', async () => {
    db.companyProjects = [3]
    db.datasets = { 3: dataset(), 50: dataset() }

    const res = await getOverview('3,50,999')

    expect(res.body.data.map((r) => r.id_proyecto)).toEqual([3])
    const [, params] = aggregateCalls()[0]
    expect(params).toEqual([1, [3]])
  })

  it('si no queda ningún id permitido responde [] sin consultar', async () => {
    db.role = 'collaborator'
    db.assignments = []

    const res = await getOverview('3,7')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: [] })
    expect(aggregateCalls()).toHaveLength(0)
  })
})

describe('Resumen agregado de presupuesto · forma y cálculo', () => {
  it('devuelve solo los campos del dashboard', async () => {
    db.companyProjects = [3]
    db.datasets = { 3: dataset({ base: '1000.00', actividades: ['250.00'] }) }

    const res = await getOverview('3')

    expect(res.body.data).toEqual([{
      id_proyecto: 3,
      presupuesto_total: 1000,
      total_gastado: 250,
      alerta_nivel: 'SALUDABLE',
      porcentaje_uso: 0.25,
    }])
  })

  it('un proyecto sin presupuesto no lleva alerta', async () => {
    db.companyProjects = [3]
    db.datasets = { 3: dataset({ base: '0', actividades: ['80.00'] }) }

    const [row] = (await getOverview('3')).body.data

    expect(row).toMatchObject({ presupuesto_total: 0, total_gastado: 80, alerta_nivel: null, porcentaje_uso: 0 })
  })

  it('un proyecto sin gastos se incluye en cero', async () => {
    db.companyProjects = [3]
    db.datasets = { 3: dataset() }

    const [row] = (await getOverview('3')).body.data

    expect(row).toMatchObject({ total_gastado: 0, alerta_nivel: 'SALUDABLE', porcentaje_uso: 0 })
  })

  it.each([
    ['59.99', 'SALUDABLE'],
    ['60.00', 'PRECAUCION'],
    ['80.00', 'ADVERTENCIA'],
    ['100.00', 'CRITICO'],
    ['100.02', 'EXCEDIDO'],
  ])('gastar %s de 100 da %s', async (spent, level) => {
    db.companyProjects = [3]
    db.datasets = { 3: dataset({ base: '100.00', actividades: [spent] }) }

    const [row] = (await getOverview('3')).body.data

    expect(row.alerta_nivel).toBe(level)
  })

  it('SALIDA es ingreso: no suma al gasto', async () => {
    db.companyProjects = [3]
    db.datasets = { 3: dataset({ movimientos: [{ tipo: 'SALIDA', precio: '500.00', cantidad: 2 }] }) }

    const [row] = (await getOverview('3')).body.data

    expect(row.total_gastado).toBe(0)
  })
})

describe('Resumen agregado de presupuesto · paridad con /project/:id/summary', () => {
  const FIELDS = ['presupuesto_total', 'total_gastado', 'alerta_nivel', 'porcentaje_uso']

  const cases = {
    vacio: dataset(),
    sin_presupuesto: dataset({ base: '0', actividades: ['120.00'], movimientos: [{ tipo: 'GASTO_ADMIN', precio: '30.00', cantidad: null }] }),
    con_ajustes: dataset({
      base: '5000.00',
      ajustes: ['500.00', '-120.50'],
      actividades: ['1200.10', null, '0'],
      movimientos: [
        { tipo: 'ENTRADA', precio: '15.75', cantidad: 12 },
        { tipo: 'SALIDA', precio: '40.00', cantidad: 5 },
        { tipo: 'GASTO_ADMIN', precio: '99.99', cantidad: null },
      ],
    }),
    // Con flotantes, 0.1 + 0.2 no es 0.3: el borde del 100 % depende del orden de las sumas.
    critico_exacto: dataset({
      base: '0.60',
      actividades: ['0.10', '0.20'],
      movimientos: [
        { tipo: 'ENTRADA', precio: '0.10', cantidad: 1 },
        { tipo: 'GASTO_ADMIN', precio: '0.20', cantidad: null },
      ],
    }),
    // /summary da ADVERTENCIA por los flotantes; el agregado debe dar lo mismo.
    orden_de_sumas: dataset({
      base: '2.02',
      actividades: ['0.01'],
      movimientos: [
        { tipo: 'ENTRADA', precio: '0.02', cantidad: 1 },
        { tipo: 'GASTO_ADMIN', precio: '1.99', cantidad: null },
      ],
    }),
    excedido_decimales: dataset({
      base: '333.33',
      ajustes: ['0.01'],
      actividades: ['111.11', '111.11'],
      movimientos: [{ tipo: 'ENTRADA', precio: '3.33', cantidad: 37 }],
    }),
    // registerExpense: la actividad queda en 0 y el gasto va como GASTO_ADMIN, una sola vez.
    gasto_registrado: dataset({
      base: '1000.00',
      actividades: ['0', '0'],
      movimientos: [
        { tipo: 'GASTO_ADMIN', precio: '450.00', cantidad: null },
        { tipo: 'GASTO_ADMIN', precio: '350.00', cantidad: null },
      ],
    }),
  }

  it.each(Object.keys(cases))('%s: mismas cifras en ambos endpoints', async (name) => {
    db.companyProjects = [3]
    db.datasets = { 3: cases[name] }

    const single = await auth(request(app).get('/api/budgets/project/3/summary'))
    const [row] = (await getOverview('3')).body.data

    expect(single.status).toBe(200)
    for (const field of FIELDS) {
      expect(row[field], field).toBe(single.body.data[field])
    }
  })

  it('el GASTO_ADMIN de registerExpense cuenta una sola vez', async () => {
    db.companyProjects = [3]
    db.datasets = { 3: cases.gasto_registrado }

    const [row] = (await getOverview('3')).body.data

    expect(row.total_gastado).toBe(800)
  })
})

describe('Resumen agregado de presupuesto · caché', () => {
  beforeEach(() => {
    db.companyProjects = [3, 7]
    db.datasets = { 3: dataset(), 7: dataset() }
  })

  it('una segunda petición dentro de 30 s no repite la consulta', async () => {
    const first = await getOverview('3,7')
    const second = await getOverview('3,7')

    expect(second.body).toEqual(first.body)
    expect(aggregateCalls()).toHaveLength(1)
  })

  it('el orden de los ids no cambia la entrada', async () => {
    await getOverview('3,7')
    await getOverview('7,3')

    expect(aggregateCalls()).toHaveLength(1)
  })

  it('a los 30 s vuelve a consultar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })

    await getOverview('3,7')
    vi.advanceTimersByTime(BUDGET_CACHE_TTL_MS - 1)
    await getOverview('3,7')
    expect(aggregateCalls()).toHaveLength(1)

    vi.advanceTimersByTime(1)
    await getOverview('3,7')
    expect(aggregateCalls()).toHaveLength(2)
  })

  it('el acceso se resuelve antes de leer la caché', async () => {
    await getOverview('3,7')

    db.role = 'collaborator'
    db.assignments = [7]
    const res = await getOverview('3,7')

    expect(res.body.data.map((r) => r.id_proyecto)).toEqual([7])
    expect(aggregateCalls()).toHaveLength(2)
  })

  it('dos empresas no comparten entrada', async () => {
    await getOverview('3,7', '1')
    await getOverview('3,7', '2')

    expect(aggregateCalls()).toHaveLength(2)
    expect(aggregateCalls()[1][1][0]).toBe(2)
  })
})

describe('Resumen agregado de presupuesto · invalidación', () => {
  beforeEach(() => {
    db.role = 'owner'
    db.companyProjects = [10]
    db.datasets = { 10: dataset() }
  })

  it('un ajuste de fondos invalida la caché de la empresa', async () => {
    await getOverview('10')

    const funding = await auth(
      request(app).post('/api/budgets/project/10/funding').send({ monto: 250, motivo: 'Ampliación' })
    )
    expect(funding.status).toBe(200)

    await getOverview('10')
    expect(aggregateCalls()).toHaveLength(2)
  })

  it('una venta del POS invalida la caché de la empresa', async () => {
    await getOverview('10')

    client.query.mockImplementation(async (sql) => {
      const q = String(sql)
      if (q.includes('FROM public.producto p')) {
        return { rows: [{ id_producto: 1, stock_actual: 10, costo_promedio_ponderado: '6.00', precio_venta: '25.50', nombre: 'Café', stock_minimo: 2, proyecto_nombre: 'Sucursal' }], rowCount: 1 }
      }
      if (q.includes('INSERT INTO public.venta')) return { rows: [{ id_venta: 500, fecha: '2026-10-09T10:00:00.000Z' }], rowCount: 1 }
      if (q.includes('INSERT INTO public.movimiento_inventario')) return { rows: [{ id_movimiento: 900 }], rowCount: 1 }
      return { rows: [], rowCount: 1 }
    })

    const sale = await auth(
      request(app).post('/api/inventory-movements/sale').send({ items: [{ id_producto: 1, id_proyecto: 10, cantidad: 2 }] })
    )
    expect(sale.status).toBe(201)

    await getOverview('10')
    expect(aggregateCalls()).toHaveLength(2)
  })

  it('una venta que se deshace no invalida', async () => {
    await getOverview('10')

    client.query.mockImplementation(async (sql) => {
      const q = String(sql)
      if (q.includes('FROM public.producto p')) {
        return { rows: [{ id_producto: 1, stock_actual: 1, costo_promedio_ponderado: '6.00', precio_venta: '25.50', nombre: 'Café', stock_minimo: 0, proyecto_nombre: 'Sucursal' }], rowCount: 1 }
      }
      return { rows: [], rowCount: 1 }
    })

    const sale = await auth(
      request(app).post('/api/inventory-movements/sale').send({ items: [{ id_producto: 1, id_proyecto: 10, cantidad: 5 }] })
    )
    expect(sale.status).toBe(409)

    await getOverview('10')
    expect(aggregateCalls()).toHaveLength(1)
  })

  it('invalidar la empresa 1 no borra la caché de la empresa 2', async () => {
    await getOverview('10', '2')

    await auth(request(app).post('/api/budgets/project/10/funding').send({ monto: 250 }), '1')

    await getOverview('10', '2')
    expect(aggregateCalls()).toHaveLength(1)
  })
})
