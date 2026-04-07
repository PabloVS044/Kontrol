import pool from '../db/pool.js'

const VALID_ESTADOS = ['activo', 'completado', 'pausado', 'cancelado']

const PROJECT_SELECT = `
  p.id_proyecto,
  p.nombre,
  p.descripcion,
  p.fecha_inicio,
  p.fecha_fin,
  p.estado,
  p.id_empresa,
  p.id_usuario_creador,
  p.activo
`

// GET /api/projects
export const getProjects = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
  const offset = (page - 1) * limit

  const filters = []
  const values = []

  if (req.query.estado) {
    if (!VALID_ESTADOS.includes(req.query.estado)) {
      return res.status(400).json({ success: false, message: `estado inválido. Valores: ${VALID_ESTADOS.join(', ')}.` })
    }
    values.push(req.query.estado)
    filters.push(`p.estado = $${values.length}`)
  }

  if (req.query.activo !== undefined) {
    values.push(req.query.activo !== 'false')
    filters.push(`p.activo = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM public.proyecto p ${where}`, values),
    pool.query(
      `SELECT ${PROJECT_SELECT} FROM public.proyecto p ${where}
       ORDER BY p.id_proyecto LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
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
    `SELECT ${PROJECT_SELECT} FROM public.proyecto p WHERE p.id_proyecto = $1`,
    [req.params.id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }

  return res.json({ success: true, data: result.rows[0] })
}

// POST /api/projects
export const createProject = async (req, res) => {
  const { nombre, descripcion, fecha_inicio, fecha_fin, estado, id_empresa } = req.body

  if (!nombre) {
    return res.status(400).json({ success: false, message: 'nombre es requerido.' })
  }

  if (estado && !VALID_ESTADOS.includes(estado)) {
    return res.status(400).json({ success: false, message: `estado inválido. Valores: ${VALID_ESTADOS.join(', ')}.` })
  }

  const result = await pool.query(
    `INSERT INTO public.proyecto (nombre, descripcion, fecha_inicio, fecha_fin, estado, id_empresa, id_usuario_creador)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${PROJECT_SELECT.replace(/p\./g, '')}`,
    [
      nombre,
      descripcion || null,
      fecha_inicio || null,
      fecha_fin || null,
      estado || 'activo',
      id_empresa || null,
      req.user.id_usuario,
    ]
  )

  return res.status(201).json({ success: true, data: result.rows[0] })
}

// PUT /api/projects/:id
export const updateProject = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion, fecha_inicio, fecha_fin, estado, id_empresa } = req.body

  if (estado && !VALID_ESTADOS.includes(estado)) {
    return res.status(400).json({ success: false, message: `estado inválido. Valores: ${VALID_ESTADOS.join(', ')}.` })
  }

  const existing = await pool.query('SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1', [id])
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }

  const setClauses = []
  const values = []

  if (nombre !== undefined)      { values.push(nombre);      setClauses.push(`nombre = $${values.length}`) }
  if (descripcion !== undefined) { values.push(descripcion); setClauses.push(`descripcion = $${values.length}`) }
  if (fecha_inicio !== undefined){ values.push(fecha_inicio);setClauses.push(`fecha_inicio = $${values.length}`) }
  if (fecha_fin !== undefined)   { values.push(fecha_fin);   setClauses.push(`fecha_fin = $${values.length}`) }
  if (estado !== undefined)      { values.push(estado);      setClauses.push(`estado = $${values.length}`) }
  if (id_empresa !== undefined)  { values.push(id_empresa);  setClauses.push(`id_empresa = $${values.length}`) }

  if (!setClauses.length) {
    return res.status(400).json({ success: false, message: 'No se proporcionaron campos para actualizar.' })
  }

  values.push(id)
  const result = await pool.query(
    `UPDATE public.proyecto SET ${setClauses.join(', ')} WHERE id_proyecto = $${values.length}
     RETURNING ${PROJECT_SELECT.replace(/p\./g, '')}`,
    values
  )

  return res.json({ success: true, data: result.rows[0] })
}

// DELETE /api/projects/:id - soft delete
export const deleteProject = async (req, res) => {
  const result = await pool.query(
    'UPDATE public.proyecto SET activo = false WHERE id_proyecto = $1 RETURNING id_proyecto',
    [req.params.id]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' })
  }

  return res.json({ success: true, message: 'Proyecto desactivado correctamente.' })
}
