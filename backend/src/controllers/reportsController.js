import { success } from "zod";
import pool from "../db/pool.js";

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

export const getReportById = async (req, res) => {
    try {
        const { id } = req.params
        const result = await pool.query(`
                SELECT * FROM reporte WHERE id_reporte = $1
            `, [id])

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: "Reporte no encontrado" })
        }

        return res.status(200).json({ success: true, data: result.rows[0] })
    } catch (error) {
        return res.status(500).json({ success: false, error: error })
    }
}

export const createReport = async (req, res) => {
    try {
        const { titulo, tipo, contenido_url, id_proyecto, id_usuario } = req.body;

        await pool.query(`
            INSERT INTO reporte (titulo, tipo, contenido_url, id_proyecto, id_usuario)
            VALUES ($1, $2, $3, $4, $5)
        `, [titulo, tipo, contenido_url, id_proyecto, id_usuario]);

        return res.status(201).json({ success: true, message: "Reporte creado correctamente" });
    } catch (error) {
        console.error('Error creating report:', error); // Log internally
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

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
            return res.status(404).json({ success: false, message: "Reporte no encontrado" })
        }

        return res.status(200).json({ success: true, data: result.rows[0] })

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: "Error con el servidor" })
    }
}

export const deleteReport = async (req, res) => {
    try {
        const { id } = req.params

        const existing = await pool.query(`
            SELECT * FROM reporte WHERE id_reporte = $1
            `, [id])

        if (!existing.rows.length) {
            return res.status(404).json({ success: false, message: "Reporte no encontrado" })
        }

        const result = await pool.query(`
            DELETE FROM reporte WHERE id_reporte = $1
            `, [id])

        return res.status(200).json({ success: true, message: "Reporte eliminado" })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error del servidor" })
    }
}