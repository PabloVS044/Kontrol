import pool from '../db/pool.js'

const PRODUCTO_SELECT = `
  p.id_producto,
  p.nombre,
  p.descripcion,
  p.precio_venta,
  p.precio_costo,
  p.costo_promedio_ponderado,
  p.stock_actual,
  p.stock_minimo,
  p.id_empresa,
  c.nombre AS categoria,
  c.id_categoria
`

async function getIdEmpresa(id_usuario) {
  const result = await pool.query(
    'SELECT id_empresa FROM public.usuario WHERE id_usuario = $1',
    [id_usuario]
  )
  return result.rows[0]?.id_empresa ?? null
}

/**
 * GET /api/productos
 * Query: ?categoria, ?stock_bajo=true
 */
export const getProductos = async (req, res) => {
  const { categoria, stock_bajo } = req.query
  const id_empresa = await getIdEmpresa(req.user.id_usuario)

  const filters = ['p.id_empresa = $1']
  const values = [id_empresa]

  if (categoria) {
    values.push(categoria)
    filters.push(`p.id_categoria = $${values.length}`)
  }

  if (stock_bajo === 'true') {
    filters.push('p.stock_actual < p.stock_minimo')
  }

  const result = await pool.query(
    `SELECT ${PRODUCTO_SELECT}
     FROM public.producto p
     LEFT JOIN public.categoria c ON c.id_categoria = p.id_categoria
     WHERE ${filters.join(' AND ')}
     ORDER BY p.id_producto`,
    values
  )

  return res.json({ success: true, data: result.rows })
}

/**
 * GET /api/productos/alertas/stock-bajo
 */
export const getAlertasStockBajo = async (req, res) => {
  const id_empresa = await getIdEmpresa(req.user.id_usuario)

  const result = await pool.query(
    `SELECT ${PRODUCTO_SELECT},
       (p.stock_minimo - p.stock_actual) AS deficit
     FROM public.producto p
     LEFT JOIN public.categoria c ON c.id_categoria = p.id_categoria
     WHERE p.id_empresa = $1 AND p.stock_actual < p.stock_minimo
     ORDER BY deficit DESC`,
    [id_empresa]
  )

  return res.json({ success: true, data: result.rows })
}

/**
 * GET /api/productos/:id  — includes linked suppliers
 */
export const getProductoById = async (req, res) => {
  const { id } = req.params
  const id_empresa = await getIdEmpresa(req.user.id_usuario)

  const result = await pool.query(
    `SELECT ${PRODUCTO_SELECT},
       COALESCE(
         json_agg(
           json_build_object(
             'id_proveedor',            pv.id_proveedor,
             'nombre',                  pv.nombre,
             'precio_unitario',         pp.precio_unitario,
             'fecha_ultima_cotizacion', pp.fecha_ultima_cotizacion
           )
         ) FILTER (WHERE pv.id_proveedor IS NOT NULL),
         '[]'
       ) AS proveedores
     FROM public.producto p
     LEFT JOIN public.categoria c ON c.id_categoria = p.id_categoria
     LEFT JOIN public.producto_proveedor pp ON pp.id_producto = p.id_producto
     LEFT JOIN public.proveedor pv ON pv.id_proveedor = pp.id_proveedor
     WHERE p.id_producto = $1 AND p.id_empresa = $2
     GROUP BY p.id_producto, c.nombre, c.id_categoria`,
    [id, id_empresa]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * POST /api/productos
 */
export const createProducto = async (req, res) => {
  const { nombre, descripcion, precio_venta, precio_costo, stock_minimo, id_categoria } = req.body
  const id_empresa = await getIdEmpresa(req.user.id_usuario)

  const inserted = await pool.query(
    `INSERT INTO public.producto
       (nombre, descripcion, precio_venta, precio_costo, stock_minimo, id_categoria, id_empresa)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_producto`,
    [nombre, descripcion ?? null, precio_venta, precio_costo, stock_minimo ?? 0, id_categoria ?? null, id_empresa]
  )

  const newProducto = await pool.query(
    `SELECT ${PRODUCTO_SELECT}
     FROM public.producto p
     LEFT JOIN public.categoria c ON c.id_categoria = p.id_categoria
     WHERE p.id_producto = $1`,
    [inserted.rows[0].id_producto]
  )

  return res.status(201).json({ success: true, data: newProducto.rows[0] })
}

/**
 * PUT /api/productos/:id
 * stock_actual and costo_promedio_ponderado are never updated directly.
 */
export const updateProducto = async (req, res) => {
  const { id } = req.params
  const id_empresa = await getIdEmpresa(req.user.id_usuario)

  const existing = await pool.query(
    'SELECT id_producto FROM public.producto WHERE id_producto = $1 AND id_empresa = $2',
    [id, id_empresa]
  )
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado.' })
  }

  const ALLOWED = ['nombre', 'descripcion', 'precio_venta', 'precio_costo', 'stock_minimo', 'id_categoria']
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
    `UPDATE public.producto SET ${setClauses.join(', ')} WHERE id_producto = $${values.length}`,
    values
  )

  const updated = await pool.query(
    `SELECT ${PRODUCTO_SELECT}
     FROM public.producto p
     LEFT JOIN public.categoria c ON c.id_categoria = p.id_categoria
     WHERE p.id_producto = $1`,
    [id]
  )

  return res.json({ success: true, data: updated.rows[0] })
}

