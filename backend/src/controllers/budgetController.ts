import { Request, Response } from 'express';
import pool from '../db/pool'; // Conexión a Postgres

export const registerExpense = async (req: Request, res: Response) => {
    const { project_id, concept, amount, category, date } = req.body;

    try {
        // Insertando gasto
        await pool.query(
            'INSERT INTO expenses (project_id, concept, amount, category, date) VALUES ($1, $2, $3, $4, $5)', [project_id, concept, amount, category, date]
        );

        // Obteniendo presupuesto total y suma de gastos (acumulados)
        const projectData = await pool.query(
            'SELECT total_budget FROM projects WHERE id = $1', [project_id]
        );

        const expensesData = await pool.query(
            'SELECT SUM(amount) as total_spent FROM expenses WHERE project_id = $1', [project_id]
        );

        const totalBudget = projectData.rows[0].total_budget;
        const totalSpent = parseFloat(expensesData.row[0].total_spent) || 0;

        // Lógica de alertas
        let alert = null;
        if (totalSpent >= totalBudget) {
            alert = "CRITICAL: Budget limit reached!";
        } else if (totalSpent > totalBudget) {
            alert = "CRITICAL: Budget limit exceeded!";
        } else if (totalSpent >= totalBudget * 0.8) {
            alert = "WARNING: You have spent 80% of your budget."
        }

        res.status(201).json({
            message: "Expense registered",
            total_spent: totalSpent,
            remaining: totalBudget - totalSpent,
            alert: alert
        });
    } catch (error) {
        res.status(500).json({ error: "Database error"});
    }
};