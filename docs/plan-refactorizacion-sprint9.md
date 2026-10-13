# Refactorización del Sprint 9 y plan para el Sprint 10

## 1. Punto de partida

El Sprint 9 termina el 13/10/2026 y el Sprint 10 es el último del proyecto, así que todo lo que sigue abierto se planifica en el Sprint 10 o se entrega documentado como deuda residual. El plan del Sprint 8 dejó **53 SP pendientes para los sprints 9 y 10** (`docs/plan-refactorizacion.md` §6): 4 trasladados de DT-02 y DT-03, 30 restantes de la línea base de SCRUM-30 y 19 de los elementos añadidos tras ZAP y volumen (DT-18 a DT-26).

**Numeración.** La regresión de G-1 propone registrar sus hallazgos nuevos como «DT-22» y «DT-23» (`docs/pruebas-regresion-seguridad-volumen.md` §7), pero esos identificadores ya los había asignado el plan del Sprint 8 a la búsqueda del POS y al listado de reportes. Este plan conserva la numeración del Sprint 8 y asigna identificadores nuevos a partir de DT-27:

| Origen | Hallazgo | Se registra como |
|---|---|---|
| G-1, N1 | `scripts/deploy.sh` expone secretos en `ps` | **DT-27** (nuevo) |
| G-1, N2 | `seed.js` con `ensureProveedor` duplicada | Ninguno: corregido en `develop` el 10/10/2026 (`429067e`) |
| G-1, N3 | `npm audit` con 2 críticas y 9 altas | Amplía el alcance de **DT-08** |
| G-1, Vol-1 a Vol-5 | Riesgos de volumen | **DT-22 a DT-26**, como en el plan del Sprint 8 |
| Revisión de DT-15 | WhatsApp, agente de IA y OAuth de Google sin timeout | **DT-28** (nuevo) |
| Corrida local de `develop` en Windows | `tests/navigation.test.js` no carga: el `src` del video de la portada se resuelve como `file:///kontrol-scroll-chaos-order.mp4`. En CI, que corre en Linux, pasa | **DT-29** (nuevo) |
| DT-10, mitigación 6 de volumen | `/api/projects/:id/metrics` sigue sin caché | **DT-30** (nuevo) |

---

## 2. Lo que se refactorizó en el Sprint 9 y cómo baja la deuda técnica

### 2.1 DT-15 · Timeouts salientes, pool y verificación TLS (SCRUM-67, PR #136, 08/10/2026)

**El problema.** Las 11 llamadas HTTP de las seis integraciones (webhook, Slack, Teams, Telegram, Twilio y SendGrid) usaban `fetch` sin `AbortSignal`. El pool de Postgres se creaba sin `max` ni timeouts. Con `DATABASE_SSL` activo, aceptaba cualquier certificado (`rejectUnauthorized: false`). Una integración que no respondiera retenía la petición indefinidamente, y la conexión a la base no estaba protegida frente a un intermediario.

**Qué se refactorizó:**

| Técnica | Cambio en el código |
|---|---|
| Extracción de método | `backend/src/utils/fetchWithTimeout.js`: envoltorio único con `AbortSignal.timeout` (10 s, configurable con `INTEGRATION_HTTP_TIMEOUT_MS`) que lanza `FetchTimeoutError`. Los seis servicios de `backend/src/services/` pasan por él |
| Parametrización | `backend/src/db/poolConfig.js`: `max`, `connectionTimeoutMillis` e `idleTimeoutMillis` explícitos y por entorno; el 0 se rechaza porque en `pg` significa esperar sin límite |
| Corrección de configuración | `rejectUnauthorized` siempre en `true`, con la CA en `DATABASE_SSL_CA`. Se eliminan `sslmode` y afines de la URL para que `?sslmode=no-verify` no reabra el hueco |
| Instrumentación | `backend/src/db/poolStats.js`: `total`, `idle` y `waiting` del pool en `GET /api/health` y, opcionalmente, en el log por intervalo |

**Pruebas que lo fijan:** `fetchWithTimeout.test.js`; `integrationTimeouts.test.js`, que levanta un servidor HTTP real que acepta la conexión y nunca contesta, y comprueba que las 12 funciones de las seis integraciones cortan a los 100 ms configurados; `poolConfig.test.js` (10 casos) y `poolStats.test.js` (4 casos, con un `pg.Pool` real).

