function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function request(url, options) {
  const res  = await fetch(url, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error en la solicitud')
  return data
}

export async function fetchAdminStats(token) {
  return request('/api/admin/stats', { headers: authHeaders(token) })
}

export async function fetchAdminUsers(token, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
  ).toString()
  return request(`/api/admin/users${qs ? `?${qs}` : ''}`, { headers: authHeaders(token) })
}

export async function revokeUserToken(token, userId) {
  return request(`/api/admin/users/${userId}/revoke-token`, {
    method: 'POST',
    headers: authHeaders(token),
  })
}

export async function toggleUserActive(token, userId) {
  return request(`/api/admin/users/${userId}/toggle-active`, {
    method: 'PUT',
    headers: authHeaders(token),
  })
}

export async function changeUserRole(token, userId, role) {
  return request(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  })
}
