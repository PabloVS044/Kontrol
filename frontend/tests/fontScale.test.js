import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { FONT_SCALES } from '@/composables/useFontScale.js'

/**
 * Tamaño de letra de Configuración. El composable escribe `data-font-scale`
 * en <html> y globals.css lo convierte en un `font-size` en porcentaje; eso
 * solo agranda el texto si los tamaños de letra están en rem.
 */

const root = resolve(__dirname, '..')
const leer = (ruta) => readFileSync(resolve(root, ruta), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('tamaño de letra: reglas de CSS', () => {
  const globals = leer('globals.css')
  const porcentaje = (nivel) => {
    const m = globals.match(new RegExp(`html\\[data-font-scale='${nivel}'\\]\\s*\\{[^}]*font-size:\\s*([\\d.]+)%`))
    return m ? Number(m[1]) : null
  }

  it('cada nivel del composable tiene su regla en globals.css, de menor a mayor', () => {
    const niveles = FONT_SCALES.slice(1)
    const valores = niveles.map(porcentaje)
    expect(valores.every((v) => v !== null), `faltan reglas: ${niveles.filter((n, i) => valores[i] === null)}`).toBe(true)
    expect(valores).toEqual([...valores].sort((a, b) => a - b))
    expect(valores[0]).toBeGreaterThan(100)
  })

  it('el nivel por defecto no tiene regla: es la ausencia del atributo', () => {
    expect(porcentaje(FONT_SCALES[0])).toBeNull()
  })

  it('los tokens de tamaño de letra están en rem', () => {
    const tokens = [...leer('src/styles/theme.css').matchAll(/--k-font-size-[\w-]+:\s*([^;]+);/g)].map((m) => m[1].trim())
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.filter((v) => !/^[\d.]+rem$/.test(v))).toEqual([])
  })

  it('ningún componente fija la letra en px: no crecería con el ajuste', () => {
    // `max(16px, …)` sí se permite: es un mínimo (iOS hace zoom por debajo de
    // 16px), y el valor que crece es el otro.
    const enPx = /font-size:\s*-?[\d.]+px/
    const archivos = readdirSync(resolve(root, 'src'), { recursive: true })
      .map((ruta) => String(ruta).replaceAll('\\', '/'))
      .filter((ruta) => /\.(vue|css)$/.test(ruta))
      .map((ruta) => `src/${ruta}`)
    archivos.push('globals.css')

    const infractores = archivos.filter((ruta) => enPx.test(readFileSync(join(root, ruta), 'utf8')))
    expect(infractores).toEqual([])
  })
})
