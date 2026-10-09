/**
 * I1 — Integración: API de autenticación ↔ PostgreSQL ↔ bcrypt ↔ JWT.
 *
 * Componentes reales: authRoutes → validate (Zod) → authController → pool pg
 * → tablas `usuario` y `rol` → bcrypt → jsonwebtoken → middleware requireAuth.
 * Ningún componente está simulado: el registro escribe en Postgres, el login
 * lee esa misma fila y compara contra el hash guardado, y `/me` resuelve el
 * token emitido contra la base otra vez.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { api, closeDb, query, unique } from '../db/fixtures.js'

const PASSWORD = 'Kontrol2026!'

describe('I1 — registro, login y sesión contra la base real', () => {
  const email = `${unique('i1')}@kontrol-test.dev`
  let token

  afterAll(closeDb)

  it('POST /api/auth/register persiste al usuario con la contraseña hasheada', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ nombre: 'Ana', apellido: 'Martínez', email, password: PASSWORD, role: 'usuario' })

    expect(res.status).toBe(201)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.data).toMatchObject({ email, nombre_rol: 'usuario' })
    expect(res.body.data).not.toHaveProperty('password_hash')

    const { rows } = await query(
      `SELECT u.password_hash, r.nombre_rol
       FROM public.usuario u JOIN public.rol r ON r.id_rol = u.id_rol
       WHERE u.email = $1`,
      [email]
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].nombre_rol).toBe('usuario')
    // Se guarda un hash bcrypt, nunca el texto plano.
    expect(rows[0].password_hash).not.toBe(PASSWORD)
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/)
  })

  it('rechaza un segundo registro con el mismo correo (409)', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ nombre: 'Ana', apellido: 'Duplicada', email, password: PASSWORD, role: 'usuario' })

    expect(res.status).toBe(409)
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM public.usuario WHERE email = $1', [email])
    expect(rows[0].n).toBe(1)
  })

  it('POST /api/auth/login valida la contraseña contra el hash guardado y emite un JWT', async () => {
    const res = await api().post('/api/auth/login').send({ email, password: PASSWORD })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ email, nombre_rol: 'usuario' })
    expect(res.body.data).not.toHaveProperty('password_hash')
    token = res.body.token
    expect(token).toEqual(expect.any(String))
  })

  it('rechaza el login con una contraseña incorrecta (401)', async () => {
    const res = await api().post('/api/auth/login').send({ email, password: 'otra-clave-123' })
    expect(res.status).toBe(401)
    expect(res.body).not.toHaveProperty('token')
  })

  it('GET /api/auth/me resuelve el token emitido al mismo usuario de la base', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ email, nombre: 'Ana', apellido: 'Martínez', activo: true })
  })

  it('GET /api/auth/me sin token responde 401', async () => {
    const res = await api().get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
