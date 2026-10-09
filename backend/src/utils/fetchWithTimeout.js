/**
 * DT-15 — `fetch` con tiempo de espera para las llamadas HTTP salientes.
 *
 * Antes de esto, webhook, Slack, Teams, Telegram, Twilio y SendGrid hacían
 * `fetch` sin `AbortSignal`: un endpoint que acepta la conexión y nunca
 * responde dejaba la petición del usuario colgada de forma indefinida. Este
 * envoltorio es el único punto donde se decide cuánto se espera.
 *
 * El plazo cubre la respuesta completa siempre que el cuerpo se lea antes de
 * que venza: la señal sigue activa mientras se consume `res.json()`/`text()`.
 */

export const DEFAULT_TIMEOUT_MS = 10_000

export class FetchTimeoutError extends Error {
  constructor(url, timeoutMs) {
    super(`El servicio externo no respondió en ${timeoutMs} ms.`)
    this.name = 'FetchTimeoutError'
    this.code = 'ETIMEDOUT'
    this.url = url
    this.timeoutMs = timeoutMs
  }
}

export function resolveTimeoutMs(env = process.env) {
  const parsed = Number.parseInt(env.INTEGRATION_HTTP_TIMEOUT_MS, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = resolveTimeoutMs()) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  // Si quien llama trae su propia señal, se respetan las dos: gana la primera
  // que aborte.
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal

  try {
    return await fetch(url, { ...options, signal })
  } catch (err) {
    if (timeoutSignal.aborted && !options.signal?.aborted) {
      throw new FetchTimeoutError(String(url), timeoutMs)
    }
    throw err
  }
}
