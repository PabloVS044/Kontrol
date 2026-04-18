import pool from '../db/pool.js'
import {
  DEFAULT_PROJECT_PERMISSION_NAMES,
  getAccessibleProjectAssignments,
  hasEmpresaManagementAccess,
} from '../services/projectAccessService.js'

const PROJECT_SELECT = `
  id_proyecto, nombre, descripcion, fecha_inicio, fecha_fin_planificada,
  presupuesto_total, estado, id_empresa, id_encargado
`

const buildProjectPermissionMap = (assignments) =>
  new Map(assignments.map((assignment) => [assignment.id_proyecto, assignment.permisos]))

export const getProjects = async (req, res) => {
  const { page, limit, estado } = req.query
  const { id_empresa, rol_empresa } = req.empresa
  const offset = (page - 1) * limit
  const managementAccess = hasEmpresaManagementAccess(rol_empresa)

  if (!managementAccess) {
    const assignments = await getAccessibleProjectAssignments({
      client: pool,
      id_empresa,
      id_usuario: req.user.id_usuario,
      rol_empresa,
    })

    const accessibleProjectIds = assignments.map(({ id_proyecto }) => id_proyecto)
    if (!accessibleProjectIds.length) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    const filters = ['id_empresa = $1', `id_proyecto = ANY($2::int[])`]
    const values = [id_empresa, accessibleProjectIds]

    if (estado) {
      values.push(estado)
      filters.push(`estado = $${values.length}`)
    }

    const where = `WHERE ${filters.join(' AND ')}`
    const permissionMap = buildProjectPermissionMap(assignments)

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM public.proyecto ${where}`, values),
      pool.query(
        `SELECT ${PROJECT_SELECT} FROM public.proyecto ${where}
         ORDER BY id_proyecto LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      ),
    ])

    return res.json({
      success: true,
      data: dataResult.rows.map((project) => ({
        ...project,
        mis_permisos: permissionMap.get(project.id_proyecto) ?? [],
      })),
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    })
  }

  const filters = ['id_empresa = $1']
  const values = [id_empresa]

  if (estado) {
    values.push(estado)
    filters.push(`estado = $${values.length}`)
  }

  const where = `WHERE ${filters.join(' AND ')}`

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM public.proyecto ${where}`, values),
    pool.query(
      `SELECT ${PROJECT_SELECT} FROM public.proyecto ${where}
       ORDER BY id_proyecto LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
  ])

  return res.json({
    success: true,
    data: dataResult.rows.map((project) => ({
      ...project,
      mis_permisos: [...DEFAULT_PROJECT_PERMISSION_NAMES],
    })),
    pagination: { page, limit, total: parseInt(countResult.rows[0].count), totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit) },
  })
}

export const getProjectById = async (req, res) => {
  const { id_empresa, rol_empresa } = req.empresa

  if (!hasEmpresaManagementAccess(rol_empresa)) {
    const assignments = await getAccessibleProjectAssignments({
      client: pool,
      id_empresa,
      id_usuario: req.user.id_usuario,
      rol_empresa,
    })

    const assignment = assignments.find(({ id_proyecto }) => id_proyecto === Number(req.params.id))
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
    }

    const result = await pool.query(
      `SELECT ${PROJECT_SELECT} FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2`,
      [req.params.id, id_empresa]
    )
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })

    return res.json({
      success: true,
      data: {
        ...result.rows[0],
        mis_permisos: assignment.permisos,
      },
    })
  }

  const result = await pool.query(
    `SELECT ${PROJECT_SELECT} FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2`,
    [req.params.id, id_empresa]
  )
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  return res.json({
    success: true,
    data: {
      ...result.rows[0],
      mis_permisos: [...DEFAULT_PROJECT_PERMISSION_NAMES],
    },
  })
}

export const createProject = async (req, res) => {
  const { nombre, descripcion, fecha_inicio, fecha_fin_planificada, presupuesto_total, estado } = req.body
  const { id_empresa } = req.empresa
  const id_encargado = req.user.id_usuario

  const result = await pool.query(
    `INSERT INTO public.proyecto
       (nombre, descripcion, fecha_inicio, fecha_fin_planificada, presupuesto_total, estado, id_empresa, id_encargado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${PROJECT_SELECT}`,
    [nombre, descripcion ?? null, fecha_inicio, fecha_fin_planificada ?? null, presupuesto_total, estado ?? 'PLANIFICADO', id_empresa, id_encargado]
  )

  return res.status(201).json({ success: true, data: result.rows[0] })
}

export const updateProject = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const existing = await pool.query(
    'SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2',
    [id, id_empresa]
  )
  if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })

  const ALLOWED = ['nombre', 'descripcion', 'fecha_inicio', 'fecha_fin_planificada', 'presupuesto_total', 'estado', 'id_encargado']
  const setClauses = []
  const values = []

  for (const field of ALLOWED) {
    if (req.body[field] !== undefined) {
      values.push(req.body[field])
      setClauses.push(`${field} = $${values.length}`)
    }
  }

  values.push(id)
  const result = await pool.query(
    `UPDATE public.proyecto SET ${setClauses.join(', ')} WHERE id_proyecto = $${values.length} RETURNING ${PROJECT_SELECT}`,
    values
  )

  return res.json({ success: true, data: result.rows[0] })
}

export const deleteProject = async (req, res) => {
  const { id_empresa } = req.empresa
  const result = await pool.query(
    'DELETE FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2 RETURNING id_proyecto',
    [req.params.id, id_empresa]
  )
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  return res.json({ success: true, message: 'Proyecto eliminado correctamente.' })
}

export const getProjectMembers = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const result = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido
      FROM public.proyecto_usuario pu
      JOIN public.usuario u ON u.id_usuario = pu.id_usuario
      WHERE pu.id_proyecto = $1
      ORDER BY u.nombre`,
    [id]
  )

  return res.json({ success: true, data: result.rows })
}
