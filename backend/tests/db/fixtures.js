// Datos de prueba sobre la base REAL. Cada helper inserta con el mismo pool
// que usa la app, así que lo que crea aquí es exactamente lo que verán los
// controladores. Los nombres y correos llevan un sufijo único para que las
// suites no dependan del orden ni choquen con los UNIQUE del esquema.
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import pool from '../../src/db/pool.js'
import app from '../../src/index.js'

let sequence = 0
export const unique = (prefix) => `${prefix}-${process.pid}-${Date.now()}-${++sequence}`

export const api = () => supertest(app)

export async function closeDb() {
  await pool.end()
}

export async function query(text, params) {
  return pool.query(text, params)
}

// Inserta un usuario de plataforma. `password_hash` queda nulo: los usuarios
// de fixture entran con `tokenFor`, no por login (eso lo prueba I1).
export async function createUser({ nombre = 'Prueba', apellido = 'Integración', rol = 'usuario' } = {}) {
  const email = `${unique('user')}@kontrol-test.dev`
  const { rows } = await pool.query(
    `INSERT INTO public.usuario (nombre, apellido, email, id_rol)
     SELECT $1, $2, $3, id_rol FROM public.rol WHERE nombre_rol = $4
     RETURNING id_usuario, email`,
    [nombre, apellido, email, rol]
  )
  return { ...rows[0], nombre_rol: rol }
}

// JWT con la misma forma que firma `authController.signToken`.
export function tokenFor(user) {
  return jwt.sign(
    { id_usuario: user.id_usuario, email: user.email, nombre_rol: user.nombre_rol },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
}

// Empresa + su configuración de punto de venta + un owner que pertenece a ella.
export async function createCompanyWithOwner({ config = {} } = {}) {
  const owner = await createUser({ nombre: 'Owner' })
  const name = unique('Empresa')

  const { rows } = await pool.query(
    `INSERT INTO public.empresa (nombre, email) VALUES ($1, $2) RETURNING id_empresa, nombre`,
    [name, `${name.toLowerCase()}@kontrol-test.dev`]
  )
  const company = rows[0]

  await pool.query(
    `INSERT INTO public.empresa_usuario (id_empresa, id_usuario, id_rol_empresa)
     SELECT $1, $2, id_rol_empresa FROM public.rol_empresa WHERE nombre = 'owner'`,
    [company.id_empresa, owner.id_usuario]
  )

  const {
    iva_activo = false,
    iva_tasa = 0.12,
    descuento_activo = false,
    descuento_max_pct = 0,
  } = config
  await pool.query(
    `INSERT INTO public.empresa_config (id_empresa, iva_activo, iva_tasa, descuento_activo, descuento_max_pct)
     VALUES ($1, $2, $3, $4, $5)`,
    [company.id_empresa, iva_activo, iva_tasa, descuento_activo, descuento_max_pct]
  )

  return { company, owner, token: tokenFor(owner) }
}

export async function createProject({ id_empresa, id_encargado, nombre = unique('Proyecto') }) {
  const { rows } = await pool.query(
    `INSERT INTO public.proyecto (nombre, fecha_inicio, presupuesto_total, id_empresa, id_encargado)
     VALUES ($1, CURRENT_DATE, 10000, $2, $3)
     RETURNING id_proyecto, nombre`,
    [nombre, id_empresa, id_encargado]
  )
  return rows[0]
}

export async function createProduct({
  id_proyecto,
  nombre = unique('Producto'),
  precio_venta = 50,
  precio_costo = 30,
  stock_actual = 10,
  stock_minimo = 0,
}) {
  const { rows } = await pool.query(
    `INSERT INTO public.producto
       (nombre, precio_venta, precio_costo, costo_promedio_ponderado, stock_actual, stock_minimo, id_proyecto)
     VALUES ($1, $2, $3, $3, $4, $5, $6)
     RETURNING id_producto, nombre, precio_venta, stock_actual`,
    [nombre, precio_venta, precio_costo, stock_actual, stock_minimo, id_proyecto]
  )
  return rows[0]
}

export async function stockOf(id_producto) {
  const { rows } = await pool.query('SELECT stock_actual FROM public.producto WHERE id_producto = $1', [id_producto])
  return rows[0].stock_actual
}

export async function salesCountFor(id_empresa) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM public.venta WHERE id_empresa = $1', [id_empresa])
  return rows[0].n
}
