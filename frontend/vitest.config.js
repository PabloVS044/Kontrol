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

        // El denominador. `coverage.all` no existe en Vitest 4: sin `include`
        // solo se mide lo que algún test importa, así que un archivo que nadie
        // prueba no aparece en el reporte y no baja el porcentaje. SCRUM-23 lo
        // dejó sin declarar a propósito para no poner el gate en rojo, y el
        // resultado fue que solo 19 de los 136 archivos `.js`/`.vue` de `src/`
        // entraban al reporte, más seis `.css`, `.png` y `.json` que no son
        // código ejecutable. El 92 % que reportaba el gate no era cobertura
        // real. Con `include` el denominador es 129 archivos y 9 152
        // sentencias, y las extensiones explícitas dejan fuera los recursos.
        include: ['src/**/*.{js,vue}'],

        // Fuera del denominador. En Vitest 4 `coverageConfigDefaults.exclude`
        // viene vacío, así que todo lo que no deba contar va listado aquí.
        exclude: [
          'tests/**',
          // Arranque de la aplicación: monta Vue, Pinia, i18n y el router.
          'src/main.js',
          // Tabla de rutas declarativa.
          'src/router/**',
          // Diccionarios de i18n.
          'src/locales/**',
          // Imágenes y hojas de estilo.
          'src/assets/**',
          'src/styles/**',
          // Fondos WebGL (`ogl`): dibujan, no deciden nada.
          'src/components/UI/Backgrounds/**'
        ],

        // Vitest sale con código 1 si no se cumple un umbral, así que el step
        // `npm run test:coverage -w frontend` de ci.yml pone el job en rojo
        // por sí solo.
        thresholds: {
          // Trinquete, punto 2: el umbral global se fija en la línea base real
          // medida el 20/09/2026 sobre el denominador completo, truncada a
          // entero y menos 1 punto porcentual de margen.
          //
          // El margen es nuevo. SCRUM-23 iba sin margen, pero con el
          // denominador real hay dos fuentes de varianza que antes no
          // pesaban: v8 cuenta ramas y funciones distinto entre versiones
          // mayores de Node —se mide en local y se verifica en CI, que usa el
          // 22 de `.nvmrc`—, y sobre 9 152 sentencias una vista nueva de 300
          // sentencias sin test baja `statements` 0.32 puntos por sí sola. El
          // margen absorbe esa varianza; no relaja el trinquete.
          statements: 9, // base real 10.15 % (929/9152) — antes 83 sobre 1 000
          branches: 8, //   base real  9.84 % (586/5955)
          functions: 11, // base real 12.12 % (252/2078)
          lines: 9, //      base real 10.46 % (848/8104)

          // Trinquete, punto 3: +5 puntos porcentuales por sprint sobre el
          // umbral global, contados desde esta base nueva. Próxima subida, al
          // cierre del Sprint 8: 14/13/16/14. La política completa está en
          // el README, sección «Cobertura de código».

          // Umbrales por módulo crítico. Los globs se resuelven con picomatch
          // contra la ruta relativa a la raíz del workspace, y los archivos
          // que casan siguen contando también en el umbral global de arriba.
          //
          // Ojo: un glob que no casa con ningún archivo del reporte pasa en
          // vacío, sin avisar. No es hipotético: entre SCRUM-23 y hoy, los
          // tres umbrales de reportes casaban con cero archivos y pasaban en
          // verde sin proteger nada. Cada glob de esta lista tiene al lado su
          // medición real; si un glob no lleva número, no se ha comprobado
          // que case con algo.

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
          },

          // Reportes: cuarto módulo crítico del trinquete de SCRUM-23.
          //
          // Los umbrales apuntaban a `views/ReportsView.vue`,
          // `views/ReportDetailView.vue` y `components/reports/**`. Los tests
          // del módulo que se esperaban para el 17/08/2026 nunca llegaron, así
          // que esos quince archivos siguen a 0 % en las cuatro métricas y los
          // tres globs pasaron un mes en verde sin proteger nada.
          //
          // Se redirigen a los tres archivos del módulo que sí tienen pruebas,
          // que es donde vive la lógica de exportación: el resto de reportes es
          // presentación. Las vistas y los componentes entran ahora al
          // denominador global, así que su 0 % ya pesa en el umbral global en
          // lugar de esconderse.
          //
          // Cubiertos por `reportExport.test.js` y `csvExportEdgeCases.test.js`.
          // Medido el 20/09/2026.
          'src/utils/reportExport.js': {
            // 96.87 / 94.44 / 93.33 / 96.87
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70
          },
          'src/utils/pdf/reportPdf.js': {
            // 95.08 / 77.50 / 100 / 95.61
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70
          },
          'src/utils/pdf/pdfDocument.js': {
            // 89.04 / 75.26 / 96.66 / 90.40 — el más justo de los tres en
            // ramas, y aun así 5 puntos por encima del umbral.
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70
          }
        }
      }
    }
  })
)
