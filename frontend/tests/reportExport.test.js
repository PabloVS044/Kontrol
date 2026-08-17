import { describe, it, expect } from 'vitest'

import { toCsv, escapeCsvValue, guardFormula } from '../src/utils/csvExport.js'
import { measureText, encodePdfText, truncateToWidth, parseColor } from '../src/utils/pdf/pdfDocument.js'
import {
  buildReportsDataset,
  buildProjectDataset,
  renderExport,
  buildExportRegistration,
} from '../src/utils/reportExport.js'
import { slugify, fileDateStamp } from '../src/utils/download.js'

// Stand-in for vue-i18n's `t`. Interpolates the params the exporters pass so
// assertions read like the strings a user would see.
const t = (key, params = {}) => {
  const canned = {
    'reports.export.page': `Página ${params.current} de ${params.total}`,
    'reports.export.recordTitle': `Exportación ${params.format} · ${params.filter}`,
    'reports.export.allProjects': 'Todos los proyectos',
    'reports.view.colProjectName': 'Nombre del Proyecto',
    'reports.view.colProgress': 'Progreso',
    'reports.view.colStatus': 'Estado',
    'reports.view.colStartDate': 'Fecha de Inicio',
    'reports.header.title': 'Centro de Reportes',
  }
  return canned[key] ?? key
}

const PROJECTS = [
  { id_proyecto: 1, nombre: 'Ampliación "Ala Norte", Fase 2', estado: 'EN_PROGRESO', fecha_inicio: '2026-03-10', progreso_actual: 42 },
  { id_proyecto: 2, nombre: 'Remodelación Ñuñoa', estado: 'COMPLETADO', fecha_inicio: '2026-01-05', progreso_actual: 100 },
]

const REPORTS = [
  { id_reporte: 1, titulo: '=SUM(A1:A9)', tipo: 'AVANCE', id_proyecto: 1, fecha_generacion: '2026-08-14' },
  { id_reporte: 2, titulo: 'Export previo', tipo: 'CONSOLIDADO', id_proyecto: null, fecha_generacion: '2026-08-15' },
]

function makeDataset(overrides = {}) {
  return buildReportsDataset({
    t,
    locale: 'es',
    companyName: 'Constructora Ñandú S.A.',
    generatedBy: 'Juan M. Morales',
    generatedAt: new Date(2026, 7, 16, 15, 42),
    scopeLabel: 'Activos',
    projects: PROJECTS,
    reports: REPORTS,
    kpis: { avgProgress: 71, totalProjects: 2, activeProjects: 1, completedProjects: 1, completionRate: 50, budgetTotal: 4820000, budgetPct: 63 },
    projectNameById: (id) => PROJECTS.find((p) => p.id_proyecto === id)?.nombre ?? '—',
    ...overrides,
  })
}

