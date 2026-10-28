import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }))

import { lookup } from 'node:dns/promises'
import { assertPublicHttpUrl, isBlockedAddress } from '../src/services/ssrfGuard.js'

/**
 * DT-18 (RTF 2, SEC-01): el guard de DT-12 no bloqueaba 0.0.0.0 ni las IPv6
 * que llevan una IPv4 dentro. Estas pruebas fijan la clasificación dirección
 * por dirección; las de `integrationSsrf.test.js` la recorren de punta a punta.
 */
describe('isBlockedAddress', () => {
  it.each([
    '0.0.0.0',
    '0.1.2.3',
    '10.0.0.5',
    '100.64.0.1',
    '100.100.100.200',
    '127.0.0.1',
    '127.255.255.254',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.8',
    '192.0.2.1',
    '192.168.1.10',
    '198.18.0.1',
    '198.51.100.7',
    '203.0.113.9',
    '224.0.0.1',
    '240.0.0.1',
    '255.255.255.255',
  ])('bloquea la IPv4 %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true)
  })

  it.each([
    ['::', 'sin especificar'],
    ['::1', 'loopback'],
    ['::ffff:127.0.0.1', 'mapeada, notación con puntos'],
    ['::ffff:7f00:1', 'mapeada, como la reescribe el parser de URL'],
    ['0:0:0:0:0:ffff:a00:5', 'mapeada a 10.0.0.5, sin abreviar'],
    ['::ffff:0:7f00:1', 'traducida'],
    ['::7f00:1', 'compatible'],
    ['64:ff9b::a9fe:a9fe', 'NAT64 hacia los metadatos'],
    ['64:ff9b:1::1', 'NAT64 de uso local'],
    ['2002:c0a8:101::1', '6to4 hacia 192.168.1.1'],
    ['2001::1', 'Teredo'],
    ['2001:db8::1', 'documentación'],
    ['fc00::1', 'única local'],
    ['fd12:3456::1', 'única local'],
    ['fe80::1', 'enlace local'],
    ['fe80::1%eth0', 'enlace local con zone id'],
    ['fec0::1', 'sitio local'],
    ['ff02::1', 'multicast'],
    ['100::1', 'descarte'],
  ])('bloquea la IPv6 %s (%s)', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true)
  })

  it.each([
    '93.184.216.34',
    '8.8.8.8',
    '172.32.0.1',
    '100.128.0.1',
    '::ffff:93.184.216.34',
    '2606:4700:4700::1111',
    '2002:5db8:d822::1',
    '64:ff9b::5db8:d822',
  ])('deja pasar la dirección pública %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false)
  })

  it('bloquea lo que no es una IP', () => {
    expect(isBlockedAddress('localhost')).toBe(true)
    expect(isBlockedAddress('')).toBe(true)
  })
})

describe('assertPublicHttpUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
  })

  it.each([
    'http://0.0.0.0:3000/api/health',
    'http://0:3000/',
    'http://[::]:3000/',
    'http://[::ffff:127.0.0.1]:3000/',
    'http://[0:0:0:0:0:ffff:127.0.0.1]/',
    'http://[::127.0.0.1]/',
    'http://2130706433/',
    'http://0x7f000001/',
    'http://0177.0.0.1/',
    'http://127.1/',
    'http://user:pass@127.0.0.1/',
  ])('rechaza %s sin consultar el DNS', async (url) => {
    await expect(assertPublicHttpUrl(url)).rejects.toThrow('La URL debe apuntar a un host público.')
    expect(lookup).not.toHaveBeenCalled()
  })

  it('rechaza un host si una sola de sus direcciones es interna', async () => {
    lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '::ffff:10.0.0.1', family: 6 },
    ])

    await expect(assertPublicHttpUrl('https://mixto.example.com/')).rejects.toThrow()
  })

  it('rechaza un host que no resuelve', async () => {
    lookup.mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }))

    await expect(assertPublicHttpUrl('https://no-existe.example.com/')).rejects.toThrow(
      'La URL debe apuntar a un host público.'
    )
  })

  it('acepta un host público', async () => {
    await expect(assertPublicHttpUrl('https://hooks.example.com/x')).resolves.toBeUndefined()
  })
})
