// Shared config for every k6 script in this directory. All values come from
// docs/plan-maestro-pruebas.md §7-§8 (scenarios, thresholds, ramp) and
// docs/test-environment.md (the SCRUM-25 test environment and its accounts).

export const BASE_URL = __ENV.BASE_URL || 'https://test.34.121.51.151.nip.io'

// Structural safety guard, same idea as backend/src/db/reset.js: refuse to
// run unless BASE_URL looks like the SCRUM-25 test environment. Production
// always serves from a different host, so this can't be bypassed by a typo.
const SAFETY_MARKER = __ENV.TEST_HOST_MARKER || 'test.34.121.51.151.nip.io'
if (!BASE_URL.includes(SAFETY_MARKER)) {
  throw new Error(
    `Refusing to run: BASE_URL (${BASE_URL}) does not look like the SCRUM-25 ` +
    `test environment (expected it to contain "${SAFETY_MARKER}"). Load and ` +
    `stress tests must never run against production.`
  )
}

// The 6 SCRUM-25 seed accounts (docs/test-environment.md). Load is spread
// across all of them so no single account's sessions dominate the sample.
export const ACCOUNTS = [
  'participante1@kontrol-test.dev',
  'participante2@kontrol-test.dev',
  'participante3@kontrol-test.dev',
  'participante4@kontrol-test.dev',
  'participante5@kontrol-test.dev',
  'reserva@kontrol-test.dev',
]
export const PASSWORD = __ENV.TEST_ACCOUNT_PASSWORD || 'Kontrol2026!'

// "Ferretería Los Pinos" / "Renovación de línea de ferretería eléctrica" —
// both seeded by SCRUM-25's seed.js, all 6 accounts are members of this
// project, so it's a stable target for every scenario below.
export const COMPANY_ID = __ENV.TEST_COMPANY_ID || '1'
export const PROJECT_ID = __ENV.TEST_PROJECT_ID || '2'

export function pickAccount(vuId) {
  return ACCOUNTS[vuId % ACCOUNTS.length]
}
