# Fase 6 — Conclusiones

## Resultados obtenidos

| Métrica | Backend | Frontend |
|---|---|---|
| Archivos de test | 4 | 4 |
| Pruebas unitarias | 22 | 31 |
| Duración de la suite | ~0.4 s | ~0.7 s |
| Cobertura (statements, archivos testeados) | 81.8 % | 75.8 % |

**Total: 53 pruebas unitarias ejecutándose en menos de 1 segundo por paquete.**

### Unidades cubiertas

- **Backend:** middleware de validación con Zod (`validate`), autenticación JWT (`requireAuth`), autorización por roles (`requireRole`) y utilidades de chat (sanitización de adjuntos, previews, serialización de mensajes).
- **Frontend:** helpers de estado/formato (`statusHelpers`), lógica de invitaciones (`invitation`), store de autenticación con Pinia (`auth`) y componente UI (`Button.vue`) con @vue/test-utils.

## Tiempo empleado

| Actividad | Tiempo aproximado |
|---|---|
| Instalación y configuración de Vitest (ambos paquetes) | ~15 min |
| Escritura de 4 suites backend (22 tests) | ~40 min |
| Escritura de 4 suites frontend (31 tests) | ~45 min |
| Depuración (1 test fallido) | ~5 min |
| **Total** | **~1 h 45 min** |

La configuración fue casi nula: en el backend bastó instalar `vitest` y crear un `vitest.config.js` de 8 líneas; en el frontend se reutilizó `vite.config.js` con `mergeConfig`, por lo que alias (`@/`) y el plugin de Vue funcionaron sin trabajo adicional.

## Eficiencia de la herramienta

- **Velocidad excelente:** cada suite completa corre en menos de 1 segundo. En modo watch, el re-run tras editar un archivo es prácticamente instantáneo porque Vitest solo re-ejecuta los tests afectados.
- **Cobertura sin fricción:** `@vitest/coverage-v8` generó reportes por archivo con un solo comando (`npm run test:coverage`), sin configuración.
- **Mocking integrado:** `vi.fn()` para simular `res.status/json` de Express, `vi.stubGlobal('fetch', ...)` para aislar el store de la API real y `vi.useFakeTimers()` para congelar la fecha en `isOverdue` — todo sin librerías adicionales.
- **Misma herramienta en front y back:** mismos comandos, misma API y mismos reportes en los dos paquetes del monorepo.

## Hallazgos durante la escritura de los tests

- El único test que falló inicialmente fue el de `Button.vue`: al no declarar `emits: ['click']`, Vue registra el click nativo además del `$emit` manual, por lo que el evento se emitía dos veces. **La prueba reveló un defecto real del componente, que corregimos declarando `emits: ['click']`**; el test quedó como prueba de regresión que valida exactamente una emisión — evidencia de que incluso tests simples encuentran (y previenen) problemas.
- Escribir tests de middlewares de Express resultó natural: al ser funciones `(req, res, next)`, basta construir objetos simulados, sin levantar servidor ni base de datos.
- El entorno `happy-dom` provee `localStorage` y DOM reales para los tests del store y del componente, manteniendo la velocidad.

## Ventajas y desventajas observadas

**Ventajas:** ESM nativo (crítico para nuestro backend `"type": "module"`), integración total con Vite/Vue, velocidad, API idéntica a Jest (transferencia de conocimiento inmediata), todo incluido (runner + aserciones + mocks + cobertura).

**Desventajas:** comunidad más joven que Jest (menos respuestas históricas en Stack Overflow); en proyectos que no usan Vite el beneficio de integración se reduce; el ecosistema de plugins es menor que el de Jest.

## Conclusión general

Vitest demostró ser la elección correcta para Kontrol: configuración mínima, ejecución casi instantánea y una sola herramienta para todo el monorepo. La inversión de ~2 horas produjo 53 pruebas que ya detectaron un defecto real y quedan listas para integrarse a CI, protegiendo las rutas críticas de autenticación, autorización y validación del sistema.
