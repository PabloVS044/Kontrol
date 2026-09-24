import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mockeamos el pool para no tocar Postgres: controlamos cada consulta.
vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

import request from 'supertest'
import pool from '../src/db/pool.js'
import { buildTestApp, signToken, companyMembership, dbRows } from './helpers/authTestApp.js'

const app = buildTestApp()
const auth = (req) => req.set('Authorization', `Bearer ${signToken()}`).set('X-Company-ID', '1').set('X-Project-ID', '10')

/**
 * El contrato del parámetro de ruta en los endpoints de producto-proveedor.
 *
 * Estas pruebas miran los parámetros con los que se arma la consulta, no solo
 * el código de estado. El motivo es el propio defecto que fijan: cuando el
 * controlador leía `req.params.pid` —un nombre que la ruta nunca declaró— el
 * valor llegaba `undefined`, `pg` lo traducía a NULL, la consulta se ejecutaba
 * sin error y no encontraba fila. La respuesta era un 404 idéntico al de una
 * relación que de verdad no existe, así que una prueba que solo comprobara el
 * código de estado habría pasado en verde con el defecto presente.
 */

// Índice de la consulta bajo prueba dentro de `pool.query.mock.calls`. Las tres
// anteriores son la membresía de empresa de `requireCompany`, el alcance del
// producto y el proyecto, ambas de `ensureProductInventoryAccess`.
const CONSULTA_BAJO_PRUEBA = 3

// Encola las tres consultas previas al cuerpo de cada controlador.
const encolarAccesoConcedido = () => {
  pool.query
    .mockResolvedValueOnce(companyMembership('admin'))
    .mockResolvedValueOnce(dbRows([{ id_proyecto: 10, nombre: 'Proyecto A', estado: 'activo' }]))
    .mockResolvedValueOnce(dbRows([{ id_usuario: 1, rol: 'admin', permiso: 'gestionar_inventario' }]))
}

const parametrosDe = (indice) => pool.query.mock.calls[indice][1]

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Contrato del parámetro de ruta en producto-proveedor (SCRUM-41 / DT-04)', () => {
  it('T1 · PUT /:id/suppliers/:supplierId arma el UPDATE con el id del proveedor de la URL', async () => {
    encolarAccesoConcedido()
    pool.query.mockResolvedValueOnce(
      dbRows([{ id_producto: 1, id_proveedor: 2, precio_unitario: 12.5 }])
    )

    const res = await auth(request(app).put('/api/products/1/suppliers/2')).send({
      precio_unitario: 12.5,
    })

    expect(res.status).toBe(200)

    const params = parametrosDe(CONSULTA_BAJO_PRUEBA)
    expect(params).toEqual([12.5, 1, 2])
    // El parámetro del proveedor es el de la URL, no un hueco: si el controlador
    // vuelve a leer un nombre que la ruta no declara, aquí llega null.
    expect(params.at(-1)).toBe(2)
    expect(params.at(-1)).not.toBeNull()
  })

  it('T2 · DELETE /:id/suppliers/:supplierId arma el DELETE con el id del proveedor de la URL', async () => {
    encolarAccesoConcedido()
    pool.query.mockResolvedValueOnce(dbRows([{ id_producto: 1 }]))

    const res = await auth(request(app).delete('/api/products/1/suppliers/2'))

    expect(res.status).toBe(200)

    const params = parametrosDe(CONSULTA_BAJO_PRUEBA)
    expect(params).toEqual([1, 2])
    expect(params.at(-1)).toBe(2)
    expect(params.at(-1)).not.toBeNull()
  })

  it('T3 · POST /:id/suppliers inserta con el id del producto de la URL y el proveedor del cuerpo', async () => {
    encolarAccesoConcedido()
    pool.query
      .mockResolvedValueOnce(dbRows([{ id_producto: 1 }])) // Verificar si el producto existe
      .mockResolvedValueOnce(dbRows([{ id_proveedor: 2 }])) // el proveedor existe
      .mockResolvedValueOnce(dbRows([])) // aún no está enlazado
      .mockResolvedValueOnce(dbRows([{ id_producto: 1, id_proveedor: 2, precio_unitario: 12.5}])) // INSERT

    const res = await auth(request(app).post('/api/products/1/suppliers')).send({
      id_proveedor: 2,
      precio_unitario: 12.5,
    })

    expect(res.status).toBe(201)
    expect(parametrosDe(6)).toEqual([1, 2, 12.5])
  })

  it('T4 · un supplierId no numérico se rechaza con 400 y no llega a consultar la relación', async () => {
    encolarAccesoConcedido()

    const res = await auth(request(app).put('/api/products/1/suppliers/abc')).send({
      precio_unitario: 12.5,
    })

    expect(res.status).toBe(400)
    // Solo corrió la membresía de empresa: el esquema cortó antes del controlador.
    expect(pool.query).toHaveBeenCalledTimes(3)
  })

  it('T5 · una relación inexistente da 404, pero la consulta se hizo con el proveedor correcto', async () => {
    encolarAccesoConcedido()
    pool.query.mockResolvedValueOnce(dbRows([])) // el UPDATE no afecta ninguna fila

    const res = await auth(request(app).put('/api/products/1/suppliers/2')).send({
      precio_unitario: 12.5,
    })

    expect(res.status).toBe(404)
    // Este es el caso que distingue el 404 legítimo del 404 fantasma: el código
    // de estado es el mismo que producía el defecto, y lo que los separa son los
    // parámetros con los que se armó la consulta.
    expect(parametrosDe(CONSULTA_BAJO_PRUEBA)).toEqual([12.5, 1, 2])
  })

  it('T6 · un cuerpo vacío se rechaza con 400, así el SET del UPDATE nunca queda vacío', async () => {
    encolarAccesoConcedido()

    const res = await auth(request(app).put('/api/products/1/suppliers/2')).send({})

    expect(res.status).toBe(400)
    expect(pool.query).toHaveBeenCalledTimes(3)
  })
})