# Fase 2 — Selección de herramientas y justificación

## Decisión

**Vitest como framework único de pruebas unitarias para backend y frontend**, complementado con:

| Herramienta | Rol |
|---|---|
| **Vitest** | Runner, aserciones, mocking (`vi`), cobertura (v8) — front y back |
| **@vue/test-utils** | Montaje de componentes Vue 3 (props, eventos, render) |
| **happy-dom** | Entorno DOM simulado y rápido para tests de componentes |
| **Pinia (`setActivePinia`)** | Testing de stores en aislamiento |

## Razones de la elección

### 1. Integración nativa con nuestro stack

- El frontend ya usa **Vite**: Vitest reutiliza la misma configuración (plugins, alias, transformación de `.vue`). Los tests ven el código exactamente igual que el build de producción, sin duplicar configuración como exigiría Jest (babel + vue3-jest).
- El backend es **ESM puro** (`"type": "module"` en package.json). Vitest soporta ES Modules de forma nativa; Jest aún lo trata como experimental (`--experimental-vm-modules`), lo que genera fricción con mocks y estabilidad.
- Es la herramienta **recomendada oficialmente por el equipo de Vue** — `npm create vue@latest` la instala por defecto.

### 2. Rendimiento

- Transformación con esbuild (Go) en lugar de Babel: arranque y ejecución notablemente más rápidos.
- Modo watch inteligente tipo HMR: al editar un archivo solo se re-ejecutan los tests afectados — feedback en milisegundos durante el desarrollo.
- Ejecución paralela por workers de forma predeterminada.

### 3. Comunidad, documentación y popularidad

- +10M descargas semanales en npm y adopción acelerada (default en Vue, Nuxt, Astro, SvelteKit).
- Documentación oficial completa (vitest.dev), en desarrollo activo por el equipo de Vite/Vue (versión estable 3.x, releases frecuentes).
- API **compatible con Jest**: cualquier recurso, tutorial o experiencia previa con Jest aplica casi 1:1 (`describe`, `it`, `expect`, mocks). Curva de aprendizaje mínima para el equipo.

### 4. Robustez / baterías incluidas

- Mocking de módulos, spies, fake timers (`vi.mock`, `vi.fn`, `vi.useFakeTimers`) sin librerías extra (a diferencia de Mocha, que necesita Sinon).
- Cobertura de código integrada vía `@vitest/coverage-v8` (`npm run test:coverage`).
- UI web opcional (`@vitest/ui`) para explorar resultados.

### 5. Un solo framework para todo el monorepo

- Mismos comandos, misma API y mismos reportes en `backend/` y `frontend/` → menor carga cognitiva, un solo estándar de equipo, CI más simple.

## Alternativas descartadas y por qué

- **Jest:** líder histórico, pero su soporte ESM experimental choca con nuestro backend y duplica configuración en el frontend Vite.
- **Mocha + Chai + Sinon:** requiere ensamblar y mantener 3+ piezas; sin cobertura ni mocking integrados.
- **node:test:** sin dependencias, pero mocking/watch/reporters inmaduros y no sirve para componentes Vue → obligaría a usar dos frameworks distintos.
- **Cypress CT:** navegador real innecesario para pruebas unitarias; lento y pesado para esta tarea.
