/**
 * Minimal PDF 1.4 writer — enough to lay out a branded report, nothing more.
 *
 * Why hand-rolled instead of a library: the whole feature needs text, rules,
 * filled rectangles and page breaks. The usual candidates (jsPDF + autotable)
 * add ~350 KB to a bundle that already carries three, ogl and zxing, for
 * primitives that fit in one file. This also keeps the export working offline
 * and pins the output format, so "el PDF abre correctamente" does not depend
 * on a transitive upgrade.
 *
 * Scope and its limits:
 *  - Uses the base-14 Helvetica faces, which every reader has built in. The
 *    brand faces (Playfair Display / Manrope) would each need the binary font
 *    embedded and a CID font setup; the layout mirrors the brand's *scale* and
 *    weights instead.
 *  - Text is encoded as WinAnsi, which covers the full Spanish alphabet plus
 *    the punctuation the UI uses (— … · «»). Anything outside it degrades to
 *    "?" rather than producing a corrupt stream.
 *
 * Coordinates are top-left based (y grows downwards) because that is how the
 * layout code thinks; the conversion to PDF's bottom-left origin happens here.
 */

export const A4 = { width: 595.28, height: 841.89 }
export const A4_LANDSCAPE = { width: A4.height, height: A4.width }

const FONT_REGULAR = 'F1'
const FONT_BOLD = 'F2'

// ─── Encoding ──────────────────────────────────────────────────────────────

// WinAnsi (CP1252) positions for the characters that differ from Latin-1, i.e.
// the typographic punctuation the UI actually emits.
const WIN_ANSI_EXTRAS = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84,
  '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88,
  '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c,
  'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93,
  '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b,
  'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
}

/** Maps a code point to its WinAnsi byte, or null when unrepresentable. */
function winAnsiByte(char) {
  const code = char.codePointAt(0)
  // Control characters — a title pasted with a line break, most often — would
  // render as a stray glyph. A single line of text has no room for them, so
  // they collapse to a space instead.
  if (code < 0x20) return 0x20
  if (code <= 0x7e) return code
  if (code >= 0xa0 && code <= 0xff) return code
  return WIN_ANSI_EXTRAS[char] ?? null
}

/**
 * Encodes a string into a PDF literal string: WinAnsi bytes with the three
 * characters that terminate or escape a literal — ( ) \ — backslash-escaped.
 */
export function encodePdfText(text) {
  let out = ''
  for (const char of String(text ?? '')) {
    const byte = winAnsiByte(char)
    const encoded = byte == null ? 0x3f /* ? */ : byte
    const asChar = String.fromCharCode(encoded)
    out += '()\\'.includes(asChar) ? `\\${asChar}` : asChar
  }
  return out
}

// ─── Metrics ───────────────────────────────────────────────────────────────

// Helvetica / Helvetica-Bold advance widths for code points 32..126, in 1/1000
// em, straight from the Adobe AFM tables.
const WIDTHS_REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]
const WIDTHS_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
]

// Accented letters carry the advance width of their base letter in both faces,
// so folding them is exact rather than an approximation.
const ACCENT_FOLD = {
  á: 'a', à: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o', ø: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ñ: 'n', ç: 'c', ý: 'y', ÿ: 'y',
  Á: 'A', À: 'A', Â: 'A', Ä: 'A', Ã: 'A', Å: 'A',
  É: 'E', È: 'E', Ê: 'E', Ë: 'E',
  Í: 'I', Ì: 'I', Î: 'I', Ï: 'I',
  Ó: 'O', Ò: 'O', Ô: 'O', Ö: 'O', Õ: 'O', Ø: 'O',
  Ú: 'U', Ù: 'U', Û: 'U', Ü: 'U',
  Ñ: 'N', Ç: 'C',
}

const PUNCTUATION_WIDTHS = {
  '¡': 333, '¿': 611, '·': 278, '°': 400, 'º': 365, 'ª': 337,
  '«': 556, '»': 556, '–': 556, '—': 1000, '…': 1000, '€': 556,
  '™': 1000, '•': 350, '‘': 222, '’': 222, '“': 333, '”': 333,
}

function glyphWidth(char, bold) {
  const table = bold ? WIDTHS_BOLD : WIDTHS_REGULAR
  const folded = ACCENT_FOLD[char] ?? char
  const code = folded.charCodeAt(0)

  if (code >= 32 && code <= 126) return table[code - 32]
  return PUNCTUATION_WIDTHS[char] ?? table['n'.charCodeAt(0) - 32]
}

/**
 * Width of `text` at `size` points, in points. `tracking` mirrors the Tc
 * operator, which adds its value after every glyph — including the last.
 */
export function measureText(text, size, bold = false, tracking = 0) {
  const chars = [...String(text ?? '')]
  let total = 0
  for (const char of chars) total += glyphWidth(char, bold)
  return (total * size) / 1000 + tracking * chars.length
}

// ─── Colors ────────────────────────────────────────────────────────────────

/** '#caa860' or '#ca6' → [r, g, b] in the 0..1 range PDF operators expect. */
export function parseColor(hex) {
  let value = String(hex).replace('#', '')
  if (value.length === 3) value = value.split('').map((c) => c + c).join('')

  const int = parseInt(value, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => round(c / 255))
}

function round(n) {
  return Math.round(n * 1000) / 1000
}

// ─── Document ──────────────────────────────────────────────────────────────

export class PdfDocument {
  /**
   * @param {{ size?: {width:number,height:number}, margin?: number,
   *           title?: string, author?: string }} [options]
   */
  constructor({ size = A4, margin = 40, title = '', author = '' } = {}) {
    this.size = size
    this.margin = margin
    this.title = title
    this.author = author
    this.pages = []
    this.currentPage = -1
    this.addPage()
  }

