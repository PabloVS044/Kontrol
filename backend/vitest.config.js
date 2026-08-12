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
        // el 11/08/2026 sobre 29 archivos (1107 sentencias), truncada a
        // entero. Sin margen — el umbral es exactamente lo que hay hoy, así
        // que la cobertura solo puede mantenerse o subir, nunca bajar.
        statements: 29, // base 29.08 %
        branches: 19, //   base 19.16 %
        functions: 17, //  base 17.88 %
        lines: 29, //      base 29.13 %

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
        }

        // Reportes: umbral desactivado a propósito. Los tests del módulo
        // llegan el 17/08/2026. Cobertura medida el 11/08/2026:
        // reportsController.js 29.85 / 14.28 / 20 / 29.85.
        // Descomentar y calibrar cuando esos tests estén en develop.
        //
        // 'src/controllers/reportsController.js': {
        //   statements: 70,
        //   branches: 70,
        //   functions: 70,
        //   lines: 70
        // },
        // 'src/routes/reportsRoutes.js': {
        //   statements: 70,
        //   branches: 70,
        //   functions: 70,
        //   lines: 70
        // },
        // 'src/schemas/reportsSchemas.js': {
        //   statements: 70,
        //   branches: 70,
        //   functions: 70,
        //   lines: 70
        // }
      }
    }
  }
})
