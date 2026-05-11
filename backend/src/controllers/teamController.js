import pool from '../config/database.js';
import { teamSchema } from '../schemas/teamSchema.js';

export const createTeam = async (req, res) => {
  const client = await pool.connect(); 
  try {
    const { nombre, descripcion, id_lider } = teamSchema.parse(req.body);
    const id_empresa = req.headers['x-company-id'];

    await client.query('BEGIN');

    // Crear el equipo
    const teamRes = await client.query(
      'INSERT INTO equipo (nombre, descripcion, id_empresa, id_lider) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, descripcion, id_empresa, id_lider]
    );
    const newTeam = teamRes.rows[0];

    // Agregar al líder como miembro también
    await client.query(
      'INSERT INTO equipo_usuario (id_equipo, id_usuario) VALUES ($1, $2)',
      [newTeam.id_equipo, id_lider]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: newTeam });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};