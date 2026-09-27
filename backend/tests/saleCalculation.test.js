import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  IVA_RATE,
  DEFAULT_SALE_CONFIG,
  calcSale,
  calcSaleWithAllocation,
  calcSubtotal,
  lineTotal,
  normalizeSaleConfig,
  resolveSaleOptions,
  round2,
} from '../src/services/saleCalculation.js'

/**
 * Cálculo autoritativo de la venta.
 *
 * La primera mitad son pruebas de caracterización: los vectores compartidos de
 * `shared/test-vectors/` fijan el total actual antes de que nada se mueva, y los
 * corre también la suite del frontend. Mientras ambas pasen, el ticket no puede
 * mostrar una cifra distinta de la que se cobra y se informa.
 */
const vectors = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../shared/test-vectors/sale-calculation.json', import.meta.url)),
    'utf8'
  )
)

describe('saleCalculation — vectores compartidos con el frontend', () => {
  it('los vectores están presentes (si no, la parity no prueba nada)', () => {
    expect(vectors.cases.length).toBeGreaterThan(0)
  })

  for (const c of vectors.cases) {
    it(c.name, () => {
      const got = calcSale(c.lines, c.options ?? {})
      // Solo los campos comunes a las dos implementaciones.
      expect({
        subtotal: got.subtotal,
        discount: got.discount,
        taxableBase: got.taxableBase,
        tax: got.tax,
        total: got.total,
      }).toEqual(c.expected)
    })
  }
})

describe('saleCalculation — orden de operaciones y bordes', () => {
  it('el impuesto se calcula sobre el subtotal ya descontado, no sobre el bruto', () => {
    const { tax } = calcSale([{ precio: 100, cantidad: 1 }], { discountPercent: 50, taxRate: 0.12 })
    // Sobre el bruto serían 12; sobre la base descontada, 6.
    expect(tax).toBe(6)
  })

  it('sin impuesto explícito no inventa IVA', () => {
    // El backend exige decir la tasa: un default de 0.12 aquí cobraría IVA a
    // una empresa que lo tiene desactivado.
    expect(calcSale([{ precio: 100, cantidad: 1 }]).total).toBe(100)
  })

  it('rechaza un producto sin precio con error controlado, nunca NaN', () => {
    expect(() => calcSubtotal([{ precio: null, cantidad: 1 }])).toThrow()
    expect(() => lineTotal({ precio: 'abc', cantidad: 1 })).toThrow()
  })

  it('rechaza cantidades negativas', () => {
    expect(() => calcSubtotal([{ precio: 10, cantidad: -1 }])).toThrow()
  })

  it('un precio negativo se rechaza', () => {
    expect(() => lineTotal({ precio: -1, cantidad: 1 })).toThrow()
  })

  it('round2 no arrastra el error clásico de coma flotante', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(0.07 * 300)).toBe(21)
  })

  it('acepta precio_unitario como nombre de campo (forma del backend)', () => {
    expect(lineTotal({ precio_unitario: '12.50', cantidad: 2 })).toBe(25)
  })
})

describe('normalizeSaleConfig', () => {
  it('sin fila devuelve los defaults: ni IVA ni descuento', () => {
    expect(normalizeSaleConfig(null)).toEqual({ ...DEFAULT_SALE_CONFIG })
    expect(normalizeSaleConfig(undefined).iva_activo).toBe(false)
  })

  it('el default no cambia lo que cobra una empresa que ya operaba', () => {
    // Activar IVA por defecto habría subido un 12% cada venta en silencio.
    expect(DEFAULT_SALE_CONFIG.iva_activo).toBe(false)
    expect(DEFAULT_SALE_CONFIG.descuento_activo).toBe(false)
  })

  it('numeric de Postgres llega como string y se normaliza', () => {
    const cfg = normalizeSaleConfig({
      iva_activo: true,
      iva_tasa: '0.12',
      descuento_activo: true,
      descuento_max_pct: '15',
    })
    expect(cfg).toEqual({
      iva_activo: true,
      iva_tasa: 0.12,
      descuento_activo: true,
      descuento_max_pct: 15,
    })
  })

  it('una tasa fuera de rango cae a la tasa por defecto', () => {
    expect(normalizeSaleConfig({ iva_tasa: '7' }).iva_tasa).toBe(IVA_RATE)
    expect(normalizeSaleConfig({ iva_tasa: '-1' }).iva_tasa).toBe(IVA_RATE)
  })

  it('solo el booleano verdadero activa; un valor suelto no', () => {
    expect(normalizeSaleConfig({ iva_activo: 'true' }).iva_activo).toBe(false)
    expect(normalizeSaleConfig({ iva_activo: 1 }).iva_activo).toBe(false)
  })
})

