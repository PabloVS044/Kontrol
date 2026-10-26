import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')
const leer = (ruta) => readFileSync(resolve(root, ruta), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('fondo de la página (DT-17)', () => {
  it('globals.css pinta el fondo del body con el token de fondo', () => {
    const reglasBody = [...leer('globals.css').matchAll(/(?:^|\})\s*body\s*\{([^}]*)\}/g)].map((m) => m[1])
    expect(reglasBody.some((r) => /background-color:\s*var\(--k-color-bg\)/.test(r))).toBe(true)
  })

  it('el fondo no depende del CSS de la landing, que se carga en diferido', () => {
    expect(leer('src/components/navbar.css')).not.toMatch(/(?:^|\})\s*body\s*\{/)
  })
})
