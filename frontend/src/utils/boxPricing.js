/**
 * Resolve a stock entry (new product or restock) to a unit quantity and a
 * per-unit cost, supporting two input modes:
 *
 *  - 'unidad': the user enters units + per-unit cost directly.
 *  - 'caja':   the user enters number of boxes, units per box, and the box
 *              price. Per-unit cost = boxPrice / unitsPerBox, and total units
 *              = boxes * unitsPerBox. This keeps the DB untouched (we still
 *              store cantidad + precio_unitario) while letting shops buy by box.
 *
 * Returns { cantidad, costoUnitario } as finite non-negative numbers, or nulls
 * when the inputs are incomplete/invalid so callers can disable submission.
 */
export function resolveStockEntry({
  modo = 'unidad',
  unidades,
  precioUnitario,
  cajas,
  unidadesPorCaja,
  precioCaja,
} = {}) {
  if (modo === 'caja') {
    const c = Number(cajas)
    const upc = Number(unidadesPorCaja)
    const pc = Number(precioCaja)
    const cantidad = Math.floor(c * upc)
    const costoUnitario = upc > 0 ? pc / upc : null
    return {
      cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null,
      costoUnitario:
        Number.isFinite(costoUnitario) && costoUnitario >= 0 ? round2(costoUnitario) : null,
    }
  }

  const cantidad = Math.floor(Number(unidades))
  const costoUnitario = Number(precioUnitario)
  return {
    cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null,
    costoUnitario:
      Number.isFinite(costoUnitario) && costoUnitario >= 0 ? costoUnitario : null,
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}
