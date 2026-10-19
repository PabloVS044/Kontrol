#!/usr/bin/env node
// audit-check.mjs — Gate de dependencias para CI (DT-08).
// Equivale a `npm audit --audit-level=high`, pero acepta excepciones
// justificadas por advisory en audit-allowlist.json, cada una con fecha de
// vencimiento para que no queden olvidadas.
//
// Uso: npm run audit:ci                  (corre npm audit sobre el lockfile)
//      node scripts/audit-check.mjs <archivo.json>   (reporte ya guardado)
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ALLOWLIST_PATH = join(ROOT, 'audit-allowlist.json')
const BLOCKING = new Set(['high', 'critical'])

function readReport(file) {
  if (file) return JSON.parse(readFileSync(file, 'utf8'))
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json'], { cwd: ROOT, encoding: 'utf8' }))
  } catch (err) {
    // npm audit sale con código distinto de cero cuando hay hallazgos;
    // el JSON sigue en stdout.
    if (err.stdout) return JSON.parse(err.stdout)
    throw err
  }
}

function readAllowlist() {
  const entries = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
  const today = new Date().toISOString().slice(0, 10)
  const errors = []
  const ids = new Set()
  for (const e of entries) {
    const before = errors.length
    if (!/^GHSA(-[0-9a-z]{4}){3}$/.test(e.id ?? ''))
      errors.push(`id inválido: ${JSON.stringify(e.id)}`)
    if (!e.reason?.trim()) errors.push(`${e.id}: falta "reason"`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.expires ?? ''))
      errors.push(`${e.id}: "expires" debe ser AAAA-MM-DD`)
    else if (e.expires < today) errors.push(`${e.id}: la excepción venció el ${e.expires}`)
    // Solo una excepción completa y vigente deja pasar su advisory.
    if (errors.length === before) ids.add(e.id)
  }
  return { ids, errors }
}

// Un advisory aparece en cada paquete que lo arrastra; se indexa por GHSA.
function blockingAdvisories(report) {
  if (report.error)
    throw new Error(`npm audit falló: ${report.error.summary ?? JSON.stringify(report.error)}`)
  const found = new Map()
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via === 'string' || !BLOCKING.has(via.severity)) continue
      const id = via.url.split('/').pop()
      const entry = found.get(id) ?? {
        id,
        severity: via.severity,
        title: via.title,
        packages: new Set(),
      }
      entry.packages.add(`${via.name}@${via.range}`)
      found.set(id, entry)
    }
  }
  return [...found.values()]
}

const report = readReport(process.argv[2])
const allowlist = readAllowlist()
const advisories = blockingAdvisories(report)
const blocked = advisories.filter((a) => !allowlist.ids.has(a.id))
const allowed = advisories.filter((a) => allowlist.ids.has(a.id))
const stale = [...allowlist.ids].filter((id) => !advisories.some((a) => a.id === id))

for (const a of allowed) console.log(`permitido  ${a.severity.padEnd(8)} ${a.id}  ${a.title}`)
for (const id of stale)
  console.log(`aviso: ${id} ya no aparece en npm audit; quitarlo de audit-allowlist.json`)
for (const a of blocked) {
  console.log(`BLOQUEA    ${a.severity.padEnd(8)} ${a.id}  ${a.title}`)
  console.log(`           ${[...a.packages].join(', ')}`)
}
for (const err of allowlist.errors) console.log(`audit-allowlist.json: ${err}`)

const counts = report.metadata?.vulnerabilities ?? {}
console.log(
  `\nnpm audit: ${counts.critical ?? 0} críticas, ${counts.high ?? 0} altas, ${counts.moderate ?? 0} moderadas, ${counts.low ?? 0} bajas.`,
)

if (blocked.length || allowlist.errors.length) {
  console.log('Falla: hay vulnerabilidades altas o críticas sin excepción vigente.')
  process.exit(1)
}
console.log('OK: ninguna vulnerabilidad alta o crítica sin excepción vigente.')
