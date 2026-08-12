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
        exclude: ['tests/**'],

        // Nota sobre el denominador: `coverage.all` ya no existe en Vitest 4.
        // Sin declarar `coverage.include`, solo se mide lo que algún test
        // importa; un archivo que nadie prueba no aparece en el reporte y no
        // baja el porcentaje. Es intencional: mantiene el gate estable
        // mientras entra código sin tests propios.

        // Vitest sale con código 1 si no se cumple un umbral, así que el step
        // `npm run test:coverage -w frontend` de ci.yml pone el job en rojo
        // por sí solo.
        thresholds: {
          // Línea base medida el 11/08/2026 sobre 6 archivos (168 sentencias),
          // menos ~10 puntos de margen. El margen es mayor que el del backend
          // a propósito: con un denominador tan pequeño, un solo archivo lo
          // mueve muchísimo. Medido: si el rediseño deja `Button.vue` (5
          // sentencias, 3 funciones, hoy al 100 %) sin cubrir, functions cae
          // de 75.51 % a 69.39 %.
          statements: 70, // base 80.95 % · margen 10.95
          branches: 70, //   base 80.46 % · margen 10.46
          functions: 65, //  base 75.51 % · margen 10.51
          lines: 72 //       base 83.10 % · margen 11.10

          // Pendiente: recalibrar el 17/08/2026. Cuando lleguen los tests
          // nuevos, cualquiera que importe una vista completa mete esa vista
          // entera en el denominador de golpe y ningún margen razonable
          // aguanta ese salto.
        }
      }
    }
  })
)
