import pool from "../db/pool.js";

/**
 * Reports controller.
 * Handles CRUD operations for the reporte table.
 * Expected route prefix: /api/reports
 */

/**
 * GET /api/reports
 * Returns all reports from the database.
 */
export const getReports = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM reporte
            `
        )
        return res.status(200).json({ success: true, data: result.rows })
    } catch (error) {
        return res.status(500).json({ error: error })
    }
}

/**
 * GET /api/reports/:id
 * Params:
 *   id - report ID
 * Returns the requested report or 404 if not found.
 */
export const getReportById = async (req, res) => {
    try {
        const { id } = req.params
        const result = await pool.query(`
                SELECT * FROM reporte WHERE id_reporte = $1
            `, [id])

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: "Report not found" })
        }

        return res.status(200).json({ success: true, data: result.rows[0] })
    } catch (error) {
        return res.status(500).json({ success: false, error: error })
    }
}

/**
 * POST /api/reports
 * Body: { titulo, tipo, contenido_url, id_proyecto, id_usuario }
 * Creates a new report entry.
 */
export const createReport = async (req, res) => {
    try {
        const { titulo, tipo, contenido_url, id_proyecto, id_usuario } = req.body;

        await pool.query(`
            INSERT INTO reporte (titulo, tipo, contenido_url, id_proyecto, id_usuario)
            VALUES ($1, $2, $3, $4, $5)
        `, [titulo, tipo, contenido_url, id_proyecto, id_usuario]);

        return res.status(201).json({ success: true, message: "Report created successfully" });
    } catch (error) {
        console.error('Error creating report:', error); // Log internally
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * PUT /api/reports/:id
 * Params:
 *   id - report ID
 * Body: { titulo, tipo, contenido_url, id_proyecto }
 * Updates an existing report.
 */
export const updateReport = async (req, res) => {
    try {
        const { id } = req.params
        const { titulo, tipo, contenido_url, id_proyecto } = req.body

        const result = await pool.query(`
                UPDATE reporte SET titulo = $1, tipo = $2, 
                contenido_url = $3, id_proyecto = $4
                WHERE id_reporte = $5 RETURNING *
            `, [titulo, tipo, contenido_url, id_proyecto, id])

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: "Report not found" })
        }

        return res.status(200).json({ success: true, data: result.rows[0] })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: "Server error" })
    }
}

/**
 * DELETE /api/reports/:id
 * Params:
 *   id - report ID
 * Deletes the requested report.
 */
export const deleteReport = async (req, res) => {
    try {
        const { id } = req.params

        const existing = await pool.query(`
            SELECT * FROM reporte WHERE id_reporte = $1
            `, [id])

        if (!existing.rows.length) {
            return res.status(404).json({ success: false, message: "Report not found" })
        }

        const result = await pool.query(`
            DELETE FROM reporte WHERE id_reporte = $1
            `, [id])

        return res.status(200).json({ success: true, message: "Report deleted" })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" })
    }
}