**Verificación en el ambiente desplegado** (G-1, `docs/pruebas-regresion-seguridad-volumen.md` §4.1): el probador de webhooks corta a los 10.64–10.74 s contra un endpoint que tarda 10.5 s; `/api/health` expone `"max":10`; la conexión a Supabase verifica la CA con `Verify return code: 0 (ok)`.

**Cómo baja la deuda:**

1. **Cierra DT-15 (3 SP)** y sus tareas T-25 y T-26.
2. **Cierra la salvedad de RNF-6.2 sobre la base de datos.** SCRUM-56 anotaba que `rejectUnauthorized: false` anulaba el valor de TLS hacia la base; hoy se verifica el certificado.
3. **Abarata DT-18.** Toda salida HTTP pasa por una sola función, así que `redirect: 'manual'`, que es la mitad de la corrección del SSRF, se aplica en un solo sitio y no en seis.
4. **Habilita el diagnóstico pendiente de SCRUM-28.** El paso 4 del informe de carga pedía instrumentar el pool para saber si el login lento (C1, p95 de 4.99 s) es contención de conexiones. La instrumentación ya existe; falta correr C1 con ella (§5.5).
5. **Quita un modo de fallo de disponibilidad (RNF-9.1):** una integración caída ya no retiene peticiones sin límite.

**Lo que no cambió, como predijo la hipótesis de G-1:** ningún hallazgo de ZAP. DT-15 no era observable desde un DAST.

**Residual:** `whatsappService.js`, `aiAgentService.js` y el intercambio de token de Google en `authController.js` quedaron fuera de su alcance y siguen sin timeout. Se registra como **DT-28**.

### 2.2 DT-10 · Endpoint agregado del dashboard (SCRUM-68, PR #139, 09/10/2026)

**El problema.** `loadOverview` en `DashboardView.vue` hacía 1 petición de proyectos y luego **N** peticiones a `/api/budgets/project/:id/summary`, una por proyecto, hasta 100 en paralelo. Es el patrón que SCRUM-28 señaló en su hallazgo 3: las acciones con varias consultas por petición son las que menos margen tienen antes de degradar.

**Qué se refactorizó:**

| Técnica | Cambio en el código |
|---|---|
| Extracción a un endpoint agregado | `GET /api/budgets/summary?projectIds=` en `budgetRoutes.js`, con `projectIdsQuerySchema` (hasta 100 ids, sin repetidos) y `budgetOverviewService.js`, que reutiliza `computeAlert` para los niveles de alerta |
| Caché corta de la agregación | `backend/src/utils/budgetSummaryCache.js`: 30 s de vida, clave por empresa y conjunto de proyectos, como máximo 500 entradas |
| Invalidación | Un ajuste de fondos (`addProjectFunding`), una venta del POS (`createSale`) o un cambio de proyecto invalidan la caché de su empresa |
| Simplificación del cliente | `DashboardView.vue` hace una sola petición para todos los resúmenes |

**Pruebas que lo fijan:** doce casos, RA1 a RA12 (`docs/plan-maestro-pruebas.md` §19.9). Cubren validación, acceso por rol y por empresa, forma de la respuesta, alertas en los bordes del 60, 80 y 100 % y en sobregiro, **paridad de cifras con el endpoint anterior en siete escenarios**, caché e invalidación.

**Medición antes y después** (P10; Postgres 16 local, pool de 10, 20 iteraciones tras 3 de calentamiento; ambos modos en la misma corrida, `backend/scripts/bench-results/dt10-despues.json`):

| Proyectos | Antes: peticiones / consultas | Antes: p95, concurrencia 6 como el navegador | Después: peticiones / consultas | Después: p95, caché fría | Después: p95, caché caliente | Cola máxima del pool, sin límite de concurrencia → después |
|---|---|---|---|---|---|---|
| 10 | 11 / 53 | 23.3 ms | 2 / 6 | 10.0 ms | 3.7 ms | 20 → 2 |
| 50 | 51 / 253 | 54.8 ms | 2 / 6 | 6.9 ms | 9.0 ms | 140 → 2 |
| 100 | 101 / 503 | 130.8 ms | 2 / 6 | 10.0 ms | 5.9 ms | 289 → 2 |

Por debajo de 10 ms, la diferencia entre caché fría y caliente es ruido de la medición. Paridad: **0 diferencias** en presupuesto total, gasto, nivel de alerta y porcentaje de uso, en los 10, 50 y 100 proyectos.

