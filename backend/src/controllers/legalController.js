import pool from '../db/pool.js'
import {
  listAcceptances,
  matchesCurrentVersions,
  pendingDocuments,
  recordAcceptances,
} from '../services/legalDocuments.js'

// GET /api/legal/acceptances
// Qué documentos tiene pendientes el usuario: los que nunca aceptó y los que
// cambiaron de forma sustancial desde su última aceptación (L-6).
export const getAcceptanceStatus = async (req, res) => {
  const acceptances = await listAcceptances(pool, req.user.id_usuario)
  return res.json({
    success: true,
    data: { pending: pendingDocuments(acceptances), acceptances },
  })
}

// POST /api/legal/acceptances (validado por Zod)
// Reaceptación tras un cambio sustancial, y primera aceptación de las cuentas
// que se crean con Google, que no pasan por la casilla del formulario.
export const acceptPendingDocuments = async (req, res) => {
  const { id_usuario } = req.user
  const pending = pendingDocuments(await listAcceptances(pool, id_usuario))

  if (!matchesCurrentVersions(pending, req.body.versions)) {
    return res.status(409).json({
      success: false,
      code: 'legal_version_outdated',
      message: 'The legal documents changed. Review the current version and accept it again.',
      required: pending,
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await recordAcceptances(client, { id_usuario, documents: pending, ip: req.ip, origen: 'aviso' })
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }

  return res.status(201).json({ success: true, data: { pending: [], accepted: pending } })
}
