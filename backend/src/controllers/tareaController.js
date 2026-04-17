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

// GET /api/projects/:id_proyecto/tareas
export const getTareas = async (req, res) => {
    const { id_proyecto } = req.params

    const result = await pool.query(
        `SELECT ${TAREA_SELECT}
            FROM public.tarea
            WHERE id_proyecto = $1
            ORDER BY id_tarea`,
        [id_proyecto]
    )
    
    return res.json({ success: true, data: result.rows })
}

// GET /api/projects/:id_proyecto/tareas/:id
export const getTareaById = async (req, res) => {
    const { id_proyecto, id } = req.params

    const result = await pool.query(
        `SELECT ${TAREA_SELECT} FROM public.tarea WHERE id_tarea = $1 AND id_proyecto = $2`,
        [id, id_proyecto]
    )

    if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada.' })
    }

    return res.json({ success: true, data: result.rows[0] })
}

// POST /api/projects/:id_proyecto/tareas
export const createTarea = async (req, res) => {
    const { id_proyecto } = req.params
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
                return res.status(400).json({ success: false, message: 'El usuario no es miembro del proyecto.' })
            }
            throw err
        }
    }

    return res.status(201).json({ success: true, data: result.rows[0] })
}


// PUT /api/projects/:id_proyecto/tareas/:id
export const updateTarea = async (req, res) => {
    const { id_proyecto, id } = req.params
    const { nombre, descripcion, estado, prioridad, fecha_vencimiento, id_asignado } = req.body

    const existing = await pool.query(
        'SELECT id_tarea FROM public.tarea WHERE id_tarea = $1 AND id_proyecto = $2',
        [id, id_proyecto]
    )
    if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada.' })
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
                `INSERT INTO public.asignacion (id_tarea, id_usuario, id_proyecto)
                VALUES ($1, $2, $3)
                ON CONFLICT (id_tarea, id_usuario) DO NOTHING`,
                [id, id_asignado, id_proyecto]
            )
        } catch (err) {
            if (err.code === '23503') {
                return res.status(400).json({ success: false, message: 'El usuario no es miembro del proyecto.' })
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

// PATCH /api/projects/:id_proyecto/tareas/:id/cerrar
export const cerrarTarea = async (req, res) => {
    const { id_proyecto, id } = req.params

    const existing = await pool.query(
        'SELECT id_tarea, estado FROM public.tarea WHERE id_tarea = $1 AND id_proyecto = $2',
        [id, id_proyecto]
    )

    if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada.' })
    }

    if (existing.rows[0].estado === 'COMPLETADA') {
        return res.status(400).json({ success: false, message: 'La tarea ya está completada.' })
    }

    const result = await pool.query(
        `UPDATE public.tarea SET estado = 'COMPLETADA' WHERE id_tarea = $1 RETURNING ${TAREA_SELECT}`,
        [id]
    )

    return res.json({ success: true, data: result.rows[0] })
}
