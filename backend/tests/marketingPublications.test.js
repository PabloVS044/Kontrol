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
} from './helpers/authTestApp.js'

const app = buildTestApp()
// El encabezado viaja como texto; requireCompany lo convierte a número antes
// de que llegue a las consultas.
const EMPRESA_A = '1'
const EMPRESA_B = '2'
const ID_EMPRESA_A = 1
const ID_EMPRESA_B = 2

// Publicación tal como la devuelve el SELECT del controller.
const filaPublicacion = (overrides = {}) => ({
  id_publication: 5,
  id_campaign: null,
  id_proyecto: 10,
  title: 'Lanzamiento de temporada',
  caption: 'Contenido de la publicacion',
  platform: 'INSTAGRAM',
  publication_format: 'POST',
  status: 'DRAFT',
  scheduled_for: null,
  published_at: null,
  asset_url: 'https://cdn.kontrol.gt/img.png',
  publication_url: null,
  notes: null,
  created_at: '2026-08-01T09:00:00.000Z',
  updated_at: '2026-08-01T09:00:00.000Z',
  campaign_name: null,
  project_name: 'Proyecto A',
  created_by_name: 'Jonathan Tubac',
  updated_by_name: 'Jonathan Tubac',
  ...overrides,
})

const rows = (data = []) => ({ rows: data, rowCount: data.length })

const nuevaPublicacion = {
  title: 'Lanzamiento de temporada',
  caption: 'Contenido de la publicacion',
  assetUrl: 'https://cdn.kontrol.gt/img.png',
  platform: 'INSTAGRAM',
  projectId: 10,
}

// Consultas que el controller lanza al crear: proyecto, INSERT y relectura.
const respuestasDeCreacion = () => pool.query
  .mockResolvedValueOnce(rows([{ id_proyecto: 10, nombre: 'Proyecto A' }]))
  .mockResolvedValueOnce(rows([{ id_publication: 5 }]))
  .mockResolvedValueOnce(rows([filaPublicacion()]))

const comoRol = (rol) => pool.query.mockResolvedValueOnce(companyMembership(rol))

const sqlDeLlamadas = () => pool.query.mock.calls.map(([sql]) => sql)

beforeEach(() => {
  vi.resetAllMocks()
})

// HU-28 · Administración interna de publicaciones de marketing.

describe('Caso 1 · Permisos por rol sobre publicaciones', () => {
  it('el encargado de marketing (manager) puede crear → 201', async () => {
    comoRol('manager')
    respuestasDeCreacion()

    const res = await request(app)
      .post('/api/marketing/publications')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)
      .send(nuevaPublicacion)

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('DRAFT')
  })

  it('el encargado de marketing puede eliminar → 200', async () => {
    comoRol('manager')
    pool.query.mockResolvedValueOnce(rows([{ id_publication: 5 }]))

    const res = await request(app)
      .delete('/api/marketing/publications/5')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)

    expect(res.status).toBe(200)
  })

  it('el colaborador puede listar → 200, pero sin capacidad de gestión', async () => {
    comoRol('collaborator')
    pool.query.mockResolvedValueOnce(rows([filaPublicacion()]))

    const res = await request(app)
      .get('/api/marketing/publications')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)

    expect(res.status).toBe(200)
    expect(res.body.capabilities.canManageMarketing).toBe(false)
  })

  it('el colaborador no puede crear → 403 y no llega a la base', async () => {
    comoRol('collaborator')

    const res = await request(app)
      .post('/api/marketing/publications')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)
      .send(nuevaPublicacion)

    expect(res.status).toBe(403)
    // Solo se consultó la membresía de empresa; nunca se intentó insertar.
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('el colaborador no puede eliminar → 403', async () => {
    comoRol('collaborator')

    const res = await request(app)
      .delete('/api/marketing/publications/5')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)

    expect(res.status).toBe(403)
  })

  it('sin token no se llega al módulo → 401', async () => {
    const res = await request(app)
      .get('/api/marketing/publications')
      .set('X-Company-ID', EMPRESA_A)

    expect(res.status).toBe(401)
    expect(pool.query).not.toHaveBeenCalled()
  })
})

