import { describe, it, expect } from 'vitest'
import { toCsv, csvBlob, escapeCsvValue } from '../src/utils/csvExport.js'
import { renderExport } from '../src/utils/reportExport.js'

const BOM = '﻿'
const CRLF = '\r\n'

const columnas = [
  { key: 'nombre', label: 'Proyecto' },
  { key: 'estado', label: 'Estado' },
]

describe('Caso 7 · Conjunto de datos vacío', () => {
  it('no lanza: un listado sin filas es un caso normal, no un error', () => {
    expect(() => toCsv(columnas, [])).not.toThrow()
  })

  it('genera un archivo válido con la cabecera sola', () => {
    const csv = toCsv(columnas, [])

    expect(csv).toBe(`${BOM}Proyecto,Estado${CRLF}`)
  })

  it('conserva el BOM aunque no haya datos, para que Excel no cambie de codificación', () => {
    expect(toCsv(columnas, []).startsWith(BOM)).toBe(true)
  })

  it('cierra con CRLF: sin él algunos importadores se comen el último registro', () => {
    expect(toCsv(columnas, []).endsWith(CRLF)).toBe(true)
  })

  it('sigue siendo rectangular: una sola línea de contenido', () => {
    const lineas = toCsv(columnas, []).replace(BOM, '').split(CRLF).filter(Boolean)

    expect(lineas).toHaveLength(1)
    expect(lineas[0].split(',')).toHaveLength(columnas.length)
  })

  it('sin filas y sin columnas produce un archivo vacío, no undefined', () => {
    const csv = toCsv([], [])

    expect(typeof csv).toBe('string')
    expect(csv).toBe(`${BOM}${CRLF}`)
  })

  it('el Blob resultante es un CSV UTF-8 con contenido', () => {
    const blob = csvBlob(toCsv(columnas, []))

    expect(blob.type).toBe('text/csv;charset=utf-8;')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('renderExport devuelve archivo y nombre aunque la sección no tenga filas', () => {
    const dataset = {
      meta: { scopeLabel: 'Activos', generatedAt: new Date('2026-08-20T10:00:00Z') },
      kpis: [],
      sections: [{ key: 'projects', title: 'Proyectos', columns: columnas, rows: [] }],
    }

    const { blob, filename } = renderExport(dataset, 'CSV')

    expect(blob.size).toBeGreaterThan(0)
    expect(filename).toMatch(/\.csv$/)
  })
})

describe('Caso 8 · Caracteres especiales y acentos', () => {
  it('mantiene las vocales acentuadas y la ñ sin escaparlas', () => {
    const csv = toCsv(columnas, [['Diseño de campaña', 'En ejecución']])

    expect(csv).toContain('Diseño de campaña')
    expect(csv).toContain('En ejecución')
  })

  it('cubre las cinco vocales acentuadas y la diéresis', () => {
    const texto = 'áéíóú ÁÉÍÓÚ üÜ ñÑ'

    expect(escapeCsvValue(texto)).toBe(texto)
    expect(toCsv(columnas, [[texto, '—']])).toContain(texto)
  })

  it('entrecomilla y duplica las comillas cuando conviven con acentos', () => {
    const csv = toCsv(columnas, [['Campaña "Verano Ñ"', 'Activo']])

    expect(csv).toContain('"Campaña ""Verano Ñ"""')
  })

  it('preserva los emojis, que ocupan dos unidades de código', () => {
    const csv = toCsv(columnas, [['Lanzamiento 🚀 Año Nuevo 🎉', 'Listo']])

    expect(csv).toContain('🚀')
    expect(csv).toContain('🎉')
    expect(csv).toContain('Año')
  })

  it('entrecomilla un acentuado que además lleva la coma delimitadora', () => {
    const csv = toCsv(columnas, [['Diseño, maquetación y revisión', 'Activo']])

    expect(csv).toContain('"Diseño, maquetación y revisión"')
  })

  it('conserva los acentos de la cabecera, no solo los de las filas', () => {
    const csv = toCsv([{ label: 'Días' }, { label: 'Ejecución' }], [])

    expect(csv).toBe(`${BOM}Días,Ejecución${CRLF}`)
  })

  it('no rompe el guardado contra fórmulas cuando el texto empieza por acento', () => {
    expect(escapeCsvValue('Ñandú')).toBe('Ñandú')
    expect(escapeCsvValue('=Ñandú')).toBe("'=Ñandú")
  })

  it('un símbolo de moneda con acento viaja íntegro', () => {
    const csv = toCsv(columnas, [['Presupuesto Ejecución', 'Q1.200,50 €']])

    expect(csv).toContain('Presupuesto Ejecución')
    expect(csv).toContain('€')
  })
})
