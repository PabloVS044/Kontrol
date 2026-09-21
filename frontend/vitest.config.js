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
          // Trinquete, punto 2: el umbral global se fija en la línea base
          // medida, truncada a entero. Sin margen — el umbral es exactamente lo
          // que hay hoy. Remedido el 18/08/2026 tras cubrir `services/auth.js`
          // (194 sentencias en 7 archivos; antes 168 en 6).
          statements: 83, // base 83.50 % — antes 80
          branches: 83, //   base 83.44 % — antes 80
          functions: 78, //  base 78.18 % — antes 75
          lines: 85, //      base 85.29 % — antes 83

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
          },

          // Reportes: cuarto módulo crítico del trinquete de SCRUM-23.
          //
          // Hoy (12/08/2026) ninguno de estos archivos entra al reporte de
          // cobertura, porque ningún test los importa. Un glob sin archivos
          // que casen pasa en vacío, así que estos tres umbrales no fallan
          // pero tampoco protegen nada todavía: empiezan a tener efecto real
          // cuando lleguen los tests del módulo el 17/08/2026.
          'src/views/ReportsView.vue': {
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70
          },
          'src/views/ReportDetailView.vue': {
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70
          },
          'src/components/reports/**': {
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
