/**
 * Rangos de fecha del historial de ventas.
 *
 * Los extremos se mandan en hora LOCAL del navegador y sin zona
 * ("2026-10-27T00:00:00"), junto con `tz`: el backend los convierte al reloj
 * UTC de la columna. Es el mismo contrato que usa Reportes.
 */

export const RANGE_PRESETS = ['today', 'week', 'month', 'custom']

const pad = (n) => String(n).padStart(2, '0')

/** Fecha y hora local sin zona, tal como la espera el backend. */
export function toLocalDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** Fecha local para un <input type="date">. */
export function toDateInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-10-27" → Date a las 00:00 locales; null si no es una fecha. */
function fromDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)

/**
 * Rango de un preset: { desde, hasta, from, to } o null si el personalizado está
 * incompleto o al revés. `from`/`to` son Date para pintar la etiqueta.
 *
 * La semana empieza el lunes y el mes el día 1: son los periodos con los que se
 * cuadra la caja, no "los últimos 7 días". Ambos llegan hasta el final de hoy.
 */
export function rangeFor(preset, { now = new Date(), from: customFrom, to: customTo } = {}) {
  let from
  let to = endOfDay(now)

  if (preset === 'today') {
    from = startOfDay(now)
  } else if (preset === 'week') {
    from = startOfDay(now)
    // getDay(): 0 domingo … 6 sábado. Retrocede hasta el lunes.
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7))
  } else if (preset === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (preset === 'custom') {
    const start = fromDateInput(customFrom)
    const end = fromDateInput(customTo)
    if (!start || !end || start > end) return null
    from = start
    to = endOfDay(end)
  } else {
    return null
  }

  return { desde: toLocalDateTime(from), hasta: toLocalDateTime(to), from, to }
}
