function headers(token, companyId) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Company-ID': companyId,
  }
}

export async function listIntegrations(token, companyId) {
  const res = await fetch('/api/integrations', { headers: headers(token, companyId) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function getIntegrationConfig(token, companyId, slug) {
  const res = await fetch(`/api/integrations/${slug}`, { headers: headers(token, companyId) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function saveIntegrationConfig(token, companyId, slug, { credentials, config }) {
  const res = await fetch(`/api/integrations/${slug}`, {
    method: 'PUT',
    headers: headers(token, companyId),
    body: JSON.stringify({ credentials, config }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function toggleIntegration(token, companyId, slug, status) {
  const res = await fetch(`/api/integrations/${slug}/toggle`, {
    method: 'PATCH',
    headers: headers(token, companyId),
    body: JSON.stringify({ status }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function testIntegration(token, companyId, slug) {
  const res = await fetch(`/api/integrations/${slug}/test`, {
    method: 'POST',
    headers: headers(token, companyId),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function deleteIntegrationConfig(token, companyId, slug) {
  const res = await fetch(`/api/integrations/${slug}`, {
    method: 'DELETE',
    headers: headers(token, companyId),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `HTTP ${res.status}`)
  }
}
