# Fase 1 — Investigación: frameworks de pruebas unitarias para nuestro stack

**Stack de Kontrol:** Backend Node.js 20 + Express (ESM) · Frontend Vue 3 + Vite + Pinia

---

## 1. Backend — Node.js / Express

### 1.1 Jest

- **Qué es:** el framework de testing más usado del ecosistema JavaScript, creado por Meta. Incluye runner, aserciones, mocking, snapshots y cobertura en un solo paquete ("baterías incluidas").
- **Comunidad/popularidad:** ~25M descargas semanales en npm; documentación extensa y miles de recursos.
- **Rendimiento:** bueno, con paralelización por workers; arranque más lento que alternativas modernas por su pipeline de transformación.
- **Punto débil para nosotros:** el soporte de **ES Modules es experimental** (`--experimental-vm-modules`). Nuestro backend es `"type": "module"`, así que Jest requiere configuración frágil o transpilar con Babel.

### 1.2 Vitest

- **Qué es:** framework moderno impulsado por Vite (equipo Vue/Vite). API compatible con Jest (`describe`, `it`, `expect`, `vi.mock`).
- **Comunidad/popularidad:** ~10M+ descargas semanales y en crecimiento; es el default de los scaffolds oficiales de Vue (`create-vue`).
- **Rendimiento:** muy rápido — usa esbuild para transformar, workers en paralelo y modo watch inteligente que solo re-ejecuta tests afectados (HMR de tests).
- **ESM:** soporte **nativo**, sin flags. Ideal para nuestro backend ESM.
- **Extras:** cobertura integrada (v8), UI web opcional (`@vitest/ui`), mocking de módulos y timers.

### 1.3 Mocha + Chai + Sinon

- **Qué es:** el stack clásico modular: Mocha (runner) + Chai (aserciones) + Sinon (mocks/spies/stubs).
- **Comunidad:** madura, muy estable, ~7M descargas semanales (Mocha).
- **Contras:** hay que ensamblar 3+ librerías; sin mocking de módulos ESM integrado; sin cobertura integrada (requiere nyc/c8). Más configuración manual.

### 1.4 node:test (runner nativo de Node)

- **Qué es:** test runner integrado en Node.js ≥ 20 (`node --test`), con `assert` nativo.
- **Pros:** cero dependencias; ESM nativo.
- **Contras:** ecosistema joven — mocking limitado, reporters y cobertura básicos, sin watch mode maduro, poca integración con tooling de frontend. Útil para scripts, corto para un proyecto full-stack.

### 1.5 AVA

- **Qué es:** runner minimalista con tests concurrentes por defecto.
- **Contras:** comunidad pequeña (~300K descargas/semana), sin mocking integrado, no aporta ventajas sobre Vitest para nuestro caso.

## 2. Frontend — Vue 3

### 2.1 Vitest + @vue/test-utils

- **La combinación oficial recomendada por el equipo de Vue.** `create-vue` la instala por defecto.
- @vue/test-utils permite montar componentes, pasar props, disparar eventos y verificar emisiones/render.
- Vitest reutiliza `vite.config` → los tests ven el proyecto igual que el build real (alias, plugins, transformaciones de `.vue`).
- Entornos DOM simulados: **happy-dom** (rápido) o jsdom.
- Para Pinia: `setActivePinia(createPinia())` o `@pinia/testing`.

### 2.2 Jest + vue-jest

- Era el estándar en la era Vue 2 / Vue CLI (webpack).
- Hoy requiere `vue3-jest` + babel + configuración de transformadores duplicando lo que Vite ya hace. Mantenimiento del transformador ha quedado rezagado.

### 2.3 Testing Library (Vue)

- Capa sobre @vue/test-utils que fomenta probar como usuario (queries por rol/texto, no por implementación).
- No es un runner: se usa **encima** de Vitest o Jest. Complemento opcional, no alternativa.

### 2.4 Cypress Component Testing / Playwright CT

- Montan componentes en un **navegador real**. Máxima fidelidad, pero arranque lento y setup pesado.
- Orientados a component/E2E testing más que a pruebas unitarias puras; excesivo para esta tarea.

## 3. Tabla comparativa

| Criterio | Jest | **Vitest** | Mocha+Chai | node:test | Cypress CT |
|---|---|---|---|---|---|
| ESM nativo | ⚠️ experimental | ✅ | ⚠️ parcial | ✅ | ✅ |
| Velocidad | Media | **Alta** | Media | Alta | Baja |
| Mocking integrado | ✅ | ✅ | ❌ (Sinon) | ⚠️ básico | ⚠️ |
| Cobertura integrada | ✅ | ✅ (v8) | ❌ (nyc) | ⚠️ básica | ❌ |
| Integración con Vite/Vue 3 | ⚠️ manual | ✅ **nativa** | ❌ | ❌ | ✅ |
| Un solo framework front+back | ⚠️ | ✅ | ⚠️ | ❌ | ❌ |
| Descargas npm/semana (aprox.) | ~25M | ~10M+ | ~7M | n/a (nativo) | ~5M |
| Recomendado oficialmente por Vue | ❌ | ✅ | ❌ | ❌ | parcial |