describe('Caso 2 · Aislamiento multi-empresa', () => {
  it('quien no pertenece a la empresa del encabezado no entra → 403', async () => {
    pool.query.mockResolvedValueOnce(noMembership())

    const res = await request(app)
      .get('/api/marketing/publications')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', '999')

    expect(res.status).toBe(403)
  })

  it('sin empresa seleccionada el módulo no responde → 400', async () => {
    const res = await request(app)
      .get('/api/marketing/publications')
      .set('Authorization', `Bearer ${signToken()}`)

    expect(res.status).toBe(400)
  })

  it('el listado siempre filtra por la empresa del encabezado', async () => {
    comoRol('manager')
    pool.query.mockResolvedValueOnce(rows([filaPublicacion()]))

    await request(app)
      .get('/api/marketing/publications')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_B)

    const [sql, valores] = pool.query.mock.calls.at(-1)
    expect(sql).toContain('mp.id_empresa = $1')
    expect(valores[0]).toBe(ID_EMPRESA_B)
  })

  it('el borrado se acota a la empresa, no solo al id de la publicación', async () => {
    comoRol('manager')
    pool.query.mockResolvedValueOnce(rows([{ id_publication: 5 }]))

    await request(app)
      .delete('/api/marketing/publications/5')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)

    const [sql, valores] = pool.query.mock.calls.at(-1)
    expect(sql).toContain('id_empresa = $1')
    expect(valores).toEqual([ID_EMPRESA_A, 5])
  })

  it('una publicación de otra empresa no aparece y responde 404', async () => {
    comoRol('manager')
    pool.query.mockResolvedValueOnce(rows([]))

    const res = await request(app)
      .delete('/api/marketing/publications/5')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)

    expect(res.status).toBe(404)
  })

  it('no se puede colgar una publicación de un proyecto ajeno a la empresa → 404', async () => {
    comoRol('manager')
    pool.query.mockResolvedValueOnce(rows([])) // el proyecto no es de esta empresa

    const res = await request(app)
      .post('/api/marketing/publications')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)
      .send({ ...nuevaPublicacion, projectId: 77 })

    expect(res.status).toBe(404)
    expect(sqlDeLlamadas().some((sql) => sql.includes('INSERT INTO public.marketing_publication'))).toBe(false)
  })
})

describe('Caso 3 · Listado filtrable por estado, canal y proyecto', () => {
  const listar = async (query) => {
    comoRol('manager')
    pool.query.mockResolvedValueOnce(rows([filaPublicacion()]))

    await request(app)
      .get(`/api/marketing/publications${query}`)
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)

    return pool.query.mock.calls.at(-1)
  }

  it('filtra por estado', async () => {
    const [sql, valores] = await listar('?status=SCHEDULED')

    expect(sql).toContain('mp.status = $2')
    expect(valores).toContain('SCHEDULED')
  })

  it('filtra por canal de destino', async () => {
    const [sql, valores] = await listar('?platform=TIKTOK')

    expect(sql).toContain('mp.platform = $2')
    expect(valores).toContain('TIKTOK')
  })

  it('filtra por proyecto', async () => {
    const [sql, valores] = await listar('?projectId=10')

    expect(sql).toContain('mp.id_proyecto = $2')
    expect(valores).toContain(10)
  })

  it('combina los tres filtros a la vez', async () => {
    const [sql, valores] = await listar('?status=DRAFT&platform=INSTAGRAM&projectId=10')

    expect(sql).toContain('mp.status = $2')
    expect(sql).toContain('mp.platform = $3')
    expect(sql).toContain('mp.id_proyecto = $4')
    expect(valores).toEqual([ID_EMPRESA_A, 'DRAFT', 'INSTAGRAM', 10, 200])
  })

  it('un estado fuera del ciclo se rechaza antes de consultar → 400', async () => {
    comoRol('manager')

    const res = await request(app)
      .get('/api/marketing/publications?status=PLANNED')
      .set('Authorization', `Bearer ${signToken()}`)
      .set('X-Company-ID', EMPRESA_A)

    expect(res.status).toBe(400)
  })
})

