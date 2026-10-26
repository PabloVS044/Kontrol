/**
 * HU-32 · Colores de los indicadores de estado/prioridad del panel de tareas.
 *
 * Fork acotado de STATUS_COLOR/PRIORITY_COLOR (utils/statusHelpers.js): ese
 * archivo también lo consumen las pantallas de Reportes y el Dashboard, y
 * HU-32 tiene instrucción explícita de no tocar Reportes hasta que cierre
 * SCRUM-20. Este archivo solo lo importan TaskCard.vue y TaskDetailModal.vue.
 */

const STATUS_TOKEN = {
  PLANIFICADO: { text: 'var(--k-hue-blue)', rgb: 'var(--k-hue-blue-rgb)' },
  EN_PROGRESO: { text: 'var(--k-state-success-text)', rgb: 'var(--k-color-success-rgb)' },
  PAUSADO:     { text: 'var(--k-hue-orange)', rgb: 'var(--k-hue-orange-rgb)' },
  COMPLETADO:  { text: 'var(--k-color-primary)', rgb: 'var(--k-color-primary-rgb)' },
  COMPLETADA:  { text: 'var(--k-color-primary)', rgb: 'var(--k-color-primary-rgb)' },
  CANCELADO:   { text: 'var(--k-state-error-text)', rgb: 'var(--k-color-error-rgb)' },
  CANCELADA:   { text: 'var(--k-state-error-text)', rgb: 'var(--k-color-error-rgb)' },
  PENDIENTE:   { text: 'var(--k-hue-blue)', rgb: 'var(--k-hue-blue-rgb)' },
}

const DEFAULT_STATUS_TOKEN = { text: 'var(--k-gray-4)', rgb: 'var(--k-ink-rgb)' }

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
  MEDIA:   'var(--k-hue-blue)',
  ALTA:    'var(--k-hue-orange)',
  CRITICA: 'var(--k-state-error-text)',
}

export function taskPriorityColor(prioridad) {
  return PRIORITY_TOKEN[prioridad] || 'var(--k-gray-3)'
}
