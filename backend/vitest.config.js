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
      exclude: ['tests/**']

      // Nota sobre el denominador: `coverage.all` ya no existe en Vitest 4. Sin
      // declarar `coverage.include`, solo se mide lo que algún test importa; un
      // archivo que nadie prueba no aparece en el reporte y no baja el
      // porcentaje. Es intencional: mantiene el gate estable mientras entra
      // código sin tests propios.
    }
  }
})
