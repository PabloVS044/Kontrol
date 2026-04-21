export const STATUS_COLOR = {
  PLANIFICADO: '#60a5fa',
  EN_PROGRESO: '#34d399',
  PAUSADO:     '#f97316',
  COMPLETADO:  '#c9a962',
  COMPLETADA:  '#c9a962',
  CANCELADO:   '#fb7185',
  CANCELADA:   '#fb7185',
  PENDIENTE:   '#60a5fa',
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

export function statusStyle(estado) {
  const c = STATUS_COLOR[estado] || '#666'
  return { color: c, borderColor: c + '44', background: c + '14' }
}

export function statusLabel(estado) {
  return STATUS_LABEL[estado] || estado
}

export function statusPill(estado) {
  const c = STATUS_COLOR[estado] || '#888'
  return { label: STATUS_LABEL[estado] || estado, color: c, bg: c + '1a' }
}

export const PRIORITY_COLOR = {
  BAJA:   '#555',
  MEDIA:  '#60a5fa',
  ALTA:   '#f97316',
  CRITICA:'#fb7185',
}

export function priorityColor(p) {
  return PRIORITY_COLOR[p] || '#555'
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
