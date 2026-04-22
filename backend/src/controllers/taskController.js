import pool from '../db/pool.js'


const TAREA_SELECT = `
    id_tarea, 
    nombre, 
    descripcion, 
    estado, 
    prioridad, 
    fecha_vencimiento, 
    id_proyecto
`

// GET /api/projects/:projectId/tasks
export const getTasks = async (req, res) => {
    const { projectId: id_proyecto } = req.params

    const result = await pool.query(
        `SELECT t.id_tarea, t.nombre, t.descripcion, t.estado, t.prioridad, t.fecha_vencimiento, t.id_proyecto,
            a.id_usuario AS asignado_id
            FROM public.tarea t
            LEFT JOIN public.asignacion a ON a.id_tarea = t.id_tarea AND a.id_proyecto = t.id_proyecto
            WHERE t.id_proyecto = $1
            ORDER BY t.id_tarea`,
        [id_proyecto]
    )
    
    return res.json({ success: true, data: result.rows })
}

// GET /api/projects/:projectId/tasks/:id
export const getTaskById = async (req, res) => {
    const { projectId: id_proyecto, id } = req.params

        const result = await pool.query(
        `SELECT t.id_tarea, t.nombre, t.descripcion, t.estado, t.prioridad, t.fecha_vencimiento, t.id_proyecto,
            u.id_usuario AS asignado_id,
            u.nombre    AS asignado_nombre,
            u.apellido  AS asignado_apellido
            FROM public.tarea t
            LEFT JOIN public.asignacion a ON a.id_tarea = t.id_tarea AND a.id_proyecto = t.id_proyecto
            LEFT JOIN public.usuario u ON u.id_usuario = a.id_usuario
            WHERE t.id_tarea = $1 AND t.id_proyecto = $2`,
            [id, id_proyecto]
        )


    if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Task not found.' })
    }

    return res.json({ success: true, data: result.rows[0] })
}

// POST /api/projects/:projectId/tasks
export const createTask = async (req, res) => {
    const { projectId: id_proyecto } = req.params
    const { nombre, descripcion, estado, prioridad, fecha_vencimiento, id_asignado } = req.body

    const result = await pool.query(
        `INSERT INTO public.tarea (nombre, descripcion, estado, prioridad, fecha_vencimiento, id_proyecto)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${TAREA_SELECT}`,
        [
        nombre,
        descripcion ?? null,
        estado ?? 'PENDIENTE',
        prioridad ?? 'MEDIA',
        fecha_vencimiento ?? null,
        id_proyecto,
        ]
    )

    const tarea = result.rows[0]

    if (id_asignado) {
        try {
            await pool.query(
                `INSERT INTO public.asignacion (id_tarea, id_usuario, id_proyecto)
                VALUES ($1, $2, $3)`,
                [tarea.id_tarea, id_asignado, id_proyecto]
            )
        } catch (err) {
            if (err.code === '23503') {
                return res.status(400).json({ success: false, message: 'The user is not a member of the project.' })
            }
            throw err
        }
    }

    return res.status(201).json({ success: true, data: result.rows[0] })
}


// PUT /api/projects/:projectId/tasks/:id
export const updateTask = async (req, res) => {
    const { projectId: id_proyecto, id } = req.params
    const { nombre, descripcion, estado, prioridad, fecha_vencimiento, id_asignado } = req.body

    const existing = await pool.query(
        'SELECT id_tarea FROM public.tarea WHERE id_tarea = $1 AND id_proyecto = $2',
        [id, id_proyecto]
    )
    if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Task not found.' })
    }

    const setClauses = []
    const values = []

    if (nombre !== undefined)            { values.push(nombre);            setClauses.push(`nombre = $${values.length}`) }
    if (descripcion !== undefined)       { values.push(descripcion);       setClauses.push(`descripcion = $${values.length}`) }
    if (estado !== undefined)            { values.push(estado);            setClauses.push(`estado = $${values.length}`) }
    if (prioridad !== undefined)         { values.push(prioridad);         setClauses.push(`prioridad = $${values.length}`) }
    if (fecha_vencimiento !== undefined) { values.push(fecha_vencimiento); setClauses.push(`fecha_vencimiento = $${values.length}`) }

    values.push(id)
    if (setClauses.length > 0) {
        await pool.query(
            `UPDATE public.tarea SET ${setClauses.join(', ')} WHERE id_tarea = $${values.length}
            RETURNING ${TAREA_SELECT}`,
            values
        )
    }

    if (id_asignado !== undefined) {
    try {
        await pool.query(
            `DELETE FROM public.asignacion WHERE id_tarea = $1`,
            [id]
        )
        if (id_asignado) {
            await pool.query(
                `INSERT INTO public.asignacion (id_tarea, id_usuario, id_proyecto)
                VALUES ($1, $2, $3)`,
                [id, id_asignado, id_proyecto]
            )
        }
    } catch (err) {
        if (err.code === '23503') {
            return res.status(400).json({ success: false, message: 'The user is not a member of the project.' })
        }
        throw err
    }
}


    const updated = await pool.query(
        `SELECT ${TAREA_SELECT} FROM public.tarea WHERE id_tarea = $1`,
        [id]
    )

    return res.json({ success: true, data: updated.rows[0] })
}

// PATCH /api/projects/:projectId/tasks/:id/close
export const closeTask = async (req, res) => {
    const { projectId: id_proyecto, id } = req.params

    const existing = await pool.query(
        'SELECT id_tarea, estado FROM public.tarea WHERE id_tarea = $1 AND id_proyecto = $2',
        [id, id_proyecto]
    )

    if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Task not found.' })
    }

    if (existing.rows[0].estado === 'COMPLETADA') {
        return res.status(400).json({ success: false, message: 'The task is already completed.' })
    }

    const result = await pool.query(
        `UPDATE public.tarea SET estado = 'COMPLETADA' WHERE id_tarea = $1 RETURNING ${TAREA_SELECT}`,
        [id]
    )

    return res.json({ success: true, data: result.rows[0] })
}