**Cómo baja la deuda:**

1. **Cierra DT-10 (3 SP)** y su tarea T-19. Se adelantó del Sprint 10 al 9.
2. **El coste del dashboard deja de crecer con el número de proyectos:** de 1 + N peticiones y unas 5N consultas a 2 peticiones y 6 consultas, constantes.
3. **Deja de saturar el pool.** Con 100 proyectos sin límite de concurrencia, el N+1 dejaba hasta 289 consultas esperando en un pool de 10. Es justo la contención que DT-15 enseñó a medir.
4. **Aporta evidencia a RNF-2.1 y 3.1:** el componente técnico del tiempo hasta ver la salud de los proyectos baja a unos 10 ms, y el resumen con alerta de sobregiro queda tres órdenes de magnitud por debajo de los 3 s del diseño.
5. **Se hizo sin esperar a DT-07.** El plan del Sprint 8 ponía la capa de API como dependencia. No hizo falta, y DT-07 deja de bloquear el rendimiento del dashboard.

**Lo que no cubre:** la caché de `/api/projects/:id/metrics` (mitigación 6 de volumen), que el plan del Sprint 8 vinculaba a DT-10, no se implementó. V2 cumple en N3 (263 ms), así que se registra como **DT-30**, de baja prioridad. El escenario C2 de k6 en la VM no se ha repetido después del cambio; queda para la repetición del final del Sprint 10 (§5.5).

### 2.3 Otros cambios del Sprint 9 que bajan deuda

| Cambio | Ticket | Efecto en la deuda |
|---|---|---|
| Contraste del texto secundario según WCAG AA | SCRUM-63 (UX-R3), PR #138 | **DT-09 pasa a parcial.** El fondo animado deja de usar el token del texto (`--k-bg-wave-line`), su pico se limita (de #ffffff a #272727) y la rampa de texto sube a 4.5:1 o más, fijada por `frontend/tests/theme.test.js`. Resuelve el impacto que motivó DT-09, el texto ilegible sobre la onda, con una técnica distinta a la del inventario: limitar el fondo en su origen en lugar de añadir una capa por vista. Queda el tema claro vacío y los `!important`: de 5 SP a 2 |
| Cierre de DT-02 | PR #126 (S8), despliegue del 10/10 | **DT-02 se cierra.** Lo que el plan del Sprint 8 trasladaba era su verificación en ambiente: `develop` ya corre en pruebas y en producción con la tabla `venta` poblada (G-1 §6.6, fila 7), y RG1 y RG2 fijan contra Postgres real que el precio lo dicta la base y que el IVA va sobre la base con descuento |
| Pruebas unitarias y carga k6 en cada pull request | SCRUM-74 (G-7), PR #141 | **Red de pruebas.** C1 a C5 corren en CI con los umbrales del plan maestro, y los umbrales de cobertura del frontend subieron a 14/13/16/14. No cierra DT-11, porque no hay lint ni auditoría, pero cubre parte de su objetivo: que un cambio que rompe algo no llegue a `develop` |
| Suites de integración y regresión contra Postgres real | Rama `test/integration-regression`, integrada en esta rama | **Caracterización previa a las refactorizaciones del Sprint 10.** I2, I3, RG2 y RG3 fijan la venta del POS, la unicidad del código de barras y el aislamiento entre empresas. Son la red que exige la regla 2 del inventario antes de tocar DT-22 y DT-16 |
| Seed reparado | G-1, N2 (`429067e`) | El ambiente de pruebas se puede volver a restablecer con `reset:test` |

UX-R1, UX-R2 y UX-R5 son mejoras de usabilidad sin deuda técnica asociada.

### 2.4 Efecto en cifras

| Concepto | SP |
|---|---|
| Pendiente al inicio del Sprint 9 (plan del Sprint 8, §6) | 53 |
| Resuelto en el Sprint 9: DT-15 (3), DT-10 (3), DT-02 (1), DT-09 (3) | −10 |
| Reestimación de DT-03: la búsqueda en el servidor es alcance de DT-22, y a DT-03 solo le queda la decisión sobre T-07 | −2 |
| Nuevo en el Sprint 9: DT-27, DT-28, DT-29 y DT-30 | +4 |
| **Abierto al cierre del Sprint 9** | **45** |

---

## 3. Seguimiento del plan del Sprint 8 para el Sprint 9

