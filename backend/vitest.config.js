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

      // En Vitest 4 `coverageConfigDefaults.exclude` viene vacío, así que sin
      // esta línea `tests/helpers/authTestApp.js` cuenta como código medido y
      // infla la cobertura del backend.
      exclude: ['tests/**'],

      // Nota sobre el denominador: `coverage.all` ya no existe en Vitest 4. Sin
      // declarar `coverage.include`, solo se mide lo que algún test importa; un
      // archivo que nadie prueba no aparece en el reporte y no baja el
      // porcentaje. Es intencional: mantiene el gate estable mientras entra
      // código sin tests propios.

      // Vitest sale con código 1 si no se cumple un umbral, así que el step
      // `npm run test:coverage -w backend` de ci.yml pone el job en rojo solo.
      thresholds: {
        // Trinquete, punto 2: el umbral global se fija en la línea base medida
        // el 12/08/2026, truncada a entero. Sin margen — el umbral es
        // exactamente lo que hay hoy, así que la cobertura solo puede
        // mantenerse o subir, nunca bajar.
        //
        // La base subió de 29.08/19.16/17.88/29.13 a la actual al cubrir el
        // módulo de reportes; el umbral sube con ella para fijar la mejora.
        statements: 33, // base 33.42 %
        branches: 21, //   base 21.33 %
        functions: 23, //  base 23.84 %
        lines: 33, //      base 33.71 %

        // Trinquete, punto 3: +5 puntos porcentuales por sprint sobre el
        // umbral global. Próxima subida, al cierre del Sprint 6: 38/26/28/38.
        // La política completa está en el README, sección «Cobertura».

        // Umbrales por módulo crítico. Los globs se resuelven con picomatch
        // contra la ruta relativa a la raíz del workspace, y los archivos que
        // casan siguen contando también en el umbral global de arriba.
        //
        // Ojo: un glob que no casa con ningún archivo del reporte pasa en
        // vacío, sin avisar. Si se borra el test que cubre uno de estos
        // archivos, su umbral deja de proteger nada.

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
        }
      }
    }
  }
})
