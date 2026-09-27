/**
 * Cálculo autoritativo de una venta del POS.
 *
 * Esta es la única fuente de verdad del dinero: el backend calcula subtotal,
 * descuento, IVA y total, los persiste, y los devuelve para el ticket. El
 * navegador puede calcular lo mismo para pintar el carrito, pero lo que se
 * cobra y lo que informa el reporte sale de aquí.
 *
 * Orden de operaciones (garantizado): subtotal → descuento → impuesto. El
 * impuesto se calcula sobre el subtotal YA descontado.
 *
 * Funciones puras, sin red ni base de datos, para poder probarlas aisladas.
 * Los vectores de `shared/test-vectors/sale-calculation.json` fijan el contrato
 * que este módulo comparte con `frontend/src/utils/sales.js`, para que las dos
 * implementaciones no puedan divergir sin que un test lo cace.
 */

/** IVA vigente en Guatemala (12%). Solo es el valor por defecto de la config. */
export const IVA_RATE = 0.12

/**
 * Redondea a dos decimales evitando los errores clásicos de coma flotante
 * (p. ej. 1.005 → 1.01). Los valores no numéricos se tratan como 0.
 */
export function round2(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Valida y normaliza un precio. Un precio nulo, vacío o no numérico produce un
 * error controlado (nunca NaN, que se propagaría hasta el total cobrado).
 */
function toPrice(precio) {
  if (precio === null || precio === undefined || precio === '') {
    throw new Error('El producto no tiene precio.')
  }
  const n = Number(precio)
  if (!Number.isFinite(n)) {
    throw new Error('El precio del producto no es un número válido.')
  }
  if (n < 0) {
    throw new Error('El precio del producto no puede ser negativo.')
  }
  return n
}

/**
 * Valida y normaliza la cantidad de una línea.
 * La cantidad 0 es válida (no suma al total); una negativa se rechaza.
 */
function toQuantity(cantidad) {
  const n = Number(cantidad)
  if (!Number.isFinite(n)) {
    throw new Error('La cantidad no es un número válido.')
  }
  if (n < 0) {
    throw new Error('La cantidad no puede ser negativa.')
  }
  return n
}

/** Normaliza un porcentaje al rango [0, 100]. Inválido o negativo → 0. */
function clampPercent(percent) {
  const n = Number(percent)
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 100) return 100
  return n
}

/**
 * Subtotal de una línea (precio × cantidad), redondeado a 2 decimales.
 * Acepta `{ precio, cantidad }` o `{ precio_unitario, cantidad }`.
 */
export function lineTotal(line) {
  const precio = toPrice(line?.precio ?? line?.precio_unitario ?? line?.precio_venta)
  const cantidad = toQuantity(line?.cantidad)
  return round2(precio * cantidad)
}

/** Suma de los subtotales de todas las líneas. Una venta vacía devuelve 0. */
export function calcSubtotal(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return 0
  const sum = lines.reduce((acc, line) => acc + lineTotal(line), 0)
  return round2(sum)
}

/**
 * Desglose completo de una venta.
 *
 * @param {Array}  lines Líneas de la venta.
 * @param {object} [options]
 * @param {number} [options.discountPercent=0] Descuento porcentual [0, 100].
 * @param {number} [options.taxRate=0] Tasa de impuesto (0.12 = 12%).
 * @returns {{subtotal:number, discountPercent:number, discount:number,
 *            taxableBase:number, taxRate:number, tax:number, total:number}}
 */
export function calcSale(lines, { discountPercent = 0, taxRate = 0 } = {}) {
  const subtotal = calcSubtotal(lines)

  const pct = clampPercent(discountPercent)
  const discount = round2(subtotal * (pct / 100))
  const taxableBase = round2(Math.max(subtotal - discount, 0))

  const rate = Number.isFinite(Number(taxRate)) && Number(taxRate) > 0 ? Number(taxRate) : 0
  const tax = round2(taxableBase * rate)
  const total = round2(Math.max(taxableBase + tax, 0))

  return { subtotal, discountPercent: pct, discount, taxableBase, taxRate: rate, tax, total }
}

/* ── configuración de empresa ─────────────────────────────────────────────── */

/**
 * Config por defecto: sin IVA y sin descuento. Es lo que se aplica a una empresa
 * que todavía no tiene fila en `empresa_config`, y equivale al comportamiento
 * anterior a esta función (total = subtotal), de modo que habilitar la tabla no
 * cambia lo que cobra nadie hasta que lo activa.
 */
export const DEFAULT_SALE_CONFIG = Object.freeze({
  iva_activo: false,
  iva_tasa: IVA_RATE,
  descuento_activo: false,
  descuento_max_pct: 0,
})

/** Normaliza una fila de `empresa_config` (o su ausencia) a valores usables. */
export function normalizeSaleConfig(row) {
  if (!row) return { ...DEFAULT_SALE_CONFIG }
  const tasa = Number(row.iva_tasa)
  const maxPct = Number(row.descuento_max_pct)
  return {
    iva_activo: row.iva_activo === true,
    iva_tasa: Number.isFinite(tasa) && tasa >= 0 && tasa <= 1 ? tasa : IVA_RATE,
    descuento_activo: row.descuento_activo === true,
    descuento_max_pct: Number.isFinite(maxPct) ? clampPercent(maxPct) : 0,
  }
}

/**
 * Traduce la config de la empresa a las opciones de `calcSale`, y valida el
 * descuento que pide el cliente contra ella.
 *
 * El descuento se rechaza en vez de recortarse en silencio: si el cajero pidió
 * un 30% y la empresa permite 10, cobrar el 10 sin avisar deja al cliente
 * pagando algo distinto de lo que se le dijo en el mostrador.
 *
 * @returns {{ok:true, options:{discountPercent:number, taxRate:number}}
 *          |{ok:false, code:string, message:string}}
 */
export function resolveSaleOptions(config, { discountPercent = 0 } = {}) {
  const cfg = normalizeSaleConfig(config)
  const requested = Number(discountPercent ?? 0)

  if (!Number.isFinite(requested) || requested < 0) {
    return { ok: false, code: 'DISCOUNT_INVALID', message: 'The discount is not a valid percentage.' }
  }

  if (requested > 0) {
    if (!cfg.descuento_activo) {
      return { ok: false, code: 'DISCOUNT_DISABLED', message: 'Discounts are disabled for this company.' }
    }
    if (requested > cfg.descuento_max_pct) {
      return {
        ok: false,
        code: 'DISCOUNT_ABOVE_MAX',
        message: `The discount exceeds the maximum allowed (${cfg.descuento_max_pct}%).`,
      }
    }
  }

  return {
    ok: true,
    options: {
      discountPercent: requested,
      taxRate: cfg.iva_activo ? cfg.iva_tasa : 0,
    },
  }
}
