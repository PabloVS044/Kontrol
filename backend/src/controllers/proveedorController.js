import pool from '../db/pool.js'

const PROVEEDOR_SELECT = `
  pr.id_proveedor,
  pr.nombre,
  pr.contacto_nombre,
  pr.telefono,
  pr.email,
  pr.id_empresa
`

/**
 * GET /api/proveedores
 */
export const getProveedores = async (req, res) => {
  const { id_empresa } = req.empresa

  const result = await pool.query(
    `SELECT ${PROVEEDOR_SELECT}
     FROM public.proveedor pr
     WHERE pr.id_empresa = $1
     ORDER BY pr.id_proveedor`,
    [id_empresa]
  )

  return res.json({ success: true, data: result.rows })
}

/**
 * GET /api/proveedores/:id  — includes linked products
 */
export const getProveedorById = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const result = await pool.query(
    `SELECT ${PROVEEDOR_SELECT},
       COALESCE(
         json_agg(
           json_build_object(
             'id_producto',             p.id_producto,
             'nombre',                  p.nombre,
             'precio_unitario',         pp.precio_unitario,
             'fecha_ultima_cotizacion', pp.fecha_ultima_cotizacion
           )
         ) FILTER (WHERE p.id_producto IS NOT NULL),
         '[]'
       ) AS productos
     FROM public.proveedor pr
     LEFT JOIN public.producto_proveedor pp ON pp.id_proveedor = pr.id_proveedor
     LEFT JOIN public.producto p ON p.id_producto = pp.id_producto
     WHERE pr.id_proveedor = $1 AND pr.id_empresa = $2
     GROUP BY pr.id_proveedor`,
    [id, id_empresa]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Proveedor no encontrado.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * POST /api/proveedores
 */
export const createProveedor = async (req, res) => {
  const { nombre, contacto_nombre, telefono, email } = req.body
  const { id_empresa } = req.empresa

  const inserted = await pool.query(
    `INSERT INTO public.proveedor (nombre, contacto_nombre, telefono, email, id_empresa)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_proveedor`,
    [nombre, contacto_nombre ?? null, telefono ?? null, email ?? null, id_empresa]
  )

  const newProveedor = await pool.query(
    `SELECT ${PROVEEDOR_SELECT} FROM public.proveedor pr WHERE pr.id_proveedor = $1`,
    [inserted.rows[0].id_proveedor]
  )

  return res.status(201).json({ success: true, data: newProveedor.rows[0] })
}

/**
 * PUT /api/proveedores/:id
 */
export const updateProveedor = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const existing = await pool.query(
    'SELECT id_proveedor FROM public.proveedor WHERE id_proveedor = $1 AND id_empresa = $2',
    [id, id_empresa]
  )
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Proveedor no encontrado.' })
  }

  const ALLOWED = ['nombre', 'contacto_nombre', 'telefono', 'email']
  const setClauses = []
  const values = []

  for (const field of ALLOWED) {
    if (req.body[field] !== undefined) {
      values.push(req.body[field])
      setClauses.push(`${field} = $${values.length}`)
    }
  }

  values.push(id)
  await pool.query(
    `UPDATE public.proveedor SET ${setClauses.join(', ')} WHERE id_proveedor = $${values.length}`,
    values
  )

  const updated = await pool.query(
    `SELECT ${PROVEEDOR_SELECT} FROM public.proveedor pr WHERE pr.id_proveedor = $1`,
    [id]
  )

  return res.json({ success: true, data: updated.rows[0] })
}

/**
 * DELETE /api/proveedores/:id
 */
export const deleteProveedor = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  try {
    const result = await pool.query(
      'DELETE FROM public.proveedor WHERE id_proveedor = $1 AND id_empresa = $2 RETURNING id_proveedor',
      [id, id_empresa]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado.' })
    }

    return res.json({ success: true, message: 'Proveedor eliminado correctamente.' })
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar el proveedor porque tiene movimientos u otras referencias.',
      })
    }
    throw err
  }
}