describe('Caso 4 · Las transiciones inválidas no llegan a escribir', () => {
  // requireCompany → lectura de la publicación → validación del proyecto.
  const prepararEdicion = (publicacion) => {
    comoRol('manager')
    pool.query
      .mockResolvedValueOnce(rows([publicacion]))
      .mockResolvedValueOnce(rows([{ id_proyecto: 10, nombre: 'Proyecto A' }]))
  }

  const editar = (body) => request(app)
    .put('/api/marketing/publications/5')
    .set('Authorization', `Bearer ${signToken()}`)
    .set('X-Company-ID', EMPRESA_A)
    .send(body)

  it('revertir una publicada responde 409 sin tocar la fila', async () => {
    prepararEdicion(filaPublicacion({ status: 'PUBLISHED', published_at: '2026-08-01 09:00:00' }))

    const res = await editar({ status: 'DRAFT' })

    expect(res.status).toBe(409)
    expect(sqlDeLlamadas().some((sql) => sql.includes('UPDATE public.marketing_publication'))).toBe(false)
  })

  it('programar sin fecha responde 400 sin tocar la fila', async () => {
    prepararEdicion(filaPublicacion())

    const res = await editar({ status: 'SCHEDULED' })

    expect(res.status).toBe(400)
    expect(sqlDeLlamadas().some((sql) => sql.includes('UPDATE public.marketing_publication'))).toBe(false)
  })

  it('programar con fecha sí escribe y deja la publicación programada', async () => {
    prepararEdicion(filaPublicacion())
    pool.query
      .mockResolvedValueOnce(rows([]))
      .mockResolvedValueOnce(rows([filaPublicacion({
        status: 'SCHEDULED',
        scheduled_for: '2026-09-01T10:00:00.000Z',
      })]))

    const res = await editar({ status: 'SCHEDULED', scheduledFor: '2026-09-01 10:00:00' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('SCHEDULED')

    const update = pool.query.mock.calls.find(([sql]) => sql.includes('UPDATE public.marketing_publication'))
    expect(update).toBeDefined()
    expect(update[0]).toContain('scheduled_for')
  })

  it('al publicar, la fecha la pone la base y no un valor calculado en Node', async () => {
    prepararEdicion(filaPublicacion({ status: 'SCHEDULED', scheduled_for: '2026-09-01 10:00:00' }))
    pool.query
      .mockResolvedValueOnce(rows([]))
      .mockResolvedValueOnce(rows([filaPublicacion({
        status: 'PUBLISHED',
        published_at: '2026-09-01T10:00:00.000Z',
      })]))

    const res = await editar({ status: 'PUBLISHED' })

    expect(res.status).toBe(200)

    const [sql] = pool.query.mock.calls.find(([q]) => q.includes('UPDATE public.marketing_publication'))
    expect(sql).toContain('published_at = CURRENT_TIMESTAMP')
  })
})

describe('Caso 5 · Datos obligatorios de la publicación', () => {
  const crear = (body) => request(app)
    .post('/api/marketing/publications')
    .set('Authorization', `Bearer ${signToken()}`)
    .set('X-Company-ID', EMPRESA_A)
    .send(body)

  it('el título es obligatorio → 400', async () => {
    comoRol('manager')
    const { title, ...sinTitulo } = nuevaPublicacion

    expect((await crear(sinTitulo)).status).toBe(400)
  })

  it('el canal de destino es obligatorio → 400', async () => {
    comoRol('manager')
    const { platform, ...sinCanal } = nuevaPublicacion

    expect((await crear(sinCanal)).status).toBe(400)
  })

  it('el proyecto es obligatorio, porque la publicación se vincula a él → 400', async () => {
    comoRol('manager')
    const { projectId, ...sinProyecto } = nuevaPublicacion

    expect((await crear(sinProyecto)).status).toBe(400)
  })

  it('un canal inexistente se rechaza → 400', async () => {
    comoRol('manager')

    expect((await crear({ ...nuevaPublicacion, platform: 'MYSPACE' })).status).toBe(400)
  })

  it('la campaña es opcional: se puede crear sin ella', async () => {
    comoRol('manager')
    respuestasDeCreacion()

    const res = await crear(nuevaPublicacion)

    expect(res.status).toBe(201)
    expect(res.body.data.campaignId).toBeNull()
  })
})
