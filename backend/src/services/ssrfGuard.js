import net from 'node:net'
import { lookup } from 'node:dns/promises'

/**
 * El mensaje es deliberadamente genérico: no dice qué IP resolvió el host ni en
 * qué rango cayó. Detallarlo convertiría al propio guard en el oráculo de red
 * que viene a cerrar.
 */
export const MENSAJE = 'La URL debe apuntar a un host público.'

export class SsrfBlockedError extends Error {
  constructor() {
    super(MENSAJE)
    this.name = 'SsrfBlockedError'
    this.code = 'ESSRFBLOCKED'
  }
}

/*
 * Rangos que no son internet pública (registro de propósito especial de IANA).
 * DT-18 (RTF 2, SEC-01): la lista anterior no tenía 0.0.0.0/8, y `http://0.0.0.0`
 * llegaba al backend local; tampoco CGNAT, multicast ni los reservados.
 */
const V4 = new net.BlockList()
for (const [red, prefijo] of [
  ['0.0.0.0', 8], //        "esta red": 0.0.0.0 conecta con el propio host
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], //    CGNAT; incluye metadatos de algunas nubes
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], //   enlace local; metadatos de GCP, AWS y Azure
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24], //     TEST-NET-1
  ['192.88.99.0', 24], //   relé 6to4, obsoleto
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], //    pruebas de rendimiento
  ['198.51.100.0', 24], //  TEST-NET-2
  ['203.0.113.0', 24], //   TEST-NET-3
  ['224.0.0.0', 4], //      multicast
  ['240.0.0.0', 4], //      reservado, incluye 255.255.255.255
]) {
  V4.addSubnet(red, prefijo, 'ipv4')
}

const V6 = new net.BlockList()
for (const [red, prefijo] of [
  ['64:ff9b:1::', 48], //   NAT64 de uso local
  ['100::', 64], //         descarte
  ['2001::', 32], //        Teredo: lleva una IPv4 ofuscada
  ['2001:db8::', 32], //    documentación
  ['fc00::', 7], //         direcciones únicas locales
  ['fe80::', 10], //        enlace local
  ['fec0::', 10], //        sitio local, obsoleto
  ['ff00::', 8], //         multicast
]) {
  V6.addSubnet(red, prefijo, 'ipv6')
}

// Los ocho grupos de 16 bits de una IPv6 ya validada por net.isIP.
function gruposV6(ip) {
  let s = ip.toLowerCase().split('%')[0] // descarta el zone id
  const cuarteto = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (cuarteto) {
    const [a, b, c, d] = cuarteto[2].split('.').map(Number)
    s = `${cuarteto[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const [cabeza, cola] = s.includes('::') ? s.split('::') : [s, null]
  const inicio = cabeza ? cabeza.split(':') : []
  const fin = cola ? cola.split(':') : []
  const relleno = cola === null ? [] : Array(8 - inicio.length - fin.length).fill('0')
  return [...inicio, ...relleno, ...fin].map((g) => parseInt(g, 16))
}

const aV4 = (alto, bajo) => [alto >> 8, alto & 0xff, bajo >> 8, bajo & 0xff].join('.')

/**
 * La IPv4 a la que de verdad se conecta una IPv6 que la lleva dentro, o null.
 * Sin esto `[::ffff:127.0.0.1]` —que el parser de URL reescribe como
 * `[::ffff:7f00:1]`— no casaba con ningún rango IPv6 y pasaba el guard.
 */
function v4Embebida(g) {
  const ceros = (desde, hasta) => g.slice(desde, hasta).every((x) => x === 0)
  if (ceros(0, 5) && g[5] === 0xffff) return aV4(g[6], g[7]) //                  ::ffff:0:0/96, mapeada
  if (ceros(0, 4) && g[4] === 0xffff && g[5] === 0) return aV4(g[6], g[7]) //    ::ffff:0:0:0/96, traducida
  if (ceros(0, 6)) return aV4(g[6], g[7]) //                                     ::/96, compatible; cubre :: y ::1
  if (g[0] === 0x64 && g[1] === 0xff9b && ceros(2, 6)) return aV4(g[6], g[7]) // 64:ff9b::/96, NAT64
  if (g[0] === 0x2002) return aV4(g[1], g[2]) //                                 2002::/16, 6to4
  return null
}

/** true si la IP no es un destino público. Una cadena que no es IP también se bloquea. */
export function isBlockedAddress(ip) {
  const familia = net.isIP(ip)
  if (familia === 4) return V4.check(ip, 'ipv4')
  if (familia !== 6) return true

  const grupos = gruposV6(ip)
  const v4 = v4Embebida(grupos)
  if (v4) return V4.check(v4, 'ipv4')
  return V6.check(grupos.map((x) => x.toString(16)).join(':'), 'ipv6')
}

/**
 * Lanza si la URL no es apta para una salida HTTP hacia internet.
 *
 * Es la comprobación previa, con el mensaje genérico. La que impide el DNS
 * rebinding se repite al conectar, sobre la IP que de verdad se usa:
 * `utils/httpTransport.js`.
 */
export async function assertPublicHttpUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new SsrfBlockedError()
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedError()
  }

  // El parser de URL ya normaliza 2130706433, 0x7f.1 o 127.1 a 127.0.0.1.
  const host = url.hostname.replace(/^\[|\]$/g, '') // los literales IPv6 vienen entre corchetes

  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new SsrfBlockedError()
    return
  }

  let direcciones
  try {
    direcciones = await lookup(host, { all: true })
  } catch {
    throw new SsrfBlockedError()
  }

  // Basta una dirección bloqueada: mirar solo la primera sería un bypass trivial.
  if (!direcciones.length || direcciones.some(({ address }) => isBlockedAddress(address))) {
    throw new SsrfBlockedError()
  }
}
