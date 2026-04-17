import pool from "../db/pool.js";

export const getProyectsMetrics = async (req, res) => {
    try {
        const { id } = req.params

        const existing = await pool.query(`
            SELECT * FROM proyecto WHERE id_proyecto = $1
            `, [id])

        if (!existing.rows.length) {
            return res.status(404).json({ success: false, message: "proyecto no encontrado" })
        }

        const [tareas, presupuesto, movimientos, equipo] = await Promise.all([
            pool.query(`
                SELECT estado, COUNT(*) FROM tarea
                WHERE id_proyecto = $1 GROUP BY estado
                `, [id]),
            pool.query(`
                SELECT 
                SUM(monto_planificado) AS total_planificado,
                SUM(monto_real) AS total_real
                FROM presupuesto_actividad WHERE id_proyecto = $1
                `, [id]),
            pool.query(`
                SELECT tipo, COUNT(*), SUM(precio_unitario * cantidad) AS total
                FROM movimiento_inventario WHERE id_proyecto = $1
                GROUP BY tipo
                `, [id]),
            pool.query(`
                SELECT rp.nombre AS rol, COUNT(*) AS total
                FROM proyecto_usuario pu
                JOIN rol_proyecto rp ON rp.id_rol_proyecto = pu.id_rol_proyecto
                WHERE pu.id_proyecto = $1
                GROUP BY rp.nombre
                `, [id])
        ])

        return res.status(200).json({
            success: true,
            data: {
                tareas: tareas.rows,
                presupuesto: presupuesto.rows[0],
                movimientos: movimientos.rows,
                equipo: equipo.rows[0]
            }
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ success: false, message: "Error del servidor" })
    }
}