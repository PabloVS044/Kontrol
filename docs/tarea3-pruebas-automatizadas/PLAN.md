# Plan — Tarea 3: Pruebas Automatizadas (CC3091)

**Proyecto:** Kontrol — Backend: Node.js 20 + Express (ESM, Mongoose, pg, Zod, JWT, Socket.IO) · Frontend: Vue 3 + Vite + Pinia

**Entregables finales:** presentación en PDF + video demostrando la implementación y ejecución de las pruebas.

---

## Fase 1 — Investigación y resumen de frameworks (20 pts)

Documento `docs/tarea3-pruebas-automatizadas/01-investigacion.md` con resumen de frameworks de pruebas unitarias para nuestro stack:

- **Backend (Node.js/Express):** Jest, Vitest, Mocha + Chai + Sinon, node:test (nativo), AVA.
- **Frontend (Vue 3):** Vitest + @vue/test-utils, Jest + vue-jest, Testing Library (Vue), Cypress Component Testing.
- Por cada uno: descripción, popularidad/comunidad, rendimiento, soporte ESM, integración con nuestro stack.

## Fase 2 — Selección y justificación (25 pts)

Documento `02-seleccion.md`:

- **Elección propuesta: Vitest** para backend y frontend (un solo framework para todo el monorepo).
  - Frontend usa Vite → Vitest reutiliza la misma config y pipeline de transformación.
  - Backend es ESM puro (`"type": "module"`) → Vitest soporta ESM nativo sin configuración extra (Jest requiere flags experimentales).
  - API compatible con Jest (describe/it/expect/vi.mock) → curva de aprendizaje mínima.
  - Complementos: **@vue/test-utils** (montaje de componentes Vue), **@pinia/testing** (stores), **happy-dom** (DOM simulado).
- Justificar con elementos convincentes: comunidad, descargas npm, documentación, velocidad (workers + HMR de tests), watch mode, cobertura integrada (v8).

## Fase 3 — Infraestructura de pruebas

- Instalar y configurar Vitest en `backend/` y `frontend/`.
- Scripts npm: `test`, `test:watch`, `test:coverage` en ambos paquetes.
- Config: `vitest.config.js` en frontend (environment happy-dom, plugin vue); backend usa environment node.
- Verificar que `npm test` corre en ambos.

## Fase 4 — Pruebas unitarias backend (≥3, parte de los 35 pts)

Candidatos (unidades puras o mockeables, sin DB real):

1. `src/middleware/validate.js` — validación con Zod: body válido pasa, inválido responde 400.
2. `src/middleware/requireAuth.js` — JWT: token válido, ausente, expirado/inválido (mock de jsonwebtoken o tokens firmados de prueba).
3. `src/middleware/requireRole.js` — autorización por rol: permitido / denegado.
4. `src/utils/frontendUrl.js` y/o `src/utils/chat.js` — funciones puras.
5. Extra: un controller con req/res mockeados (p. ej. authController) si aporta valor a la demo.

## Fase 5 — Pruebas unitarias frontend (≥3, parte de los 35 pts)

Candidatos:

1. `src/utils/statusHelpers.js` — helpers puros de estado.
2. `src/utils/invitation.js` o `src/utils/projectAccessLabels.js` — lógica pura.
3. `src/stores/auth.js` — store Pinia con `createTestingPinia` / setActivePinia.
4. Componente UI simple (p. ej. Button o DonutChart) con @vue/test-utils: render de props, emisión de eventos.

## Fase 6 — Conclusiones (20 pts)

Documento `03-conclusiones.md`:

- Tiempo empleado en configurar la herramienta y escribir cada prueba.
- Velocidad de ejecución (medir `npm test` y modo watch).
- Ventajas/desventajas encontradas en la práctica.
- Experiencia escribiendo los tests (mocking, DX, mensajes de error).

## Fase 7 — Presentación y video

- Presentación (HTML → PDF o slides) que cubra los 4 rubros de evaluación: frameworks investigados, justificación de elección, ejemplos con capturas, conclusiones.
- Guion para el video: mostrar código de tests, correr `npm test` y `npm run test:coverage` en backend y frontend, modo watch en vivo.

---

## Orden de ejecución

| # | Fase | Resultado |
|---|------|-----------|
| 1 | Investigación | `01-investigacion.md` |
| 2 | Selección | `02-seleccion.md` |
| 3 | Setup Vitest | configs + scripts npm |
| 4 | Tests backend | `backend/tests/*.test.js` (≥3) |
| 5 | Tests frontend | `frontend/tests/*.test.js` (≥3) |
| 6 | Conclusiones | `03-conclusiones.md` |
| 7 | Presentación + guion video | PDF + `guion-video.md` |
