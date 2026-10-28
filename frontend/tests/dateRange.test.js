import { describe, it, expect } from 'vitest'
import { rangeFor, toDateInput, toLocalDateTime } from '@/utils/dateRange.js'

// Jueves 15 de octubre de 2026, 14:30 locales.
const now = new Date(2026, 9, 15, 14, 30, 0)

describe('rangeFor — periodos del historial de ventas', () => {
  it('hoy va de las 00:00 a las 23:59:59 del día', () => {
    expect(rangeFor('today', { now })).toMatchObject({
      desde: '2026-10-15T00:00:00',
      hasta: '2026-10-15T23:59:59',
    })
  })

  it('la semana empieza el lunes', () => {
    expect(rangeFor('week', { now }).desde).toBe('2026-10-12T00:00:00')
    // Un domingo pertenece a la semana que empezó seis días antes.
    expect(rangeFor('week', { now: new Date(2026, 9, 18, 9) }).desde).toBe('2026-10-12T00:00:00')
    // Y un lunes empieza la suya.
    expect(rangeFor('week', { now: new Date(2026, 9, 12, 9) }).desde).toBe('2026-10-12T00:00:00')
  })

  it('el mes empieza el día 1 y llega hasta el final de hoy', () => {
    expect(rangeFor('month', { now })).toMatchObject({
      desde: '2026-10-01T00:00:00',
      hasta: '2026-10-15T23:59:59',
    })
  })

  it('el personalizado cubre los dos días completos', () => {
    expect(rangeFor('custom', { now, from: '2026-09-28', to: '2026-10-02' })).toMatchObject({
      desde: '2026-09-28T00:00:00',
      hasta: '2026-10-02T23:59:59',
    })
  })

  it('un personalizado incompleto o al revés no es un rango', () => {
    expect(rangeFor('custom', { now, from: '2026-10-02', to: '' })).toBeNull()
    expect(rangeFor('custom', { now, from: '2026-10-05', to: '2026-10-02' })).toBeNull()
    expect(rangeFor('custom', { now, from: 'ayer', to: '2026-10-02' })).toBeNull()
    expect(rangeFor('desconocido', { now })).toBeNull()
  })
})

describe('formatos locales', () => {
  it('fecha y hora sin zona, como las espera el backend', () => {
    expect(toLocalDateTime(new Date(2026, 0, 5, 7, 4, 9))).toBe('2026-01-05T07:04:09')
  })

  it('fecha para un input de tipo date', () => {
    expect(toDateInput(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
