import pool from "../db/pool.js";

const  getReports = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM reporte`)
        return res.status(200).json(result.rows)
    } catch (error) {
        return res.status(500).json({ error: error })
    }
}