  get pageCount() {
    return this.pages.length
  }

  get width() {
    return this.size.width
  }

  get height() {
    return this.size.height
  }

  get contentWidth() {
    return this.size.width - this.margin * 2
  }

  addPage() {
    this.pages.push([])
    this.currentPage = this.pages.length - 1
    return this.currentPage
  }

  /** Reopens an earlier page — used to stamp footers once the total is known. */
  usePage(index) {
    if (index < 0 || index >= this.pages.length) throw new RangeError(`No page ${index}`)
    this.currentPage = index
  }

  push(op) {
    this.pages[this.currentPage].push(op)
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  /**
   * @param {string} text
   * @param {number} x  left edge (or the alignment anchor)
   * @param {number} y  baseline, measured from the top of the page
   */
  text(text, x, y, { size = 10, bold = false, color = '#141414', align = 'left', maxWidth, tracking = 0 } = {}) {
    let value = String(text ?? '')
    if (maxWidth != null) value = truncateToWidth(value, maxWidth, size, bold, tracking)
    if (!value) return

    const width = measureText(value, size, bold, tracking)
    const anchorX = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x
    const [r, g, b] = parseColor(color)

    this.push(
      `BT ${r} ${g} ${b} rg /${bold ? FONT_BOLD : FONT_REGULAR} ${size} Tf ${round(tracking)} Tc ` +
      `${round(anchorX)} ${round(this.height - y)} Td (${encodePdfText(value)}) Tj ET`
    )
  }

  rect(x, y, width, height, { fill, stroke, lineWidth = 0.6 } = {}) {
    if (fill) {
      const [r, g, b] = parseColor(fill)
      this.push(`${r} ${g} ${b} rg ${round(x)} ${round(this.height - y - height)} ${round(width)} ${round(height)} re f`)
    }
    if (stroke) {
      const [r, g, b] = parseColor(stroke)
      this.push(
        `${r} ${g} ${b} RG ${lineWidth} w ` +
        `${round(x)} ${round(this.height - y - height)} ${round(width)} ${round(height)} re S`
      )
    }
  }

  line(x1, y1, x2, y2, { color = '#d8d3c9', width = 0.6 } = {}) {
    const [r, g, b] = parseColor(color)
    this.push(
      `${r} ${g} ${b} RG ${width} w ${round(x1)} ${round(this.height - y1)} m ` +
      `${round(x2)} ${round(this.height - y2)} l S`
    )
  }

  // ── Serialization ────────────────────────────────────────────────────────

  /**
   * Assembles the file. Every chunk is Latin-1, so string length equals byte
   * length and the xref offsets can be counted as characters.
   */
  toBytes() {
    const chunks = []
    let offset = 0
    const offsets = {}

    const push = (chunk) => {
      chunks.push(chunk)
      offset += chunk.length
    }
    const addObject = (id, body) => {
      offsets[id] = offset
      push(`${id} 0 obj\n${body}\nendobj\n`)
    }

    const pageIds = this.pages.map((_, i) => 6 + i * 2)
    const kids = pageIds.map((id) => `${id} 0 R`).join(' ')

    push('%PDF-1.4\n')
    // A binary comment marks the file as non-ASCII for tools that sniff it.
    push('%\xE2\xE3\xCF\xD3\n')

    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>')
    addObject(2, `<< /Type /Pages /Count ${this.pages.length} /Kids [${kids}] >>`)
    addObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    addObject(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    addObject(
      5,
      `<< /Title (${encodePdfText(this.title)}) /Author (${encodePdfText(this.author)}) ` +
      `/Producer (Kontrol) /Creator (Kontrol) /CreationDate (${pdfDate(new Date())}) >>`
    )

    this.pages.forEach((ops, i) => {
      const pageId = pageIds[i]
      const contentId = pageId + 1
      const stream = ops.join('\n')

      addObject(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${round(this.width)} ${round(this.height)}] ` +
        `/Resources << /Font << /${FONT_REGULAR} 3 0 R /${FONT_BOLD} 4 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`
      )
      addObject(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    })

    const maxId = 5 + this.pages.length * 2
    const xrefOffset = offset
    let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`
    for (let id = 1; id <= maxId; id++) {
      xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
    }
    push(xref)
    push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

    const file = chunks.join('')
    const bytes = new Uint8Array(file.length)
    for (let i = 0; i < file.length; i++) bytes[i] = file.charCodeAt(i) & 0xff
    return bytes
  }

  toBlob() {
    return new Blob([this.toBytes()], { type: 'application/pdf' })
  }
}

/** Shortens `text` with an ellipsis until it fits `maxWidth` points. */
export function truncateToWidth(text, maxWidth, size, bold = false, tracking = 0) {
  const value = String(text ?? '')
  if (measureText(value, size, bold, tracking) <= maxWidth) return value

  const ellipsis = '…'
  let end = value.length
  while (end > 0 && measureText(value.slice(0, end) + ellipsis, size, bold, tracking) > maxWidth) end--
  return end > 0 ? value.slice(0, end) + ellipsis : ''
}

/** Greedy word wrap; falls back to hard truncation for unbreakable words. */
export function wrapText(text, maxWidth, size, bold = false) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (measureText(candidate, size, bold) <= maxWidth) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = measureText(word, size, bold) <= maxWidth ? word : truncateToWidth(word, maxWidth, size, bold)
  }
  if (line) lines.push(line)
  return lines
}

/** PDF date string: D:YYYYMMDDHHmmSS+HH'mm' */
function pdfDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  const tz = -date.getTimezoneOffset()
  const sign = tz >= 0 ? '+' : '-'

  return (
    `D:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(Math.abs(tz) / 60))}'${pad(Math.abs(tz) % 60)}'`
  )
}
