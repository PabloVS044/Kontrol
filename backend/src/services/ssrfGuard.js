import net from 'node:net'
import { lookup } from 'node:dns/promises'

/**
 * El mensaje es deliberadamente genérico: no dice qué IP resolvió el host ni en
 * qué rango cayó. Detallarlo convertiría al propio guard en el oráculo de red
 * que viene a cerrar.
 */
const MENSAJE = 'La URL debe apuntar a un host público.'

// Loopback, privadas y enlace local.
function bloqueadaV4(ip) {
  const [a, b] = ip.split('.').map(Number)
  if (a === 127) return true                        // 127.0.0.0/8
  if (a === 10) return true                         // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true  // 172.16.0.0/12
  if (a === 192 && b === 168) return true           // 192.168.0.0/16
  if (a === 169 && b === 254) return true           // 169.254.0.0/16
  return false
}

function bloqueadaV6(ip) {
  const s = ip.toLowerCase().split('%')[0] // descarta el zone id
  if (s === '::1') return true             // loopback
  if (/^f[cd]/.test(s)) return true        // fc00::/7, direcciones únicas locales
  if (/^fe[89ab]/.test(s)) return true     // fe80::/10, enlace local
  return false
}

const bloqueada = (ip) => (net.isIP(ip) === 6 ? bloqueadaV6(ip) : bloqueadaV4(ip))

/**
 * Lanza si la URL no es apta para una salida HTTP hacia internet.
 * Se invoca antes de cualquier fetch cuyo destino elija el usuario.
 */
export async function assertPublicHttpUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(MENSAJE)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(MENSAJE)
  }

  const host = url.hostname.replace(/^\[|\]$/g, '') // los literales IPv6 vienen entre corchetes

  if (net.isIP(host)) {
    if (bloqueada(host)) throw new Error(MENSAJE)
    return
  }

  let direcciones
  try {
    direcciones = await lookup(host, { all: true })
  } catch {
    throw new Error(MENSAJE)
  }

  // Basta una dirección bloqueada: mirar solo la primera sería un bypass trivial.
  if (!direcciones.length || direcciones.some(({ address }) => bloqueada(address))) {
    throw new Error(MENSAJE)
  }
}