El plan del Sprint 8 asignó al Sprint 9 once elementos y 27 SP. Se ejecutaron **dos, por 4 SP**: DT-15 (3) y el cierre de DT-02 (1). Fuera de ese plan se ejecutaron DT-10, adelantado del Sprint 10, y la parte de DT-09 que resolvió UX-R3.

| Planificado para el Sprint 9 | SP | Estado al 13/10/2026 |
|---|---|---|
| DT-21 · Infraestructura y despliegue del ambiente de pruebas | 3 | No ejecutado. Disco mitigado a mano (84 %) |
| DT-18 · SSRF | 3 | No ejecutado. Dos hallazgos altos abiertos y ya en producción |
| DT-15 · Timeouts y pool | 3 | **Ejecutado** |
| DT-19 · Cabeceras del SPA | 2 | No ejecutado |
| DT-02 · Verificación en ambiente | 1 | **Ejecutado** |
| DT-03 · Decisión sobre T-07 | 3 | Sin decisión registrada. I3 fija la unicidad por proyecto como comportamiento actual |
| DT-22 · Búsqueda del POS en el servidor | 3 | No ejecutado |
| DT-23 · Listado de reportes | 2 | No ejecutado |
| DT-26 · Índice de `presupuesto_actividad` | 1 | No ejecutado |
| DT-08 · Dependencias | 3 | No ejecutado; empeoró (G-1, N3) |
| DT-11 · Lint y auditoría en CI | 3 | No ejecutado |

**Por qué.** El Sprint 9 sumó 42 SP en doce tareas. La guía del sprint priorizó las mejoras que salieron de usabilidad (UX-R1 a UX-R5) y los entregables G-1 a G-7. Solo dos tareas, SCRUM-67 y SCRUM-68, por 6 SP, eran de refactorización. El plan del Sprint 8 sobreestimó la capacidad: suponía 27 SP de deuda en un sprint en el que la deuda tuvo, en la práctica, unos 10.

**Consecuencia que hay que registrar.** El plan del Sprint 8 fijó una regla, que su presentación de cierre repitió: ningún release de `develop` a `main` sin cerrar antes los hallazgos altos de seguridad (DT-18). La retrospectiva del Sprint 8 puso, a la vez, el release como acción del Sprint 9. En la práctica, la regla se rompió el 10/10/2026: el despliegue de G-1 llevó `develop` @ `28f5580` a producción sin pasar por `main` y con DT-18 abierto, porque `deploy.sh` no puede actualizar solo el ambiente de pruebas (DT-21). El balance para producción es positivo, porque ganó DT-01, DT-05, DT-12 parcial, DT-13, DT-14, DT-15 y DT-10, pero los dos SSRF altos están hoy expuestos ahí. La deuda de infraestructura provocó la ruptura de la regla, y por eso DT-21 entra en el compromiso del Sprint 10.

**Lección aplicada a este plan:** el compromiso del Sprint 10 se ordena estrictamente por riesgo y lleva una línea de corte explícita (§5.1).

---

## 4. Inventario abierto al 13/10/2026

20 elementos, 45 SP. La severidad es la que dio la prueba no funcional que detectó el riesgo (`docs/comparativa-rnf-sprint9.md` §5).

