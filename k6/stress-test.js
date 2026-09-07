// Stress scenarios E1-E5 from docs/plan-maestro-pruebas.md §8. Each E-n
// stresses the same endpoint as its C-n load counterpart in load-test.js,
// starting from that scenario's max VUs and stepping up 25% every 2 minutes
// (§8.1) until a stop condition in §8.2 fires or the 500-VU safety ceiling
// is reached.
//
// Run ONE scenario per invocation — never several stress scenarios at once,
// same reasoning as §7.1/§8: a failure in one must not be attributable to
// noise from another.
//
// Usage: k6 run -e SCENARIO=e2 k6/stress-test.js
//   SCENARIO: e1 | e2 | e3 | e4 | e5 (required, no default on purpose)
//   BASE_URL=https://test.34.121.51.151.nip.io (default, the SCRUM-25 env)
//
// k6's abortOnFail thresholds are the closest built-in mechanism to "stop
// once the error rate or p95 breaches X, sustained ~30s" (§8.2, points 1-2):
// delayAbortEval postpones the first abort check so an initial ramp isn't
// mistaken for sustained degradation, but it is a periodic re-check, not a
// literal 30s-sustained window — documented here so the approximation is
// explicit, not silent. Point 3 of §8.2 (backend health check stops
// responding) is covered indirectly: a dead backend fails every request,
// which trips the error-rate threshold anyway. Point 4 (500 VU ceiling) is
// enforced by capping the generated stages below.
import { provisionSaleProduct } from './lib/scenarios.js'
import {
  c1LoginScenario,
  c2ProjectsScenario,
  c3ProgressScenario,
  c4ReportsScenario,
  c5PosSaleScenario,
} from './lib/scenarios.js'

const SAFETY_CEILING_VUS = 500
const STEP_GROWTH = 1.25
const STEP_DURATION = '2m'
const WARMUP_DURATION = '30s'
const FINAL_HOLD_DURATION = '10m' // backstop once the ceiling is reached; abortOnFail is expected to fire well before this

const SCENARIOS = {
  e1: { exec: 'c1LoginScenario', baseVUs: 50, thresholdMs: 300, name: 'login' },
  e2: { exec: 'c2ProjectsScenario', baseVUs: 100, thresholdMs: 500, name: 'projects_list' },
  e3: { exec: 'c3ProgressScenario', baseVUs: 30, thresholdMs: 800, name: 'progress_create' },
  e4: { exec: 'c4ReportsScenario', baseVUs: 20, thresholdMs: 800, name: 'reports_export' },
  e5: { exec: 'c5PosSaleScenario', baseVUs: 40, thresholdMs: 800, name: 'pos_sale' },
}

const scenarioKey = __ENV.SCENARIO
const chosen = SCENARIOS[scenarioKey]
if (!chosen) {
  throw new Error(
    `Set -e SCENARIO=<e1|e2|e3|e4|e5>. Got: ${JSON.stringify(scenarioKey)}. ` +
    `Each stress scenario must run on its own, per docs/plan-maestro-pruebas.md §8.`
  )
}

function buildStages(baseVUs) {
  const stages = [{ duration: WARMUP_DURATION, target: baseVUs }]
  let level = baseVUs
  while (level < SAFETY_CEILING_VUS) {
    level = Math.min(Math.ceil(level * STEP_GROWTH), SAFETY_CEILING_VUS)
    stages.push({ duration: STEP_DURATION, target: level })
  }
  stages.push({ duration: FINAL_HOLD_DURATION, target: SAFETY_CEILING_VUS })
  return stages
}

const scenarioName = `${scenarioKey}_stress`

export const options = {
  scenarios: {
    [scenarioName]: {
      executor: 'ramping-vus',
      exec: chosen.exec,
      startVUs: 0,
      stages: buildStages(chosen.baseVUs),
    },
  },
  thresholds: {
    // §8.2 point 1: error rate > 5% sustained ~30s aborts the run.
    [`http_req_failed{scenario:${scenarioName}}`]: [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' },
    ],
    // §8.2 point 2: p95 latency > 3x the load threshold (§7.2) sustained ~30s aborts the run.
    [`http_req_duration{scenario:${scenarioName},name:${chosen.name}}`]: [
      { threshold: `p(95)<${chosen.thresholdMs * 3}`, abortOnFail: true, delayAbortEval: '30s' },
    ],
  },
}

export function setup() {
  if (scenarioKey === 'e5') return provisionSaleProduct('K6-STRESS')
  return {}
}

export { c1LoginScenario, c2ProjectsScenario, c3ProgressScenario, c4ReportsScenario, c5PosSaleScenario }
