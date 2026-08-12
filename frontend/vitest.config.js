import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      globals: true,
      include: ['tests/**/*.test.js'],

      coverage: {
        provider: 'v8',

        // Los reporters por defecto más `json-summary`, que escribe
        // `coverage/coverage-summary.json`: de ahí salen los porcentajes
        // exactos para el informe del sprint sin abrir el reporte HTML.
        reporter: ['text', 'html', 'clover', 'json', 'json-summary'],

        // En Vitest 4 `coverageConfigDefaults.exclude` viene vacío; se declara
        // explícitamente para que nada de `tests/` cuente como código medido.
        exclude: ['tests/**']

        // Nota sobre el denominador: `coverage.all` ya no existe en Vitest 4.
        // Sin declarar `coverage.include`, solo se mide lo que algún test
        // importa; un archivo que nadie prueba no aparece en el reporte y no
        // baja el porcentaje. Es intencional: mantiene el gate estable
        // mientras entra código sin tests propios.
      }
    }
  })
)
