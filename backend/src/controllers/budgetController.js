import pool from '../db/pool.js';
import { expenseSchema } from '../schemas/budgetSchema.js';

export const registerExpense = async (req, res) => {
  try {
    // Validar datos con Zod
    const validatedData = expenseSchema.parse(req.body);
    const { id_proyecto, nombre_actividad, monto_gasto } = validatedData;

    // Insertar o actualizar el gasto en la actividad
    await pool.query(
      `INSERT INTO presupuesto_actividad (id_proyecto, nombre, monto_planificado, monto_real)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (id_actividad) DO UPDATE SET monto_real = presupuesto_actividad.monto_real + $3`,
      [id_proyecto, nombre_actividad, monto_gasto]
    );

    // Obtener Presupuesto Total del Proyecto y Suma de Gastos Reales
    const projectInfo = await pool.query(
      `SELECT presupuesto_total FROM proyecto WHERE id_proyecto = $1`,
      [id_proyecto]
    );

    const totalSpentInfo = await pool.query(
      `SELECT SUM(monto_real) as total_acumulado FROM presupuesto_actividad WHERE id_proyecto = $1`,
      [id_proyecto]
    );

    const presupuestoTotal = parseFloat(projectInfo.rows[0].presupuesto_total);
    const totalAcumulado = parseFloat(totalSpentInfo.rows[0].total_acumulado) || 0;

    // Lógica de Alertas
    let alerta = null;
    const porcentajeUso = (totalAcumulado / presupuestoTotal);

    if (totalAcumulado >= presupuestoTotal) {
      alerta = "CRÍTICO: Se ha alcanzado o superado el presupuesto total del proyecto.";
    } else if (porcentajeUso >= 0.8) {
      alerta = "ADVERTENCIA: Se ha utilizado más del 80% del presupuesto disponible.";
    }

    res.status(200).json({
      success: true,
      data: {
        total_proyecto: presupuestoTotal,
        gasto_actual: totalAcumulado,
        disponible: presupuestoTotal - totalAcumulado,
        alerta
      }
    });

  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: "Error al procesar el gasto" });
  }
};