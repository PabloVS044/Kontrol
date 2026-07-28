import { describe, it, expect } from 'vitest'
import {
  IVA_RATE,
  round2,
  lineTotal,
  calcSubtotal,
  applyDiscount,
  calcSale,
} from '@/utils/sales.js'

// Lógica del punto de venta (POS): es el cálculo con mayor riesgo financiero
// del sistema, por eso cada caso de negocio se prueba de forma aislada.
describe('POS · lógica de ventas', () => {
  // 1. Total con un producto, cantidad 1.
  it('calcula el total de un solo producto con cantidad 1', () => {
    const lines = [{ precio: 100, cantidad: 1 }]
    expect(calcSubtotal(lines)).toBe(100)
    expect(calcSale(lines, { taxRate: 0 }).total).toBe(100)
  })

  // 2. Subtotal con múltiples líneas y cantidades distintas.
  it('suma subtotales de múltiples líneas con cantidades distintas', () => {
    const lines = [
      { precio: 100, cantidad: 2 }, // 200
      { precio: 55.5, cantidad: 3 }, // 166.5
      { precio: 10, cantidad: 1 }, //  10
    ]
    expect(calcSubtotal(lines)).toBe(376.5)
  })

  // 3. Descuento porcentual aplicado correctamente.
  it('aplica un descuento porcentual correctamente', () => {
    expect(applyDiscount(100, 10)).toBe(90)
    const { discount, total } = calcSale([{ precio: 100, cantidad: 1 }], {
      discountPercent: 10,
      taxRate: 0,
    })
    expect(discount).toBe(10)
    expect(total).toBe(90)
  })

  // 4. Descuento del 100% → total 0, nunca negativo.
  it('con descuento del 100% el total es 0 y nunca negativo', () => {
    expect(applyDiscount(250, 100)).toBe(0)
    expect(calcSale([{ precio: 250, cantidad: 2 }], { discountPercent: 100 }).total).toBe(0)
    // Un porcentaje mayor a 100 se limita: sigue siendo 0, jamás negativo.
    expect(applyDiscount(250, 150)).toBe(0)
    expect(calcSale([{ precio: 250, cantidad: 2 }], { discountPercent: 150 }).total).toBe(0)
  })

  // 5. Cálculo de IVA (12%) sobre el subtotal ya descontado.
  it('calcula el IVA (12%) sobre el subtotal ya descontado', () => {
    // Sin descuento: 100 + 12% = 112.
    const sinDescuento = calcSale([{ precio: 100, cantidad: 1 }], { taxRate: IVA_RATE })
    expect(sinDescuento.tax).toBe(12)
    expect(sinDescuento.total).toBe(112)

    // Con 10% de descuento: base gravable 90, IVA 10.8, total 100.8.
    const conDescuento = calcSale([{ precio: 100, cantidad: 1 }], {
      discountPercent: 10,
      taxRate: IVA_RATE,
    })
    expect(conDescuento.taxableBase).toBe(90)
    expect(conDescuento.tax).toBe(10.8)
    expect(conDescuento.total).toBe(100.8)
  })

  // 6. Orden de operaciones: descuento antes de impuesto.
  it('aplica el descuento antes del impuesto', () => {
    const { subtotal, discount, taxableBase, tax, total } = calcSale(
      [{ precio: 200, cantidad: 1 }],
      { discountPercent: 50, taxRate: IVA_RATE }
    )
    expect(subtotal).toBe(200)
    expect(discount).toBe(100)
    // El impuesto se calcula sobre la base ya descontada, no sobre el subtotal.
    expect(taxableBase).toBe(subtotal - discount) // 100
    expect(tax).toBe(round2(taxableBase * IVA_RATE)) // 12
    // Si el IVA se aplicara antes del descuento, tax sería 24: se descarta.
    expect(tax).not.toBe(round2(subtotal * IVA_RATE))
    expect(total).toBe(112)
  })

  // 7. Cantidad cero → la línea no suma al total.
  it('una línea con cantidad cero no suma al total', () => {
    expect(lineTotal({ precio: 100, cantidad: 0 })).toBe(0)
    const lines = [
      { precio: 100, cantidad: 0 },
      { precio: 50, cantidad: 2 },
    ]
    expect(calcSubtotal(lines)).toBe(100)
  })

  // 8. Producto sin precio o null → error controlado, no NaN.
  it('rechaza un producto sin precio con error controlado (no NaN)', () => {
    expect(() => lineTotal({ precio: null, cantidad: 1 })).toThrow()
    expect(() => lineTotal({ precio: undefined, cantidad: 1 })).toThrow()
    expect(() => lineTotal({ precio: 'abc', cantidad: 1 })).toThrow()
    expect(() => lineTotal({ precio: -5, cantidad: 1 })).toThrow()
    expect(() => calcSubtotal([{ precio: null, cantidad: 1 }])).toThrow()
  })

  // 9. Redondeo a dos decimales.
  it('redondea el resultado a dos decimales', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(2.675)).toBe(2.68)
    // 10.10 + 12% IVA = 11.312 → 11.31.
    expect(calcSale([{ precio: 10.1, cantidad: 1 }], { taxRate: IVA_RATE }).total).toBe(11.31)
    expect(lineTotal({ precio: 33.333, cantidad: 3 })).toBe(100)
  })

  // 10. Venta vacía → total 0.
  it('una venta vacía tiene total 0', () => {
    expect(calcSubtotal([])).toBe(0)
    expect(calcSale([]).total).toBe(0)
    expect(calcSubtotal(null)).toBe(0)
  })

  // 11. Cantidad negativa → rechazo por validación.
  it('rechaza cantidades negativas por validación', () => {
    expect(() => lineTotal({ precio: 100, cantidad: -1 })).toThrow()
    expect(() => lineTotal({ precio: 100, cantidad: 'x' })).toThrow()
    expect(() => calcSubtotal([{ precio: 100, cantidad: -2 }])).toThrow()
  })
})
