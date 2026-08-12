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
          // Trinquete, punto 2: el umbral global se fija en la línea base
          // medida el 11/08/2026 sobre 6 archivos (168 sentencias), truncada a
          // entero. Sin margen — el umbral es exactamente lo que hay hoy.
          statements: 80, // base 80.95 %
          branches: 80, //   base 80.46 %
          functions: 75, //  base 75.51 %
          lines: 83, //      base 83.10 %

          // Trinquete, punto 3: +5 puntos porcentuales por sprint sobre el
          // umbral global. Próxima subida, al cierre del Sprint 6:
          // 85/85/80/88. La política completa está en el README, sección
          // «Cobertura».

          // Aviso: el denominador del frontend es de solo 168 sentencias en 6
          // archivos, así que un único archivo lo mueve muchísimo. Medido: si
          // el rediseño deja `Button.vue` (5 sentencias, 3 funciones, hoy al
          // 100 %) sin cubrir, functions cae de 75.51 % a 69.39 % y este
          // umbral se incumple. Al ir sin margen por decisión de SCRUM-23,
          // cualquier PR que toque un archivo cubierto puede requerir subir
          // cobertura en el mismo PR.

          // Umbrales por módulo crítico. Los globs se resuelven con picomatch
          // contra la ruta relativa a la raíz del workspace, y los archivos
          // que casan siguen contando también en el umbral global de arriba.
          //
          // Ojo: un glob que no casa con ningún archivo del reporte pasa en
          // vacío, sin avisar. Si se borra el test que cubre uno de estos
          // archivos, su umbral deja de proteger nada.

          // POS: subtotal, descuento e IVA de una venta. Es el cálculo con
          // mayor riesgo financiero del sistema. Medido 95.45/94.44/100/100.
          'src/utils/sales.js': {
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70
          },

          // Autenticación de frontend. Escalón temporal por debajo del 70 %:
          // medido 66.66/60.41/59.25/69.73, es decir por debajo en las cuatro
          // métricas pese a tener `authStore.test.js` propio. Se fija encima
          // de lo medido para frenar regresiones; subir a 70 cuando se amplíe
          // ese test.
          'src/stores/auth.js': {
            statements: 60,
            branches: 55,
            functions: 55,
            lines: 60
          }

          // Reportes: umbral desactivado a propósito. Los tests del módulo
          // llegan el 17/08/2026. Hoy (11/08/2026) ninguno de estos archivos
          // entra siquiera al reporte, porque ningún test los importa.
          // Descomentar y calibrar cuando esos tests estén en develop.
          //
          // 'src/views/ReportsView.vue': {
          //   statements: 70,
          //   branches: 70,
          //   functions: 70,
          //   lines: 70
          // },
          // 'src/views/ReportDetailView.vue': {
          //   statements: 70,
          //   branches: 70,
          //   functions: 70,
          //   lines: 70
          // },
          // 'src/components/reports/**': {
          //   statements: 70,
          //   branches: 70,
          //   functions: 70,
          //   lines: 70
          // }
        }
      }
    }
  })
)
