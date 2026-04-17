import pool from '../db/pool.js'

/**
 * POST /api/empresas
 * Crea una empresa y vincula al usuario autenticado como 'owner'.
 * Usado en onboarding cuando el usuario aún no pertenece a ninguna empresa.
 */
export const createEmpresa = async (req, res) => {
  const { nombre, industria, telefono, direccion } = req.body
  const id_usuario = req.user.id_usuario

  const userRow = await pool.query(
    'SELECT email FROM public.usuario WHERE id_usuario = $1',
    [id_usuario]
  )
  const email = userRow.rows[0]?.email

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const empresaInserted = await client.query(
      `INSERT INTO public.empresa (nombre, industria, telefono, direccion, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_empresa, nombre, email`,
      [nombre, industria ?? null, telefono ?? null, direccion ?? null, email]
    )
    const id_empresa = empresaInserted.rows[0].id_empresa

    // El creador de la empresa queda como 'owner'
    const ownerRole = await client.query(
      "SELECT id_rol_empresa FROM public.rol_empresa WHERE nombre = 'owner' LIMIT 1"
    )
    if (!ownerRole.rows.length) {
      throw new Error('Rol owner no encontrado. Verifica el seed de la base de datos.')
    }

    await client.query(
      `INSERT INTO public.empresa_usuario (id_empresa, id_usuario, id_rol_empresa)
       VALUES ($1, $2, $3)`,
      [id_empresa, id_usuario, ownerRole.rows[0].id_rol_empresa]
    )

    await client.query('COMMIT')
    return res.status(201).json({ success: true, data: empresaInserted.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe una empresa con ese email.' })
    }
    throw err
  } finally {
    client.release()
  }
}

/**
 * GET /api/empresas/mis-empresas
 * Retorna todas las empresas a las que pertenece el usuario autenticado.
 */
export const getMisEmpresas = async (req, res) => {
  const id_usuario = req.user.id_usuario

  const result = await pool.query(
    `SELECT e.id_empresa, e.nombre, e.industria, e.email, e.telefono, re.nombre AS rol
     FROM public.empresa e
     JOIN public.empresa_usuario eu ON eu.id_empresa = e.id_empresa
     JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
     WHERE eu.id_usuario = $1
     ORDER BY e.nombre`,
    [id_usuario]
  )

  return res.json({ success: true, data: result.rows })
}
