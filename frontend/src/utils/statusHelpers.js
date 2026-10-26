export const STATUS_COLOR = {
  PLANIFICADO: 'var(--k-hue-blue)',
  EN_PROGRESO: 'var(--k-hue-emerald)',
  PAUSADO:     'var(--k-hue-orange)',
  COMPLETADO:  'var(--k-color-primary)',
  COMPLETADA:  'var(--k-color-primary)',
  CANCELADO:   'var(--k-hue-rose)',
  CANCELADA:   'var(--k-hue-rose)',
  PENDIENTE:   'var(--k-hue-blue)',
}

export const STATUS_LABEL = {
  PLANIFICADO: 'Planned',
  EN_PROGRESO: 'In Progress',
  PAUSADO:     'Paused',
  COMPLETADO:  'Completed',
  COMPLETADA:  'Completed',
  CANCELADO:   'Cancelled',
  CANCELADA:   'Cancelled',
  PENDIENTE:   'Pending',
}

// Un sufijo hex de alfa (c + '44') no se puede concatenar a un var().
export function withAlpha(color, alpha) {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 1000) / 10}%, transparent)`
}

export function statusStyle(estado) {
  const c = STATUS_COLOR[estado] || 'var(--k-gray-4)'
  return { color: c, borderColor: withAlpha(c, 0.267), background: withAlpha(c, 0.078) }
}

// El fallback a '—' importa: un proyecto sin estado producia el string
// "undefined" dentro del PDF y del CSV exportados.
export function statusLabel(estado) {
  return STATUS_LABEL[estado] || estado || '—'
}

export function statusPill(estado) {
  const c = STATUS_COLOR[estado] || 'var(--k-gray-5)'
  return { label: STATUS_LABEL[estado] || estado || '—', color: c, bg: withAlpha(c, 0.102) }
}

export const PRIORITY_COLOR = {
  BAJA:   'var(--k-gray-3)',
  MEDIA:  'var(--k-hue-blue)',
  ALTA:   'var(--k-hue-orange)',
  CRITICA:'var(--k-hue-rose)',
}

export function priorityColor(p) {
  return PRIORITY_COLOR[p] || 'var(--k-gray-3)'
}

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatMoney(val) {
  const n = Number(val || 0)
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toFixed(2)
}

export function formatBudget(n) {
  const num = parseFloat(n) || 0
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000)     return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

export function isOverdue(task) {
  if (!task.fecha_vencimiento) return false
  if (task.estado === 'COMPLETADA' || task.estado === 'CANCELADA') return false
  return new Date(task.fecha_vencimiento) < new Date()
}
