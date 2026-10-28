import { apiFetch } from './api.js'
import { acceptanceVersions } from '../utils/legal.js'

/**
 * Aceptación de los documentos legales en el servidor (L-6).
 */

async function readJson(response) {
  const data = await response.json().catch(() => null)
  if (response.ok && data) return data.data
  const error = new Error(data?.message || `HTTP ${response.status}`)
  error.status = response.status
  error.serverCode = data?.code
  throw error
}

/** `{ pending: [{ document, version }], acceptances: [...] }` del usuario actual. */
export async function fetchLegalStatus() {
  return readJson(await apiFetch('/api/legal/acceptances'))
}

/** Registra la aceptación de lo pendiente con las versiones que se mostraron. */
export async function acceptLegalDocuments() {
  return readJson(
    await apiFetch('/api/legal/acceptances', {
      method: 'POST',
      body: JSON.stringify({ accepted: true, versions: acceptanceVersions() }),
    }),
  )
}
