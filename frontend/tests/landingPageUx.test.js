import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sourceRoot = resolve(__dirname, '../src')
const es = JSON.parse(readFileSync(resolve(sourceRoot, 'locales/es.json'), 'utf8'))
const en = JSON.parse(readFileSync(resolve(sourceRoot, 'locales/en.json'), 'utf8'))
const landing = readFileSync(resolve(sourceRoot, 'views/LandingPage.vue'), 'utf8')
const footer = readFileSync(resolve(sourceRoot, 'components/Footer.vue'), 'utf8')

describe('UX de la portada', () => {
  it('explica el producto y su público en español e inglés', () => {
    expect(es.landing.hero.title).toMatch(/ventas.*inventario/i)
    expect(es.landing.hero.pill).toMatch(/tiendas.*pequeños negocios/i)
    expect(en.landing.hero.title).toMatch(/sales.*inventory/i)
    expect(en.landing.hero.pill).toMatch(/shops.*small businesses/i)
  })

  it('no publica cifras de adopción sin verificar', () => {
    expect(`${es.landing.start.copy} ${en.landing.start.copy}`).not.toMatch(/\b50,?000\b/i)
  })

  it('limita el pie a anclas existentes en la landing', () => {
    const sectionIds = new Set([...landing.matchAll(/<section id="([^"]+)"/g)].map(([, id]) => id))
    const footerAnchors = [...footer.matchAll(/href="#([^"]+)"/g)].map(([, id]) => id)

    expect(footer).not.toContain('href="#"')
    expect(footerAnchors.length).toBeGreaterThan(0)
    expect(footerAnchors.every((id) => sectionIds.has(id))).toBe(true)
  })
})
