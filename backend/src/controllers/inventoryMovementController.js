import pool from '../db/pool.js'
import {
  ensureProjectAccess,
  getAccessibleProjectIds,
  hasEmpresaManagementAccess,
  INVENTORY_VIEW_PERMISSION_NAMES,
} from '../services/projectAccessService.js'

const MOVIMIENTO_SELECT = `
  m.id_movimiento,
  m.tipo,
  m.cantidad,
  m.precio_unitario,
  m.fecha,
  m.motivo,
  m.id_producto,
  p.nombre  AS producto_nombre,
  p.stock_actual AS producto_stock_actual,
  m.id_usuario,
  u.nombre  AS usuario_nombre,
  u.apellido AS usuario_apellido,
  m.id_proyecto,
  pr.nombre AS proyecto_nombre,
  m.id_proveedor,
  pv.nombre AS proveedor_nombre
`

const getAccessibleInventoryProjectIds = async (req) => {
  if (hasEmpresaManagementAccess(req.empresa.rol_empresa)) {
    return null
  }

  return getAccessibleProjectIds({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    id_usuario: req.user.id_usuario,
    rol_empresa: req.empresa.rol_empresa,
    requiredPermissions: INVENTORY_VIEW_PERMISSION_NAMES,
  })
}

/**
 * GET /api/inventory-movements
 * Filters: ?id_producto, ?projectId, ?tipo, ?desde, ?hasta
 * Scoped to the company in the X-Company-ID header via product join.
 */
export const getInventoryMovements = async (req, res) => {
  const { id_producto, projectId, id_proyecto: legacyProjectId, tipo, desde, hasta } = req.query
  const id_proyecto = projectId ?? legacyProjectId
  const { id_empresa } = req.empresa
  const accessibleProjectIds = await getAccessibleInventoryProjectIds(req)

  if (accessibleProjectIds && !accessibleProjectIds.length) {
    return res.json({ success: true, data: [] })
  }

  if (accessibleProjectIds && id_proyecto && !accessibleProjectIds.includes(Number(id_proyecto))) {
    return res.status(403).json({ success: false, message: 'You do not have access to this project inventory.' })
  }

  // Scope to empresa via proyecto join
  const filters = ['proj.id_empresa = $1']
  const values = [id_empresa]

  if (accessibleProjectIds) {
    values.push(accessibleProjectIds)
    filters.push(`m.id_proyecto = ANY($${values.length}::int[])`)
  }

  if (id_producto) {
    values.push(id_producto)
    filters.push(`m.id_producto = $${values.length}`)
  }
  if (id_proyecto) {
    values.push(id_proyecto)
    filters.push(`m.id_proyecto = $${values.length}`)
  }
  if (tipo) {
    values.push(tipo)
    filters.push(`m.tipo = $${values.length}`)
  }
  if (desde) {
    values.push(desde)
    filters.push(`m.fecha >= $${values.length}::timestamp`)
  }
  if (hasta) {
    values.push(hasta)
    filters.push(`m.fecha <= $${values.length}::timestamp`)
  }

  const result = await pool.query(
    `SELECT ${MOVIMIENTO_SELECT}
     FROM public.movimiento_inventario m
     JOIN public.producto p    ON p.id_producto  = m.id_producto
     JOIN public.proyecto pr   ON pr.id_proyecto = m.id_proyecto
     JOIN public.proyecto proj ON proj.id_proyecto = m.id_proyecto
     JOIN public.usuario u     ON u.id_usuario   = m.id_usuario
     LEFT JOIN public.proveedor pv ON pv.id_proveedor = m.id_proveedor
     WHERE ${filters.join(' AND ')}
     ORDER BY m.fecha DESC`,
    values
  )

  return res.json({ success: true, data: result.rows })
}

/**
 * GET /api/inventory-movements/:id
 */
