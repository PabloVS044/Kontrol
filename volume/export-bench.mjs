// Times the PDF and CSV export of the reports view at growing volumes.
//
// Both files are built in the browser (frontend/src/utils/reportExport.js),
// not on the server, so their cost depends on how many rows the view holds —
// every project of the company (/api/reports/summary) and every report of it
// (/api/reports, unpaginated) — and not on the database. This runs the very
// same modules the view calls, with synthetic rows shaped like those two
// responses, so it needs no database and is safe to run anywhere.
//
// Usage: node volume/export-bench.mjs [--reps=5]
// Times are from Node on the machine that runs it; a browser on a modest
// laptop or phone will be slower, so treat them as a lower bound.
import { buildReportsDataset, renderExport } from '../frontend/src/utils/reportExport.js'

const reps = Number(process.argv.find((a) => a.startsWith('--reps='))?.split('=')[1] ?? 5)

// [projects, reports] of the company. The first four rows are the scope the
// levels leave in the test company (see results/<level>/inventario.txt); the
// rest extend the curve past N3 to locate where the export stops being usable.
const SIZES = [
  [3, 1],
  [12, 2300],
  [53, 11400],
  [103, 22800],
  [200, 50000],
  [400, 100000],
]

const ESTADOS = ['PLANIFICADO', 'EN_PROGRESO', 'PAUSADO', 'COMPLETADO']
const TIPOS = ['AVANCE', 'PRESUPUESTO', 'INCIDENTE', 'CONSOLIDADO']

// vue-i18n stand-in: the key plus its params is as long as a real label.
const t = (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key)

function fakeRows(nProjects, nReports) {
  const projects = Array.from({ length: nProjects }, (_, i) => ({
    id_proyecto: i + 1,
    nombre: `VOL Proyecto ${i + 1}`,
    estado: ESTADOS[i % 4],
    fecha_inicio: new Date(2026, 0, 1 + (i % 250)).toISOString(),
    progreso_actual: i % 101,
    presupuesto_total: 250000 + i * 1000,
  }))
  const reports = Array.from({ length: nReports }, (_, i) => ({
    id_reporte: i + 1,
    titulo: `VOL Reporte ${i + 1}`,
    tipo: TIPOS[i % 4],
    id_proyecto: i % 5 === 0 ? null : 1 + (i % nProjects),
    fecha_generacion: new Date(Date.now() - i * 43 * 60000).toISOString(),
  }))
  return { projects, reports }
}

function median(values) {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function time(fn) {
  const start = performance.now()
  const result = fn()
  return [performance.now() - start, result]
}

const lines = ['proyectos,reportes,payload_json_kb,parse_json_ms,pdf_ms,pdf_kb,pdf_paginas,csv_ms,csv_kb']

for (const [nProjects, nReports] of SIZES) {
  const rows = fakeRows(nProjects, nReports)
  // What the browser downloads and parses before it can build anything.
  const payload = JSON.stringify({ success: true, data: rows.reports }) +
    JSON.stringify({ success: true, data: { proyectos: rows.projects } })

  const samples = { parse: [], pdf: [], csv: [] }
  let pdfBytes = 0, pages = 0, csvBytes = 0

  for (let r = 0; r < reps; r++) {
    const [parseMs] = time(() => JSON.parse(JSON.stringify(rows)))
    const names = new Map(rows.projects.map((p) => [p.id_proyecto, p.nombre]))
    const dataset = buildReportsDataset({
      t,
      companyName: 'Ferretería Los Pinos',
      generatedBy: 'Participante 1',
      scopeLabel: 'Todos',
      projects: rows.projects,
      reports: rows.reports,
      kpis: { avgProgress: 50, totalProjects: nProjects, activeProjects: 1, completedProjects: 1, budgetTotal: 1e6 },
      projectNameById: (id) => names.get(id) ?? '—',
    })

    const [pdfMs, pdf] = time(() => renderExport(dataset, 'PDF'))
    const [csvMs, csv] = time(() => renderExport(dataset, 'CSV'))
    samples.parse.push(parseMs)
    samples.pdf.push(pdfMs)
    samples.csv.push(csvMs)
    pdfBytes = pdf.blob.size
    csvBytes = csv.blob.size
    pages = (Buffer.from(await pdf.blob.arrayBuffer()).toString('latin1').match(/\/Type \/Page\b/g) || []).length
  }

  const row = [
    nProjects, nReports, (Buffer.byteLength(payload) / 1024).toFixed(0),
    median(samples.parse).toFixed(1), median(samples.pdf).toFixed(0), (pdfBytes / 1024).toFixed(0), pages,
    median(samples.csv).toFixed(1), (csvBytes / 1024).toFixed(1),
  ].join(',')
  lines.push(row)
  console.log(row)
}

const { writeFileSync, mkdirSync } = await import('node:fs')
const out = new URL('./results/', import.meta.url)
mkdirSync(out, { recursive: true })
writeFileSync(new URL('exportacion.csv', out), lines.join('\n') + '\n')
console.log(`\n-> ${new URL('exportacion.csv', out).pathname}`)
