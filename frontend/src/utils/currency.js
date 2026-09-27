/**
 * Moneda de venta de la empresa.
 *
 * La configuración guarda el código ISO 4217 —no el símbolo—, porque "$" lo
 * comparten varias monedas y no dice cuál es. Aquí vive la traducción de código
 * a símbolo y el formato del importe, para que el carrito, el cobro, el ticket
 * y los informes no acaben cada uno con su propio criterio.
 */

/** Monedas admitidas. Debe coincidir con SUPPORTED_CURRENCIES del backend. */
export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$',  label: 'USD — Dólar' },
  GTQ: { code: 'GTQ', symbol: 'Q.', label: 'GTQ — Quetzal' },
}

export const DEFAULT_CURRENCY = 'USD'

/** Lista para pintar un selector, en orden estable. */
export const CURRENCY_OPTIONS = Object.values(CURRENCIES)

/**
 * Símbolo de una moneda. Un código desconocido cae al de por defecto en vez de
 * devolver vacío: un importe sin unidad es peor que uno con la unidad genérica.
 */
export function currencySymbol(code) {
  return (CURRENCIES[code] ?? CURRENCIES[DEFAULT_CURRENCY]).symbol
}

/**
 * Formatea un importe con el símbolo de la moneda delante.
 *
 * Ambas monedas admitidas se escriben con el símbolo como prefijo, así que no
 * hace falta modelar la posición todavía; cuando entre una que lo lleve detrás,
 * este es el único sitio que hay que tocar.
 *
 * Los no numéricos caen a 0 en vez de mostrar "NaN" en un total.
 *
 * @param {number|string} amount
 * @param {string} [code] Código ISO 4217.
 * @param {object} [options]
 * @param {boolean} [options.decimals=true] Incluir los dos decimales.
 */
export function formatMoney(amount, code = DEFAULT_CURRENCY, { decimals = true } = {}) {
  const n = Number(amount)
  const safe = Number.isFinite(n) ? n : 0
  const body = decimals
    ? safe.toFixed(2)
    : Math.round(safe).toLocaleString('en-US')
  // El signo va delante del símbolo: "-$32", no "$-32".
  return safe < 0
    ? `-${currencySymbol(code)}${body.replace('-', '')}`
    : `${currencySymbol(code)}${body}`
}
