import pool from '../db/pool.js'

// Producto joined with its project (for empresa-level access checks)
const PRODUCTO_SELECT = `
  p.id_producto,
  p.nombre,
  p.descripcion,
  p.precio_venta,
  p.precio_costo,
  p.costo_promedio_ponderado,
  p.stock_actual,
  p.stock_minimo,
  p.id_proyecto,
  proj.nombre AS proyecto_nombre,
  c.nombre AS categoria,
  c.id_categoria
`

const PRODUCTO_FROM = `
  FROM public.producto p
  LEFT JOIN public.categoria c ON c.id_categoria = p.id_categoria
  JOIN public.proyecto proj ON proj.id_proyecto = p.id_proyecto
`

/**
 * GET /api/productos
 * Query: ?categoria, ?stock_bajo=true, ?id_proyecto
 *
 * Without id_proyecto  → all products for the empresa (across all projects)
 * With    id_proyecto  → products for that project + per-project aggregates
 */
export const getProductos = async (req, res) => {
  const { categoria, stock_bajo, id_proyecto } = req.query
  const { id_empresa } = req.empresa

  if (id_proyecto) {
    const filters = ['p.id_proyecto = $1', 'proj.id_empresa = $2']
    const values  = [id_proyecto, id_empresa]

    if (categoria) { values.push(categoria); filters.push(`p.id_categoria = $${values.length}`) }
    if (stock_bajo === 'true') filters.push('p.stock_actual < p.stock_minimo')

    const result = await pool.query(
      `SELECT ${PRODUCTO_SELECT},
         COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.cantidad ELSE 0 END),0) AS entradas_proyecto,
         COALESCE(SUM(CASE WHEN m.tipo='SALIDA'  THEN m.cantidad ELSE 0 END),0) AS salidas_proyecto,
         COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.cantidad WHEN m.tipo='SALIDA' THEN -m.cantidad ELSE 0 END),0) AS neto_proyecto
       ${PRODUCTO_FROM}
       LEFT JOIN public.movimiento_inventario m
         ON m.id_producto = p.id_producto AND m.id_proyecto = p.id_proyecto
         AND m.tipo IN ('ENTRADA','SALIDA','AJUSTE')
       WHERE ${filters.join(' AND ')}
       GROUP BY p.id_producto, proj.nombre, c.nombre, c.id_categoria
       ORDER BY p.id_producto`,
      values
    )
    return res.json({ success: true, data: result.rows })
  }

  // All projects for empresa
  const filters = ['proj.id_empresa = $1']
  const values  = [id_empresa]

  if (categoria) { values.push(categoria); filters.push(`p.id_categoria = $${values.length}`) }
  if (stock_bajo === 'true') filters.push('p.stock_actual < p.stock_minimo')

  const result = await pool.query(
    `SELECT ${PRODUCTO_SELECT} ${PRODUCTO_FROM}
     WHERE ${filters.join(' AND ')}
     ORDER BY proj.id_proyecto, p.id_producto`,
    values
  )
  return res.json({ success: true, data: result.rows })
}

/**
 * GET /api/productos/alertas/stock-bajo
 * Optional: ?id_proyecto
 */
export const getAlertasStockBajo = async (req, res) => {
  const { id_empresa } = req.empresa
  const { id_proyecto } = req.query

  if (id_proyecto) {
    const result = await pool.query(
      `SELECT ${PRODUCTO_SELECT}, (p.stock_minimo - p.stock_actual) AS deficit
       ${PRODUCTO_FROM}
       WHERE p.id_proyecto = $1 AND proj.id_empresa = $2
         AND p.stock_actual < p.stock_minimo
       ORDER BY deficit DESC`,
      [id_proyecto, id_empresa]
    )
    return res.json({ success: true, data: result.rows })
  }

  const result = await pool.query(
    `SELECT ${PRODUCTO_SELECT}, (p.stock_minimo - p.stock_actual) AS deficit
     ${PRODUCTO_FROM}
     WHERE proj.id_empresa = $1 AND p.stock_actual < p.stock_minimo
     ORDER BY deficit DESC`,
    [id_empresa]
  )
  return res.json({ success: true, data: result.rows })
}

/**
 * GET /api/productos/:id
 */
export const getProductoById = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const result = await pool.query(
    `SELECT ${PRODUCTO_SELECT},
       COALESCE(json_agg(json_build_object(
         'id_proveedor', pv.id_proveedor, 'nombre', pv.nombre,
         'precio_unitario', pp.precio_unitario,
         'fecha_ultima_cotizacion', pp.fecha_ultima_cotizacion
       )) FILTER (WHERE pv.id_proveedor IS NOT NULL), '[]') AS proveedores
     ${PRODUCTO_FROM}
     LEFT JOIN public.producto_proveedor pp ON pp.id_producto = p.id_producto
     LEFT JOIN public.proveedor pv ON pv.id_proveedor = pp.id_proveedor
     WHERE p.id_producto = $1 AND proj.id_empresa = $2
     GROUP BY p.id_producto, proj.nombre, c.nombre, c.id_categoria`,
    [id, id_empresa]
  )

  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Producto no encontrado.' })
  return res.json({ success: true, data: result.rows[0] })
}

/**
 * POST /api/productos  — requires requireProyecto middleware
 */