describe('csvExport — compatibilidad con Excel y Google Sheets', () => {
  it('entrecomilla solo cuando hace falta', () => {
    expect(escapeCsvValue('simple')).toBe('simple')
    expect(escapeCsvValue('con,coma')).toBe('"con,coma"')
    expect(escapeCsvValue('dice "hola"')).toBe('"dice ""hola"""')
    expect(escapeCsvValue('dos\nlíneas')).toBe('"dos\nlíneas"')
    expect(escapeCsvValue(' con espacio ')).toBe('" con espacio "')
    expect(escapeCsvValue(null)).toBe('')
  })

  it('neutraliza fórmulas sin tocar números negativos', () => {
    expect(guardFormula('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(guardFormula('+1+1')).toBe("'+1+1")
    expect(guardFormula('@import')).toBe("'@import")
    expect(guardFormula('-2+3')).toBe("'-2+3")
    expect(guardFormula('-1200')).toBe('-1200')
    expect(guardFormula('1200')).toBe('1200')
  })

  it('emite BOM y CRLF para que Excel lea los acentos', () => {
    const csv = toCsv([{ label: 'Proyecto' }], [['Ñuñoa']])

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toBe('\uFEFFProyecto\r\nÑuñoa\r\n')
    expect(csv).not.toMatch(/[^\r]\n/)
  })

  it('produce una tabla rectangular de una sola cabecera', () => {
    const [projects] = makeDataset().sections
    const rows = toCsv(projects.columns, projects.rows).split('\r\n').filter(Boolean)

    expect(rows).toHaveLength(1 + PROJECTS.length)
    expect(rows[0]).toContain('Nombre del Proyecto,Progreso,Estado,Fecha de Inicio')
    expect(rows[1]).toContain('42%')
  })
})

describe('pdfDocument — codificación y métricas', () => {
  it('escapa los caracteres que cierran un literal PDF', () => {
    expect(encodePdfText('=SUM(A1:A9)')).toBe('=SUM\\(A1:A9\\)')
    expect(encodePdfText('C:\\ruta')).toBe('C:\\\\ruta')
  })

  it('codifica el español como WinAnsi y degrada lo irrepresentable', () => {
    expect([...encodePdfText('Ñandú')].map((c) => c.charCodeAt(0)))
      .toEqual([0xd1, 0x61, 0x6e, 0x64, 0xfa])
    expect(encodePdfText('日本')).toBe('??')
  })

  it('convierte los saltos de línea en espacios en vez de glifos sueltos', () => {
    expect(encodePdfText('Salto\nde línea')).toBe('Salto de línea')
    expect(encodePdfText('a\tb')).toBe('a b')
  })

  it('mide con las anchuras AFM de Helvetica', () => {
    // H 722 + e 556 + l 222 + l 222 + o 556 = 2278/1000 em
    expect(measureText('Hello', 10)).toBeCloseTo(22.78, 5)
    expect(measureText('áéíóúñ', 10)).toBe(measureText('aeioun', 10))
    expect(measureText('Presupuesto', 10, true)).toBeGreaterThan(measureText('Presupuesto', 10))
    expect(measureText('abc', 10, false, 2)).toBe(measureText('abc', 10) + 6)
  })

  it('trunca con elipsis respetando el ancho disponible', () => {
    const truncated = truncateToWidth('Proyecto de reconstrucción urbana', 40, 8)

    expect(truncated.endsWith('…')).toBe(true)
    expect(measureText(truncated, 8)).toBeLessThanOrEqual(40)
    expect(truncateToWidth('corto', 200, 8)).toBe('corto')
  })

  it('convierte hex a los componentes 0..1 de los operadores', () => {
    expect(parseColor('#caa860')).toEqual([0.792, 0.659, 0.376])
    expect(parseColor('#fff')).toEqual([1, 1, 1])
  })
})

describe('reportExport — dataset y artefactos', () => {
  it('refleja las filas recibidas, que son las ya filtradas en pantalla', () => {
    const [projects] = makeDataset({ projects: [PROJECTS[0]] }).sections

    expect(projects.rows).toHaveLength(1)
    expect(projects.rows[0][0]).toBe('Ampliación "Ala Norte", Fase 2')
    expect(projects.rows[0][2]).toBe('In Progress')
  })

  it('etiqueta los reportes sin proyecto como exportaciones de toda la empresa', () => {
    const [, reports] = makeDataset().sections

    expect(reports.rows[1][2]).toBe('Todos los proyectos')
  })

  it('nombra el archivo con el filtro y la fecha', () => {
    const dataset = makeDataset()

    expect(renderExport(dataset, 'PDF').filename).toBe('kontrol-reportes-activos-2026-08-16.pdf')
    expect(renderExport(dataset, 'CSV').filename).toBe('kontrol-reportes-activos-2026-08-16.csv')
  })

  it('genera un PDF que empieza por la cabecera y cierra con %%EOF', async () => {
    const { blob } = renderExport(makeDataset(), 'PDF')
    const text = Buffer.from(await blob.arrayBuffer()).toString('latin1')

    expect(blob.type).toBe('application/pdf')
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
  })

  it('declara en el PDF una longitud de stream exacta', async () => {
    const { blob } = renderExport(makeDataset(), 'PDF')
    const text = Buffer.from(await blob.arrayBuffer()).toString('latin1')

    for (const match of text.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const start = match.index + match[0].length
      expect(text.slice(start + Number(match[1]), start + Number(match[1]) + 10)).toBe('\nendstream')
    }
  })

  it('deja las tablas de xref apuntando al inicio de cada objeto', async () => {
    const { blob } = renderExport(makeDataset(), 'PDF')
    const text = Buffer.from(await blob.arrayBuffer()).toString('latin1')

    const startxref = Number(text.slice(text.lastIndexOf('startxref')).match(/startxref\s+(\d+)/)[1])
    expect(text.slice(startxref, startxref + 4)).toBe('xref')

    const entries = text.slice(startxref).split('\n').slice(3)
    const total = Number(text.slice(startxref).match(/xref\n0 (\d+)/)[1]) - 1
    for (let id = 1; id <= total; id++) {
      expect(text.startsWith(`${id} 0 obj`, Number(entries[id - 1].slice(0, 10)))).toBe(true)
    }
  })

  it('registra la exportación como CONSOLIDADO sin proyecto', () => {
    const payload = buildExportRegistration(makeDataset(), 'PDF', { t })

    expect(payload).toEqual({
      titulo: 'Exportación PDF · Activos',
      tipo: 'CONSOLIDADO',
      id_proyecto: null,
    })
    expect(payload.titulo.length).toBeLessThanOrEqual(200)
  })
})

describe('reportExport — detalle de un proyecto', () => {
  const project = {
    id_proyecto: 7,
    nombre: 'Ampliación Ñuñoa',
    descripcion: 'Obra civil fase 2',
    estado: 'EN_PROGRESO',
    fecha_inicio: '2026-02-01',
    fecha_fin_planificada: '2026-12-15',
    presupuesto_total: 1200000,
  }
  const metrics = {
    progressPct: 64,
    budget: { planificado: 1200000, real: 780000, pct: 65, remaining: 420000 },
    tasks: { total: 20, completadas: 12, enProgreso: 5, pendientes: 2, canceladas: 1 },
    team: [{ rol: 'Supervisor', total: 2 }, { rol: 'Operario', total: 6 }],
  }

  const makeProjectDataset = (overrides = {}) =>
    buildProjectDataset({
      t,
      locale: 'es',
      companyName: 'Constructora Ñandú S.A.',
      generatedBy: 'Juan M. Morales',
      generatedAt: new Date(2026, 7, 16, 15, 42),
      project,
      metrics,
      ...overrides,
    })

  it('usa el proyecto como alcance, no un filtro', () => {
    const { meta } = makeProjectDataset()

    expect(meta.scopeLabel).toBe('Ampliación Ñuñoa')
    expect(meta.title).toBe('Ampliación Ñuñoa')
    expect(meta.labels.scope).toBe('reports.export.meta.project')
  })

  it('resume en la sección primaria lo que muestra la pantalla', () => {
    const [summary] = makeProjectDataset().sections
    const byMetric = Object.fromEntries(summary.rows)

    expect(summary.columns).toHaveLength(2)
    expect(byMetric['Estado']).toBe('In Progress')
    expect(byMetric['reports.detail.metaProgress']).toBe('64%')
    expect(byMetric['reports.detail.spent']).toBe('$780K')
    expect(byMetric['reports.detail.remaining']).toBe('$420K')
  })

  it('reparte las tareas en porcentajes que suman el total', () => {
    const tasks = makeProjectDataset().sections.find((s) => s.key === 'tasks')

    expect(tasks.rows.map((r) => r[1])).toEqual(['2', '5', '12', '1'])
    expect(tasks.rows.map((r) => r[2])).toEqual(['10%', '25%', '60%', '5%'])
  })

  it('no divide por cero cuando el proyecto no tiene tareas', () => {
    const empty = makeProjectDataset({ metrics: { ...metrics, tasks: { total: 0 } } })
    const tasks = empty.sections.find((s) => s.key === 'tasks')

    expect(tasks.rows.every((r) => r[2] === '0%')).toBe(true)
  })

  it('nombra el archivo con el proyecto y registra su id', () => {
    const dataset = makeProjectDataset()

    expect(renderExport(dataset, 'CSV').filename).toBe('kontrol-reportes-ampliacion-nunoa-2026-08-16.csv')
    expect(buildExportRegistration(dataset, 'PDF', { t, idProyecto: 7 })).toEqual({
      titulo: 'Exportación PDF · Ampliación Ñuñoa',
      tipo: 'CONSOLIDADO',
      id_proyecto: 7,
    })
  })

  it('produce un PDF válido con las tres secciones', async () => {
    const { blob } = renderExport(makeProjectDataset(), 'PDF')
    const text = Buffer.from(await blob.arrayBuffer()).toString('latin1')

    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(makeProjectDataset().sections.map((s) => s.key)).toEqual(['summary', 'tasks', 'team'])
  })
})

describe('download — nombres de archivo', () => {
  it('normaliza acentos y separadores', () => {
    expect(slugify('Últimos 30 días')).toBe('ultimos-30-dias')
    expect(slugify('Todos los proyectos')).toBe('todos-los-proyectos')
    expect(slugify('')).toBe('')
  })

  it('sella la fecha local, no la UTC', () => {
    expect(fileDateStamp(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
