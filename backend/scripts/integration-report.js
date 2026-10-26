// Convierte el JSON de Vitest de las suites de integración y de regresión en un
// reporte Markdown que se puede adjuntar al informe del sprint.
//
// Uso: node scripts/integration-report.js [--out <archivo.md>] [suite ...]
//   suite: integration, regression (por defecto, las dos que existan en reports/)
//
// En GitHub Actions el mismo Markdown se escribe en el resumen del job y en
// reports/, que se publica como artefacto. La copia versionada vive en
// docs/evidencias/pruebas-integracion/.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const LABELS = {
  integration: 'Pruebas de integración (API + PostgreSQL)',
  regression: 'Pruebas de regresión (API + PostgreSQL)',
}

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const outFile = outIndex >= 0 ? args.splice(outIndex, 2)[1] : null
const suites = args.length ? args : Object.keys(LABELS)

const escape = (text) => String(text).replace(/\|/g, '\\|')
const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`

const context = () => {
  const { GITHUB_SHA, GITHUB_REF_NAME, GITHUB_EVENT_NAME, GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env
  if (!GITHUB_SHA) return 'Ejecución local.'
  const run = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
  return `Commit \`${GITHUB_SHA.slice(0, 7)}\` · rama \`${GITHUB_REF_NAME}\` · evento \`${GITHUB_EVENT_NAME}\` · [corrida](${run})`
}

function renderSuite(suite) {
  const label = LABELS[suite] ?? suite
  const file = `reports/${suite}-results.json`
  if (!existsSync(file)) {
    return `### ${label}\n\nNo se generó reporte: la ejecución falló antes de correr las pruebas.\n`
  }

  const r = JSON.parse(readFileSync(file, 'utf8'))
  const ok = r.numFailedTests === 0 && r.success !== false
  const files = r.testResults.map((s) => ({
    name: s.name.replace(/\\/g, '/').split('/tests/')[1] ?? s.name,
    duration: s.endTime - s.startTime,
    tests: s.assertionResults,
  }))
  const testTime = files.reduce((sum, f) => sum + f.duration, 0)

  let md = `### ${label} — ${ok ? '✅ aprobado' : '❌ fallido'}\n\n`
  md += '| Archivos | Total | Aprobadas | Fallidas | Omitidas | Tiempo en pruebas |\n|---|---|---|---|---|---|\n'
  md += `| ${files.length} | ${r.numTotalTests} | ${r.numPassedTests} | ${r.numFailedTests} | ${r.numPendingTests + (r.numTodoTests ?? 0)} | ${seconds(testTime)} |\n\n`

  md += '| Resultado | Archivo | Grupo | Prueba | Duración |\n|---|---|---|---|---|\n'
  for (const f of files) {
    for (const t of f.tests) {
      const icon = t.status === 'passed' ? '✅' : t.status === 'failed' ? '❌' : '⏭️'
      const group = t.ancestorTitles.at(-1) ?? ''
      md += `| ${icon} | ${escape(f.name)} | ${escape(group)} | ${escape(t.title)} | ${Math.round(t.duration ?? 0)} ms |\n`
    }
  }

  const failures = files.flatMap((f) => f.tests.filter((t) => t.status === 'failed').map((t) => ({ file: f.name, t })))
  if (failures.length) {
    md += '\n#### Fallos\n\n'
    for (const { file, t } of failures) {
      md += `- **${escape(file)} › ${escape(t.title)}**\n\n  \`\`\`\n  ${(t.failureMessages?.[0] ?? '').split('\n')[0]}\n  \`\`\`\n`
    }
  }
  return md + '\n'
}

const body = `## Resultados de pruebas de integración — Kontrol backend\n\n${context()} · generado ${new Date().toISOString()}\n\n` +
  suites.map(renderSuite).join('\n')

if (outFile) writeFileSync(outFile, body)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, body)
if (!outFile && !process.env.GITHUB_STEP_SUMMARY) process.stdout.write(body)
