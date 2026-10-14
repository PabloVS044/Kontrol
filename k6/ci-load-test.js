// Short load profile for the CI pipeline (.github/workflows/ci.yml, job
// "Carga - k6"). Runs on every pull request to main or develop against a
// throwaway backend + Postgres started inside the GitHub Actions runner, so
// it never touches the shared SCRUM-25 environment.
//
// Same scenarios as load-test.js (C1-C5 from docs/plan-maestro-pruebas.md
// §7.1) and the same acceptance thresholds (§7.2), unchanged. What changes
// is the profile: fewer VUs and shorter windows, ~3.5 min in total. This is
// a regression gate — "the API still answers within §7.2 under concurrent
// load" — not a capacity measurement. Capacity on the real VM is measured
// with load-test.js and documented in docs/pruebas-carga-estres.md.
//
// Usage (what CI does):
//   BASE_URL=http://localhost:3000 TEST_HOST_MARKER=localhost:3000 \
//     k6 run --summary-export=k6-summary.json k6/ci-load-test.js
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
    // Sequential, never overlapping — same reasoning as load-test.js: any
    // regression can be attributed to a single endpoint.
    c1_login: {
      executor: 'constant-vus',
      exec: 'c1LoginScenario',
      vus: 5,
      duration: '30s',
      startTime: '0s',
    },
    c2_projects_list: {
      executor: 'constant-vus',
      exec: 'c2ProjectsScenario',
      vus: 10,
      duration: '45s',
      startTime: '30s',
    },
    c3_progress_write: {
      executor: 'constant-vus',
      exec: 'c3ProgressScenario',
      vus: 5,
      duration: '30s',
      startTime: '75s',
    },
    // C4 paces each VU to one export every ~10s, so it gets a longer window
    // to collect a usable sample.
    c4_reports_export: {
      executor: 'constant-vus',
      exec: 'c4ReportsScenario',
      vus: 5,
      duration: '60s',
      startTime: '105s',
    },
    c5_pos_sale: {
      executor: 'constant-vus',
      exec: 'c5PosSaleScenario',
      vus: 5,
      duration: '30s',
      startTime: '165s',
    },
  },
  // §7.2, copied from load-test.js without changes. k6 exits non-zero when
  // any of them is crossed, and that fails the CI job.
  thresholds: {
    'http_req_duration{scenario:c1_login}': ['p(95)<300'],
    'http_req_failed{scenario:c1_login}': ['rate<0.01'],

    'http_req_duration{scenario:c2_projects_list}': ['p(95)<500'],
    'http_req_failed{scenario:c2_projects_list}': ['rate<0.01'],

    'http_req_duration{scenario:c3_progress_write}': ['p(95)<800'],
    'http_req_failed{scenario:c3_progress_write}': ['rate<0.01'],

    'http_req_duration{scenario:c4_reports_export,name:reports_list}': ['p(95)<500'],
    'http_req_duration{scenario:c4_reports_export,name:reports_export}': ['p(95)<800'],
    'http_req_failed{scenario:c4_reports_export}': ['rate<0.01'],

    'http_req_duration{scenario:c5_pos_sale}': ['p(95)<800'],
    'http_req_failed{scenario:c5_pos_sale}': ['rate<0.01'],

    // §7.2, "falsos negativos de autorización": a fast 401/403/404 must not
    // pass as a good latency sample, so every check has to hold too.
    checks: ['rate>0.99'],
  },
}

export function setup() {
  return provisionSaleProduct('K6-CI')
}

export {
  c1LoginScenario,
  c2ProjectsScenario,
  c3ProgressScenario,
  c4ReportsScenario,
  c5PosSaleScenario,
}
