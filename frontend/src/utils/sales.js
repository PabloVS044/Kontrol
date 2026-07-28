/**
 * Lógica de cálculo del punto de venta (POS).
 *
 * Funciones puras, sin dependencias de Vue ni de red, para poder probarlas de
 * forma aislada. Aquí vive el cálculo con mayor riesgo financiero del sistema:
 * subtotales, descuentos, IVA y total de una venta. El orden de operaciones es
 * siempre: subtotal → descuento → impuesto.
 */

/** IVA vigente en Guatemala (12%). */
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
 * Valida y normaliza el precio de un producto.
 * Un precio nulo, vacío o no numérico produce un error controlado (nunca NaN).
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
 * La cantidad 0 es válida (no suma al total); una cantidad negativa se rechaza.
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

/**
 * Normaliza un porcentaje (descuento o tasa) al rango [0, 100].
 * Valores inválidos o negativos se tratan como 0.
 */
function clampPercent(percent) {
  const n = Number(percent)
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 100) return 100
  return n
}

/**
 * Subtotal de una línea de venta (precio × cantidad), redondeado a 2 decimales.
 * Acepta `{ precio, cantidad }` o un ítem del carrito `{ product, cantidad }`.
 */
export function lineTotal(line) {
  const precio = toPrice(line?.precio ?? line?.precio_venta ?? line?.product?.precio_venta)
  const cantidad = toQuantity(line?.cantidad)
  return round2(precio * cantidad)
}

/**
 * Suma de los subtotales de todas las líneas. Una venta vacía devuelve 0.
 */
export function calcSubtotal(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return 0
  const sum = lines.reduce((acc, line) => acc + lineTotal(line), 0)
  return round2(sum)
}

/**
 * Aplica un descuento porcentual a un monto. El porcentaje se limita a [0, 100],
 * por lo que un 100% deja el monto en 0 y el resultado nunca es negativo.
 */
export function applyDiscount(amount, discountPercent = 0) {
  const base = round2(amount)
  const pct = clampPercent(discountPercent)
  return round2(Math.max(base * (1 - pct / 100), 0))
}

/**
 * Calcula el desglose completo de una venta.
 *
 * Orden de operaciones (garantizado): el descuento se aplica sobre el subtotal
 * y el impuesto se calcula sobre el subtotal ya descontado.
 *
 * @param {Array} lines Líneas de la venta (`{ precio, cantidad }`).
 * @param {object} [options]
 * @param {number} [options.discountPercent=0] Descuento porcentual [0, 100].
 * @param {number} [options.taxRate=IVA_RATE] Tasa de impuesto (0.12 = 12%).
 * @returns {{ subtotal:number, discount:number, taxableBase:number, tax:number, total:number }}
 */
export function calcSale(lines, { discountPercent = 0, taxRate = IVA_RATE } = {}) {
  const subtotal = calcSubtotal(lines)

  const pct = clampPercent(discountPercent)
  const discount = round2(subtotal * (pct / 100))
  const taxableBase = round2(Math.max(subtotal - discount, 0))

  const rate = Number.isFinite(Number(taxRate)) && Number(taxRate) > 0 ? Number(taxRate) : 0
  const tax = round2(taxableBase * rate)
  const total = round2(Math.max(taxableBase + tax, 0))

  return { subtotal, discount, taxableBase, tax, total }
}
