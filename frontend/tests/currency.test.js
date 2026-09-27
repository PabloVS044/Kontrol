import { describe, it, expect } from 'vitest'
import {
  CURRENCIES,
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  currencySymbol,
  formatMoney,
} from '@/utils/currency.js'

/**
 * Moneda de venta.
 *
 * La configuración guarda el código ISO 4217 y no el símbolo, porque "$" lo
 * comparten varias monedas. Aquí se fija la traducción y el formato, que es lo
 * que impide que el carrito, el cobro y el ticket usen criterios distintos.
 */
describe('currency — símbolo por código', () => {
  it('dólar y quetzal tienen su símbolo', () => {
    expect(currencySymbol('USD')).toBe('$')
    expect(currencySymbol('GTQ')).toBe('Q.')
  })

  it('un código desconocido cae al de por defecto, no a vacío', () => {
    // Un importe sin unidad es peor que uno con la unidad genérica.
    expect(currencySymbol('XYZ')).toBe(CURRENCIES[DEFAULT_CURRENCY].symbol)
    expect(currencySymbol(undefined)).toBe('$')
  })

  it('el selector ofrece las dos monedas admitidas', () => {
    expect(CURRENCY_OPTIONS.map((c) => c.code)).toEqual(['USD', 'GTQ'])
  })
})

describe('currency — formato del importe', () => {
  it('antepone el símbolo con dos decimales', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1234.50')
    expect(formatMoney(1234.5, 'GTQ')).toBe('Q.1234.50')
  })

  it('el signo va delante del símbolo, no entre símbolo e importe', () => {
    // "-$32", nunca "$-32".
    expect(formatMoney(-32, 'USD')).toBe('-$32.00')
    expect(formatMoney(-32, 'GTQ')).toBe('-Q.32.00')
  })

  it('un valor no numérico cae a cero en vez de mostrar NaN', () => {
    expect(formatMoney(undefined, 'USD')).toBe('$0.00')
    expect(formatMoney('no soy un número', 'GTQ')).toBe('Q.0.00')
  })

  it('acepta el importe como cadena, que es como llega de Postgres', () => {
    expect(formatMoney('28.50', 'GTQ')).toBe('Q.28.50')
  })

  it('sin moneda usa la de por defecto', () => {
    expect(formatMoney(10)).toBe('$10.00')
  })

  it('puede omitir los decimales', () => {
    expect(formatMoney(1234.6, 'USD', { decimals: false })).toBe('$1,235')
  })
})
