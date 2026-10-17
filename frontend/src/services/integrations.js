import { apiFetch as requestApi, authHeaders } from './api.js'
export async function listIntegrations(_token, companyId) {
  const res = await requestApi('/api/integrations', { headers: authHeaders({ 'X-Company-ID': companyId }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function getIntegrationConfig(_token, companyId, slug) {
  const res = await requestApi(`/api/integrations/${slug}`, { headers: authHeaders({ 'X-Company-ID': companyId }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function saveIntegrationConfig(_token, companyId, slug, { credentials, config }) {
  const res = await requestApi(`/api/integrations/${slug}`, {
    method: 'PUT',
    headers: authHeaders({ 'X-Company-ID': companyId }),
    body: JSON.stringify({ credentials, config }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function toggleIntegration(_token, companyId, slug, status) {
  const res = await requestApi(`/api/integrations/${slug}/toggle`, {
    method: 'PATCH',
    headers: authHeaders({ 'X-Company-ID': companyId }),
    body: JSON.stringify({ status }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data.data
}

export async function testIntegration(_token, companyId, slug) {
  const res = await requestApi(`/api/integrations/${slug}/test`, {
    method: 'POST',
    headers: authHeaders({ 'X-Company-ID': companyId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function deleteIntegrationConfig(_token, companyId, slug) {
  const res = await requestApi(`/api/integrations/${slug}`, {
    method: 'DELETE',
    headers: authHeaders({ 'X-Company-ID': companyId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `HTTP ${res.status}`)
  }
}
