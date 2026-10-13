import { describe, it, expect } from 'vitest'
import { resolveStockEntry } from '@/utils/boxPricing.js'

describe('resolveStockEntry — modo unidad', () => {
  it('usa unidad por defecto y trunca la cantidad', () => {
    expect(resolveStockEntry({ unidades: '12.9', precioUnitario: '3.5' })).toEqual({
      cantidad: 12,
      costoUnitario: 3.5,
    })
  })

  it('acepta costo cero', () => {
    expect(resolveStockEntry({ unidades: 1, precioUnitario: 0 })).toEqual({
      cantidad: 1,
      costoUnitario: 0,
    })
  })

  it('devuelve null en cantidad no positiva y costo negativo o no numérico', () => {
    expect(resolveStockEntry({ unidades: 0, precioUnitario: -1 })).toEqual({
      cantidad: null,
      costoUnitario: null,
    })
    expect(resolveStockEntry({ unidades: 'x', precioUnitario: 'y' })).toEqual({
      cantidad: null,
      costoUnitario: null,
    })
  })

  it('sin argumentos no lanza y deja ambos en null', () => {
    expect(resolveStockEntry()).toEqual({ cantidad: null, costoUnitario: null })
  })
})

describe('resolveStockEntry — modo caja', () => {
  it('multiplica cajas por unidades y reparte el precio de la caja', () => {
    expect(
      resolveStockEntry({ modo: 'caja', cajas: 3, unidadesPorCaja: 12, precioCaja: 100 })
    ).toEqual({ cantidad: 36, costoUnitario: 8.33 })
  })

  it('redondea el costo unitario a dos decimales', () => {
    expect(
      resolveStockEntry({ modo: 'caja', cajas: 1, unidadesPorCaja: 3, precioCaja: 10 }).costoUnitario
    ).toBe(3.33)
  })

  it('sin unidades por caja no puede calcular costo unitario', () => {
    expect(
      resolveStockEntry({ modo: 'caja', cajas: 2, unidadesPorCaja: 0, precioCaja: 50 })
    ).toEqual({ cantidad: null, costoUnitario: null })
  })

  it('rechaza precio de caja negativo o entradas no numéricas', () => {
    expect(
      resolveStockEntry({ modo: 'caja', cajas: 2, unidadesPorCaja: 5, precioCaja: -10 })
    ).toEqual({ cantidad: 10, costoUnitario: null })
    expect(
      resolveStockEntry({ modo: 'caja', cajas: 'a', unidadesPorCaja: 5, precioCaja: 'b' })
    ).toEqual({ cantidad: null, costoUnitario: null })
  })
})
