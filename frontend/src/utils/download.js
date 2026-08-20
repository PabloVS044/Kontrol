/** Browser file-download helpers shared by the export formats. */

/** Triggers a download of `blob` under `filename`. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Revoking synchronously cancels the download in Safari; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** ASCII, lowercase, hyphenated — safe on every filesystem. */
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** YYYY-MM-DD in local time, so the name matches the day the user sees. */
export function fileDateStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
