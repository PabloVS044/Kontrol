import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  statusStyle,
  statusLabel,
  statusPill,
  priorityColor,
  formatMoney,
  formatBudget,
  isOverdue,
} from '@/utils/statusHelpers.js'

describe('statusStyle / statusLabel / statusPill', () => {
  it('devuelve el color correcto para un estado conocido', () => {
    const style = statusStyle('EN_PROGRESO')
    expect(style.color).toBe('#34d399')
    expect(style.borderColor).toBe('#34d39944')
  })

  it('usa color gris por defecto para estados desconocidos', () => {
    expect(statusStyle('INEXISTENTE').color).toBe('#666')
  })

  it('traduce estados al inglés y deja pasar valores desconocidos', () => {
    expect(statusLabel('EN_PROGRESO')).toBe('In Progress')
    expect(statusLabel('RARO')).toBe('RARO')
  })

  it('statusPill combina etiqueta, color y fondo', () => {
    // El dorado de COMPLETADO se alineó con --k-color-primary (#caa860); antes
    // era un literal aparte (#c9a962) que no coincidía con el token de marca.
    expect(statusPill('COMPLETADO')).toEqual({
      label: 'Completed',
      color: '#caa860',
      bg: '#caa8601a',
    })
  })
})

describe('priorityColor', () => {
  it('mapea prioridades y usa fallback', () => {
    expect(priorityColor('CRITICA')).toBe('#fb7185')
    expect(priorityColor('OTRA')).toBe('#555')
  })
})

describe('formatMoney / formatBudget', () => {
  it('abrevia millones y miles', () => {
    expect(formatMoney(2_500_000)).toBe('2.5M')
    expect(formatMoney(1_500)).toBe('1.5K')
    expect(formatMoney(999)).toBe('999.00')
  })

  it('tolera valores nulos o vacíos', () => {
    expect(formatMoney(null)).toBe('0.00')
    expect(formatBudget(undefined)).toBe('$0')
  })

  it('formatBudget antepone el símbolo de dólar', () => {
    expect(formatBudget(3_200_000)).toBe('$3.2M')
    expect(formatBudget(4_500)).toBe('$5K')
    expect(formatBudget(80)).toBe('$80')
  })
})

describe('isOverdue', () => {
  afterEach(() => vi.useRealTimers())

  it('detecta tareas vencidas con fecha en el pasado', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00Z'))

    expect(isOverdue({ fecha_vencimiento: '2026-07-01', estado: 'EN_PROGRESO' })).toBe(true)
    expect(isOverdue({ fecha_vencimiento: '2026-08-01', estado: 'EN_PROGRESO' })).toBe(false)
  })

  it('nunca marca vencidas las tareas completadas o canceladas', () => {
    expect(isOverdue({ fecha_vencimiento: '2020-01-01', estado: 'COMPLETADA' })).toBe(false)
    expect(isOverdue({ fecha_vencimiento: '2020-01-01', estado: 'CANCELADA' })).toBe(false)
  })

  it('sin fecha de vencimiento no hay atraso', () => {
    expect(isOverdue({ estado: 'EN_PROGRESO' })).toBe(false)
  })
})
