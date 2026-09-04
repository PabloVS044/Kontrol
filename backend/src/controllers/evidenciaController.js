import pool from '../db/pool.js'
import { UTApi } from 'uploadthing/server'

const utapi = new UTApi()

const EVIDENCIA_SELECT = `
  e.id_evidencia, e.descripcion, e.url_archivo, e.tipo_archivo,
  e.timestamp_captura, e.id_tarea, e.id_usuario, e.id_progress_entry,
  u.nombre AS autor_nombre, u.apellido AS autor_apellido
`

// GET /api/projects/:projectId/tasks/:id/evidence
export const getTaskEvidence = async (req, res) => {
  const { id: id_tarea } = req.params

  const result = await pool.query(
    `SELECT ${EVIDENCIA_SELECT}
     FROM public.evidencia e
     JOIN public.usuario u ON u.id_usuario = e.id_usuario
     WHERE e.id_tarea = $1
     ORDER BY e.timestamp_captura DESC`,
    [id_tarea]
  )

  return res.json({ success: true, data: result.rows })
}

// DELETE /api/projects/:projectId/tasks/:id/evidence/:evidenceId
export const deleteTaskEvidence = async (req, res) => {
  const { id: id_tarea, evidenceId } = req.params

  const existing = await pool.query(
    'SELECT id_evidencia, public_id FROM public.evidencia WHERE id_evidencia = $1 AND id_tarea = $2',
    [evidenceId, id_tarea]
  )

  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Evidence not found.' })
  }

  await pool.query('DELETE FROM public.evidencia WHERE id_evidencia = $1', [evidenceId])

  const publicId = existing.rows[0].public_id
  if (publicId) {
    try {
      await utapi.deleteFiles(publicId)
    } catch (error) {
      console.error('Could not delete evidence file from UploadThing:', error)
    }
  }

  return res.json({ success: true })
}
