import { describe, it, expect } from 'vitest'
import { taskStatusStyle, taskPriorityColor } from '@/utils/taskIndicatorColors.js'

describe('taskStatusStyle', () => {
  it('arma color, borde y fondo con la opacidad del original', () => {
    expect(taskStatusStyle('PAUSADO')).toEqual({
      color: 'var(--k-hue-orange)',
      borderColor: 'rgba(var(--k-hue-orange-rgb), 0.27)',
      background: 'rgba(var(--k-hue-orange-rgb), 0.08)',
    })
  })

  it('usa tokens para los estados con token y gris para los desconocidos', () => {
    expect(taskStatusStyle('EN_PROGRESO').color).toBe('var(--k-state-success-text)')
    expect(taskStatusStyle('INEXISTENTE')).toEqual({
      color: 'var(--k-gray-4)',
      borderColor: 'rgba(var(--k-ink-rgb), 0.27)',
      background: 'rgba(var(--k-ink-rgb), 0.08)',
    })
  })
})

describe('taskPriorityColor', () => {
  it('mapea cada prioridad y cae a gris para las desconocidas', () => {
    expect(taskPriorityColor('CRITICA')).toBe('var(--k-state-error-text)')
    expect(taskPriorityColor('MEDIA')).toBe('var(--k-hue-blue)')
    expect(taskPriorityColor(undefined)).toBe('var(--k-gray-3)')
  })
})