export const getInventoryMovementById = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const scope = await pool.query(
    `SELECT m.id_movimiento, m.id_proyecto
     FROM public.movimiento_inventario m
     JOIN public.proyecto pr ON pr.id_proyecto = m.id_proyecto
     WHERE m.id_movimiento = $1 AND pr.id_empresa = $2
     LIMIT 1`,
    [id, id_empresa]
  )

  if (!scope.rows.length) {
    return res.status(404).json({ success: false, message: 'Movement not found.' })
  }

  const access = await ensureProjectAccess({
    client: pool,
    id_empresa,
    id_usuario: req.user.id_usuario,
    rol_empresa: req.empresa.rol_empresa,
    id_proyecto: scope.rows[0].id_proyecto,
    requiredPermissions: INVENTORY_VIEW_PERMISSION_NAMES,
  })

  if (!access.allowed) {
    return res.status(403).json({ success: false, message: 'You do not have access to this movement.' })
  }

  const result = await pool.query(
    `SELECT ${MOVIMIENTO_SELECT}
     FROM public.movimiento_inventario m
     JOIN public.producto p   ON p.id_producto   = m.id_producto
     JOIN public.usuario u    ON u.id_usuario    = m.id_usuario
     JOIN public.proyecto pr  ON pr.id_proyecto  = m.id_proyecto
     LEFT JOIN public.proveedor pv ON pv.id_proveedor = m.id_proveedor
     WHERE m.id_movimiento = $1 AND pr.id_empresa = $2`,
    [id, id_empresa]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Movement not found.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * POST /api/inventory-movements
 *
 * Business rules:
 *  - SALIDA: stock_actual >= cantidad (409 if not)
 *  - All stock updates wrapped in a transaction
 *  - ENTRADA: recalculates costo_promedio_ponderado using weighted average cost
 *  - AJUSTE:  sets stock_actual = cantidad (absolute, not delta)
 */
export const createInventoryMovement = async (req, res) => {
  const { tipo, cantidad, precio_unitario, motivo, id_producto, id_proyecto, id_proveedor } = req.body
  const id_usuario = req.user.id_usuario
  const { id_empresa } = req.empresa

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lock the product row for the duration of the transaction
    const productoResult = await client.query(
      `SELECT p.id_producto, p.stock_actual, p.costo_promedio_ponderado
       FROM public.producto p
       JOIN public.proyecto proj ON proj.id_proyecto = p.id_proyecto
       WHERE p.id_producto = $1 AND p.id_proyecto = $2 AND proj.id_empresa = $3
       FOR UPDATE`,
      [id_producto, id_proyecto, id_empresa]
    )

    if (!productoResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Product not found in this project.' })
    }

    const producto = productoResult.rows[0]

    // SALIDA: ensure enough stock
    if (tipo === 'SALIDA' && producto.stock_actual < cantidad) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: `Insufficient stock. Available: ${producto.stock_actual}, requested: ${cantidad}.`,
      })
    }

    // Insert movement
    const inserted = await client.query(
      `INSERT INTO public.movimiento_inventario
         (tipo, cantidad, precio_unitario, motivo, id_producto, id_usuario, id_proyecto, id_proveedor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id_movimiento`,
      [tipo, cantidad, precio_unitario, motivo ?? null, id_producto, id_usuario, id_proyecto, id_proveedor ?? null]
    )

    // Update stock
    if (tipo === 'ENTRADA') {
      await client.query(
        `UPDATE public.producto
         SET
           costo_promedio_ponderado = CASE
             WHEN stock_actual + $1 = 0 THEN 0
             ELSE (stock_actual * costo_promedio_ponderado + $1 * $2) / (stock_actual + $1)
           END,
           stock_actual = stock_actual + $1
         WHERE id_producto = $3`,
        [cantidad, precio_unitario, id_producto]
      )
    } else if (tipo === 'SALIDA') {
      await client.query(
        'UPDATE public.producto SET stock_actual = stock_actual - $1 WHERE id_producto = $2',
        [cantidad, id_producto]
      )
    } else {
      // AJUSTE: stock_actual becomes the absolute value provided
      await client.query(
        'UPDATE public.producto SET stock_actual = $1 WHERE id_producto = $2',
        [cantidad, id_producto]
      )
    }

    await client.query('COMMIT')

    // Fetch the full movement with joins for the response
    const result = await pool.query(
      `SELECT ${MOVIMIENTO_SELECT}
       FROM public.movimiento_inventario m
       JOIN public.producto p   ON p.id_producto   = m.id_producto
       JOIN public.usuario u    ON u.id_usuario    = m.id_usuario
       JOIN public.proyecto pr  ON pr.id_proyecto  = m.id_proyecto
       LEFT JOIN public.proveedor pv ON pv.id_proveedor = m.id_proveedor
       WHERE m.id_movimiento = $1`,
      [inserted.rows[0].id_movimiento]
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
