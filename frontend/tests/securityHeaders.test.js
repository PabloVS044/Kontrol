import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * DT-19 (RTF 2, SEC-01): el documento del SPA salía sin cabeceras de
 * seguridad. Las sirven dos sitios —nginx en la VM y Vercel—, así que esta
 * prueba fija las dos copias y que digan lo mismo.
 */
const read = (file) => readFileSync(resolve(__dirname, '..', file), 'utf8')

const nginx = read('nginx.conf.template')
const spaBlock = nginx.slice(nginx.indexOf('location / {'))
const nginxHeaders = Object.fromEntries(
  [...spaBlock.matchAll(/add_header\s+([\w-]+)\s+"([^"]*)"\s+always;/g)].map(([, name, value]) => [
    name.toLowerCase(),
    value,
  ])
)

const vercel = JSON.parse(read('vercel.json'))
const vercelHeaders = Object.fromEntries(
  vercel.headers.find((rule) => rule.source === '/(.*)').headers.map(({ key, value }) => [key.toLowerCase(), value])
)

const directive = (csp, name) =>
  csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `))

describe('DT-19 · Cabeceras de seguridad del SPA', () => {
  it('nginx emite las cinco cabeceras del plan maestro (§9.2)', () => {
    for (const header of [
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'strict-transport-security',
      'referrer-policy',
    ]) {
      expect(nginxHeaders[header], header).toBeTruthy()
    }
  })

  it('Vercel y nginx sirven exactamente las mismas cabeceras', () => {
    expect(vercelHeaders).toEqual(nginxHeaders)
  })

  it('la CSP no permite scripts inline ni eval, y nadie puede enmarcar la app', () => {
    const csp = nginxHeaders['content-security-policy']

    expect(directive(csp, 'script-src')).toBe("script-src 'self'")
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(csp).not.toContain('unsafe-eval')
    expect(nginxHeaders['x-frame-options']).toBe('DENY')
  })

  it('la cámara y el micrófono siguen disponibles para el escáner del POS y las llamadas', () => {
    const policy = nginxHeaders['permissions-policy']

    expect(policy).toContain('camera=(self)')
    expect(policy).toContain('microphone=(self)')
  })

  it('nginx no anuncia su versión', () => {
    expect(nginx).toMatch(/^\s*server_tokens off;/m)
  })
})
