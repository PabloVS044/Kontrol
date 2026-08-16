/**
 * Builds the export dataset — the single description of "what the user is
 * looking at" that both the PDF layout and the CSV serializer render.
 *
 * Keeping it in one pure function is what makes the acceptance criterion
 * "ambos respetan el filtrado activo en la vista" true by construction: the
 * caller passes the already-filtered rows, and neither format can drift from
 * the other or from the screen.
 *
 * Values arrive pre-formatted with the very same helpers the table cells use,
 * so a number that reads "$1.2M" on screen reads "$1.2M" in the file.
 */

import { statusPill, formatDate, formatBudget } from './statusHelpers.js'
import { toCsv, csvBlob } from './csvExport.js'
import { buildReportPdf } from './pdf/reportPdf.js'
import { slugify, fileDateStamp } from './download.js'

/**
 * @typedef {Object} ReportDataset
 * @property {Object} meta
 * @property {{label:string,value:string,hint?:string}[]} kpis
 * @property {{key:string,title:string,count?:string,columns:Object[],rows:string[][]}[]} sections
 */

/** Human date+time for the "generated on" stamp. */
export function formatGeneratedAt(date, locale = 'es') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

/**
 * @param {Object} input
 * @param {(key: string, params?: Object) => string} input.t  vue-i18n translate
 * @param {string} input.locale
 * @param {string} input.companyName
 * @param {string} input.generatedBy
 * @param {Date}   [input.generatedAt]
 * @param {string} input.filterLabel   label of the filter active in the view
 * @param {Array}  input.projects      already filtered project rows
 * @param {Array}  input.reports       report rows as listed on screen
 * @param {Object} input.kpis          the four figures shown above the tables
 * @param {(id:number|null)=>string} input.projectNameById
 * @returns {ReportDataset}
 */
export function buildReportsDataset({
  t,
  locale = 'es',
  companyName = '',
  generatedBy = '',
  generatedAt = new Date(),
  filterLabel = '',
  projects = [],
  reports = [],
  kpis = {},
  projectNameById = () => '—',
}) {
  const generatedAtLabel = formatGeneratedAt(generatedAt, locale)

  const meta = {
    title: t('reports.header.title'),
    subtitle: t('reports.header.subtitle'),
    companyName,
    generatedBy,
    generatedAt,
    generatedAtLabel,
    filterLabel,
    footerLeft: [companyName, t('reports.export.footerNote')].filter(Boolean).join(' · '),
    // "Datos del proyecto" block of the PDF cover.
    entries: [
      { label: t('reports.export.meta.company'), value: companyName },
      { label: t('reports.export.meta.generatedBy'), value: generatedBy },
      { label: t('reports.export.meta.generatedOn'), value: generatedAtLabel },
      { label: t('reports.export.meta.filter'), value: filterLabel },
      { label: t('reports.export.meta.projectCount'), value: String(projects.length) },
      { label: t('reports.export.meta.reportCount'), value: String(reports.length) },
    ],
    labels: {
      tagline: t('reports.export.tagline'),
      generatedOn: t('reports.export.meta.generatedOn'),
      filter: t('reports.export.meta.filter'),
      noData: t('reports.export.noData'),
      continued: t('reports.export.continued'),
      page: (current, total) => t('reports.export.page', { current, total }),
    },
  }

  const kpiCards = [
    {
      label: t('reports.view.kpi.avgProgress'),
      value: `${kpis.avgProgress ?? 0}%`,
      hint: t('reports.view.kpi.projects', { count: kpis.totalProjects ?? projects.length }),
    },
    {
      label: t('reports.view.kpi.activeProjects'),
      value: String(kpis.activeProjects ?? 0),
      hint: t('reports.view.kpi.ofTotal', { total: kpis.totalProjects ?? projects.length }),
    },
    {
      label: t('reports.view.kpi.completed'),
      value: String(kpis.completedProjects ?? 0),
      hint: t('reports.view.kpi.completionRate', { pct: kpis.completionRate ?? 0 }),
    },
    {
      label: t('reports.view.kpi.budgetTotal'),
      value: formatBudget(kpis.budgetTotal ?? 0),
      hint: t('reports.view.kpi.budgetUsed', { pct: kpis.budgetPct ?? 0 }),
    },
  ]

  const sections = [
    {
      key: 'projects',
      title: t('reports.view.projectsTitle'),
      count: t('reports.view.kpi.projects', { count: projects.length }),
      columns: [
        { key: 'nombre', label: t('reports.view.colProjectName'), width: 3 },
        { key: 'progreso', label: t('reports.view.colProgress'), width: 1.1, align: 'right' },
        { key: 'estado', label: t('reports.view.colStatus'), width: 1.5 },
        { key: 'fecha_inicio', label: t('reports.view.colStartDate'), width: 1.6 },
      ],
      rows: projects.map((project) => [
        project.nombre ?? '—',
        `${project.progreso_actual ?? 0}%`,
        statusPill(project.estado).label,
        formatDate(project.fecha_inicio),
      ]),
    },
    {
      key: 'reports',
      title: t('reports.view.reportsTitle'),
      count: t('reports.view.reportsCount', { count: reports.length }),
      columns: [
        { key: 'titulo', label: t('reports.view.colTitle'), width: 3 },
        { key: 'tipo', label: t('reports.view.colType'), width: 1.4 },
        { key: 'proyecto', label: t('reports.view.colProject'), width: 2 },
        { key: 'fecha', label: t('reports.view.colDate'), width: 1.6 },
      ],
      rows: reports.map((report) => [
        report.titulo ?? '—',
        report.tipo ?? '—',
        report.id_proyecto == null
          ? t('reports.export.allProjects')
          : projectNameById(report.id_proyecto),
        formatDate(report.fecha_generacion),
      ]),
    },
  ]

  return { meta, kpis: kpiCards, sections }
}

/**
 * Name of the downloaded file, e.g. `kontrol-reportes-activos-2026-08-16.pdf`.
 * Carrying the filter in the name keeps two exports of different subsets
 * distinguishable in a downloads folder.
 */
export function buildExportFilename(dataset, format) {
  const parts = ['kontrol', 'reportes', slugify(dataset.meta.filterLabel)].filter(Boolean)
  return `${parts.join('-')}-${fileDateStamp(dataset.meta.generatedAt)}.${format.toLowerCase()}`
}

/**
 * Renders the dataset to a downloadable file.
 *
 * The PDF carries the whole view — cover, KPIs and both tables. The CSV
 * carries the projects table alone, on purpose: a single rectangular block
 * with one header row is what Excel and Sheets import cleanly, and stacking
 * several tables into one file is what makes an import ambiguous.
 *
 * @param {ReportDataset} dataset
 * @param {'PDF'|'CSV'} format
 * @returns {{ blob: Blob, filename: string }}
 */
export function renderExport(dataset, format) {
  const filename = buildExportFilename(dataset, format)

  if (format === 'CSV') {
    const [primary] = dataset.sections
    return { blob: csvBlob(toCsv(primary.columns, primary.rows)), filename }
  }

  return { blob: buildReportPdf(dataset).toBlob(), filename }
}

/**
 * Payload for POST /api/reports/exports — the row left behind in REPORTE.
 * Company-wide exports carry no project, which is why id_proyecto is null.
 */
export function buildExportRegistration(dataset, format, { t, idProyecto = null } = {}) {
  return {
    titulo: t('reports.export.recordTitle', {
      format,
      filter: dataset.meta.filterLabel,
    }).slice(0, 200),
    tipo: 'CONSOLIDADO',
    id_proyecto: idProyecto,
  }
}
