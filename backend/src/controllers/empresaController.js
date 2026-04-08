import pool from '../db/pool.js'

/**
 * POST /api/empresas
 * Creates a new empresa and links it to the authenticated user.
 * Used during onboarding when a new user has no empresa yet.
 */
export const createEmpresa = async (req, res) => {
  const { nombre, industria, telefono, direccion } = req.body
  const id_usuario = req.user.id_usuario

  // Use the user's email as the empresa email if not provided
  const userRow = await pool.query(
    'SELECT email FROM public.usuario WHERE id_usuario = $1',
    [id_usuario]
  )
  const email = userRow.rows[0]?.email

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const inserted = await client.query(
      `INSERT INTO public.empresa (nombre, industria, telefono, direccion, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_empresa, nombre, email`,
      [nombre, industria ?? null, telefono ?? null, direccion ?? null, email]
    )

    const id_empresa = inserted.rows[0].id_empresa

    await client.query(
      'UPDATE public.usuario SET id_empresa = $1 WHERE id_usuario = $2',
      [id_empresa, id_usuario]
    )

    await client.query('COMMIT')
    return res.status(201).json({ success: true, data: inserted.rows[0] })
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
