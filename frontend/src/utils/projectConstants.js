export const ESTADOS = [
  { value: 'PLANIFICADO', label: 'Planned' },
  { value: 'EN_PROGRESO', label: 'In Progress' },
  { value: 'PAUSADO',     label: 'Paused' },
  { value: 'COMPLETADO',  label: 'Completed' },
  { value: 'CANCELADO',   label: 'Cancelled' }
]

export const STATUS_COLOR = {
  PLANIFICADO: '#60a5fa',
  EN_PROGRESO: '#34d399',
  PAUSADO:     '#f97316',
  COMPLETADO:  '#caa860',
  CANCELADO:   '#fb7185'
}

export const STATUS_PROGRESS = {
  PLANIFICADO: 10,
  EN_PROGRESO: 60,
  PAUSADO:     35,
  COMPLETADO:  100,
  CANCELADO:   5
}