/**
 * DELETE /api/productos/:id  (hard delete — no activo column on producto)
 */
export const deleteProducto = async (req, res) => {
  const { id } = req.params
  const id_empresa = await getIdEmpresa(req.user.id_usuario)

  try {
    const result = await pool.query(
      'DELETE FROM public.producto WHERE id_producto = $1 AND id_empresa = $2 RETURNING id_producto',
      [id, id_empresa]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' })
    }

    return res.json({ success: true, message: 'Producto eliminado correctamente.' })
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar el producto porque tiene movimientos u otras referencias.',
      })
    }
    throw err
  }
}

// ─── Producto ↔ Proveedor ─────────────────────────────────────────────────────

/**
 * POST /api/productos/:id/proveedores
 */
export const linkProveedor = async (req, res) => {
  const { id } = req.params
  const { id_proveedor, precio_unitario } = req.body
  const id_empresa = await getIdEmpresa(req.user.id_usuario)

  const [producto, proveedor] = await Promise.all([
    pool.query('SELECT id_producto FROM public.producto WHERE id_producto = $1 AND id_empresa = $2', [id, id_empresa]),
    pool.query('SELECT id_proveedor FROM public.proveedor WHERE id_proveedor = $1 AND id_empresa = $2', [id_proveedor, id_empresa]),
  ])

  if (!producto.rows.length) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado.' })
  }
  if (!proveedor.rows.length) {
    return res.status(404).json({ success: false, message: 'Proveedor no encontrado.' })
  }

  const existing = await pool.query(
    'SELECT id_producto FROM public.producto_proveedor WHERE id_producto = $1 AND id_proveedor = $2',
    [id, id_proveedor]
  )
  if (existing.rows.length) {
    return res.status(409).json({ success: false, message: 'El proveedor ya está vinculado a este producto.' })
  }

  await pool.query(
    'INSERT INTO public.producto_proveedor (id_producto, id_proveedor, precio_unitario) VALUES ($1, $2, $3)',
    [id, id_proveedor, precio_unitario]
  )

  return res.status(201).json({ success: true, message: 'Proveedor vinculado correctamente.' })
}

/**
 * PUT /api/productos/:id/proveedores/:pid
 */
export const updateLinkProveedor = async (req, res) => {
  const { id, pid } = req.params
  const { precio_unitario, fecha_ultima_cotizacion } = req.body

  const setClauses = []
  const values = []

  if (precio_unitario !== undefined) {
    values.push(precio_unitario)
    setClauses.push(`precio_unitario = $${values.length}`)
  }
  if (fecha_ultima_cotizacion !== undefined) {
    values.push(fecha_ultima_cotizacion)
    setClauses.push(`fecha_ultima_cotizacion = $${values.length}`)
  }

  values.push(id, pid)
  const result = await pool.query(
    `UPDATE public.producto_proveedor
     SET ${setClauses.join(', ')}
     WHERE id_producto = $${values.length - 1} AND id_proveedor = $${values.length}
     RETURNING *`,
    values
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Relación producto-proveedor no encontrada.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * DELETE /api/productos/:id/proveedores/:pid
 */
export const unlinkProveedor = async (req, res) => {
  const { id, pid } = req.params

  const result = await pool.query(
    'DELETE FROM public.producto_proveedor WHERE id_producto = $1 AND id_proveedor = $2 RETURNING id_producto',
    [id, pid]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Relación producto-proveedor no encontrada.' })
  }

  return res.json({ success: true, message: 'Proveedor desvinculado correctamente.' })
}
