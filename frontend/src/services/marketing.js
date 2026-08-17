// HU-28 · Administración interna de publicaciones de marketing.

function headers(token, companyId) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Company-ID': companyId,
  }
}

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
export async function listPublications(token, companyId, filters = {}) {
  const query = new URLSearchParams()
  // Un filtro vacío se omite para no mandar `status=` y que el backend lo rechace.
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value)
  }

  const suffix = query.toString() ? `?${query}` : ''
  const res = await fetch(`/api/marketing/publications${suffix}`, {
    headers: headers(token, companyId),
  })
  const body = await readJson(res)

  return {
    data: body.data ?? [],
    capabilities: body.capabilities ?? { canManageMarketing: false },
  }
}

export async function createPublication(token, companyId, publication) {
  const res = await fetch('/api/marketing/publications', {
    method: 'POST',
    headers: headers(token, companyId),
    body: JSON.stringify(publication),
  })

  return (await readJson(res)).data
}

export async function updatePublication(token, companyId, publicationId, changes) {
  const res = await fetch(`/api/marketing/publications/${publicationId}`, {
    method: 'PUT',
    headers: headers(token, companyId),
    body: JSON.stringify(changes),
  })

  return (await readJson(res)).data
}

export async function deletePublication(token, companyId, publicationId) {
  const res = await fetch(`/api/marketing/publications/${publicationId}`, {
    method: 'DELETE',
    headers: headers(token, companyId),
  })

  await readJson(res)
}

/** Proyectos de la empresa, para poder vincular la publicación. */
export async function listProjectsForPublications(token, companyId) {
  const res = await fetch('/api/projects', { headers: headers(token, companyId) })

  return (await readJson(res)).data ?? []
}
