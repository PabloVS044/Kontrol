/**
 * Report layout — turns an export dataset into a branded PDF.
 *
 * Follows the "Luxury Dark" identity v2: gold #caa860 on near-black #12120e,
 * uppercase tracked labels, hairline rules, no rounded corners. Applied to
 * paper rather than literally: the masthead and section headers carry the dark
 * ground and the gold accents, the body stays light so the file prints and
 * annotates like a document instead of flooding a page with ink.
 *
 * The type scale mirrors the tokens (42 / 24 / 14 / 11) scaled to a page.
 */

import { A4, PdfDocument, measureText, wrapText } from './pdfDocument.js'

// Identity v2 tokens, resolved to the literals the PDF operators need.
const BRAND = {
  gold: '#caa860',
  goldDeep: '#b27f2a',
  ink: '#12120e',
  inkSoft: '#282825',
  paper: '#ffffff',
  paperAlt: '#faf8f5',
  text: '#1c1913',
  textMuted: '#6e6558',
  textFaint: '#8a8070',
  onInk: '#faf8f5',
  border: '#e0dacd',
}

// --tracking-caps from the design tokens: 0.08em on uppercase labels.
const CAPS_TRACKING = 0.08

const MARGIN = 40
const MASTHEAD_HEIGHT = 104
const RUNNING_HEAD_HEIGHT = 34
const FOOTER_HEIGHT = 34

const TABLE = {
  headerHeight: 22,
  rowHeight: 19,
  cellPadding: 7,
  fontSize: 8.5,
  headerFontSize: 7.5,
}

/**
 * @param {import('../reportExport.js').ReportDataset} dataset
 * @returns {PdfDocument}
 */
export function buildReportPdf(dataset) {
  const { meta, kpis = [], sections = [] } = dataset

  const doc = new PdfDocument({
    size: A4,
    margin: MARGIN,
    title: meta.title,
    author: meta.companyName || 'Kontrol',
  })

  let y = drawMasthead(doc, meta)
  y = drawMetaBlock(doc, meta, y + 22)

  if (kpis.length) y = drawKpiRow(doc, kpis, y + 18)

  for (const section of sections) {
    y = drawSection(doc, section, y + 22, meta)
  }

  stampFooters(doc, meta)
  return doc
}

// ─── Masthead ──────────────────────────────────────────────────────────────

function drawMasthead(doc, meta) {
  doc.rect(0, 0, doc.width, MASTHEAD_HEIGHT, { fill: BRAND.ink })
  doc.rect(0, MASTHEAD_HEIGHT, doc.width, 2.5, { fill: BRAND.gold })

  doc.text('KONTROL', MARGIN, 34, {
    size: 17, bold: true, color: BRAND.gold, tracking: 2.6,
  })
  doc.text(meta.labels.tagline, MARGIN, 48, {
    size: 6.5, color: BRAND.textFaint, tracking: CAPS_TRACKING * 6.5,
  })

  doc.text(meta.title, MARGIN, 76, { size: 19, bold: true, color: BRAND.onInk, maxWidth: 330 })
  if (meta.subtitle) {
    doc.text(meta.subtitle, MARGIN, 90, { size: 8, color: BRAND.textFaint, maxWidth: 330 })
  }

  // Right rail: the two facts that make an exported file self-explanatory.
  const right = doc.width - MARGIN
  drawStackedLabel(doc, right, 34, meta.labels.generatedOn, meta.generatedAtLabel)
  drawStackedLabel(doc, right, 68, meta.labels.filter, meta.filterLabel)

  return MASTHEAD_HEIGHT + 2.5
}

function drawStackedLabel(doc, right, y, label, value) {
  doc.text(label, right, y, {
    size: 6.5, bold: true, color: BRAND.textFaint, align: 'right', tracking: CAPS_TRACKING * 6.5,
  })
  doc.text(value, right, y + 12, { size: 9, color: BRAND.onInk, align: 'right', maxWidth: 200 })
}

// ─── Project / company data ────────────────────────────────────────────────

function drawMetaBlock(doc, meta, y) {
  const entries = meta.entries.filter((entry) => entry.value)
  if (!entries.length) return y

  const columns = 3
  const rows = Math.ceil(entries.length / columns)
  const columnWidth = doc.contentWidth / columns
  const height = rows * 30 + 14

  doc.rect(MARGIN, y, doc.contentWidth, height, { fill: BRAND.paperAlt })
  doc.rect(MARGIN, y, 2.5, height, { fill: BRAND.gold })

  entries.forEach((entry, i) => {
    const x = MARGIN + 16 + (i % columns) * columnWidth
    const top = y + 20 + Math.floor(i / columns) * 30

    doc.text(entry.label, x, top, {
      size: 6.5, bold: true, color: BRAND.textFaint, tracking: CAPS_TRACKING * 6.5, maxWidth: columnWidth - 24,
    })
    doc.text(entry.value, x, top + 12, {
      size: 9.5, color: BRAND.text, maxWidth: columnWidth - 24,
    })
  })

  return y + height
}

// ─── KPI row ───────────────────────────────────────────────────────────────

function drawKpiRow(doc, kpis, y) {
  const gap = 10
  const width = (doc.contentWidth - gap * (kpis.length - 1)) / kpis.length
  const height = 58

  kpis.forEach((kpi, i) => {
    const x = MARGIN + i * (width + gap)
    doc.rect(x, y, width, height, { stroke: BRAND.border, lineWidth: 0.7 })
    doc.rect(x, y, width, 2, { fill: BRAND.gold })

    doc.text(kpi.label, x + 10, y + 18, {
      size: 6.5, bold: true, color: BRAND.textFaint, tracking: CAPS_TRACKING * 6.5, maxWidth: width - 20,
    })
    doc.text(kpi.value, x + 10, y + 38, {
      size: 16, bold: true, color: BRAND.text, maxWidth: width - 20,
    })
    if (kpi.hint) {
      doc.text(kpi.hint, x + 10, y + 50, {
        size: 7.5, color: BRAND.goldDeep, maxWidth: width - 20,
      })
    }
  })

  return y + height
}

