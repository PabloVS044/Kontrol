import { apiFetch as requestApi, authHeaders } from './api.js'
// HU-28 · Administración interna de publicaciones de marketing.

async function readJson(res) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

/**
 * Lista las publicaciones de la empresa activa.
 * @param {{ status?: string, platform?: string, projectId?: number|string }} filters
 * @returns {Promise<{ data: object[], capabilities: { canManageMarketing: boolean } }>}
 */
export async function listPublications(_token, companyId, filters = {}) {
  const query = new URLSearchParams()
  // Un filtro vacío se omite para no mandar `status=` y que el backend lo rechace.
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value)
  }

  const suffix = query.toString() ? `?${query}` : ''
  const res = await requestApi(`/api/marketing/publications${suffix}`, {
    headers: authHeaders({ 'X-Company-ID': companyId }),
  })
  const body = await readJson(res)

  return {
    data: body.data ?? [],
    capabilities: body.capabilities ?? { canManageMarketing: false },
  }
}

export async function createPublication(_token, companyId, publication) {
  const res = await requestApi('/api/marketing/publications', {
    method: 'POST',
    headers: authHeaders({ 'X-Company-ID': companyId }),
    body: JSON.stringify(publication),
  })

  return (await readJson(res)).data
}

export async function updatePublication(_token, companyId, publicationId, changes) {
  const res = await requestApi(`/api/marketing/publications/${publicationId}`, {
    method: 'PUT',
    headers: authHeaders({ 'X-Company-ID': companyId }),
    body: JSON.stringify(changes),
  })

  return (await readJson(res)).data
}

export async function deletePublication(_token, companyId, publicationId) {
  const res = await requestApi(`/api/marketing/publications/${publicationId}`, {
    method: 'DELETE',
    headers: authHeaders({ 'X-Company-ID': companyId }),
  })

  await readJson(res)
}

/** Proyectos de la empresa, para poder vincular la publicación. */
export async function listProjectsForPublications(_token, companyId) {
  const res = await requestApi('/api/projects', { headers: authHeaders({ 'X-Company-ID': companyId }) })

  return (await readJson(res)).data ?? []
}
