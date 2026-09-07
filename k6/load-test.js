// Load scenarios C1-C5 from docs/plan-maestro-pruebas.md §7. Run one at a
// time by design (sequential startTime offsets below), never overlapping,
// so any degradation can be attributed to a single endpoint — same
// reasoning as §7.1. Full battery: ~40 min.
//
// Usage: k6 run k6/load-test.js
//   BASE_URL=https://test.34.121.51.151.nip.io (default, the SCRUM-25 env)
//   --summary-export=summary.json  to get a machine-readable result
import {
  c1LoginScenario,
  c2ProjectsScenario,
  c3ProgressScenario,
  c4ReportsScenario,
  c5PosSaleScenario,
  provisionSaleProduct,
} from './lib/scenarios.js'

export const options = {
  scenarios: {
    // C1 — inicio de sesión concurrente. Rampa 0->50 en 1min, sostenido 50, 6min total.
    c1_login: {
      executor: 'ramping-vus',
      exec: 'c1LoginScenario',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 50 },
      ],
      startTime: '0m',
    },
    // C2 — listado de proyectos y métricas. 100 VUs sostenidos, 10min.
    c2_projects_list: {
      executor: 'constant-vus',
      exec: 'c2ProjectsScenario',
      vus: 100,
      duration: '10m',
      startTime: '6m',
    },
    // C3 — registro de avance de proyecto. Rampa 0->30 en 1min, sostenido 30, 6min total.
    c3_progress_write: {
      executor: 'ramping-vus',
      exec: 'c3ProgressScenario',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 },
        { duration: '5m', target: 30 },
      ],
      startTime: '16m',
    },
    // C4 — listado y exportación de reportes, una exportación cada ~10s por usuario. 20 VUs, 10min.
    c4_reports_export: {
      executor: 'constant-vus',
      exec: 'c4ReportsScenario',
      vus: 20,
      duration: '10m',
      startTime: '22m',
    },
    // C5 — flujo de venta con código de barras. 40 VUs sostenidos, 8min.
    c5_pos_sale: {
      executor: 'constant-vus',
      exec: 'c5PosSaleScenario',
      vus: 40,
      duration: '8m',
      startTime: '32m',
    },
  },
  thresholds: {
    // C1 — inicio de sesión: p95 <= 300ms, error < 1%.
    'http_req_duration{scenario:c1_login}': ['p(95)<300'],
    'http_req_failed{scenario:c1_login}': ['rate<0.01'],

    // C2 — lectura: p95 <= 500ms, error < 1%.
    'http_req_duration{scenario:c2_projects_list}': ['p(95)<500'],
    'http_req_failed{scenario:c2_projects_list}': ['rate<0.01'],

    // C3 — escritura: p95 <= 800ms, error < 1%.
    'http_req_duration{scenario:c3_progress_write}': ['p(95)<800'],
    'http_req_failed{scenario:c3_progress_write}': ['rate<0.01'],

    // C4 — listado (lectura, 500ms) y exportación (escritura, 800ms) se miden por separado.
    'http_req_duration{scenario:c4_reports_export,name:reports_list}': ['p(95)<500'],
    'http_req_duration{scenario:c4_reports_export,name:reports_export}': ['p(95)<800'],
    'http_req_failed{scenario:c4_reports_export}': ['rate<0.01'],

    // C5 — escritura: p95 <= 800ms, error < 1%.
    'http_req_duration{scenario:c5_pos_sale}': ['p(95)<800'],
    'http_req_failed{scenario:c5_pos_sale}': ['rate<0.01'],
  },
}

export function setup() {
  return provisionSaleProduct('K6-LOAD')
}

export {
  c1LoginScenario,
  c2ProjectsScenario,
  c3ProgressScenario,
  c4ReportsScenario,
  c5PosSaleScenario,
}
