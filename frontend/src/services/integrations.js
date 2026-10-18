import { apiFetch as requestApi } from './api.js'
export async function listIntegrations(token, companyId) {
  const res = await requestApi('/api/integrations', { token, companyId })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function getIntegrationConfig(token, companyId, slug) {
  const res = await requestApi(`/api/integrations/${slug}`, { token, companyId })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function saveIntegrationConfig(token, companyId, slug, { credentials, config }) {
  const res = await requestApi(`/api/integrations/${slug}`, {
    method: 'PUT',
    token,
    companyId,
    body: JSON.stringify({ credentials, config }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function toggleIntegration(token, companyId, slug, status) {
  const res = await requestApi(`/api/integrations/${slug}/toggle`, {
    method: 'PATCH',
    token,
    companyId,
    body: JSON.stringify({ status }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function testIntegration(token, companyId, slug) {
  const res = await requestApi(`/api/integrations/${slug}/test`, {
    method: 'POST',
    token,
    companyId,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function deleteIntegrationConfig(token, companyId, slug) {
  const res = await requestApi(`/api/integrations/${slug}`, {
    method: 'DELETE',
    token,
    companyId,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `HTTP ${res.status}`)
  }
}