| Elemento | Prio. | SP | Severidad medida | Origen | RNF afectado |
|---|---|---|---|---|---|
| DT-18 · Caminos de SSRF sin cubrir | P1 | 3 | Alta | ZAP S8 y S9 | 6.3 |
| DT-08 · Dependencias vulnerables | P1 (sube de P2 por N3) | 3 | Alta | `npm audit` S8 y S9 | — (propuesto) |
| DT-22 · Búsqueda del POS en el servidor | P1 | 3 | Alta | Volumen S8 y S9 | 13.3 |
| DT-03 · Decisión de unicidad del código de barras (T-07) | P1 | 1 | — | Inventario S7 | — |
| DT-19 · Cabeceras del SPA | P2 | 2 | Media | ZAP S8 y S9 | 6.2 |
| DT-21 · Disco, logs y despliegue del ambiente de pruebas | P1 | 3 | Media | ZAP S8, G-1 | 9.1, 9.3 |
| DT-27 · Secretos visibles en `ps` durante el despliegue | P2 | 1 | Media | G-1, N1 | — |
| DT-16 · Vistas temporales del agente | P2 | 3 | Media, latente | Inspección S7 | 6.1, 14.1 |
| DT-23 · Listado de reportes por empresa y paginado | P2 | 2 | Media | Volumen S8 y S9 | 3.1 |
| DT-26 · Índice de `presupuesto_actividad` | P2 | 1 | Baja | Volumen S8 y S9 | 3.1 |
| DT-28 · Timeouts restantes | P3 | 1 | Baja | Revisión de DT-15 | 9.1 |
| DT-20 · Validación de entradas | P3 | 2 | Baja | ZAP S8 y S9 | 6.3 |
| DT-25 · Resumen de reportes por empresa | P2 | 2 | Media, hoy dentro de umbral | Volumen S8 y S9 | 3.1 |
| DT-30 · Caché de métricas de proyecto | P3 | 1 | Baja, dentro de umbral | Volumen S8; DT-10 | 13.3 |
| DT-24 · Límite del PDF | P3 | 1 | Media, de utilidad | Volumen S8 | — |
| DT-11 · Lint y auditoría en CI | P3 | 3 | — | Inventario S7 | — |
| DT-07 · Capa de acceso a API | P2 | 5 | — | Inventario S7 | — |
| DT-17 · Bundle de entrada | P2 | 5 | Sin prueba en el cliente; 1,302 kB y creciendo | Build S7 y S9 | 3.3, 5.3 |
| DT-09 · Tema claro y estilos restantes | P2 | 2 | — | Inventario S7 | 1.3 |
| DT-29 · Suite del frontend en Windows | P3 | 1 | — | Corrida local S9 | — |

---

## 5. Plan de refactorización para el Sprint 10

### 5.1 Capacidad y reglas

**Capacidad supuesta: unos 20 SP de refactorización** en el Sprint 10. La velocidad del segundo semestre fue de 35, 61, 44, 56 y 42 SP en los sprints 5 a 9, con un promedio de 47.6 (presentación de cierre del Sprint 8 y `docs/ejecucion-presupuesto-sprint9.xlsx`). Veinte SP son algo más del 40 % de ese promedio. El resto, unos 27 SP, queda para los entregables de la guía, para una selección de las pruebas faltantes de la Parte 1 §4.1 (todas sumarían unos 22 SP) y para la repetición de §5.5. Es un supuesto que hay que confirmar en la planificación del Sprint 10. **Si la capacidad real se queda en los 10 SP del Sprint 9, el corte va después del elemento 3**, que cierra los tres riesgos de severidad alta.

Reglas que se mantienen del inventario y del plan del Sprint 8:

1. **La caracterización va antes que la refactorización.** Para DT-22 y DT-16 ya existe: I2, I3, RG2 y RG3 (§2.3).
2. **Ningún despliegue a producción sin DT-18 cerrado.** Se rompió el 10/10; desde ahora la hace cumplir DT-21, porque deja actualizar el ambiente de pruebas sin tocar producción.
3. **Cada elemento se cierra con la prueba que detectó el riesgo**, no solo con pruebas unitarias. Columna «Verificación de cierre».

### 5.2 Compromiso del Sprint 10 (6 elementos, 19 SP)

Ordenado por la severidad que reveló la prueba no funcional.

