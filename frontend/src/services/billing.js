import { apiFetch as requestApi } from './api.js'

// PAY-1 — Suscripción de la empresa activa. Todo en modo de prueba: el
// backend solo acepta claves de prueba de la pasarela y no cobra nada real.
// El pago ocurre en la página hospedada del proveedor; aquí no se toca ningún
// dato de tarjeta.

async function readJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.errors?.[0]?.message || data.message || `HTTP ${res.status}`)
    error.status = res.status
    error.code = data.code
    throw error
  }
  return data
}

export async function getPlans() {
  const res = await requestApi('/api/billing/plans', { auth: false })
  return (await readJson(res)).data
}

export async function getSubscription() {
  const res = await requestApi('/api/billing/subscription')
  return (await readJson(res)).data
}

/** Devuelve la URL del Checkout hospedado; el llamador redirige. */
export async function startCheckout({ plan, interval }) {
  const res = await requestApi('/api/billing/checkout', {
    method: 'POST',
    json: true,
    body: JSON.stringify({ plan, interval }),
  })
  return (await readJson(res)).data.url
}

export async function changePlan({ plan, interval }) {
  const res = await requestApi('/api/billing/subscription/change', {
    method: 'POST',
    json: true,
    body: JSON.stringify({ plan, interval }),
  })
  return (await readJson(res)).data
}

/** Devuelve la URL del portal hospedado del proveedor (tarjeta y cancelación). */
export async function openPortal() {
  const res = await requestApi('/api/billing/portal', { method: 'POST' })
  return (await readJson(res)).data.url
}
