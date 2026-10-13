import { defineConfig } from 'vitest/config'

// Tarea 5 — pruebas de integración y de regresión contra un Postgres real.
//
// A diferencia de `vitest.config.js`, aquí no se simula `db/pool.js`: la app
// real de `src/index.js` atiende peticiones HTTP de Supertest y sus consultas
// llegan a la base de `DATABASE_URL`. `globalSetup` la deja limpia y con el
// esquema de `kontrol.sql` antes de la primera suite.
//
// Uso: `npm run test:integration` o `npm run test:regression` (ver package.json).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.js', 'tests/regression/**/*.test.js'],
    globalSetup: ['tests/db/globalSetup.js'],
    setupFiles: ['tests/db/env.js'],

    // Todas las suites comparten una sola base: en serie, para que ninguna
    // vea a medias los datos que otra está creando.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,

    // Evidencia para el CI: JUnit para el reporte de pruebas y JSON para el
    // resumen del job; en GitHub Actions, además, anotaciones en el diff.
    reporters: [
      'default',
      ['junit', { suiteName: 'Kontrol backend' }],
      'json',
      ...(process.env.GITHUB_ACTIONS ? ['github-actions'] : []),
    ],
    outputFile: {
      junit: `reports/${process.env.TEST_SUITE || 'tests'}-junit.xml`,
      json: `reports/${process.env.TEST_SUITE || 'tests'}-results.json`,
    },
  },
})
