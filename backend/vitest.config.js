import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],

    coverage: {
      provider: 'v8',

      // Los reporters por defecto más `json-summary`, que escribe
      // `coverage/coverage-summary.json`: de ahí salen los porcentajes exactos
      // para el informe del sprint sin tener que abrir el reporte HTML.
      reporter: ['text', 'html', 'clover', 'json', 'json-summary'],

      // El denominador. `coverage.all` no existe en Vitest 4: sin `include`
      // solo se mide lo que algún test importa, así que un archivo que nadie
      // prueba no aparece en el reporte y no baja el porcentaje. SCRUM-23 lo
      // dejó sin declarar a propósito para no poner el gate en rojo, y el
      // resultado fue que 59 de los 94 archivos de `src/` eran invisibles y el
      // 37 % que reportaba el gate no era cobertura real. Con `include` el
      // denominador es todo `src/`: 83 archivos y 3 929 sentencias.
      include: ['src/**/*.js'],

      // Fuera del denominador. En Vitest 4 `coverageConfigDefaults.exclude`
      // viene vacío, así que todo lo que no deba contar va listado aquí.
      exclude: [
        // Ayudantes de test (`tests/helpers/authTestApp.js` inflaba la cifra).
        'tests/**',
        // Arranque del proceso: `app.listen`, sin lógica que probar.
        'src/index.js',
        // Configuración del SDK de UploadThing.
        'src/uploadthing.js',
        // Pool de Postgres, conexión de Mongo, DDL de arranque y los scripts
        // de `npm run seed:test` / `reset:test`.
        'src/db/**',
        // Esquemas de Mongoose: declaraciones, no comportamiento.
        'src/models/**'
      ],

      // Vitest sale con código 1 si no se cumple un umbral, así que el step
      // `npm run test:coverage -w backend` de ci.yml pone el job en rojo solo.
      thresholds: {
        // Trinquete, punto 2: el umbral global se fija en la línea base real
        // medida el 20/09/2026 sobre el denominador completo, truncada a
        // entero y menos 1 punto porcentual de margen.
        //
        // El margen es nuevo. SCRUM-23 iba sin margen, pero con el
        // denominador real hay dos fuentes de varianza que antes no pesaban:
        // v8 cuenta ramas y funciones distinto entre versiones mayores de
        // Node —se mide en local y se verifica en CI, que usa el 22 de
        // `.nvmrc`—, y sobre 3 929 sentencias un controlador nuevo de 200
        // sentencias sin test baja `statements` 0.78 puntos por sí solo. El
        // margen absorbe esa varianza; no relaja el trinquete.
        statements: 15, // base real 16.21 % (637/3929) — antes 33 sobre 1 719
        branches: 9, //    base real 10.94 % (265/2421)
        functions: 11, //  base real 12.42 % (59/475)
        lines: 15, //      base real 16.46 % (610/3705)

        // Trinquete, punto 3: +5 puntos porcentuales por sprint sobre el
        // umbral global, contados desde esta base nueva. Próxima subida, al
        // cierre del Sprint 8: 20/14/16/20. La política completa está en
        // el README, sección «Cobertura de código».

        // Umbrales por módulo crítico. Los globs se resuelven con picomatch
        // contra la ruta relativa a la raíz del workspace, y los archivos que
        // casan siguen contando también en el umbral global de arriba.
        //
        // Ojo: un glob que no casa con ningún archivo del reporte pasa en
        // vacío, sin avisar. Con `include` declarado eso ya solo pasa si la
        // ruta no existe, pero el riesgo sigue: cada glob de esta lista lleva
        // al lado su medición real, y si un glob no lleva número es que no se
        // ha comprobado que case con algo.

        // Presupuesto: cálculo financiero puro. Medido 100 % en las cuatro.
        'src/utils/budgetCalculations.js': {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70
        },

        // Autenticación: verificación de token y de rol. Medido 100 % en las
        // cuatro para ambos archivos. La expansión de llaves casa solo con
        // requireAuth.js y requireRole.js — requireCompanyRole.js queda fuera.
        'src/middleware/require{Auth,Role}.js': {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70
        },

        // Reportes: cuarto módulo crítico del trinquete de SCRUM-23.
        // Cubierto por `tests/reports.controller.test.js`. Medido el
        // 12/08/2026: los tres archivos al 100 % en las cuatro métricas.
        'src/controllers/reportsController.js': {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70
        },
        'src/routes/reportsRoutes.js': {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70
        },
        'src/schemas/reportsSchemas.js': {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70
        },

        // POS: la venta real. Hasta ahora el único umbral de POS del proyecto
        // era `frontend/src/utils/sales.js`, que mide 95 % — pero ahí solo
        // están el subtotal y el total de línea del navegador, y `calcSale`
        // (descuento e IVA) no lo importa nadie. La venta que descuenta stock
        // y cobra vive aquí, y mide 0 % en las cuatro métricas: 198 sentencias
        // sin una sola prueba.
        //
        // El umbral va en 0 a propósito. En 0 no protege nada: es un marcador
        // que deja el módulo declarado como crítico con su cifra real a la
        // vista. La tarea de validación de precios del POS lo sube en el mismo
        // PR en que entren sus pruebas de caracterización.
        'src/controllers/inventoryMovementController.js': {
          // 0 / 0 / 0 / 0 — 180 sentencias
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        'src/routes/inventoryMovementRoutes.js': {
          // 0 / 0 / 0 / 0 — 11 sentencias
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        'src/schemas/inventoryMovementSchemas.js': {
          // 0 / 0 / 0 / 0 — 7 sentencias
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        }
      }
    }
  }
})
