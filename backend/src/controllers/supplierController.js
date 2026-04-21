import pool from '../db/pool.js'
import {
  getAccessibleProjectIds,
  hasEmpresaManagementAccess,
  INVENTORY_VIEW_PERMISSION_NAMES,
} from '../services/projectAccessService.js'

const PROVEEDOR_SELECT = `
  pr.id_proveedor,
  pr.nombre,
  pr.contacto_nombre,
  pr.telefono,
  pr.email,
  pr.id_empresa
`

/**
 * GET /api/suppliers
 */
export const getSuppliers = async (req, res) => {
  const { id_empresa } = req.empresa

  if (!hasEmpresaManagementAccess(req.empresa.rol_empresa)) {
    const accessibleProjectIds = await getAccessibleProjectIds({
      client: pool,
      id_empresa,
      id_usuario: req.user.id_usuario,
      rol_empresa: req.empresa.rol_empresa,
      requiredPermissions: INVENTORY_VIEW_PERMISSION_NAMES,
    })

    if (!accessibleProjectIds.length) {
      return res.json({ success: true, data: [] })
    }

    const result = await pool.query(
      `SELECT DISTINCT ${PROVEEDOR_SELECT}
       FROM public.proveedor pr
       JOIN public.producto_proveedor pp ON pp.id_proveedor = pr.id_proveedor
       JOIN public.producto p ON p.id_producto = pp.id_producto
       JOIN public.proyecto proj ON proj.id_proyecto = p.id_proyecto
       WHERE pr.id_empresa = $1
         AND proj.id_empresa = $1
         AND p.id_proyecto = ANY($2::int[])
       ORDER BY pr.id_proveedor`,
      [id_empresa, accessibleProjectIds]
    )

    return res.json({ success: true, data: result.rows })
  }

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
 * GET /api/suppliers/:id  — includes linked products
 */
export const getSupplierById = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  if (!hasEmpresaManagementAccess(req.empresa.rol_empresa)) {
    const accessibleProjectIds = await getAccessibleProjectIds({
      client: pool,
      id_empresa,
      id_usuario: req.user.id_usuario,
      rol_empresa: req.empresa.rol_empresa,
      requiredPermissions: INVENTORY_VIEW_PERMISSION_NAMES,
    })

    if (!accessibleProjectIds.length) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' })
    }

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
       LEFT JOIN public.producto p
         ON p.id_producto = pp.id_producto
         AND p.id_proyecto = ANY($3::int[])
       WHERE pr.id_proveedor = $1 AND pr.id_empresa = $2
       GROUP BY pr.id_proveedor`,
      [id, id_empresa, accessibleProjectIds]
    )

    if (!result.rows.length || result.rows[0].productos.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' })
    }

    return res.json({ success: true, data: result.rows[0] })
  }

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
    return res.status(404).json({ success: false, message: 'Supplier not found.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

/**
 * POST /api/suppliers
 */
export const createSupplier = async (req, res) => {
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
 * PUT /api/suppliers/:id
 */
export const updateSupplier = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const existing = await pool.query(
    'SELECT id_proveedor FROM public.proveedor WHERE id_proveedor = $1 AND id_empresa = $2',
    [id, id_empresa]
  )
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Supplier not found.' })
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
 * DELETE /api/suppliers/:id
 */
export const deleteSupplier = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  try {
    const result = await pool.query(
      'DELETE FROM public.proveedor WHERE id_proveedor = $1 AND id_empresa = $2 RETURNING id_proveedor',
      [id, id_empresa]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' })
    }

    return res.json({ success: true, message: 'Supplier deleted successfully.' })
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete the supplier because it has movements or other references.',
      })
    }
    throw err
  }
}