| Orden | Elemento | Qué se refactoriza | Riesgo que mitiga | RNF | Sprint | SP | Verificación de cierre |
|---|---|---|---|---|---|---|---|
| 1 | **DT-18** · SSRF | Extracción de método. En `ssrfGuard.js`, bloquear `0.0.0.0/8` y normalizar `::ffff:0:0/96` a IPv4 antes de comprobar rangos. `redirect: 'manual'` en `fetchWithTimeout`, que desde DT-15 es la única salida. `sendWebhookEvent` llama a `assertPublicHttpUrl`. Conectar a la IP ya validada para cortar el DNS rebinding | Hallazgos 1 y 2 (Alta) y 4 (Media) de ZAP, abiertos en S8 y S9 y hoy en producción | 6.3; requisito de seguridad propuesto | 10 | 3 | `zap/verify-controls.sh ssrf ssrf-redirect` sin `REACHED`; casos nuevos en `integrationSsrf.test.js` |
| 2 | **DT-08** · Dependencias (diferido del S9) | Actualización por lotes. `npm audit fix` sin cambios de versión mayor (`concurrently` y `shell-quote`, `fast-glob`, `source-map-js`, `postcss-nested`), que elimina las 2 críticas. `uploadthing` a su versión mayor con parche (T-16), con la subida de archivos verificada a mano | N3 de G-1: 2 críticas y 9 altas (Alta) | — | 10 | 3 | `npm audit --audit-level=critical` en 0; altas reducidas a la cadena de `tailwindcss` |
| 3 | **DT-22** con **DT-03** · Búsqueda del POS | Extracción a endpoint. Búsqueda por código en el servidor (`GET /api/products/barcode/:code?projectId=`), que pgbench ya midió en unos 32 ms planos en todos los niveles, devolviendo todas las coincidencias para conservar la desambiguación de PR #126. Listado de productos paginado. DT-03: registrar la decisión de mantener la unicidad por proyecto, que I3 ya fija, y cerrar T-07 como descartada | Vol-1 (Alta): el POS descarga 8.1 MB y tarda 2.41 s en N3; 789 ms en N2, al límite | 13.3; requisito de volumen propuesto | 10 | 4 | k6 V5 en N2 y N3 por debajo de 800 ms; I2, I3, RG2 y RG3 en verde |
| 4 | **DT-19** · Cabeceras del SPA | Ajuste de configuración. Las cinco cabeceras en `frontend/nginx.conf.template`, con una CSP compatible con el build de Vite y Google Fonts; `server_tokens off`; una sola llamada a `helmet` (hoy en `index.js:42` y en `security.middleware.js`); `Cache-Control: no-store` en las respuestas autenticadas de la API | Hallazgo 3 (Media) y hallazgos 5, 8 y 9 (Baja) | 6.2 | 10 | 2 | `verify-controls.sh headers` con 5/5 sobre `/`; desaparecen las alertas 10038, 10020, 10021, 10035, 10036 y 10015 del pasivo |
| 5 | **DT-21** con **DT-27** · Despliegue y VM | Ajuste de configuración. En `scripts/deploy.sh`: modo solo pruebas, con su propio checkout, y `.env` enviado por `scp` o por stdin en lugar de incrustarlo en el comando remoto. Rotación de la contraseña de la base de pruebas. `logging.options.max-size` en los dos compose, alerta de disco y `deploy.resources.limits.cpus` para `backend-test` (hallazgo 4 de SCRUM-28) | N1 de G-1 (Media); disco al 84 %, reinicio de la VM y el despliegue acoplado que llevó `develop` a producción | 9.1, 9.3 | 10 | 4 | `ps` durante un despliegue sin secretos; un despliegue solo de pruebas deja intacto el id de imagen de producción; `docker inspect` muestra la rotación de logs |
| 6 | **DT-16** · Vistas del agente (diferido) | Extracción de método (`withAgentScope`): abrir la transacción, crear las vistas dentro de ella, pasarla a solo lectura con `SET LOCAL transaction_read_only = on` y terminar con `ROLLBACK`, que descarta las vistas porque el DDL de Postgres es transaccional. Ninguna vista sobrevive en la conexión devuelta al pool | Fuga latente entre empresas: la primera consulta sin `public.` resolvería contra la vista de otro inquilino. Va en el compromiso porque DT-22 y DT-23 añaden consultas nuevas en este mismo sprint | 6.1, 14.1 | 10 | 3 | Prueba de integración: tras una consulta del agente, la conexión devuelta no tiene vistas en `pg_temp`; RG3 en verde |
| | | | | | | **19** | |

### 5.3 Ampliación si hay capacidad (4 elementos, 6 SP)

En este orden, solo si el compromiso queda cerrado:

