/**
 * CSV serialization for report exports.
 *
 * Targets the two importers the feature is accepted against — Excel and Google
 * Sheets — which constrains three things beyond plain RFC 4180 quoting:
 *
 *  - UTF-8 BOM. Without it Excel decodes the file with the system ANSI
 *    codepage and every accent in "Presupuesto Ejecución" turns to mojibake.
 *    Sheets ignores the BOM, so it is safe for both.
 *  - CRLF line endings, which is what RFC 4180 specifies and what Excel's
 *    parser is happiest with.
 *  - Formula guarding. A cell starting with = + @ or a lone - is executed as a
 *    formula on import; project names are user-supplied, so they get prefixed
 *    with an apostrophe, which both importers read as "literal text".
 */

const UTF8_BOM = '\uFEFF'
const CRLF = '\r\n'

// Leading characters that make Excel/Sheets treat a cell as a formula.
const FORMULA_PREFIXES = ['=', '+', '@', '\t', '\r']

function isNumeric(value) {
  return value !== '' && Number.isFinite(Number(value))
}

/**
 * Neutralizes a value that would otherwise be evaluated as a formula on import.
 * Negative numbers are left alone — "-1200" is data, "-2+3" is not.
 */
export function guardFormula(value) {
  if (!value) return value
  const startsFormula =
    FORMULA_PREFIXES.includes(value[0]) ||
    (value[0] === '-' && !isNumeric(value))

  return startsFormula ? `'${value}` : value
}

/**
 * Quotes a single field per RFC 4180: wrap in double quotes when the value
 * contains the delimiter, a quote, a line break or edge whitespace, and double
 * up any embedded quote.
 */
export function escapeCsvValue(value, delimiter = ',') {
  if (value == null) return ''

  const raw = guardFormula(String(value))
  const needsQuotes =
    raw.includes(delimiter) ||
    raw.includes('"') ||
    raw.includes('\n') ||
    raw.includes('\r') ||
    raw !== raw.trim()

  return needsQuotes ? `"${raw.replace(/"/g, '""')}"` : raw
}

/**
 * Builds the CSV text for one rectangular table.
 *
 * @param {{ label: string }[]} columns
 * @param {Array<Array<string|number|null>>} rows
 * @param {{ delimiter?: string, bom?: boolean }} [options]
 */
export function toCsv(columns, rows, { delimiter = ',', bom = true } = {}) {
  const line = (cells) => cells.map((cell) => escapeCsvValue(cell, delimiter)).join(delimiter)

  const body = [
    line(columns.map((column) => column.label)),
    ...rows.map((row) => line(row)),
  ].join(CRLF)

  // Trailing CRLF: some importers drop the last record without it.
  return `${bom ? UTF8_BOM : ''}${body}${CRLF}`
}

export function csvBlob(csv) {
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
}