export const createProducto = async (req, res) => {
  const { nombre, descripcion, precio_venta, precio_costo, stock_minimo, stock_inicial, id_categoria } = req.body
  const { id_proyecto } = req.proyecto

  const inserted = await pool.query(
    `INSERT INTO public.producto
       (nombre, descripcion, precio_venta, precio_costo, stock_minimo, stock_actual, id_categoria, id_proyecto)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_producto`,
    [nombre, descripcion ?? null, precio_venta, precio_costo, stock_minimo ?? 0, stock_inicial ?? 0, id_categoria ?? null, id_proyecto]
  )

  const newProducto = await pool.query(
    `SELECT ${PRODUCTO_SELECT} ${PRODUCTO_FROM} WHERE p.id_producto = $1`,
    [inserted.rows[0].id_producto]
  )
  return res.status(201).json({ success: true, data: newProducto.rows[0] })
}

/**
 * PUT /api/productos/:id
 */
export const updateProducto = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const existing = await pool.query(
    `SELECT p.id_producto ${PRODUCTO_FROM} WHERE p.id_producto = $1 AND proj.id_empresa = $2`,
    [id, id_empresa]
  )
  if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Producto no encontrado.' })

  const ALLOWED = ['nombre', 'descripcion', 'precio_venta', 'precio_costo', 'stock_minimo', 'id_categoria']
  const setClauses = []
  const values = []

  for (const field of ALLOWED) {
    if (req.body[field] !== undefined) { values.push(req.body[field]); setClauses.push(`${field} = $${values.length}`) }
  }
  values.push(id)
  await pool.query(`UPDATE public.producto SET ${setClauses.join(', ')} WHERE id_producto = $${values.length}`, values)

  const updated = await pool.query(
    `SELECT ${PRODUCTO_SELECT} ${PRODUCTO_FROM} WHERE p.id_producto = $1`,
    [id]
  )
  return res.json({ success: true, data: updated.rows[0] })
}

/**
 * DELETE /api/productos/:id
 */
export const deleteProducto = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const check = await pool.query(
    `SELECT p.id_producto ${PRODUCTO_FROM} WHERE p.id_producto = $1 AND proj.id_empresa = $2`,
    [id, id_empresa]
  )
  if (!check.rows.length) return res.status(404).json({ success: false, message: 'Producto no encontrado.' })

  try {
    await pool.query('DELETE FROM public.producto WHERE id_producto = $1', [id])
    return res.json({ success: true, message: 'Producto eliminado correctamente.' })
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ success: false, message: 'No se puede eliminar: tiene movimientos u otras referencias.' })
    throw err
  }
}

// ─── Producto ↔ Proveedor ─────────────────────────────────────────────────────

export const linkProveedor = async (req, res) => {
  const { id } = req.params
  const { id_proveedor, precio_unitario } = req.body
  const { id_empresa } = req.empresa

  const producto = await pool.query(
    `SELECT p.id_producto ${PRODUCTO_FROM} WHERE p.id_producto = $1 AND proj.id_empresa = $2`,
    [id, id_empresa]
  )
  if (!producto.rows.length) return res.status(404).json({ success: false, message: 'Producto no encontrado.' })

  const proveedor = await pool.query('SELECT id_proveedor FROM public.proveedor WHERE id_proveedor = $1', [id_proveedor])
  if (!proveedor.rows.length) return res.status(404).json({ success: false, message: 'Proveedor no encontrado.' })

  const existing = await pool.query(
    'SELECT id_producto FROM public.producto_proveedor WHERE id_producto = $1 AND id_proveedor = $2',
    [id, id_proveedor]
  )
  if (existing.rows.length) return res.status(409).json({ success: false, message: 'El proveedor ya está vinculado.' })

  await pool.query(
    'INSERT INTO public.producto_proveedor (id_producto, id_proveedor, precio_unitario) VALUES ($1,$2,$3)',
    [id, id_proveedor, precio_unitario]
  )
  return res.status(201).json({ success: true, message: 'Proveedor vinculado correctamente.' })
}

export const updateLinkProveedor = async (req, res) => {
  const { id, pid } = req.params
  const { precio_unitario, fecha_ultima_cotizacion } = req.body
  const setClauses = []
  const values = []

  if (precio_unitario !== undefined) { values.push(precio_unitario); setClauses.push(`precio_unitario = $${values.length}`) }
  if (fecha_ultima_cotizacion !== undefined) { values.push(fecha_ultima_cotizacion); setClauses.push(`fecha_ultima_cotizacion = $${values.length}`) }

  values.push(id, pid)
  const result = await pool.query(
    `UPDATE public.producto_proveedor SET ${setClauses.join(', ')}
     WHERE id_producto = $${values.length - 1} AND id_proveedor = $${values.length} RETURNING *`,
    values
  )
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Relación no encontrada.' })
  return res.json({ success: true, data: result.rows[0] })
}

export const unlinkProveedor = async (req, res) => {
  const { id, pid } = req.params
  const result = await pool.query(
    'DELETE FROM public.producto_proveedor WHERE id_producto = $1 AND id_proveedor = $2 RETURNING id_producto',
    [id, pid]
  )
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Relación no encontrada.' })
  return res.json({ success: true, message: 'Proveedor desvinculado correctamente.' })
}
