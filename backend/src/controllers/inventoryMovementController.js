import pool from '../db/pool.js'
import { notifyCompany } from '../services/notificationService.js'
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

    // On a SALIDA, snapshot the cost that applies right now (the locked row's
    // weighted-average cost) so profit analytics stay accurate even after the
    // product's cost changes with future restocks. NULL for other types.
    const costoVentaSnapshot = tipo === 'SALIDA' ? producto.costo_promedio_ponderado : null

    // Insert movement
    const inserted = await client.query(
      `INSERT INTO public.movimiento_inventario
         (tipo, cantidad, precio_unitario, motivo, id_producto, id_usuario, id_proyecto, id_proveedor, id_empresa, costo_unitario_venta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id_movimiento`,
      [tipo, cantidad, precio_unitario, motivo ?? null, id_producto, id_usuario, id_proyecto, id_proveedor ?? null, id_empresa, costoVentaSnapshot]
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

    // Alert if stock dropped below minimum after a SALIDA
    if (tipo === 'SALIDA') {
      const stockCheck = await pool.query(
        `SELECT p.nombre, p.stock_actual, p.stock_minimo, pr.nombre AS proyecto_nombre
         FROM public.producto p
         JOIN public.proyecto pr ON pr.id_proyecto = p.id_proyecto
         WHERE p.id_producto = $1`,
        [id_producto],
      )
      const prod = stockCheck.rows[0]
      if (prod && prod.stock_minimo != null && prod.stock_actual <= prod.stock_minimo) {
        const isZero = prod.stock_actual === 0
        notifyCompany(id_empresa, {
          title: isZero ? `🔴 Sin stock — ${prod.nombre}` : `🟡 Stock bajo — ${prod.nombre}`,
          text: isZero
            ? `El producto *${prod.nombre}* (${prod.proyecto_nombre}) se quedó sin stock.`
            : `El producto *${prod.nombre}* (${prod.proyecto_nombre}) tiene solo ${prod.stock_actual} unidades (mínimo: ${prod.stock_minimo}).`,
          event: 'inventory.low_stock',
          data: { id_producto, stock_actual: prod.stock_actual, stock_minimo: prod.stock_minimo },
        })
      }
    }

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

/**
 * POST /api/inventory-movements/sale
 *
 * Atomic multi-line POS sale. Takes the whole cart and creates every SALIDA in
 * a single transaction: either the full sale commits or nothing does (fixes the
 * previous per-line POST loop that could leave a sale half-applied). Because all
 * lines share one transaction, they also share one CURRENT_TIMESTAMP, which makes
 * the "operaciones_venta" grouping in the stats endpoint exact.
 *
 * Body: { items: [{ id_producto, id_proyecto, cantidad, precio_unitario }], motivo? }
 * Access: selling requires access to each project in the cart (no specific
 * permission), mirroring the single-movement SALIDA gate.
 */
export const createSale = async (req, res) => {
  const { items, motivo } = req.body
  const id_usuario = req.user.id_usuario
  const { id_empresa } = req.empresa

  // Per-project access check (a cart may span projects in the "all projects" view).
  const isSuper = req.user?.nombre_rol === 'super_user'
  if (!isSuper) {
    const projectIds = [...new Set(items.map((i) => i.id_proyecto))]
    for (const id_proyecto of projectIds) {
      const access = await ensureProjectAccess({
        client: pool,
        id_empresa,
        id_usuario,
        rol_empresa: req.empresa.rol_empresa,
        id_proyecto,
        requiredPermissions: [],
      })
      if (!access.allowed) {
        return res.status(403).json({ success: false, message: 'You do not have access to one of the projects in this sale.' })
      }
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const createdIds = []
    const lowStock = []

    for (const item of items) {
      const productoResult = await client.query(
        `SELECT p.id_producto, p.stock_actual, p.costo_promedio_ponderado,
                p.nombre, p.stock_minimo, pr.nombre AS proyecto_nombre
         FROM public.producto p
         JOIN public.proyecto pr ON pr.id_proyecto = p.id_proyecto
         WHERE p.id_producto = $1 AND p.id_proyecto = $2 AND pr.id_empresa = $3
         FOR UPDATE`,
        [item.id_producto, item.id_proyecto, id_empresa]
      )

      if (!productoResult.rows.length) {
        await client.query('ROLLBACK')
        return res.status(404).json({ success: false, message: `Product ${item.id_producto} not found in this project.` })
      }

      const producto = productoResult.rows[0]
      if (producto.stock_actual < item.cantidad) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          success: false,
          message: `Insufficient stock for ${producto.nombre}. Available: ${producto.stock_actual}, requested: ${item.cantidad}.`,
        })
      }

      const inserted = await client.query(
        `INSERT INTO public.movimiento_inventario
           (tipo, cantidad, precio_unitario, motivo, id_producto, id_usuario, id_proyecto, id_empresa, costo_unitario_venta)
         VALUES ('SALIDA', $1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id_movimiento`,
        [item.cantidad, item.precio_unitario ?? 0, motivo ?? null, item.id_producto, id_usuario, item.id_proyecto, id_empresa, producto.costo_promedio_ponderado]
      )
      createdIds.push(inserted.rows[0].id_movimiento)

      await client.query(
        'UPDATE public.producto SET stock_actual = stock_actual - $1 WHERE id_producto = $2',
        [item.cantidad, item.id_producto]
      )

      const newStock = producto.stock_actual - item.cantidad
      if (producto.stock_minimo != null && newStock <= producto.stock_minimo) {
        lowStock.push({ ...producto, stock_actual: newStock })
      }
    }

    await client.query('COMMIT')

    // Low-stock alerts after the sale is durable.
    for (const prod of lowStock) {
      const isZero = prod.stock_actual === 0
      notifyCompany(id_empresa, {
        title: isZero ? `🔴 Sin stock — ${prod.nombre}` : `🟡 Stock bajo — ${prod.nombre}`,
        text: isZero
          ? `El producto *${prod.nombre}* (${prod.proyecto_nombre}) se quedó sin stock.`
          : `El producto *${prod.nombre}* (${prod.proyecto_nombre}) tiene solo ${prod.stock_actual} unidades (mínimo: ${prod.stock_minimo}).`,
        event: 'inventory.low_stock',
        data: { id_producto: prod.id_producto, stock_actual: prod.stock_actual, stock_minimo: prod.stock_minimo },
      })
    }

    return res.status(201).json({ success: true, data: { id_movimientos: createdIds, count: createdIds.length } })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const BUCKET_TRUNC = { hour: 'hour', day: 'day', week: 'week', month: 'month' }

/**
 * GET /api/inventory-movements/stats
 * Query: ?projectId, ?desde, ?hasta, ?bucket=hour|day|week|month
 *
 * Sales & finance analytics over a date range, scoped to the company (and to
 * the projects the user can see). Returns headline totals, a time series for
 * charting, and the top-selling products. Profit uses the per-sale cost
 * snapshot (costo_unitario_venta), falling back to the product's current
 * weighted-average cost for legacy rows that predate the snapshot column.
 */
export const getInventorySalesStats = async (req, res) => {
  const { projectId, id_proyecto: legacyProjectId, desde, hasta, bucket } = req.query
  const id_proyecto = projectId ?? legacyProjectId
  const { id_empresa } = req.empresa
  const accessibleProjectIds = await getAccessibleInventoryProjectIds(req)

  const empty = {
    resumen: {
      ingreso_bruto: 0, costo_ventas: 0, ganancia_bruta: 0,
      gastos_admin: 0, compras: 0, ganancia_neta: 0,
      unidades_vendidas: 0, operaciones_venta: 0, ticket_promedio: 0,
    },
    serie: [],
    top_productos: [],
  }

  if (accessibleProjectIds && !accessibleProjectIds.length) {
    return res.json({ success: true, data: empty })
  }

  if (accessibleProjectIds && id_proyecto && !accessibleProjectIds.includes(Number(id_proyecto))) {
    return res.status(403).json({ success: false, message: 'You do not have access to this project inventory.' })
  }

  // Shared WHERE scope (empresa + optional project + accessible projects + range)
  const filters = ['proj.id_empresa = $1']
  const values = [id_empresa]

  if (accessibleProjectIds) {
    values.push(accessibleProjectIds)
    filters.push(`m.id_proyecto = ANY($${values.length}::int[])`)
  }
  if (id_proyecto) {
    values.push(id_proyecto)
    filters.push(`m.id_proyecto = $${values.length}`)
  }
  if (desde) {
    values.push(desde)
    filters.push(`m.fecha >= $${values.length}::timestamp`)
  }
  if (hasta) {
    values.push(hasta)
    filters.push(`m.fecha <= $${values.length}::timestamp`)
  }

  const where = filters.join(' AND ')
  const truncUnit = BUCKET_TRUNC[bucket] ?? 'day'

  // costo de ventas: snapshot al vender, con fallback al costo actual del producto
  const cogsExpr = 'COALESCE(m.costo_unitario_venta, p.costo_promedio_ponderado, 0)'

  const [resumenRes, serieRes, topRes] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN m.tipo='SALIDA' THEN m.precio_unitario * m.cantidad END), 0)        AS ingreso_bruto,
         COALESCE(SUM(CASE WHEN m.tipo='SALIDA' THEN ${cogsExpr} * m.cantidad END), 0)              AS costo_ventas,
         COALESCE(SUM(CASE WHEN m.tipo='GASTO_ADMIN' THEN m.precio_unitario END), 0)                AS gastos_admin,
         COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.precio_unitario * m.cantidad END), 0)       AS compras,
         COALESCE(SUM(CASE WHEN m.tipo='SALIDA' THEN m.cantidad END), 0)                            AS unidades_vendidas,
         COUNT(DISTINCT CASE WHEN m.tipo='SALIDA'
           THEN date_trunc('second', m.fecha)::text || '#' || m.id_usuario::text END)              AS operaciones_venta
       FROM public.movimiento_inventario m
       JOIN public.proyecto proj ON proj.id_proyecto = m.id_proyecto
       LEFT JOIN public.producto p ON p.id_producto = m.id_producto
       WHERE ${where}`,
      values
    ),
    pool.query(
      `SELECT
         date_trunc('${truncUnit}', m.fecha) AS periodo,
         COALESCE(SUM(CASE WHEN m.tipo='SALIDA' THEN m.precio_unitario * m.cantidad END), 0)                              AS ingreso,
         COALESCE(SUM(CASE WHEN m.tipo='SALIDA' THEN (m.precio_unitario - ${cogsExpr}) * m.cantidad END), 0)              AS ganancia,
         COALESCE(SUM(CASE WHEN m.tipo='GASTO_ADMIN' THEN m.precio_unitario END), 0)
           + COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.precio_unitario * m.cantidad END), 0)                         AS gastos
       FROM public.movimiento_inventario m
       JOIN public.proyecto proj ON proj.id_proyecto = m.id_proyecto
       LEFT JOIN public.producto p ON p.id_producto = m.id_producto
       WHERE ${where}
       GROUP BY periodo
       ORDER BY periodo ASC`,
      values
    ),
    pool.query(
      `SELECT
         m.id_producto,
         p.nombre,
         COALESCE(SUM(m.cantidad), 0)                      AS unidades,
         COALESCE(SUM(m.precio_unitario * m.cantidad), 0)  AS ingreso
       FROM public.movimiento_inventario m
       JOIN public.proyecto proj ON proj.id_proyecto = m.id_proyecto
       JOIN public.producto p ON p.id_producto = m.id_producto
       WHERE ${where} AND m.tipo='SALIDA'
       GROUP BY m.id_producto, p.nombre
       ORDER BY ingreso DESC
       LIMIT 5`,
      values
    ),
  ])

  const r = resumenRes.rows[0]
  const ingresoBruto = Number(r.ingreso_bruto)
  const costoVentas = Number(r.costo_ventas)
  const gastosAdmin = Number(r.gastos_admin)
  const gananciaBruta = ingresoBruto - costoVentas
  const operaciones = Number(r.operaciones_venta)

  const resumen = {
    ingreso_bruto: ingresoBruto,
    costo_ventas: costoVentas,
    ganancia_bruta: gananciaBruta,
    gastos_admin: gastosAdmin,
    compras: Number(r.compras),
    ganancia_neta: gananciaBruta - gastosAdmin,
    unidades_vendidas: Number(r.unidades_vendidas),
    operaciones_venta: operaciones,
    ticket_promedio: operaciones ? ingresoBruto / operaciones : 0,
  }

  const serie = serieRes.rows.map((row) => ({
    periodo: row.periodo,
    ingreso: Number(row.ingreso),
    ganancia: Number(row.ganancia),
    gastos: Number(row.gastos),
  }))

  const top_productos = topRes.rows.map((row) => ({
    id_producto: row.id_producto,
    nombre: row.nombre,
    unidades: Number(row.unidades),
    ingreso: Number(row.ingreso),
  }))

  return res.json({ success: true, data: { resumen, serie, top_productos } })
}