describe('resolveSaleOptions — la config manda sobre lo que pide el cliente', () => {
  const activa = { iva_activo: true, iva_tasa: '0.12', descuento_activo: true, descuento_max_pct: '20' }

  it('con IVA activo pasa la tasa de la empresa', () => {
    const res = resolveSaleOptions(activa, { discountPercent: 0 })
    expect(res.ok).toBe(true)
    expect(res.options.taxRate).toBe(0.12)
  })

  it('con IVA desactivado la tasa es 0 aunque haya tasa guardada', () => {
    const res = resolveSaleOptions({ ...activa, iva_activo: false })
    expect(res.options.taxRate).toBe(0)
  })

  it('un descuento dentro del tope se acepta', () => {
    const res = resolveSaleOptions(activa, { discountPercent: 20 })
    expect(res.ok).toBe(true)
    expect(res.options.discountPercent).toBe(20)
  })

  it('un descuento por encima del tope se RECHAZA, no se recorta', () => {
    // Recortar en silencio dejaría al cliente pagando algo distinto de lo que
    // se le dijo en el mostrador.
    const res = resolveSaleOptions(activa, { discountPercent: 30 })
    expect(res.ok).toBe(false)
    expect(res.code).toBe('DISCOUNT_ABOVE_MAX')
    expect(res.message).toContain('20')
  })

  it('con el descuento desactivado, pedir descuento se rechaza', () => {
    const res = resolveSaleOptions({ ...activa, descuento_activo: false }, { discountPercent: 5 })
    expect(res.ok).toBe(false)
    expect(res.code).toBe('DISCOUNT_DISABLED')
  })

  it('con el descuento desactivado, no pedir descuento sigue vendiendo', () => {
    const res = resolveSaleOptions({ ...activa, descuento_activo: false }, { discountPercent: 0 })
    expect(res.ok).toBe(true)
    expect(res.options.discountPercent).toBe(0)
  })

  it('un descuento negativo o no numérico se rechaza', () => {
    expect(resolveSaleOptions(activa, { discountPercent: -5 }).code).toBe('DISCOUNT_INVALID')
    expect(resolveSaleOptions(activa, { discountPercent: 'diez' }).code).toBe('DISCOUNT_INVALID')
  })

  it('sin config guardada no hay IVA ni descuento posible', () => {
    expect(resolveSaleOptions(null).options.taxRate).toBe(0)
    expect(resolveSaleOptions(null, { discountPercent: 1 }).code).toBe('DISCOUNT_DISABLED')
  })
})

/**
 * Reparto del descuento y del IVA entre las líneas.
 *
 * La propiedad que importa es que el reparto sume EXACTAMENTE el importe de la
 * cabecera. Si no, el informe filtrado por proyecto deja de cuadrar con el
 * ticket por céntimos, y ese descuadre no se nota hasta que alguien audita.
 */
