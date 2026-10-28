import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { assertThresholdGlobsMatch, emptyThresholdGlobs } from '../../scripts/coverage-thresholds.mjs'
import config from '../vitest.config.js'

/**
 * RTF 2 (TEST-01): un glob de umbral sin archivos aprobaba en silencio. El
 * control vive en `scripts/coverage-thresholds.mjs` y lo usan los dos configs.
 */
const BACKEND = fileURLToPath(new URL('..', import.meta.url))
const umbral = { statements: 70, branches: 70, functions: 70, lines: 70 }

describe('control de globs de los umbrales de cobertura', () => {
  it('detecta un glob que no casa con ningún archivo', () => {
    const thresholds = { statements: 25, 'src/controllers/noExiste.js': umbral, 'src/router.js': umbral }

    expect(emptyThresholdGlobs(thresholds, BACKEND)).toEqual(['src/controllers/noExiste.js'])
    expect(() => assertThresholdGlobsMatch(thresholds, BACKEND)).toThrow('src/controllers/noExiste.js')
  })

  it('acepta expansión de llaves y comodines que sí casan', () => {
    const thresholds = { 'src/middleware/require{Auth,Role}.js': umbral, 'src/routes/*.js': umbral }

    expect(assertThresholdGlobsMatch(thresholds, BACKEND)).toBe(thresholds)
  })

  it('todos los umbrales del backend casan con algún archivo', () => {
    expect(emptyThresholdGlobs(config.test.coverage.thresholds, BACKEND)).toEqual([])
  })
})