| Orden | Elemento | Qué se refactoriza | Riesgo que mitiga | RNF | Sprint | SP | Verificación de cierre |
|---|---|---|---|---|---|---|---|
| 7 | **DT-26** · Índice | `CREATE INDEX IF NOT EXISTS` sobre `presupuesto_actividad (id_proyecto)` en `bootstrap.js` | Vol-5: dos *seq scans* en métricas y en el resumen | 3.1 | 10 | 1 | `EXPLAIN` de N3 con *index scan* |
| 8 | **DT-23** · Listado de reportes | Filtrar por `r.id_empresa = $1` en lugar de `COALESCE(r.id_empresa, p.id_empresa)`, que impide usar el índice, y paginar en el servidor y en la vista | Vol-2: 499 ms en N3, a 0.5 ms del umbral; 1.8 MB por respuesta | 3.1 | 10 | 2 | k6 V3 en N3 con margen bajo 500 ms |
| 9 | **DT-28** · Timeouts restantes | `fetchWithTimeout` en WhatsApp, en el intercambio de token de Google y, con un límite propio más largo, en el agente de IA | Una dependencia externa caída retiene peticiones | 9.1 | 10 | 1 | Casos nuevos en `integrationTimeouts.test.js` |
| 10 | **DT-20** · Validación de entradas | Esquema para `X-Company-ID` en `requireCompany`; `validate()` antes de `movementPermissionGate`; prueba que fije el escapado de los campos libres | Hallazgos 6 y 7 (Baja): 500 ante entrada inválida y HTML sin sanear | 6.3 | 10 | 2 | 0 errores `invalid input syntax` en el activo de ZAP; `X-Company-ID: abc` devuelve 400 |

### 5.4 Deuda residual al cierre del proyecto (8 elementos, 20 SP)

No se refactorizan en el tiempo que queda. Se entregan documentados, con el motivo por el que se acepta el riesgo y la condición que lo reactivaría.

| Elemento | SP | Por qué se acepta | Se reactiva si… |
|---|---|---|---|
| DT-25 · Resumen de reportes por empresa | 2 | 197 ms en N3, dentro de los dos umbrales | V4 pasa de 500 ms en una repetición de volumen |
| DT-30 · Caché de métricas | 1 | V2 en 263 ms en N3, dentro de umbral | C2 en la VM sigue fuera de umbral después de DT-10 |
| DT-24 · Límite del PDF | 1 | Afecta la utilidad del documento, no el tiempo ni la seguridad | — |
| DT-11 · Lint y auditoría en CI | 3 | CI ya corre unitarias, umbral de cobertura, k6 e integración. El gate de `npm audit --audit-level=high` fallaría de todos modos hasta migrar `tailwindcss` | Se migra `tailwindcss@4` |
| DT-07 · Capa de acceso a API | 5 | Coste de mantenimiento, sin riesgo medido por ninguna prueba no funcional. DT-10 ya no depende de ella | Se necesita un cambio transversal: refresh de token, 401 global |
| DT-17 · Bundle de entrada | 5 | 1,302 kB y creciendo, pero ninguna prueba mide el rendimiento en el cliente (RNF-3.3 y 5.3 sin validar) | Lighthouse (Parte 1 §4.1) da un resultado malo en el login |
| DT-09 · Tema claro | 2 | Bloqueado por la paleta clara que Diseño no ha entregado (TODO de SCRUM-12). El contraste del tema oscuro ya cumple AA | Diseño entrega la paleta |
| DT-29 · Suite del frontend en Windows | 1 | CI corre en Linux y está en verde; solo afecta la corrida local | — |

**Cadena de `tailwindcss`** (`chokidar`, `fast-glob`, `micromatch`, `braces`): queda fuera de DT-08 porque exige migrar a `tailwindcss@4`, que reescribe la configuración de estilos de todo el frontend. Esas librerías procesan los archivos del propio repositorio durante el build, no entradas de usuarios en ejecución. Se acepta como riesgo residual y se documenta en la entrega.

### 5.5 Final del Sprint 10: repetir las pruebas que dieron los riesgos

Sin elementos de refactorización. Como última tarea del Sprint 10, una vez mergeado el compromiso, se repiten las pruebas que detectaron cada riesgo, para medir el efecto del plan y actualizar la matriz de la Parte 1:

| Prueba | Qué verifica |
|---|---|
| `zap/verify-controls.sh` y ZAP pasivo y activo, con los planes y la imagen de G-1 | DT-18, DT-19 y DT-20 |
| Volumen N2 y N3, escenarios V3 y V5 | DT-22, DT-23 y DT-26 |
| k6 C1 a C5 en la VM con `DB_POOL_STATS_INTERVAL_MS` activo | C2 después de DT-10, C5 después de DT-02 y DT-22, y el diagnóstico de C1 con la instrumentación de DT-15 |
| `npm audit` | DT-08 |

**Efecto esperado en los RNF:** RNF-6.3 y 6.2 siguen en Cumple, pero sin los hallazgos de seguridad abiertos. RNF-13.3 solo pasaría a Cumple si, además del POS, el login (C1) entra en su umbral, y eso depende del diagnóstico del pool, no de este plan. La matriz se actualiza con lo que se mida, no con lo esperado.

