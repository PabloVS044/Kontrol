// Volume scenarios V1-V5 (Sprint 8, docs/pruebas-volumen.md). Unlike
// load-test.js, concurrency stays at a normal 5 VUs: what changes between
// runs is the amount of data, populated by volume/populate.sh. Run it once per
// volume level, right after volume/measure.sh, and keep each summary.
//
//   k6 run -e VOLUME_PROJECT_ID=<id> --summary-export=volume/results/N1/k6.json k6/volume-test.js
//
// VOLUME_PROJECT_ID is the hot project, "VOL Proyecto 1"; measure.sh prints
// it. Thresholds are the §7.2 ones of the matching load scenario, so a
// crossed threshold marks the level at which volume alone degrades the flow.
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'
import { BASE_URL, COMPANY_ID, pickAccount } from './lib/config.js'
import { loginAs, authHeaders } from './lib/auth.js'

const PROJECT_ID = __ENV.VOLUME_PROJECT_ID
if (!PROJECT_ID) {
  throw new Error('VOLUME_PROJECT_ID is required: the id of "VOL Proyecto 1", printed by volume/measure.sh.')
}

// Bytes the browser has to download and parse, per endpoint.
const bodySize = new Trend('response_kb')
// 429s from the DT-13 limiter, counted apart so a throttled run is not read
// as a volume failure (N3 of the first run lost 17% of /metrics this way).
const rateLimited = new Counter('rate_limited')

const VUS = Number(__ENV.VOLUME_VUS || 5)
const STEP = __ENV.VOLUME_STEP_DURATION || '2m'
const stepMinutes = parseInt(STEP, 10)

const ENDPOINTS = [
  // name, path, p95 threshold (ms) from docs/plan-maestro-pruebas.md §7.2,
  // pause between requests (s)
  ['v1_projects_list',   '/api/projects',                          500, 1],
  // /metrics sits behind RATE_LIMIT_EXPENSIVE_MAX (60/min per user), and
  // pickAccount(__VU) can land two VUs of one scenario on the same account:
  // at 1 s that pair makes ~96 req/min and gets throttled. 2 s keeps it under.
  ['v2_project_metrics', `/api/projects/${PROJECT_ID}/metrics`,    500, 2],
  ['v3_reports_list',    '/api/reports',                           500, 1],
  ['v4_reports_summary', '/api/reports/summary',                   500, 1],
  ['v5_pos_products',    `/api/products?projectId=${PROJECT_ID}`,  800, 1],
]

export const options = {
  scenarios: Object.fromEntries(ENDPOINTS.map(([name], i) => [name, {
    executor: 'constant-vus',
    exec: 'hit',
    vus: VUS,
    duration: STEP,
    startTime: `${i * stepMinutes}m`,
    env: { ENDPOINT: String(i) },
  }])),
  thresholds: Object.fromEntries(ENDPOINTS.flatMap(([name, , p95]) => [
    [`http_req_duration{scenario:${name}}`, [`p(95)<${p95}`]],
    [`http_req_failed{scenario:${name}}`, ['rate<0.01']],
    [`response_kb{scenario:${name}}`, ['avg>=0']],
  ])),
}

export function hit() {
  const [name, path, , pause] = ENDPOINTS[Number(__ENV.ENDPOINT)]
  const token = loginAs(pickAccount(__VU))
  const res = http.get(`${BASE_URL}${path}`, {
    headers: authHeaders(token, { companyId: COMPANY_ID, projectId: PROJECT_ID }),
    tags: { name },
    timeout: '60s',
  })
  check(res, { [`${name}: 200`]: (r) => r.status === 200 })
  if (res.status === 429) rateLimited.add(1)
  bodySize.add((res.body?.length ?? 0) / 1024)
  sleep(pause)
}
