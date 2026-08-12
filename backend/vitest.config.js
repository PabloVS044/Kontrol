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
        // Línea base medida el 11/08/2026 sobre 29 archivos (1107 sentencias),
        // menos ~4 puntos de margen. El margen no cubre el código nuevo sin
        // tests (ese ni entra al denominador), sino el movimiento normal del
        // denominador: un controller de ~200 sentencias que entre al 10% mueve
        // el total ~1.5 puntos.
        statements: 25, // base 29.08 % · margen 4.08
        branches: 15, //   base 19.16 % · margen 4.16
        functions: 14, //  base 17.88 % · margen 3.88
        lines: 25 //       base 29.13 % · margen 4.13
      }
    }
  }
})
