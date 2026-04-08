import pool from '../db/pool.js'

const PROJECT_SELECT = `
  id_proyecto, nombre, descripcion, fecha_inicio, fecha_fin_planificada,
  presupuesto_total, estado, id_empresa, id_encargado
`

// GET /api/projects (query validada por Zod)
export const getProjects = async (req, res) => {
  const { page, limit, estado, id_empresa } = req.query
  const offset = (page - 1) * limit

  const filters = []
  const values = []

  if (estado) {
    values.push(estado)
    filters.push(`estado = $${values.length}`)
  }

  if (id_empresa) {
    values.push(id_empresa)
    filters.push(`id_empresa = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM public.proyecto ${where}`, values),
    pool.query(
      `SELECT ${PROJECT_SELECT} FROM public.proyecto ${where}
       ORDER BY id_proyecto LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
  ])

  const total = parseInt(countResult.rows[0].count)
  return res.json({
    success: true,
    data: dataResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// GET /api/projects/:id
export const getProjectById = async (req, res) => {
  const result = await pool.query(
    `SELECT ${PROJECT_SELECT} FROM public.proyecto WHERE id_proyecto = $1`,
    [req.params.id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

// POST /api/projects (body validado por Zod)
export const createProject = async (req, res) => {
  const { nombre, descripcion, fecha_inicio, fecha_fin_planificada, presupuesto_total, estado, id_empresa, id_encargado } = req.body

  const result = await pool.query(
    `INSERT INTO public.proyecto
       (nombre, descripcion, fecha_inicio, fecha_fin_planificada, presupuesto_total, estado, id_empresa, id_encargado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${PROJECT_SELECT}`,
    [
      nombre,
      descripcion ?? null,
      fecha_inicio,
      fecha_fin_planificada ?? null,
      presupuesto_total,
      estado ?? 'PLANIFICADO',
      id_empresa,
      id_encargado,
    ]
  )

  return res.status(201).json({ success: true, data: result.rows[0] })
}

// PUT /api/projects/:id (body validado por Zod)
export const updateProject = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion, fecha_inicio, fecha_fin_planificada, presupuesto_total, estado, id_empresa, id_encargado } = req.body

  const existing = await pool.query('SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1', [id])
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }

  const setClauses = []
  const values = []

  if (nombre !== undefined)               { values.push(nombre);               setClauses.push(`nombre = $${values.length}`) }
  if (descripcion !== undefined)          { values.push(descripcion);          setClauses.push(`descripcion = $${values.length}`) }
  if (fecha_inicio !== undefined)         { values.push(fecha_inicio);         setClauses.push(`fecha_inicio = $${values.length}`) }
  if (fecha_fin_planificada !== undefined){ values.push(fecha_fin_planificada);setClauses.push(`fecha_fin_planificada = $${values.length}`) }
  if (presupuesto_total !== undefined)    { values.push(presupuesto_total);    setClauses.push(`presupuesto_total = $${values.length}`) }
  if (estado !== undefined)               { values.push(estado);               setClauses.push(`estado = $${values.length}`) }
  if (id_empresa !== undefined)           { values.push(id_empresa);           setClauses.push(`id_empresa = $${values.length}`) }
  if (id_encargado !== undefined)         { values.push(id_encargado);         setClauses.push(`id_encargado = $${values.length}`) }

  values.push(id)
  const result = await pool.query(
    `UPDATE public.proyecto SET ${setClauses.join(', ')} WHERE id_proyecto = $${values.length}
     RETURNING ${PROJECT_SELECT}`,
    values
  )

  return res.json({ success: true, data: result.rows[0] })
}

// DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  const result = await pool.query(
    'DELETE FROM public.proyecto WHERE id_proyecto = $1 RETURNING id_proyecto',
    [req.params.id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }

  return res.json({ success: true, message: 'Proyecto eliminado correctamente.' })
}
