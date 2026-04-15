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

