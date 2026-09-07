// Iteration bodies for C1-C5 / E1-E5 (docs/plan-maestro-pruebas.md §7-§8).
// Shared by load-test.js and stress-test.js so the request logic — the part
// that actually has to match the real API — lives in exactly one place.
import http from 'k6/http'
import { check, sleep } from 'k6'
import { BASE_URL, COMPANY_ID, PROJECT_ID, PASSWORD, pickAccount } from './config.js'
import { loginAs, authHeaders } from './auth.js'

// Provisions the one product C5/E5 needs before either can run. Uses the
// first seeded account (all 6 have company role "manager", so any of them
// can create it) — call once from setup().
export function provisionSaleProduct(tagPrefix) {
  const token = loginAs('participante1@kontrol-test.dev')
  const codigoBarras = `${tagPrefix}-${Date.now()}`

  const res = http.post(
    `${BASE_URL}/api/products`,
    JSON.stringify({
      nombre: `${tagPrefix} — producto de prueba`,
      precio_venta: 10,
      precio_costo: 5,
      stock_inicial: 1000000,
      codigo_barras: codigoBarras,
    }),
    { headers: authHeaders(token, { companyId: COMPANY_ID, projectId: PROJECT_ID }), tags: { name: 'setup_create_product' } }
  )

  if (res.status !== 201) {
    throw new Error(`setup(): could not create the ${tagPrefix} product: ${res.status} ${res.body}`)
  }

  return { productId: res.json('data.id_producto'), codigoBarras }
}

export function c1LoginScenario() {
  const account = pickAccount(__VU)
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: account, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  )
  check(res, { 'C1: login 200': (r) => r.status === 200 })
  sleep(1)
}

export function c2ProjectsScenario() {
  const token = loginAs(pickAccount(__VU))
  const headers = authHeaders(token, { companyId: COMPANY_ID })

  const list = http.get(`${BASE_URL}/api/projects`, { headers, tags: { name: 'projects_list' } })
  check(list, { 'C2: projects list 200': (r) => r.status === 200 })

  const metrics = http.get(`${BASE_URL}/api/projects/${PROJECT_ID}/metrics`, { headers, tags: { name: 'project_metrics' } })
  check(metrics, { 'C2: project metrics 200': (r) => r.status === 200 })

  sleep(1)
}

export function c3ProgressScenario() {
  const token = loginAs(pickAccount(__VU))
  const headers = authHeaders(token, { companyId: COMPANY_ID })

  const res = http.post(
    `${BASE_URL}/api/projects/${PROJECT_ID}/progress`,
    JSON.stringify({
      title: `k6 — avance (VU ${__VU}, iter ${__ITER})`,
      details: 'Generado por la prueba automatizada C3/E3.',
      updateType: 'UPDATE',
      progressPercentage: Math.floor(Math.random() * 100),
    }),
    { headers, tags: { name: 'progress_create' } }
  )
  check(res, { 'C3: progress entry 201': (r) => r.status === 201 })

  sleep(1)
}

export function c4ReportsScenario() {
  const token = loginAs(pickAccount(__VU))
  const headers = authHeaders(token, { companyId: COMPANY_ID })

  const start = Date.now()

  const list = http.get(`${BASE_URL}/api/reports`, { headers, tags: { name: 'reports_list' } })
  check(list, { 'C4: reports list 200': (r) => r.status === 200 })

  const exported = http.post(
    `${BASE_URL}/api/reports/exports`,
    JSON.stringify({ titulo: `k6 — export (VU ${__VU}, iter ${__ITER})`, tipo: 'CONSOLIDADO', id_proyecto: Number(PROJECT_ID) }),
    { headers, tags: { name: 'reports_export' } }
  )
  check(exported, { 'C4: report export 201': (r) => r.status === 201 })

  // Paces each VU to roughly one export every 10s, per §7.1. Under stress
  // (E4) this can go negative-then-clamped-to-0 once latency exceeds 10s,
  // which is fine — at that point the scenario is already past its
  // degradation point and the stop condition in §8.2 takes over.
  const elapsedSeconds = (Date.now() - start) / 1000
  sleep(Math.max(0, 10 - elapsedSeconds))
}

export function c5PosSaleScenario(data) {
  const token = loginAs(pickAccount(__VU))
  const headers = authHeaders(token, { companyId: COMPANY_ID, projectId: PROJECT_ID })

  const search = http.get(`${BASE_URL}/api/products?projectId=${PROJECT_ID}`, { headers, tags: { name: 'product_search' } })
  check(search, { 'C5: product search 200': (r) => r.status === 200 })

  const sale = http.post(
    `${BASE_URL}/api/inventory-movements/sale`,
    JSON.stringify({
      motivo: 'k6 — venta',
      items: [{ id_producto: data.productId, id_proyecto: Number(PROJECT_ID), cantidad: 1, precio_unitario: 10 }],
    }),
    { headers, tags: { name: 'pos_sale' } }
  )
  check(sale, { 'C5: sale 201': (r) => r.status === 201 })

  sleep(1)
}
