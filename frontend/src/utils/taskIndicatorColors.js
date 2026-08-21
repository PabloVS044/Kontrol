/**
 * HU-32 · Colores de los indicadores de estado/prioridad del panel de tareas.
 *
 * Fork acotado de STATUS_COLOR/PRIORITY_COLOR (utils/statusHelpers.js): ese
 * archivo también lo consumen las pantallas de Reportes y el Dashboard, y
 * HU-32 tiene instrucción explícita de no tocar Reportes hasta que cierre
 * SCRUM-20. Este archivo solo lo importan TaskCard.vue y TaskDetailModal.vue.
 *
 * TODO SCRUM-16: '#60a5fa' (azul) y '#f97316' (naranja) no tienen token en la
 * paleta v2 — mismo hueco ya documentado en ProjectsView.vue y
 * ProjectDetailView.vue; se dejan como literal hasta que Diseño lo resuelva.
 */

const STATUS_TOKEN = {
  PLANIFICADO: { text: '#60a5fa', rgb: '96, 165, 250' },
  EN_PROGRESO: { text: 'var(--k-state-success-text)', rgb: 'var(--k-color-success-rgb)' },
  PAUSADO:     { text: '#f97316', rgb: '249, 115, 22' },
  COMPLETADO:  { text: 'var(--k-color-primary)', rgb: 'var(--k-color-primary-rgb)' },
  COMPLETADA:  { text: 'var(--k-color-primary)', rgb: 'var(--k-color-primary-rgb)' },
  CANCELADO:   { text: 'var(--k-state-error-text)', rgb: 'var(--k-color-error-rgb)' },
  CANCELADA:   { text: 'var(--k-state-error-text)', rgb: 'var(--k-color-error-rgb)' },
  PENDIENTE:   { text: '#60a5fa', rgb: '96, 165, 250' },
}

const DEFAULT_STATUS_TOKEN = { text: 'var(--k-gray-4)', rgb: '102, 102, 102' }

/**
 * Equivalente tokenizado de statusStyle(): mismos niveles de opacidad
 * (borde ~27%, fondo ~8%) que el original expresaba concatenando hex + alfa
 * — algo que no funciona con var(), de ahí el rgba() explícito.
 */
export function taskStatusStyle(estado) {
  const { text, rgb } = STATUS_TOKEN[estado] || DEFAULT_STATUS_TOKEN
  return {
    color: text,
    borderColor: `rgba(${rgb}, 0.27)`,
    background: `rgba(${rgb}, 0.08)`,
  }
}

const PRIORITY_TOKEN = {
  BAJA:    'var(--k-gray-3)',
  MEDIA:   '#60a5fa',
  ALTA:    '#f97316',
  CRITICA: 'var(--k-state-error-text)',
}

export function taskPriorityColor(prioridad) {
  return PRIORITY_TOKEN[prioridad] || 'var(--k-gray-3)'
}