describe('calcSaleWithAllocation — el reparto cuadra al céntimo', () => {
  // Se suma en céntimos enteros, no en decimales: `0.12 + 3.06` en coma flotante
  // da 3.1799999999999997 y el descuadre sería del test, no del reparto. En la
  // base la columna es `numeric`, que es aritmética decimal exacta, así que
  // sumar céntimos es lo que refleja lo que hará SUM() en Postgres.
  const sum = (arr, key) =>
    arr.reduce((acc, l) => acc + Math.round(l[key] * 100), 0) / 100

  it('una sola línea se queda todo el descuento y todo el IVA', () => {
    const { header, lines } = calcSaleWithAllocation(
      [{ precio: 100, cantidad: 1 }],
      { discountPercent: 10, taxRate: 0.12 }
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].descuento_linea).toBe(header.discount)
    expect(lines[0].iva_linea).toBe(header.tax)
  })

  it('tres líneas iguales: el céntimo que no divide no se pierde', () => {
    // 10.00 entre tres da 3.333…; redondear cada parte daría 9.99 o 10.01.
    const { header, lines } = calcSaleWithAllocation(
      [
        { precio: 33.34, cantidad: 1 },
        { precio: 33.33, cantidad: 1 },
        { precio: 33.33, cantidad: 1 },
      ],
      { discountPercent: 10, taxRate: 0 }
    )
    expect(header.subtotal).toBe(100)
    expect(header.discount).toBe(10)
    expect(sum(lines, 'descuento_linea')).toBe(10)
  })

  it('el reparto es proporcional al importe de cada línea', () => {
    const { lines } = calcSaleWithAllocation(
      [
        { precio: 75, cantidad: 1 },
        { precio: 25, cantidad: 1 },
      ],
      { discountPercent: 20, taxRate: 0 }
    )
    // 20% de 100 = 20, repartido 75/25.
    expect(lines[0].descuento_linea).toBe(15)
    expect(lines[1].descuento_linea).toBe(5)
  })

  it('con IVA y descuento, ambos repartos suman su cabecera', () => {
    const { header, lines } = calcSaleWithAllocation(
      [
        { precio: 19.99, cantidad: 2 },
        { precio: 5.25, cantidad: 4 },
        { precio: 0.99, cantidad: 7 },
      ],
      { discountPercent: 15, taxRate: 0.12 }
    )
    expect(sum(lines, 'descuento_linea')).toBe(header.discount)
    expect(sum(lines, 'iva_linea')).toBe(header.tax)
  })

  it('una línea con importe cero no recibe reparto', () => {
    const { lines } = calcSaleWithAllocation(
      [
        { precio: 100, cantidad: 1 },
        { precio: 50, cantidad: 0 },
      ],
      { discountPercent: 10, taxRate: 0.12 }
    )
    expect(lines[1].descuento_linea).toBe(0)
    expect(lines[1].iva_linea).toBe(0)
  })

  it('sin descuento ni IVA el reparto es todo cero', () => {
    const { lines } = calcSaleWithAllocation(
      [{ precio: 100, cantidad: 2 }],
      { discountPercent: 0, taxRate: 0 }
    )
    expect(lines[0].descuento_linea).toBe(0)
    expect(lines[0].iva_linea).toBe(0)
  })

  it('un descuento del 100% se reparte entero y deja el total en cero', () => {
    const { header, lines } = calcSaleWithAllocation(
      [
        { precio: 33.33, cantidad: 1 },
        { precio: 66.67, cantidad: 1 },
      ],
      { discountPercent: 100, taxRate: 0.12 }
    )
    expect(header.total).toBe(0)
    expect(sum(lines, 'descuento_linea')).toBe(100)
    expect(sum(lines, 'iva_linea')).toBe(0)
  })

  it('una venta vacía no produce líneas', () => {
    const { header, lines } = calcSaleWithAllocation([], { taxRate: 0.12 })
    expect(lines).toEqual([])
    expect(header.total).toBe(0)
  })

  it('el reparto no depende del orden de las líneas', () => {
    const a = calcSaleWithAllocation(
      [{ precio: 10, cantidad: 1 }, { precio: 20, cantidad: 1 }],
      { discountPercent: 7, taxRate: 0.12 }
    )
    const b = calcSaleWithAllocation(
      [{ precio: 20, cantidad: 1 }, { precio: 10, cantidad: 1 }],
      { discountPercent: 7, taxRate: 0.12 }
    )
    expect(a.lines[0].descuento_linea).toBe(b.lines[1].descuento_linea)
    expect(a.lines[1].descuento_linea).toBe(b.lines[0].descuento_linea)
  })

  it('cuadra con muchas líneas de céntimos incómodos (propiedad, 200 casos)', () => {
    // Barrido: es donde aparecen los descuadres de un céntimo.
    for (let n = 1; n <= 8; n++) {
      for (let pct = 1; pct <= 25; pct++) {
        const lines = Array.from({ length: n }, (_, i) => ({
          precio: 0.01 + i * 3.37,
          cantidad: (i % 3) + 1,
        }))
        const { header, lines: split } = calcSaleWithAllocation(lines, {
          discountPercent: pct,
          taxRate: 0.12,
        })
        expect(sum(split, 'descuento_linea')).toBe(header.discount)
        expect(sum(split, 'iva_linea')).toBe(header.tax)
      }
    }
  })
})
