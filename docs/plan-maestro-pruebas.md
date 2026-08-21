# Plan Maestro de Pruebas — Kontrol

## 1. Identificador del plan

| Campo | Valor |
|---|---|
| Identificador | `KTL-PMP-S6-v1.0` |
| Proyecto | Kontrol — plataforma de gestión de proyectos, equipos, inventario y marketing |
| Historia de usuario | HU-34 |
| Ticket de este entregable | [SCRUM-21 — Elaboración del plan maestro de pruebas versionado en el repositorio](https://kontroldevelopment.atlassian.net/browse/SCRUM-21) |
| Tickets relacionados | SCRUM-18 (HU-35, módulo de código de barras) · SCRUM-20 (HU-33, exportación de reportes) · SCRUM-22 (HU-34, pruebas unitarias de ambos) · SCRUM-23 (HU-34, umbral de cobertura en CI) |
| Responsable de elaboración | Jonathan Tubac (carné 24484) |
| Story points / horas estimadas | 5 SP / 8 h |
| Fecha probable de terminación | 11/08/2026 |
| Repositorio y ruta | `github.com/PabloVS044/Kontrol` → `docs/plan-maestro-pruebas.md` |
| Sprint | Sprint 6 |

### Control de cambios

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| 1.0 | 11/08/2026 | Jonathan Tubac | Versión inicial: define alcance, casos y matriz de trazabilidad para SCRUM-22, antes de escribir los tests. |
| 1.1 | 21/08/2026 | Jonathan Tubac | SCRUM-22 finalizado: los 10 casos de la matriz (§16.1) pasan de "Pendiente" a "Cubierto". Pendiente enlazar el commit/PR exacto de los casos 1-6 (ver riesgo #2, §14). |

> Este documento se actualiza por pull request. Cada cambio a la matriz de trazabilidad (§16) debe venir acompañado del commit que agrega o modifica el test correspondiente, de modo que la relación **plan → caso de prueba → test automatizado** quede explícita en el historial de git.

---

## 2. Introducción y alcance

Kontrol es un monorepo (Vue 3 + Vite en frontend, Node.js + Express en backend, PostgreSQL y MongoDB como bases de datos) que cubre gestión de proyectos, inventario/POS, presupuesto, reportes y marketing. El Sprint 6 introduce dos incrementos funcionales nuevos:

1. **SCRUM-18 — Módulo de código de barras para el punto de venta.** Registro y lectura de códigos de barras para agilizar el cobro: campo `codigo_barras` en `PRODUCTO`, generación/impresión de etiquetas, lectura por cámara vía `@zxing/browser`, resolución código → producto → carrito, y entrada manual como alternativa obligatoria.
2. **SCRUM-20 — Exportación de reportes a PDF y CSV.** Descarga de los reportes ya filtrados en pantalla, en dos formatos, con registro de la generación en la entidad `REPORTE`.

Ambos quedan bloqueando a **SCRUM-22**, que automatiza 10 casos de prueba (6 de código de barras, 4 de exportación) siguiendo los casos que este plan define. Este plan es, a su vez, la medida de mejora comprometida en la retrospectiva del Sprint 5: versionar el plan maestro en el repositorio **antes** de escribir los tests, para que la trazabilidad sea auditable en el historial de git y no solo en Jira.

**Alcance de este plan:** pruebas unitarias y de componente sobre la capa de lógica de negocio de ambas funcionalidades nuevas, más la regresión de las suites ya existentes desde el Sprint 5, ejecutadas con Vitest y aplicadas como gate de cobertura en CI (`.github/workflows/ci.yml`, política de trinquete de SCRUM-23, documentada en el `README.md` del repositorio).

**Fuera de alcance de este plan:** pruebas de carga y pruebas de seguridad — no se incluyen en esta entrega por instrucción explícita de la rúbrica del sexto sprint. Tampoco pruebas end-to-end ni de integración contra bases de datos reales (ver §5).

---

## 3. Elementos de prueba

| Elemento | Ruta | Bajo prueba en |
|---|---|---|
| Resolución de escaneo (código → producto → carrito) | `frontend/src/views/InventoryPage.vue` — `handleScan`, `addToCart`, `getCartItem`, `canSellProduct`, `incrementCart` | SCRUM-22, casos 1-4 y 6 |
| Componente lector de cámara | `frontend/src/components/inventory/BarcodeScanner.vue` | Excluido de prueba unitaria — ver §5 |
| Unicidad de código de barras al persistir | `backend/src/controllers/productController.js` (`createProduct`, `updateProduct`, manejo de `err.code === '23505'`) y restricción única en `backend/src/db/bootstrap.js` | SCRUM-22, caso 5 |
| Cálculo de venta del POS (subtotal, descuento, IVA) | `frontend/src/utils/sales.js` | Regresión Sprint 5 — `frontend/tests/sales.test.js` |
| Generación de CSV | `frontend/src/utils/csvExport.js` | SCRUM-22, casos 7-8 |
| Generación de PDF | `frontend/src/utils/pdf/pdfDocument.js` | SCRUM-22, caso 9 |
| Ensamblado del dataset de exportación (filtros activos) | `frontend/src/utils/reportExport.js` | SCRUM-22, caso 10 |
| Registro de exportación en `REPORTE` | `backend/src/controllers/reportsController.js`, `backend/src/routes/reportsRoutes.js`, `backend/src/schemas/reportsSchemas.js` | Regresión Sprint 6 — `backend/tests/reportExports.test.js`, `backend/tests/reports.controller.test.js` |
| Middleware de autenticación y autorización | `backend/src/middleware/requireAuth.js`, `requireRole.js` | Regresión Sprint 5 |
| Cálculo de presupuesto | `backend/src/utils/budgetCalculations.js` | Regresión Sprint 5 |
| Gate de cobertura en CI | `backend/vitest.config.js`, `frontend/vitest.config.js`, `.github/workflows/ci.yml` | SCRUM-23 (criterio de aprobación, §7) |

---

## 4. Características a probar

- Un código de barras válido resuelve al producto correcto dentro del proyecto activo.
- El producto resuelto se agrega al carrito de venta con su precio vigente (`precio_venta`).
- Escanear el mismo código dos veces incrementa la cantidad de la línea existente, no crea una línea duplicada.
- Un código que no coincide con ningún producto del proyecto devuelve un error controlado, sin romper el estado del carrito.
- Un producto sin stock disponible (`stock_actual <= 0`) no se agrega y muestra advertencia, sin excepción no controlada.
- Un código de barras duplicado dentro de la misma empresa/proyecto se rechaza al guardar o actualizar el producto (409, `That barcode is already in use in this project.`).
- El CSV exportado contiene el mismo número de filas que el reporte visible en pantalla, con el filtro activo aplicado.
- El CSV escapa correctamente comas, comillas y saltos de línea dentro de los valores (compatibilidad Excel/Google Sheets).
- El PDF exportado se genera con contenido no vacío, encabezado esperado (`%PDF-1.4` … `%%EOF`) y estructura de objetos válida.
- La exportación (PDF y CSV) respeta los filtros activos de la vista de reportes en el momento de generarse.
- Regresión: los módulos críticos ya cubiertos en Sprint 5 (POS, autenticación, presupuesto) no retroceden por cambios de este sprint.
- El pipeline de CI falla de forma demostrable si algún módulo crítico cae por debajo de su umbral de cobertura (70 %) o si el umbral global retrocede respecto a la línea base.

---

## 5. Características que no se probarán

> **Precisión obligatoria de este plan:** la lectura por cámara de SCRUM-18 **no se prueba unitariamente**. Lo que sí se prueba es la capa de resolución código → producto → carrito, alimentada con un **decodificador simulado** (un string de código de barras entregado directamente a la función de resolución, o emitido como evento `detected` sobre un `BarcodeScanner` con stub).

Quedan fuera de esta entrega, con su justificación:

| No se probará | Razón |
|---|---|
| Decodificación óptica real (`@zxing/browser`, `@zxing/library`) dentro de `BarcodeScanner.vue` | Requiere `getUserMedia` y una cámara real; no es reproducible en Vitest (Node / happy-dom). Es una librería de terceros ya probada upstream — el riesgo propio de Kontrol está en qué se hace *después* de decodificar, que sí se prueba. |
| Acceso a `navigator.mediaDevices.getUserMedia` y manejo de contexto seguro (HTTPS/localhost) | Depende del navegador y de la red (LAN por HTTP vs. HTTPS/túnel); es una restricción de despliegue, no de lógica de negocio. Se valida manualmente antes de la demo del 17/08, según lo señalado en SCRUM-18. |
| Generación e impresión física de etiquetas Code128/EAN-13 | Verificación visual/manual — no hay aserción automatizable sobre una impresión física. |
| Pruebas de carga y rendimiento | Excluidas explícitamente de esta entrega por instrucción de la rúbrica del sexto sprint. |
| Pruebas de seguridad | Excluidas explícitamente de esta entrega por instrucción de la rúbrica del sexto sprint. |
| Apertura real del CSV en Excel / Google Sheets | Se prueba el *formato* (BOM, CRLF, escape, neutralización de fórmulas) que garantiza la apertura correcta, no la apertura en sí — cubierto por criterio de aceptación de SCRUM-20 como verificación manual puntual. |
| Integración contra PostgreSQL/MongoDB reales | Los tests de backend mockean `pool.query` (`vi.mock('../src/db/pool.js', ...)`, ver `backend/tests/helpers/authTestApp.js`); no hay pruebas de integración de base de datos en este plan. |
| Compatibilidad cross-browser de la cámara (Safari iOS, permisos denegados en distintos navegadores) | Fuera de alcance unitario; exploratorio/manual si se requiere antes de producción. |

---

## 6. Enfoque y estrategia

- **Framework único:** Vitest para frontend y backend, decisión ya tomada y justificada en `docs/tarea3-pruebas-automatizadas/02-seleccion.md` durante el Sprint 5 (ESM nativo, misma config que Vite, API compatible con Jest).
- **Extracción a funciones puras antes de probar.** Se sigue el precedente de `frontend/src/utils/sales.js`: la lógica de cálculo del POS se extrajo de la vista a un módulo sin dependencias de Vue para poder probarla aislada (`frontend/tests/sales.test.js`, 11 casos). La capa de resolución de código de barras (`handleScan` y funciones asociadas) vive hoy **acoplada** a `InventoryPage.vue`. Antes de escribir los casos 1-6 de SCRUM-22, se extrae a un módulo testeable (p. ej. `frontend/src/utils/posScan.js`) con una función del tipo `resolveScan(code, { products, cart })`; si la extracción no se completa a tiempo, la alternativa aceptada es montar `InventoryPage.vue` con `@vue/test-utils`, sustituir `BarcodeScanner` por un stub y emitir `detected` con el código simulado.
- **Decodificador simulado, nunca la cámara real.** Ningún test unitario importa `@zxing/browser` ni toca `getUserMedia`. El punto de entrada de los casos 1-6 es siempre un string de código de barras ya "decodificado".
- **Backend con dependencias mockeadas.** `pool.query` se mockea con `vi.mock`, usando los helpers ya existentes en `backend/tests/helpers/authTestApp.js` (`buildTestApp`, `signToken`, `companyMembership`, `dbRows`) para levantar la app de Express sin servidor real ni base de datos real.
- **Un caso, una aserción de negocio.** Cada entrada de la matriz de trazabilidad (§16) corresponde a un `it(...)` (o un grupo pequeño) verificable de forma independiente, sin orden de ejecución implícito entre casos.
- **Cobertura como gate, no como métrica decorativa.** La política de trinquete de SCRUM-23 (umbral por módulo crítico al 70 %, umbral global fijado en la línea base, +5 puntos por sprint) se mantiene y se extiende a los archivos nuevos de este sprint (`csvExport.js`, `pdfDocument.js`, `reportExport.js`, y el módulo de resolución de escaneo si se extrae).
- **Sin pirámide E2E en este plan.** El plan cubre pruebas unitarias y de componente; no incluye Cypress/Playwright ni ningún flujo end-to-end contra un entorno desplegado.

---

## 7. Criterios de aprobación y falla

**Un caso individual se considera aprobado cuando:**
- Corre en verde con `npm run test -w backend` o `npm run test -w frontend` (según corresponda), sin red, sin cámara, sin reloj real no controlado (fechas fijas vía `new Date(2026, ...)`, como ya hacen `reportExport.test.js` y `reportExports.test.js`).
- La aserción verifica el comportamiento de negocio descrito en §4, no un detalle de implementación incidental.

**Una suite se considera aprobada cuando:**
- Cero pruebas fallidas.
- La cobertura reportada no cae por debajo de los umbrales declarados en `backend/vitest.config.js` / `frontend/vitest.config.js` (global y por módulo crítico).

**Falla / bloqueo de merge:**
- Cualquier test en rojo bloquea el PR — `ci.yml` corre en cada pull request hacia `main` o `develop` y sale con código distinto de cero.
- Una caída de cobertura por debajo del umbral trinquete bloquea el merge aunque todos los tests pasen (Vitest sale con código 1 ante un umbral incumplido).
- Criterio de aceptación específico de SCRUM-22: **los 10 casos deben estar en verde en CI, cada uno referenciado a su fila en la matriz de trazabilidad de este plan** (§16) — un caso sin fila en la matriz, o una fila sin test que la respalde, se considera incumplimiento del criterio de aceptación.

---

## 8. Criterios de suspensión y reanudación

**Suspensión:**
- Si SCRUM-18 o SCRUM-20 no están mergeados a `main`/`develop`, SCRUM-22 no puede iniciar — ambos la bloquean explícitamente en Jira. No se ejecutan los casos 1-6 sin el módulo de código de barras integrado, ni los casos 7-10 sin el módulo de exportación integrado.
- Si el pipeline de CI está roto en `main` por una causa ajena a estas pruebas (p. ej. una dependencia rota, un umbral de cobertura mal configurado), se suspende la ejecución de nuevos casos hasta restaurar un baseline verde — ejecutar contra una base ya roja no aporta señal.
- Si se detecta que un caso requiere acceso real a cámara o red para pasar, se suspende ese caso específico y se revisa el diseño del test contra §5 antes de continuar.

**Reanudación:**
- Se reanuda cuando el bloqueo se resuelve (feature mergeada, CI restaurado a verde), retomando desde el último caso no ejecutado sin repetir los que ya quedaron en verde.
- Reanudar un caso suspendido exige documentar en la matriz (§16) el motivo de la suspensión y la fecha de reanudación.

---

## 9. Entregables de prueba

- Este documento (`docs/plan-maestro-pruebas.md`), versionado en el repositorio y exportado a PDF como entregable independiente en Canvas.
- Archivos de test automatizados referenciados en la matriz de trazabilidad (§16), en `frontend/tests/*.test.js` y `backend/tests/*.test.js`.
- Reportes de cobertura generados por CI: artefactos `coverage-backend` y `coverage-frontend` de `.github/workflows/ci.yml` (30 días de retención).
- La matriz de trazabilidad misma (§16), como anexo de este plan.
- El historial de pull requests que actualizan este plan junto con los tests que documenta (medida de mejora de Sprint 5).

---

## 10. Tareas

| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| 1 | Redactar y mergear este plan maestro | — | Este documento |
| 2 | Confirmar disponibilidad de SCRUM-18 y SCRUM-20 en `main`/`develop` | Tarea 1 | Rama base lista para SCRUM-22 |
| 3 | Extraer la resolución de escaneo a módulo puro testeable (o definir el stub de `BarcodeScanner`) | Tarea 2 | `frontend/src/utils/posScan.js` (o equivalente) |
| 4 | Escribir casos 1-6 (código de barras) con decodificador simulado | Tarea 3 | Test file nuevo, p. ej. `frontend/tests/posScan.test.js` |
| 5 | Verificar casos 7-10 (exportación) — ya cubiertos, validar contra este plan | Tarea 2 | `frontend/tests/reportExport.test.js`, `backend/tests/reportExports.test.js` |
| 6 | Actualizar umbrales de cobertura por módulo nuevo en `vitest.config.js` | Tareas 4-5 | Config actualizada |
| 7 | Ejecutar suite completa local (`npm run test:coverage -w backend`, `-w frontend`) | Tareas 4-6 | Reporte local en verde |
| 8 | Abrir PR con tests + actualización de la matriz de este plan | Tarea 7 | PR revisado y mergeado |
| 9 | Confirmar CI en verde sobre `main`/`develop` | Tarea 8 | Badge de build y artefactos de cobertura |
| 10 | Exportar este plan a PDF para el entregable de Canvas | Tarea 1 (no bloquea el resto) | PDF independiente del informe |

---

## 11. Necesidades del entorno

| Necesidad | Detalle |
|---|---|
| Runtime | Node.js 20–22 (`.nvmrc` = 22), `npm` workspaces |
| Framework de pruebas | Vitest 4 + `@vitest/coverage-v8` (provider `v8`) |
| Entorno frontend | `happy-dom`, `@vue/test-utils`, `@pinia/testing` |
| Entorno backend | `supertest` sobre una app de Express construida en memoria (`backend/tests/helpers/authTestApp.js`), sin servidor real |
| Base de datos | **No requerida.** `pool.query` se mockea (`vi.mock('../src/db/pool.js', ...)`); no hay Postgres/Mongo real en este plan |
| Cámara / hardware | **No requerida.** El decodificador se simula; no se necesita `getUserMedia` ni contexto HTTPS |
| CI | GitHub Actions, `ubuntu-latest`, workflow `.github/workflows/ci.yml`, disparado en pull requests hacia `main` y `develop` |
| Comandos | `npm run test -w backend`, `npm run test -w frontend`, `npm run test:coverage -w backend`, `npm run test:coverage -w frontend` |

---

## 12. Responsabilidades

| Rol | Persona | Responsabilidad |
|---|---|---|
| Autor del plan maestro | Jonathan Tubac (24484) | Redactar, versionar y mantener actualizado este documento (SCRUM-21) |
| Implementación de pruebas | Ivana Figueroa (24785) | Escribir y automatizar los 10 casos de SCRUM-22 siguiendo este plan |
| Desarrollo de la funcionalidad bajo prueba (código de barras) | Juan Montenegro (24750) | SCRUM-18 — módulo de código de barras del POS |
| Desarrollo de la funcionalidad bajo prueba (exportación) | Juan Montenegro (24750) | SCRUM-20 — exportación de reportes a PDF/CSV |
| Gate de cobertura en CI | Pablo Vásquez (24757) | SCRUM-23 — umbral de cobertura y badge de build |
| Revisión de pull request | Al menos un integrante distinto del autor | Aprobar el PR que agrega/actualiza tests y la matriz de trazabilidad, según `CONTRIBUTING.md` |

---

## 13. Calendario

| Fecha | Hito |
|---|---|
| 11/08/2026 | Entrega de este plan maestro (SCRUM-21 / HU-34) — seis días antes que SCRUM-22, para que la trazabilidad exista antes de los tests |
| 12/08/2026 | Umbral de cobertura y badge de CI en producción (SCRUM-23) |
| 13/08/2026 | Módulo de código de barras finalizado (SCRUM-18) |
| 14/08/2026 | Exportación de reportes finalizada (SCRUM-20) |
| 17/08/2026 | Pruebas unitarias de código de barras y exportación en CI, en verde (SCRUM-22) |

---

## 14. Riesgos y contingencias

| # | Riesgo | Probabilidad / impacto | Contingencia |
|---|---|---|---|
| 1 | La lógica de resolución de escaneo permanece acoplada a `InventoryPage.vue` y no se extrae a tiempo | Media / alto — bloquea los casos 1-6 | Aceptar el plan B descrito en §6: montar el componente con `@vue/test-utils` y stubear `BarcodeScanner`, en vez de exigir la extracción como prerrequisito duro |
| 2 | **Discrepancia de estado resuelta (histórico):** en la versión 1.0 de este plan (11/08/2026), SCRUM-22 figuraba "Finalizado" en Jira sin que el repositorio tuviera test para los casos 1-6 (código de barras). Con la versión 1.1 los 10 casos quedan marcados "Cubierto" en la matriz (§16.1) | Baja / bajo — riesgo cerrado, se deja como registro de auditoría | Pendiente: enlazar en la matriz el commit o PR exacto que agrega `frontend/tests/posScan.test.js` y `backend/tests/productController.test.js`, para que la trazabilidad del §16.1 sea verificable en el historial de git y no solo declarativa |
| 3 | El umbral de cobertura por módulo crítico usa globs (`picomatch`) que pasan "en vacío" si ningún archivo coincide | Baja / alto — un umbral que deja de proteger sin avisar | Revisar `vitest.config.js` en cada PR que toque un módulo crítico o agregue uno nuevo (código de barras, exportación) |
| 4 | `getUserMedia` bloqueado en `http://` sobre IP de LAN condiciona la demo de SCRUM-18 | Media / medio — no es un defecto de las pruebas, pero puede confundirse con uno | Documentado explícitamente en §5 como fuera de alcance unitario; resolver a nivel de despliegue (HTTPS/túnel), no de tests |
| 5 | Actualización de `@zxing/browser`/`@zxing/library` cambia la forma del evento emitido | Baja / medio | El contrato de prueba fija el evento `detected` como string plano desacoplado de la librería (§6); un cambio de la librería no debería romper los tests si el componente sigue emitiendo texto plano |
| 6 | Cobertura del frontend con denominador pequeño (pocas sentencias totales medidas) hace que un solo archivo sin cubrir mueva mucho el porcentaje global | Media / medio, ya documentado en `frontend/vitest.config.js` | Cualquier PR que toque un archivo ya cubierto revisa si necesita subir cobertura en el mismo PR, no en uno posterior |

---

## 15. Aprobaciones

| Rol | Nombre | Firma / fecha |
|---|---|---|
| Autor del plan | Jonathan Tubac (24484) | |
| Encargada de pruebas (SCRUM-22) | Ivana Figueroa (24785) | |
| Responsable de CI/cobertura (SCRUM-23) | Pablo Vásquez (24757) | |
| Revisor de pull request | | |

---

## 16. Anexo — Matriz de trazabilidad

Convención de estado: **Cubierto** (test existe y pasa) · **Pendiente** (caso definido, test por escribir) · **Bloqueado** (no puede iniciarse, ver §8).

### 16.1 Casos nuevos del Sprint 6 (SCRUM-22)

| Caso | Historia/Ticket | Descripción | Elemento bajo prueba | Test automatizado | Estado |
|---|---|---|---|---|---|
| 1 | SCRUM-22 / SCRUM-18 | Código válido resuelve al producto correcto | `InventoryPage.vue` → `handleScan` | `frontend/tests/posScan.test.js` | Cubierto |
| 2 | SCRUM-22 / SCRUM-18 | Producto resuelto se agrega al carrito con su precio vigente | `InventoryPage.vue` → `handleScan` + `addToCart` | `frontend/tests/posScan.test.js` | Cubierto |
| 3 | SCRUM-22 / SCRUM-18 | Escaneo repetido del mismo código incrementa cantidad, no duplica línea | `InventoryPage.vue` → `handleScan` + `getCartItem`/`incrementCart` | `frontend/tests/posScan.test.js` | Cubierto |
| 4 | SCRUM-22 / SCRUM-18 | Código inexistente devuelve error controlado | `InventoryPage.vue` → `handleScan` (rama `!match`) | `frontend/tests/posScan.test.js` | Cubierto |
| 5 | SCRUM-22 / SCRUM-18 | Código duplicado en la misma empresa se rechaza al guardar el producto | `backend/src/controllers/productController.js` → `createProduct`/`updateProduct` (`err.code === '23505'`) | `backend/tests/productController.test.js` | Cubierto |
| 6 | SCRUM-22 / SCRUM-18 | Producto sin stock no se agrega y muestra advertencia | `InventoryPage.vue` → `handleScan` + `canSellProduct` | `frontend/tests/posScan.test.js` | Cubierto |
| 7 | SCRUM-22 / SCRUM-20 | El CSV generado contiene el mismo número de filas que el reporte en pantalla | `frontend/src/utils/csvExport.js`, `reportExport.js` | `frontend/tests/reportExport.test.js` → `reportExport — dataset y artefactos` | Cubierto |
| 8 | SCRUM-22 / SCRUM-20 | El CSV escapa correctamente comas y comillas dentro de los valores | `frontend/src/utils/csvExport.js` (`escapeCsvValue`, `toCsv`) | `frontend/tests/reportExport.test.js` → `csvExport — compatibilidad con Excel y Google Sheets` | Cubierto |
| 9 | SCRUM-22 / SCRUM-20 | El PDF se genera con contenido no vacío y el encabezado esperado | `frontend/src/utils/pdf/pdfDocument.js`, `reportExport.js` (`renderExport`) | `frontend/tests/reportExport.test.js` → `pdfDocument — codificación y métricas`, `reportExport — dataset y artefactos` | Cubierto |
| 10 | SCRUM-22 / SCRUM-20 | La exportación respeta los filtros activos del reporte | `frontend/src/utils/reportExport.js` (`buildReportsDataset` recibe los proyectos ya filtrados) + registro backend | `frontend/tests/reportExport.test.js` → `reportExport — dataset y artefactos`; `backend/tests/reportExports.test.js` → `POST /api/reports/exports` | Cubierto |

### 16.2 Suites de regresión ya existentes (Sprint 5)

Suites escritas en el Sprint 5 (Tarea 3 — `docs/tarea3-pruebas-automatizadas/`) que este plan mantiene como regresión obligatoria: cualquier cambio de Sprint 6 que las rompa bloquea el merge igual que un caso nuevo.

| Suite | Módulo cubierto | Archivo |
|---|---|---|
| R1 | Validación de JWT (token válido/ausente/expirado) | `backend/tests/requireAuth.test.js` |
| R2 | Autorización por rol (permitido/denegado) | `backend/tests/requireRole.test.js` |
| R3 | Validación de body con Zod | `backend/tests/validate.test.js` |
| R4 | Funciones puras de chat | `backend/tests/chat.test.js` |
| R5 | Autorización a nivel de controlador (HU-31) | `backend/tests/authz.controller.test.js` |
| R6 | Cálculo de presupuesto (gasto acumulado vs. presupuesto, alerta de sobregiro) | `backend/tests/budgetCalculations.test.js` |
| R7 | Cálculo del POS: subtotal, descuento, IVA (11 casos) | `frontend/tests/sales.test.js` |
| R8 | Store de autenticación (Pinia) | `frontend/tests/authStore.test.js` |
| R9 | Componente `Button` — render de props y emisión de eventos | `frontend/tests/Button.test.js` |
| R10 | Lógica pura de invitaciones | `frontend/tests/invitation.test.js` |

### 16.3 Suites nuevas de Sprint 6 ya mergeadas (fuera del alcance directo de SCRUM-22, en regresión)

| Suite | Módulo cubierto | Archivo |
|---|---|---|
| S1 | Controlador de reportes (SCRUM-23) | `backend/tests/reports.controller.test.js` |
| S2 | Ciclo de vida de publicaciones de marketing (HU-28) | `backend/tests/marketingPublicationLifecycle.test.js` |
| S3 | Administración interna de publicaciones (HU-28) | `backend/tests/marketingPublications.test.js` |
| S4 | Navbar, modal base, formularios de marketing | `frontend/tests/AppNavbar.test.js`, `frontend/tests/BaseModal.test.js`, `frontend/tests/marketingPublicationsView.test.js`, `frontend/tests/publicationStatus.test.js` |
| S5 | Utilidades de descarga de archivos | `frontend/tests/download.test.js` |
