/**
 * DT-18 (RTF 2, SEC-01) — salida HTTP hacia una URL que eligió el usuario.
 *
 * `fetch` deja dos huecos que ningún guard previo puede cerrar:
 *
 *  - Sigue redirecciones: una URL pública que responde 302 hacia 127.0.0.1
 *    pasaba `assertPublicHttpUrl` y la petición terminaba en el backend local.
 *  - Resuelve el host por su cuenta: el guard resolvía una IP pública y `fetch`
 *    volvía a preguntar al DNS, que con un TTL de 0 ya podía contestar
 *    127.0.0.1 (DNS rebinding).
 *
 * Aquí la validación va en el `lookup` del socket, así que se comprueba la IP a
 * la que de verdad se conecta, y las redirecciones no se siguen: la respuesta
 * 3xx vuelve tal cual y el llamador la trata como cualquier status no 2xx. Los
 * literales IP no pasan por `lookup`; los valida `assertPublicHttpUrl` antes,
 * y un literal no puede cambiar de destino entre una comprobación y otra.
 *
 * Telegram, Twilio y SendGrid llevan el host fijo en el código y siguen con
 * `fetchWithTimeout`; esto es solo para webhook, Slack y Teams.
 */
import http from 'node:http'
import https from 'node:https'
import { lookup } from 'node:dns/promises'
import { assertPublicHttpUrl, isBlockedAddress, SsrfBlockedError } from '../services/ssrfGuard.js'
import { FetchTimeoutError, resolveTimeoutMs } from './fetchWithTimeout.js'

// El cuerpo solo se usa para el mensaje de error del llamador.
export const MAX_BODY_BYTES = 64 * 1024

const NULL_BODY_STATUS = new Set([204, 205, 304])

function guardedLookup(isBlocked) {
  return (hostname, options, callback) => {
    lookup(hostname, { all: true }).then(
      (direcciones) => {
        const familia = options?.family
        const candidatas = familia ? direcciones.filter((d) => d.family === familia) : direcciones
        if (!candidatas.length || candidatas.some(({ address }) => isBlocked(address))) {
          callback(new SsrfBlockedError())
          return
        }
        if (options?.all) callback(null, candidatas)
        else callback(null, candidatas[0].address, candidatas[0].family)
      },
      () => callback(new SsrfBlockedError())
    )
  }
}

function toHeaders(raw) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(raw)) {
    for (const v of [].concat(value)) headers.append(name, v)
  }
  return headers
}

/**
 * Hace la petición sin la validación previa. `isBlocked` existe para que las
 * pruebas puedan apuntar a un servidor en 127.0.0.1; en producción no se pasa.
 */
export function sendHttpRequest(
  url,
  { method = 'GET', headers = {}, body } = {},
  { timeoutMs = resolveTimeoutMs(), isBlocked = isBlockedAddress } = {}
) {
  const target = new URL(url)
  const client = target.protocol === 'https:' ? https : http
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const requestHeaders = { 'User-Agent': 'Kontrol-Integrations', ...headers }
  if (body != null && !Object.keys(requestHeaders).some((h) => h.toLowerCase() === 'content-length')) {
    requestHeaders['Content-Length'] = Buffer.byteLength(body)
  }

  return new Promise((resolve, reject) => {
    const fail = (err) => {
      reject(timeoutSignal.aborted ? new FetchTimeoutError(String(url), timeoutMs) : err)
    }

    const req = client.request(
      target,
      {
        method,
        headers: requestHeaders,
        lookup: guardedLookup(isBlocked),
        signal: timeoutSignal,
        // Sin keep-alive: cada salida abre su socket y pasa por el lookup.
        agent: false,
      },
      (res) => {
        const chunks = []
        let size = 0
        const done = () => {
          const status = res.statusCode
          const payload = NULL_BODY_STATUS.has(status) ? null : Buffer.concat(chunks)
          try {
            resolve(new Response(payload, { status, statusText: res.statusMessage, headers: toHeaders(res.headers) }))
          } catch (err) {
            reject(err)
          }
        }

        res.on('data', (chunk) => {
          if (size >= MAX_BODY_BYTES) return
          chunks.push(chunk.subarray(0, MAX_BODY_BYTES - size))
          size += chunk.length
          if (size >= MAX_BODY_BYTES) {
            res.destroy()
            done()
          }
        })
        res.on('end', done)
        res.on('error', fail)
      }
    )

    req.on('error', fail)
    req.end(body ?? undefined)
  })
}

// Las pruebas sustituyen `transport.send` para no abrir sockets sin desactivar
// la validación previa; por eso `fetchPublicUrl` llama a través de este objeto.
export const transport = { send: sendHttpRequest }

/**
 * Salida HTTP hacia un destino elegido por el usuario: valida la URL, conecta
 * solo a IP públicas, no sigue redirecciones y corta por timeout como
 * `fetchWithTimeout`. Devuelve un `Response`.
 */
export async function fetchPublicUrl(url, options = {}) {
  await assertPublicHttpUrl(url)
  return transport.send(url, options)
}