// ─── Tables ────────────────────────────────────────────────────────────────

function drawSection(doc, section, y, meta) {
  const bottom = doc.height - FOOTER_HEIGHT
  const widths = resolveColumnWidths(section.columns, doc.contentWidth)

  // Never orphan a section title: it needs its header row plus one data row.
  if (y + 24 + TABLE.headerHeight + TABLE.rowHeight > bottom) {
    y = startContinuationPage(doc, meta)
  }

  y = drawSectionTitle(doc, section, y)
  y = drawTableHeader(doc, section.columns, widths, y)

  if (!section.rows.length) {
    doc.text(meta.labels.noData, MARGIN + TABLE.cellPadding, y + 13, {
      size: 8.5, color: BRAND.textFaint,
    })
    return y + TABLE.rowHeight
  }

  section.rows.forEach((row, index) => {
    if (y + TABLE.rowHeight > bottom) {
      y = startContinuationPage(doc, meta)
      y = drawSectionTitle(doc, section, y, meta.labels.continued)
      y = drawTableHeader(doc, section.columns, widths, y)
    }

    if (index % 2 === 1) {
      doc.rect(MARGIN, y, doc.contentWidth, TABLE.rowHeight, { fill: BRAND.paperAlt })
    }

    let x = MARGIN
    section.columns.forEach((column, columnIndex) => {
      const width = widths[columnIndex]
      const align = column.align ?? 'left'
      const anchor = align === 'right' ? x + width - TABLE.cellPadding : x + TABLE.cellPadding

      doc.text(row[columnIndex], anchor, y + 13, {
        size: TABLE.fontSize,
        color: columnIndex === 0 ? BRAND.text : BRAND.textMuted,
        bold: columnIndex === 0,
        align,
        maxWidth: width - TABLE.cellPadding * 2,
      })
      x += width
    })

    doc.line(MARGIN, y + TABLE.rowHeight, MARGIN + doc.contentWidth, y + TABLE.rowHeight, {
      color: BRAND.border, width: 0.4,
    })
    y += TABLE.rowHeight
  })

  return y
}

function drawSectionTitle(doc, section, y, suffix) {
  const title = suffix ? `${section.title} ${suffix}` : section.title

  doc.text(title, MARGIN, y + 10, {
    size: 8.5, bold: true, color: BRAND.text, tracking: CAPS_TRACKING * 8.5,
  })

  if (section.count) {
    doc.text(section.count, MARGIN + doc.contentWidth, y + 10, {
      size: 8, color: BRAND.textFaint, align: 'right',
    })
  }

  const underlineWidth = measureText(title, 8.5, true, CAPS_TRACKING * 8.5)
  doc.rect(MARGIN, y + 15, Math.min(underlineWidth, doc.contentWidth), 1.6, { fill: BRAND.gold })

  return y + 24
}

function drawTableHeader(doc, columns, widths, y) {
  doc.rect(MARGIN, y, doc.contentWidth, TABLE.headerHeight, { fill: BRAND.ink })

  let x = MARGIN
  columns.forEach((column, i) => {
    const align = column.align ?? 'left'
    const anchor = align === 'right' ? x + widths[i] - TABLE.cellPadding : x + TABLE.cellPadding

    doc.text(column.label, anchor, y + 14, {
      size: TABLE.headerFontSize,
      bold: true,
      color: BRAND.onInk,
      tracking: CAPS_TRACKING * TABLE.headerFontSize,
      align,
      maxWidth: widths[i] - TABLE.cellPadding * 2,
    })
    x += widths[i]
  })

  return y + TABLE.headerHeight
}

/** Normalizes the columns' relative weights to the printable width. */
function resolveColumnWidths(columns, available) {
  const weights = columns.map((column) => column.width ?? 1)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  return weights.map((weight) => (weight / total) * available)
}

function startContinuationPage(doc, meta) {
  doc.addPage()
  doc.rect(0, 0, doc.width, RUNNING_HEAD_HEIGHT, { fill: BRAND.ink })
  doc.rect(0, RUNNING_HEAD_HEIGHT, doc.width, 1.5, { fill: BRAND.gold })

  doc.text('KONTROL', MARGIN, 22, { size: 9, bold: true, color: BRAND.gold, tracking: 1.8 })
  doc.text(meta.title, doc.width - MARGIN, 22, {
    size: 8, color: BRAND.textFaint, align: 'right', maxWidth: 300,
  })

  return RUNNING_HEAD_HEIGHT + 1.5 + 20
}

// ─── Footer ────────────────────────────────────────────────────────────────

/**
 * Footers are stamped after the fact because "Página 1 de N" cannot be written
 * until the last page exists.
 */
function stampFooters(doc, meta) {
  const total = doc.pageCount
  const y = doc.height - FOOTER_HEIGHT + 12

  for (let index = 0; index < total; index++) {
    doc.usePage(index)
    doc.line(MARGIN, y - 8, doc.width - MARGIN, y - 8, { color: BRAND.border, width: 0.6 })

    doc.text(meta.footerLeft, MARGIN, y + 4, { size: 7.5, color: BRAND.textFaint, maxWidth: 340 })
    doc.text(meta.labels.page(index + 1, total), doc.width - MARGIN, y + 4, {
      size: 7.5, color: BRAND.textFaint, align: 'right',
    })
  }
}

export { BRAND, wrapText }