---

## 6. Matriz de riesgos, elementos y RNF

| Riesgo (Parte 1 §5) | Elemento | Sprint | Estado | RNF |
|---|---|---|---|---|
| Integración que no responde retiene peticiones; TLS a la base sin verificar | DT-15 | 9 | **Resuelto** | 6.2, 9.1 |
| Dashboard con 1 + N peticiones; saturación del pool | DT-10 | 9 | **Resuelto** | 2.1, 3.1, 13.3 |
| Texto ilegible sobre el fondo animado | DT-09 (parte de contraste) | 9 | **Resuelto** | 1.1, 1.3 |
| Precio de venta fijado por el cliente | DT-02 | 8 y 9 | **Resuelto** | 8.3 |
| SSRF en producción | DT-18 | 10 | Compromiso | 6.3 |
| Dependencias con críticas | DT-08 | 10 | Compromiso | — |
| POS degradado por volumen | DT-22, DT-03 | 10 | Compromiso | 13.3 |
| SPA sin cabeceras | DT-19 | 10 | Compromiso | 6.2 |
| Secretos en `ps`; despliegue acoplado; disco | DT-21, DT-27 | 10 | Compromiso | 9.1, 9.3 |
| Fuga latente del agente | DT-16 | 10 | Compromiso | 6.1, 14.1 |
| Reportes al límite en N3 | DT-23, DT-26 | 10 | Ampliación | 3.1 |
| Timeouts restantes | DT-28 | 10 | Ampliación | 9.1 |
| 500 ante entrada inválida | DT-20 | 10 | Ampliación | 6.3 |
| Resumen de reportes y métricas que crecen con el volumen | DT-25, DT-30 | — | Residual | 3.1, 13.3 |
| Bundle de 1,302 kB | DT-17 | — | Residual | 3.3, 5.3 |
| Login con p95 de 4.99 s | Diagnóstico en la repetición de §5.5 | 10 | Pendiente de medición | 13.3 |

---

## 7. Resumen de SP

| Concepto | SP |
|---|---|
| Inventario total: línea base (60), añadidos del S8 (19) y del S9 (4) | 83 |
| Resuelto en el Sprint 8 | 22 |
| Avance de DT-02 en el Sprint 8 (PR #126) | 4 |
| Resuelto en el Sprint 9 | 10 |
| Reestimación de DT-03 | 2 |
| **Abierto al cierre del Sprint 9** | **45** |
| Compromiso del Sprint 10 | 19 |
| Ampliación del Sprint 10 | 6 |
| Residual documentado al cierre | 20 |

Si se cumple el compromiso, al cierre del proyecto se habrán resuelto 55 de los 83 SP (66 %). Quedarán cerrados los tres riesgos de severidad alta y los de severidad media que hoy están expuestos en producción o fuera de umbral. Con la ampliación serían 61 SP (73 %). Lo que queda abierto está dentro de umbral, se midió como de severidad baja o no tiene un riesgo medido por ninguna prueba.

---

## 8. Verificación del criterio de aceptación

| Criterio del ticket | Estado |
|---|---|
| Lista de lo refactorizado en el Sprint 9, con su efecto en la deuda técnica | Cumplido en §2: DT-15 (§2.1) y DT-10 (§2.2), cada uno con el problema, la técnica, el código, las pruebas, la medición y el efecto en la deuda; otros cambios del sprint que bajan deuda en §2.3; cifras en §2.4 |
| Plan de refactorización por sprint hasta el cierre del proyecto | Cumplido en §5: el Sprint 10 es el único que queda, con compromiso, ampliación, repetición de las pruebas al final del sprint y residual documentado |
| Partir del inventario de deuda que queda abierto, incluidos los diferidos DT-16 y DT-08 | Cumplido: inventario abierto en §4 (20 elementos, 45 SP); DT-08 y DT-16 en el compromiso del Sprint 10, órdenes 2 y 6 |
| Priorizar por el riesgo que revelaron las pruebas no funcionales | Cumplido: orden por severidad medida (§4 y §5.2), con el riesgo, la prueba y el hallazgo de origen de cada elemento |
| Cada ítem: qué se refactoriza, qué riesgo o RNF mitiga, sprint destino y esfuerzo | Cumplido en las tablas de §5.2 y §5.3; el residual de §5.4 lleva SP y el motivo por el que se acepta |
