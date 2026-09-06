# Plan Maestro de Pruebas — Kontrol

## 1. Identificador del plan

| Campo | Valor |
|---|---|
| Identificador | `KTL-PMP-S6-v1.2` |
| Proyecto | Kontrol — plataforma de gestión de proyectos, equipos, inventario y marketing |
| Historia de usuario | HU-34 y HU-38 |
| Ticket de este entregable | [SCRUM-21 — Elaboración del plan maestro de pruebas versionado en el repositorio](https://kontroldevelopment.atlassian.net/browse/SCRUM-21) |
| Tickets relacionados | SCRUM-18 — código de barras · SCRUM-20 — exportación de reportes · SCRUM-22 — pruebas unitarias de ambos · SCRUM-23 — umbral de cobertura en CI · SCRUM-9 — autorización multi-rol y multi-empresa, ver §9.3 · SCRUM-28 — carga y estrés, bloqueada por esta actualización |
| Responsable de elaboración | Jonathan Tubac, carné 24484 |
| Story points / horas estimadas | 5 SP / 8 h en la versión original, SCRUM-21 |
| Fecha probable de terminación | 11/08/2026 en la versión original, SCRUM-21 |
| Repositorio y ruta | `github.com/PabloVS044/Kontrol` → `docs/plan-maestro-pruebas.md` |
| Sprint | Sprint 6 para las versiones 1.0 y 1.1 · Sprint 7 para la versión 1.2 |

### Actualización de esta versión: HU-38, Sprint 7

| Campo | Valor |
|---|---|
| Historia de usuario | HU-38 |
| Responsable | Jonathan Tubac, carné 24484 |
| Story points / horas estimadas | 3 SP / 5 h |
| Fecha probable de terminación | 04/09/2026 |
| Motivo | Completar este plan, elaborado en SCRUM-21, con las secciones que la guía del sexto sprint permitía omitir y que la del séptimo ya exige: pruebas de carga en §7, de estrés en §8 y de seguridad en §9 |
| Precedencia obligatoria | Vence dos días antes que SCRUM-28, el 04/09/2026 frente al 06/09/2026, porque los escenarios y umbrales de §7-§8 deben quedar definidos antes de escribirse los scripts de k6. Es la misma medida de trazabilidad plan-antes-que-prueba acordada en la retrospectiva del Sprint 5 que motivó versionar este documento antes de SCRUM-22 |
| Bloquea | SCRUM-28, la implementación de los scripts de k6 de carga y estrés |
| Alcance de las pruebas de seguridad | Se acota a revisión de dependencias con `npm audit`, verificación de cabeceras de seguridad HTTP y trazabilidad hacia los nueve casos de autorización multi-rol y multi-empresa ya implementados en SCRUM-9. No incluye pruebas de penetración; ver §9 y §5 |
| Criterio de aceptación | Plan maestro actualizado en el repositorio por pull request, con la matriz de trazabilidad de §19 extendida a los nuevos escenarios, y exportado a PDF para el informe |

### Control de cambios

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| 1.0 | 11/08/2026 | Jonathan Tubac | Versión inicial: define alcance, casos y matriz de trazabilidad para SCRUM-22, antes de escribir los tests. |
| 1.1 | 21/08/2026 | Jonathan Tubac | SCRUM-22 finalizado: los 10 casos de la matriz, hoy §19.1, pasan de "Pendiente" a "Cubierto". Queda pendiente enlazar el commit o PR exacto de los casos 1-6, ver riesgo 2 en §17. |
| 1.2 | 04/09/2026 | Jonathan Tubac | HU-38: se agregan las secciones de pruebas de carga, estrés y seguridad, exigidas desde el séptimo sprint. Se actualiza el alcance en §2, §4 y §5 — ya no excluye carga ni seguridad, sí pruebas de penetración — y se extiende la matriz de trazabilidad en §19.4 y §19.5. Se renumeran las secciones 7 a 16 como 10 a 19 para insertar las tres nuevas. Precede a SCRUM-28. |

> Este documento se actualiza por pull request. Cada cambio a la matriz de trazabilidad de §19 debe venir acompañado del commit que agrega o modifica el test correspondiente, de modo que la relación **plan → caso de prueba → test automatizado** quede explícita en el historial de git.

---

## 2. Introducción y alcance

Kontrol es un monorepo con Vue 3 y Vite en el frontend, Node.js y Express en el backend, y PostgreSQL y MongoDB como bases de datos. Cubre gestión de proyectos, inventario y punto de venta, presupuesto, reportes y marketing. El Sprint 6 introduce dos incrementos funcionales nuevos:

1. **SCRUM-18 — Módulo de código de barras para el punto de venta.** Registro y lectura de códigos de barras para agilizar el cobro: campo `codigo_barras` en `PRODUCTO`, generación/impresión de etiquetas, lectura por cámara vía `@zxing/browser`, resolución código → producto → carrito, y entrada manual como alternativa obligatoria.
2. **SCRUM-20 — Exportación de reportes a PDF y CSV.** Descarga de los reportes ya filtrados en pantalla, en dos formatos, con registro de la generación en la entidad `REPORTE`.

Ambos quedan bloqueando a **SCRUM-22**, que automatiza 10 casos de prueba, 6 de código de barras y 4 de exportación, siguiendo los casos que este plan define. Este plan es, a su vez, la medida de mejora comprometida en la retrospectiva del Sprint 5: versionar el plan maestro en el repositorio **antes** de escribir los tests, para que la trazabilidad sea auditable en el historial de git y no solo en Jira.

**Extensión de la versión 1.2, HU-38, Sprint 7.** La guía del sexto sprint permitía omitir las pruebas de carga, de estrés y de seguridad; la del séptimo ya las exige. HU-38 completa este plan con esas tres secciones, manteniendo la misma disciplina de definir el plan antes que la prueba: los escenarios, los perfiles de usuarios concurrentes y los umbrales quedan definidos aquí antes de que SCRUM-28 escriba los scripts de k6 que los implementan. Por eso vence dos días antes que esa tarea.

**Alcance de este plan:** pruebas unitarias y de componente sobre la lógica de negocio de ambas funcionalidades nuevas del Sprint 6, más la regresión de las suites ya existentes desde el Sprint 5, ejecutadas con Vitest y aplicadas como control de cobertura en el pipeline de integración continua. Ese control usa una política de trinquete definida en SCRUM-23 y documentada en el `README.md` del repositorio. Desde la versión 1.2, el alcance se extiende a pruebas de carga y de estrés sobre los endpoints críticos del backend, y a pruebas de seguridad acotadas a revisión de dependencias, cabeceras HTTP y trazabilidad de autorización.

**Fuera de alcance de este plan:** las pruebas end-to-end y las de integración contra bases de datos reales — ver §5. Dentro de las pruebas de seguridad, las pruebas de penetración quedan explícitamente fuera de alcance: dado el tiempo del sprint, HU-38 acota la sección de seguridad a los tres puntos declarados en §9.

---

## 3. Elementos de prueba

| Elemento | Ruta | Bajo prueba en |
|---|---|---|
| Resolución de escaneo: de código a producto a carrito | `frontend/src/views/InventoryPage.vue` — `handleScan`, `addToCart`, `getCartItem`, `canSellProduct`, `incrementCart` | SCRUM-22, casos 1-4 y 6 |
| Componente lector de cámara | `frontend/src/components/inventory/BarcodeScanner.vue` | Excluido de prueba unitaria, ver §5 |
| Unicidad de código de barras al persistir | `backend/src/controllers/productController.js`, funciones `createProduct` y `updateProduct`, más la restricción única en `backend/src/db/bootstrap.js` | SCRUM-22, caso 5 |
| Cálculo de venta del punto de venta: subtotal, descuento e IVA | `frontend/src/utils/sales.js` | Regresión Sprint 5 — `frontend/tests/sales.test.js` |
| Generación de CSV | `frontend/src/utils/csvExport.js` | SCRUM-22, casos 7-8 |
| Generación de PDF | `frontend/src/utils/pdf/pdfDocument.js` | SCRUM-22, caso 9 |
| Ensamblado del dataset de exportación con los filtros activos | `frontend/src/utils/reportExport.js` | SCRUM-22, caso 10 |
| Registro de exportación en `REPORTE` | `backend/src/controllers/reportsController.js`, `backend/src/routes/reportsRoutes.js`, `backend/src/schemas/reportsSchemas.js` | Regresión Sprint 6 — `backend/tests/reportExports.test.js`, `backend/tests/reports.controller.test.js` |
| Middleware de autenticación y autorización | `backend/src/middleware/requireAuth.js`, `requireRole.js` | Regresión Sprint 5 |
| Cálculo de presupuesto | `backend/src/utils/budgetCalculations.js` | Regresión Sprint 5 |
| Gate de cobertura en CI | `backend/vitest.config.js`, `frontend/vitest.config.js`, `.github/workflows/ci.yml` | SCRUM-23, criterio de aprobación en §10 |
| Endpoints críticos bajo carga y estrés | `POST /api/auth/login`, `GET /api/projects`, `GET /api/projects/:id/metrics`, `POST /api/projects/:id/progress`, `GET /api/reports`, `POST /api/reports/exports`, y los endpoints de inventario y punto de venta en `backend/src/routes/productRoutes.js` | §7, §8 |
| Dependencias de terceros en backend y frontend | `backend/package.json`, `frontend/package.json`, revisadas con `npm audit` | §9.1 |
| Cabeceras de seguridad en las respuestas HTTP | Stack de middleware del backend en `backend/src/index.js`, hoy solo `cors` y `express.json` | §9.2 |
| Autorización multi-rol y multi-empresa de SCRUM-9 | `backend/src/middleware/requireAuth.js`, `requireRole.js`, `requireCompanyRole.js`, verificados en `backend/tests/authz.controller.test.js` con 9 casos | §9.3, es la misma suite de regresión R5 en §19.2 |

---

## 4. Características a probar

- Un código de barras válido resuelve al producto correcto dentro del proyecto activo.
- El producto resuelto se agrega al carrito de venta con su precio vigente.
- Escanear el mismo código dos veces incrementa la cantidad de la línea existente y no crea una línea duplicada.
- Un código que no coincide con ningún producto del proyecto devuelve un error controlado, sin romper el estado del carrito.
- Un producto sin stock disponible no se agrega y muestra una advertencia, sin lanzar una excepción no controlada.
- Un código de barras duplicado dentro de la misma empresa o proyecto se rechaza al guardar o actualizar el producto.
- El CSV exportado contiene el mismo número de filas que el reporte visible en pantalla, con el filtro activo aplicado.
- El CSV escapa correctamente comas, comillas y saltos de línea dentro de los valores, para abrirse bien en Excel y Google Sheets.
- El PDF exportado se genera con contenido, con el encabezado esperado y con una estructura de objetos válida.
- La exportación en PDF y en CSV respeta los filtros activos de la vista de reportes en el momento de generarse.
- Regresión: los módulos críticos ya cubiertos en Sprint 5, punto de venta, autenticación y presupuesto, no retroceden por cambios de este sprint.
- El pipeline de integración continua falla de forma demostrable si algún módulo crítico cae por debajo de su umbral de cobertura o si el umbral global retrocede respecto a la línea base.
- Bajo una carga sostenida de usuarios concurrentes en los escenarios de §7, los endpoints críticos responden dentro del umbral de latencia definido y con una tasa de error que no supera el máximo aceptado.
- Al incrementar la carga por encima del perfil normal, según la rampa de estrés de §8, el sistema degrada de forma identificable, el punto de degradación queda definido y documentado, y el sistema no queda en un estado inconsistente ni pierde datos.
- Las dependencias de backend y frontend no tienen vulnerabilidades críticas sin remediar, según §9.1.
- Las respuestas del backend incluyen las cabeceras de seguridad HTTP esperadas, según §9.2.
- Los nueve casos de autorización multi-rol y multi-empresa de SCRUM-9 permanecen en verde y quedan referenciados explícitamente en el capítulo de seguridad de este plan.

---

## 5. Características que no se probarán

> **Precisión obligatoria de este plan:** la lectura por cámara de SCRUM-18 no se prueba unitariamente. Lo que sí se prueba es la capa de resolución que va de código a producto a carrito, alimentada con un decodificador simulado: un texto de código de barras entregado directamente a la función de resolución, o emitido como evento `detected` sobre un `BarcodeScanner` sustituido por un doble de prueba.

Quedan fuera de esta entrega, con su justificación:

| No se probará | Razón |
|---|---|
| Decodificación óptica real dentro de `BarcodeScanner.vue`, con las librerías `@zxing/browser` y `@zxing/library` | Requiere acceso a cámara real y no es reproducible en el entorno de pruebas de Vitest. Son librerías de terceros ya probadas por sus autores; el riesgo propio de Kontrol está en qué se hace después de decodificar, y eso sí se prueba. |
| Acceso a la cámara del dispositivo y manejo del contexto seguro que exige el navegador | Depende del navegador y de la red, no de la lógica de negocio; es una restricción de despliegue. Se valida manualmente antes de la demo del 17/08, según lo señalado en SCRUM-18. |
| Generación e impresión física de etiquetas de código de barras | Es una verificación visual y manual; no hay forma de automatizar una aserción sobre una impresión física. |
| Pruebas de penetración | Delimitación obligatoria de este plan: dado el tiempo del sprint, la sección de seguridad de §9 se acota a revisión de dependencias, cabeceras HTTP y validación de los controles de autorización ya implementados. No incluye explotación activa, fuzzing, escaneo de vulnerabilidades de infraestructura ni ingeniería social. |
| Pruebas de carga o estrés contra el ambiente de producción | Se ejecutan contra el ambiente de pruebas descrito en `docs/test-environment.md`, nunca contra producción. Ver §7 y el riesgo 7 de §17. |
| Apertura real del CSV en Excel o Google Sheets | Se prueba el formato del archivo, que es lo que garantiza la apertura correcta, y no la apertura en sí misma. Queda cubierto por el criterio de aceptación de SCRUM-20 como una verificación manual puntual. |
| Integración contra PostgreSQL o MongoDB reales | Los tests de backend simulan el acceso a la base de datos con los helpers de `backend/tests/helpers/authTestApp.js`; este plan no incluye pruebas de integración de base de datos. |
| Compatibilidad de la cámara entre distintos navegadores | Fuera de alcance unitario; se explora de forma manual si se requiere antes de producción. |

---

## 6. Enfoque y estrategia

- **Framework único.** Vitest para frontend y backend, decisión ya tomada y justificada en `docs/tarea3-pruebas-automatizadas/02-seleccion.md` durante el Sprint 5, por su compatibilidad directa con Vite y con la API de Jest.
- **Extracción a funciones puras antes de probar.** Se sigue el precedente de `frontend/src/utils/sales.js`, donde la lógica de cálculo del punto de venta se extrajo de la vista a un módulo sin dependencias de Vue para poder probarla aislada. La capa de resolución de código de barras, `handleScan` y sus funciones asociadas, vive hoy acoplada a `InventoryPage.vue`. Antes de escribir los casos 1 a 6 de SCRUM-22 se extrae a un módulo testeable; si la extracción no se completa a tiempo, la alternativa aceptada es montar `InventoryPage.vue` con `@vue/test-utils`, sustituir `BarcodeScanner` por un doble de prueba y emitir el evento `detected` con el código simulado.
- **Decodificador simulado, nunca la cámara real.** Ningún test unitario importa la librería de lectura de cámara ni accede a ella. El punto de entrada de los casos 1 a 6 es siempre un texto de código de barras ya decodificado.
- **Backend con dependencias simuladas.** El acceso a la base de datos se simula usando los helpers ya existentes en `backend/tests/helpers/authTestApp.js`, para levantar la app de Express sin servidor real ni base de datos real.
- **Un caso, una aserción de negocio.** Cada entrada de la matriz de trazabilidad en §19 corresponde a una prueba, o a un grupo pequeño de pruebas, verificable de forma independiente y sin orden de ejecución implícito entre casos.
- **Cobertura como control obligatorio, no como métrica decorativa.** La política de trinquete de SCRUM-23 se mantiene y se extiende a los archivos nuevos de este sprint.
- **Sin pirámide de pruebas de extremo a extremo en este plan.** Cubre pruebas unitarias y de componente; no incluye ningún flujo completo contra un entorno desplegado.
- **k6 para carga y estrés, el plan antes que el script.** Los escenarios, perfiles y umbrales de §7 y §8 se definen en este documento antes de que SCRUM-28 escriba los scripts de k6 que los implementan, siguiendo el mismo precedente que motivó este plan.
- **Seguridad con herramientas ya disponibles, sin infraestructura nueva.** La revisión de dependencias no requiere instalación adicional; la verificación de cabeceras se hace con una petición HTTP simple contra el backend. No se incorpora un escáner de vulnerabilidades ni un framework de pruebas de penetración, en línea con el alcance acotado que declara §9.

---

## 7. Pruebas de carga

Esta sección corresponde a HU-38, Sprint 7. Define los escenarios, el perfil de usuarios concurrentes, la duración y los criterios de aceptación que SCRUM-28 debe implementar con la herramienta k6. Ningún script existe todavía al momento de esta versión del plan; este documento es precisamente el insumo que SCRUM-28 necesita para empezar.

**Objetivo:** verificar que los endpoints críticos de Kontrol sostienen el uso concurrente esperado dentro de umbrales de latencia y tasa de error aceptables.

**Entorno de ejecución:** el ambiente de pruebas descrito en `docs/test-environment.md`, con una base de datos separada de producción. Ese ambiente está reservado para las sesiones de UX del protocolo T1-T5 antes del 15/09, así que cualquier corrida de carga debe coordinarse con ese calendario y restaurarse con el comando de reinicio del entorno al terminar, porque la carga generada modifica los datos sembrados descritos en ese documento. Ver el riesgo 7 de §17.

### 7.1 Escenarios

| ID | Escenario | Endpoints | Perfil de usuarios concurrentes | Duración |
|---|---|---|---|---|
| C1 | Inicio de sesión concurrente | `POST /api/auth/login` | Rampa de 0 a 50 usuarios virtuales en 1 minuto, sostenido en 50 | 6 min |
| C2 | Listado de proyectos y métricas, la lectura típica del dashboard | `GET /api/projects`, `GET /api/projects/:id/metrics` | 100 usuarios virtuales sostenidos | 10 min |
| C3 | Registro de avance de proyecto, la escritura típica | `POST /api/projects/:id/progress` | Rampa de 0 a 30 usuarios virtuales en 1 minuto, sostenido en 30 | 6 min |
| C4 | Listado y exportación de reportes | `GET /api/reports`, `POST /api/reports/exports` | 20 usuarios virtuales sostenidos, una exportación cada 10 segundos por usuario | 10 min |
| C5 | Flujo de venta con código de barras, la punta de caja del punto de venta | Búsqueda de producto y movimiento de inventario en `backend/src/routes/productRoutes.js` e `inventoryMovementRoutes.js` | 40 usuarios virtuales sostenidos | 8 min |

**Perfil de usuarios concurrentes:** rampa gradual en cada escenario, nunca un arranque instantáneo que no representa el uso real. Se corre un escenario a la vez, sin superponer C1 a C5 entre sí, para poder atribuir cualquier degradación a un endpoint específico.

**Duración:** entre 6 y 10 minutos por escenario, incluyendo la rampa. La batería completa, C1 a C5, no debe exceder una ventana de mantenimiento coordinada de una hora sobre el ambiente de pruebas.

### 7.2 Criterios de aceptación

| Criterio | Umbral |
|---|---|
| Latencia en el percentil 95, lecturas: C2 y la lectura de C4 | 500 ms o menos |
| Latencia en el percentil 95, escrituras: C3, la exportación de C4, y C5 | 800 ms o menos |
| Latencia en el percentil 95, inicio de sesión: C1 | 300 ms o menos |
| Tasa de error máxima, respuestas de error del servidor o tiempo de espera agotado | Menos del 1 % de las peticiones, en cualquier escenario |
| Falsos negativos de autorización | Ninguna petición autenticada válida recibe un rechazo por causa de la carga |

Un escenario se considera aprobado cuando cumple ambos umbrales, latencia y tasa de error, durante toda su duración sostenida y no solo en el promedio.

---

## 8. Pruebas de estrés

**Objetivo:** encontrar, de forma controlada, el punto en que el sistema deja de cumplir los criterios de aceptación de §7, sin causar un incidente en el ambiente compartido con las sesiones de UX.

### 8.1 Perfil de rampa

Cada escenario de estrés parte del nivel máximo de usuarios virtuales definido en §7.1 para ese mismo escenario y lo incrementa en escalones del 25 % cada 2 minutos, sin techo predefinido salvo el límite de seguridad de §8.2. A diferencia de §7, donde la carga es sostenida y representativa del uso normal, aquí la carga crece hasta encontrar el límite.

### 8.2 Condición de parada

Cualquiera de las siguientes, lo que ocurra primero:

- La tasa de error supera el 5 % de forma sostenida durante al menos 30 segundos.
- La latencia en el percentil 95 supera tres veces el umbral de aceptación de §7.2 para ese endpoint, de forma sostenida durante al menos 30 segundos.
- El contenedor de backend del ambiente de pruebas deja de responder a la verificación de salud.
- Se alcanza un techo de seguridad de 500 usuarios virtuales por escenario, para no arriesgar el ambiente compartido aunque el sistema todavía no haya degradado.

### 8.3 Definición del punto de degradación

Es el escalón de usuarios virtuales inmediatamente anterior al que dispara la condición de parada: el último nivel de concurrencia en el que el sistema seguía cumpliendo los criterios de aceptación de §7.2. Se registra por escenario en la matriz de trazabilidad de §19.4, junto con el script de k6 que lo reproduce.

**Reanudación obligatoria:** reiniciar el ambiente de pruebas antes de cualquier otra prueba de carga, estrés o sesión de UX en el mismo ambiente, porque una rampa de estrés puede dejar datos o conexiones en un estado no representativo.

---

## 9. Pruebas de seguridad

**Alcance de esta entrega:** dado el tiempo del sprint, esta sección se acota a los tres puntos siguientes. No incluye pruebas de penetración, es decir, explotación activa, fuzzing, escaneo de vulnerabilidades de infraestructura o ingeniería social. Ver también §5.

### 9.1 Revisión de dependencias con npm audit

**Procedimiento:** ejecutar `npm audit` en el workspace del backend y en el del frontend, de forma local por ahora, con la propuesta de sumarlo como paso no bloqueante al pipeline de integración continua como tarea de seguimiento en §13.

**Línea base registrada el 04/09/2026, fecha de esta versión del plan:**

| Workspace | Crítica | Alta | Moderada | Baja | Total |
|---|---|---|---|---|---|
| backend | 0 | 6 | 5 | 1 | 12 |
| frontend | 0 | 6 | 3 | 1 | 10 |

**Criterio de aceptación:** cero vulnerabilidades críticas sin remediar. Las vulnerabilidades de severidad alta de esta línea base están concentradas en el paquete `uploadthing` y sus dependencias, presentes en ambos workspaces, y su corrección disponible implica un cambio de versión mayor. Quedan registradas como deuda técnica en el riesgo 9 de §17 y no bloquean esta entrega. Una vulnerabilidad crítica nueva sí bloquea el merge del pull request que la introduce.

### 9.2 Cabeceras de seguridad HTTP

**Cabeceras verificadas** sobre las respuestas del backend: política de seguridad de contenido, prevención de sniffing de tipo MIME, protección contra clickjacking, forzado de conexión segura y control de la cabecera de referencia.

**Estado actual, línea base del 04/09/2026:** el backend hoy solo aplica los middlewares `cors` y `express.json`, y no agrega ninguna de estas cabeceras de seguridad. Este plan registra el hallazgo; la corrección es una tarea de desarrollo fuera del alcance de HU-38, anotada como riesgo abierto en el riesgo 8 de §17.

**Criterio de aceptación:** las cinco cabeceras están presentes en las respuestas de al menos un endpoint autenticado y uno público. Mientras la corrección no se implemente, este caso se documenta en la matriz de §19.5 con estado Pendiente, no Cubierto.

### 9.3 Trazabilidad hacia SCRUM-9: autorización multi-rol y multi-empresa

Los nueve casos de autorización multi-rol y multi-empresa de SCRUM-9 ya están implementados y en verde en `backend/tests/authz.controller.test.js`, la misma suite de regresión R5 de §19.2. Esta sección no agrega casos nuevos: extiende la matriz de trazabilidad de §19.5 para declarar esa cobertura explícitamente como parte del capítulo de seguridad del plan maestro, en vez de dejarla solo como regresión funcional. Los nueve casos son:

1. Una petición sin token se rechaza.
2. Un token inválido se rechaza.
3. Un token expirado se rechaza.
4. Un administrador accede correctamente a un endpoint restringido.
5. Un encargado accede correctamente a un endpoint permitido para su rol.
6. Un colaborador es rechazado en un endpoint de administrador.
7. Un encargado es rechazado en un endpoint solo para administradores.
8. Un usuario de la empresa A que solicita un recurso de la empresa B es rechazado, lo que confirma el aislamiento entre empresas.
9. El mismo usuario pasa de ser rechazado a tener acceso al cambiar de rol de colaborador a administrador, lo que confirma que el permiso efectivo cambia con el rol.

**Criterio de aceptación:** los nueve casos permanecen en verde en la integración continua. Cualquier cambio a los middlewares de autenticación y autorización que los rompa bloquea el merge, igual que un caso nuevo de este plan.

---

## 10. Criterios de aprobación y falla

**Un caso individual se considera aprobado cuando:**
- Corre en verde con la suite de backend o de frontend según corresponda, sin red, sin cámara y sin depender del reloj real: las fechas se fijan en el propio test, como ya hacen `reportExport.test.js` y `reportExports.test.js`.
- La aserción verifica el comportamiento de negocio descrito en §4, no un detalle de implementación incidental.

**Una suite se considera aprobada cuando:**
- Cero pruebas fallidas.
- La cobertura reportada no cae por debajo de los umbrales declarados, ni a nivel global ni por módulo crítico.

**Falla o bloqueo del merge:**
- Cualquier test en rojo bloquea el pull request; el flujo de integración continua corre en cada pull request hacia las ramas principales y termina con error si algo falla.
- Una caída de cobertura por debajo del umbral trinquete bloquea el merge aunque todos los tests pasen.
- Criterio de aceptación específico de SCRUM-22: los 10 casos deben estar en verde en la integración continua, cada uno referenciado a su fila en la matriz de trazabilidad de este plan. Un caso sin fila en la matriz, o una fila sin test que la respalde, se considera incumplimiento del criterio de aceptación.
- Criterio de aceptación específico de esta versión: plan maestro actualizado en el repositorio por pull request, con la matriz de trazabilidad extendida a los escenarios de carga, estrés y seguridad, y exportado a PDF para el informe.
- Un escenario de carga falla si no cumple los umbrales de latencia o de tasa de error de §7.2 durante toda su duración sostenida.
- Una prueba de seguridad falla si aparece una vulnerabilidad crítica sin remediar, o si una cabecera de seguridad exigida está ausente en un endpoint donde antes estaba presente.

---

## 11. Criterios de suspensión y reanudación

**Suspensión:**
- Si SCRUM-18 o SCRUM-20 no están mergeados a las ramas principales, SCRUM-22 no puede iniciar, ya que ambos la bloquean explícitamente en Jira. No se ejecutan los casos 1 a 6 sin el módulo de código de barras integrado, ni los casos 7 a 10 sin el módulo de exportación integrado.
- Si el pipeline de integración continua está roto en la rama principal por una causa ajena a estas pruebas, se suspende la ejecución de nuevos casos hasta restaurar una base verde, porque ejecutar contra una base ya roja no aporta ninguna señal útil.
- Si se detecta que un caso requiere acceso real a cámara o red para pasar, se suspende ese caso específico y se revisa el diseño del test contra §5 antes de continuar.
- Si el ambiente de pruebas tiene una sesión de UX programada del protocolo T1-T5, antes del 15/09, se suspende cualquier corrida de carga o estrés hasta que la sesión termine.
- Si SCRUM-28 todavía no ha implementado los scripts de k6, los escenarios de §7 y §8 quedan en estado Pendiente en la matriz de §19.4. No es un bloqueo de este plan, es el orden de precedencia esperado.

**Reanudación:**
- Se reanuda cuando el bloqueo se resuelve, con la funcionalidad ya mergeada o la integración continua restaurada a verde, retomando desde el último caso no ejecutado sin repetir los que ya quedaron en verde.
- Reanudar un caso suspendido exige documentar en la matriz el motivo de la suspensión y la fecha de reanudación.
- Antes de reanudar cualquier prueba de carga, estrés o sesión de UX en el ambiente compartido, es obligatorio reiniciar el ambiente de pruebas, como se describe en §8.3.

---

## 12. Entregables de prueba

- Este documento, versionado en el repositorio y exportado a PDF como entregable independiente en Canvas.
- Los archivos de test automatizados referenciados en la matriz de trazabilidad de §19.
- Los reportes de cobertura generados por la integración continua, con 30 días de retención.
- La matriz de trazabilidad misma, como anexo de este plan.
- El historial de pull requests que actualizan este plan junto con los tests que documenta, la medida de mejora acordada en el Sprint 5.
- La línea base de la revisión de dependencias y el hallazgo de cabeceras de seguridad, documentados en §9.
- Los scripts de k6 de SCRUM-28 no son un entregable de esta versión: este plan es su insumo, no su implementación.

---

## 13. Tareas

| # | Tarea | Depende de | Entregable |
|---|---|---|---|
| 1 | Redactar y mergear este plan maestro | — | Este documento |
| 2 | Confirmar que SCRUM-18 y SCRUM-20 estén disponibles en las ramas principales | Tarea 1 | Rama base lista para SCRUM-22 |
| 3 | Extraer la resolución de escaneo a un módulo puro y testeable, o definir el doble de prueba de `BarcodeScanner` | Tarea 2 | Módulo nuevo en `frontend/src/utils/` |
| 4 | Escribir los casos 1 a 6 de código de barras con el decodificador simulado | Tarea 3 | Archivo de test nuevo, similar a `frontend/tests/posScan.test.js` |
| 5 | Verificar los casos 7 a 10 de exportación, ya cubiertos, contra este plan | Tarea 2 | `frontend/tests/reportExport.test.js`, `backend/tests/reportExports.test.js` |
| 6 | Actualizar los umbrales de cobertura por módulo nuevo | Tareas 4 y 5 | Configuración actualizada |
| 7 | Ejecutar la suite completa en local, con cobertura | Tareas 4 a 6 | Reporte local en verde |
| 8 | Abrir un pull request con los tests y la actualización de la matriz de este plan | Tarea 7 | Pull request revisado y mergeado |
| 9 | Confirmar que la integración continua quede en verde sobre las ramas principales | Tarea 8 | Insignia de build y artefactos de cobertura |
| 10 | Exportar este plan a PDF para el entregable de Canvas | Tarea 1, no bloquea el resto | PDF independiente del informe |
| 11 | Definir escenarios, perfil de usuarios concurrentes, duración y umbrales de carga y estrés | Tarea 1 | Este documento, §7 y §8 |
| 12 | Ejecutar la revisión de dependencias en ambos workspaces y registrar la línea base | Tarea 1 | Este documento, §9.1 |
| 13 | Verificar las cabeceras de seguridad actuales del backend y registrar el hallazgo | Tarea 1 | Este documento, §9.2 |
| 14 | Extender la matriz de trazabilidad con los escenarios de carga, estrés y seguridad | Tareas 11 a 13 | Matriz extendida en §19.4 y §19.5 |
| 15 | Abrir un pull request con la actualización de esta versión del plan | Tarea 14 | Pull request revisado y mergeado |
| 16 | Exportar esta versión del plan a PDF para el informe | Tarea 15 | PDF actualizado |
| 17 | Escribir los scripts de k6 de carga y estrés siguiendo §7 y §8, tarea de SCRUM-28 | Tarea 15 | Scripts de k6 en el repositorio |

---

## 14. Necesidades del entorno

| Necesidad | Detalle |
|---|---|
| Entorno de ejecución | Node.js, con workspaces de npm |
| Framework de pruebas | Vitest, con su proveedor de cobertura |
| Entorno frontend | Simulación de navegador y utilidades de prueba de componentes Vue |
| Entorno backend | Una app de Express construida en memoria, sin servidor real |
| Base de datos | No se requiere. El acceso a la base de datos se simula; no hay Postgres ni Mongo real en este plan |
| Cámara y hardware | No se requiere. El decodificador se simula; no hace falta acceso a cámara ni a un contexto seguro |
| Integración continua | El flujo configurado del repositorio, que se dispara en cada pull request hacia las ramas principales |
| Comandos | Los scripts de test y de cobertura definidos en cada workspace del repositorio |
| Herramienta de carga y estrés | k6, a instalar como parte de SCRUM-28; este plan no requiere instalarla, solo define los escenarios que sus scripts deben implementar |
| Ambiente para carga y estrés | El ambiente de pruebas descrito en `docs/test-environment.md`, con base de datos separada de producción y un script de reinicio ya disponible |
| Revisión de dependencias | La herramienta de auditoría incluida con npm, sin instalación adicional |

---

## 15. Responsabilidades

| Rol | Persona | Responsabilidad |
|---|---|---|
| Autor del plan maestro | Jonathan Tubac, carné 24484 | Redactar, versionar y mantener actualizado este documento |
| Implementación de pruebas | Ivana Figueroa, carné 24785 | Escribir y automatizar los 10 casos de SCRUM-22 siguiendo este plan |
| Desarrollo de la funcionalidad de código de barras | Juan Montenegro, carné 24750 | SCRUM-18, el módulo de código de barras del punto de venta |
| Desarrollo de la funcionalidad de exportación | Juan Montenegro, carné 24750 | SCRUM-20, la exportación de reportes a PDF y CSV |
| Control de cobertura en la integración continua | Pablo Vásquez, carné 24757 | SCRUM-23, el umbral de cobertura y la insignia de build |
| Revisión de pull request | Al menos un integrante distinto del autor | Aprobar el pull request que agrega o actualiza tests y la matriz de trazabilidad |
| Implementación de pruebas de carga y estrés | Por asignar, en SCRUM-28 | Escribir los scripts de k6 siguiendo los escenarios y umbrales de §7 y §8 |

---

## 16. Calendario

| Fecha | Hito |
|---|---|
| 11/08/2026 | Entrega del plan maestro original, SCRUM-21, seis días antes que SCRUM-22, para que la trazabilidad exista antes de los tests |
| 12/08/2026 | Umbral de cobertura y control de integración continua en producción, SCRUM-23 |
| 13/08/2026 | Módulo de código de barras finalizado, SCRUM-18 |
| 14/08/2026 | Exportación de reportes finalizada, SCRUM-20 |
| 17/08/2026 | Pruebas unitarias de código de barras y exportación en verde, SCRUM-22 |
| 04/09/2026 | Entrega de esta versión del plan, dos días antes que SCRUM-28, para que escenarios y umbrales existan antes de los scripts de k6 |
| 06/09/2026 | Scripts de k6 de carga y estrés implementados, SCRUM-28 |

---

## 17. Riesgos y contingencias

| # | Riesgo | Probabilidad e impacto | Contingencia |
|---|---|---|---|
| 1 | La lógica de resolución de escaneo permanece acoplada a `InventoryPage.vue` y no se extrae a tiempo | Media probabilidad, alto impacto: bloquea los casos 1 a 6 | Aceptar el plan alternativo descrito en §6: montar el componente con las utilidades de prueba de Vue y sustituir `BarcodeScanner` por un doble de prueba, en vez de exigir la extracción como requisito obligatorio |
| 2 | Discrepancia de estado ya resuelta: en la versión 1.0 de este plan, SCRUM-22 figuraba como finalizado en Jira sin que el repositorio tuviera tests para los casos 1 a 6. Con la versión 1.1 los 10 casos quedan marcados como cubiertos en la matriz | Baja probabilidad, bajo impacto: riesgo cerrado, se deja como registro | Queda pendiente enlazar en la matriz el commit o pull request exacto que agrega los tests correspondientes, para que la trazabilidad sea verificable en el historial de git y no solo declarativa |
| 3 | El umbral de cobertura por módulo crítico puede pasar sin avisar si ningún archivo coincide con el patrón configurado | Baja probabilidad, alto impacto: un umbral que deja de proteger sin avisar | Revisar la configuración de cobertura en cada pull request que toque un módulo crítico o agregue uno nuevo |
| 4 | El acceso a cámara queda bloqueado en una conexión sin cifrar sobre una red local, lo que condiciona la demo de SCRUM-18 | Media probabilidad, medio impacto: no es un defecto de las pruebas, pero puede confundirse con uno | Documentado explícitamente en §5 como fuera de alcance unitario; se resuelve a nivel de despliegue, no de tests |
| 5 | Una actualización de la librería de lectura de códigos cambia la forma del evento emitido | Baja probabilidad, medio impacto | El contrato de prueba fija el evento como un texto plano desacoplado de la librería, según §6; un cambio de la librería no debería romper los tests si el componente sigue emitiendo texto plano |
| 6 | La cobertura del frontend tiene un denominador pequeño, así que un solo archivo sin cubrir mueve mucho el porcentaje global | Media probabilidad, medio impacto, ya documentado en la configuración de cobertura del frontend | Cualquier pull request que toque un archivo ya cubierto revisa si necesita subir cobertura en el mismo cambio, no en uno posterior |
| 7 | El ambiente de pruebas está reservado para sesiones de UX del protocolo T1-T5 antes del 15/09 | Media probabilidad, alto impacto: una corrida de carga o estrés puede chocar con una sesión programada o dejar datos en mal estado | Coordinar el horario con el calendario de sesiones de UX y reiniciar el ambiente obligatoriamente después de cada corrida de carga o estrés, antes de la siguiente prueba o sesión |
| 8 | El backend no tiene cabeceras de seguridad HTTP configuradas, hallazgo de la línea base de §9.2 | Alta probabilidad de persistir, medio impacto: el caso correspondiente parte en estado Pendiente, no Cubierto | Registrado como hallazgo de este plan; requiere una tarea de desarrollo fuera del alcance de HU-38, anotada en la matriz de §19.5 |
| 9 | Hay vulnerabilidades de severidad alta en una dependencia de terceros sin corrección menor disponible, según la línea base de §9.1 | Media probabilidad, medio impacto | La corrección disponible implica un cambio de versión mayor de esa dependencia; se registra como deuda técnica y no bloquea esta entrega salvo que aparezca una vulnerabilidad crítica |

---

## 18. Aprobaciones

| Rol | Nombre | Firma / fecha |
|---|---|---|
| Autor del plan | Jonathan Tubac, carné 24484 | |
| Encargada de pruebas, SCRUM-22 | Ivana Figueroa, carné 24785 | |
| Responsable de cobertura en integración continua, SCRUM-23 | Pablo Vásquez, carné 24757 | |
| Revisor de pull request | | |

---

## 19. Anexo — Matriz de trazabilidad

Convención de estado: Cubierto significa que el test existe y pasa; Pendiente, que el caso está definido y el test por escribir; Bloqueado, que no puede iniciarse, ver §11.

### 19.1 Casos nuevos del Sprint 6, SCRUM-22

| Caso | Historia/Ticket | Descripción | Elemento bajo prueba | Test automatizado | Estado |
|---|---|---|---|---|---|
| 1 | SCRUM-22 / SCRUM-18 | Código válido resuelve al producto correcto | `InventoryPage.vue` → `handleScan` | `frontend/tests/posScan.test.js` | Cubierto |
| 2 | SCRUM-22 / SCRUM-18 | Producto resuelto se agrega al carrito con su precio vigente | `InventoryPage.vue` → `handleScan` + `addToCart` | `frontend/tests/posScan.test.js` | Cubierto |
| 3 | SCRUM-22 / SCRUM-18 | Escaneo repetido del mismo código incrementa cantidad, no duplica línea | `InventoryPage.vue` → `handleScan` + `getCartItem`/`incrementCart` | `frontend/tests/posScan.test.js` | Cubierto |
| 4 | SCRUM-22 / SCRUM-18 | Código inexistente devuelve error controlado | `InventoryPage.vue` → `handleScan`, rama sin coincidencia | `frontend/tests/posScan.test.js` | Cubierto |
| 5 | SCRUM-22 / SCRUM-18 | Código duplicado en la misma empresa se rechaza al guardar el producto | `backend/src/controllers/productController.js` → `createProduct` y `updateProduct` | `backend/tests/productController.test.js` | Cubierto |
| 6 | SCRUM-22 / SCRUM-18 | Producto sin stock no se agrega y muestra advertencia | `InventoryPage.vue` → `handleScan` + `canSellProduct` | `frontend/tests/posScan.test.js` | Cubierto |
| 7 | SCRUM-22 / SCRUM-20 | El CSV generado contiene el mismo número de filas que el reporte en pantalla | `frontend/src/utils/csvExport.js`, `reportExport.js` | `frontend/tests/reportExport.test.js` → dataset y artefactos | Cubierto |
| 8 | SCRUM-22 / SCRUM-20 | El CSV escapa correctamente comas y comillas dentro de los valores | `frontend/src/utils/csvExport.js` | `frontend/tests/reportExport.test.js` → compatibilidad con Excel y Google Sheets | Cubierto |
| 9 | SCRUM-22 / SCRUM-20 | El PDF se genera con contenido no vacío y el encabezado esperado | `frontend/src/utils/pdf/pdfDocument.js`, `reportExport.js` | `frontend/tests/reportExport.test.js` → codificación, métricas y dataset | Cubierto |
| 10 | SCRUM-22 / SCRUM-20 | La exportación respeta los filtros activos del reporte | `frontend/src/utils/reportExport.js`, más el registro en el backend | `frontend/tests/reportExport.test.js` y `backend/tests/reportExports.test.js` | Cubierto |

### 19.2 Suites de regresión ya existentes del Sprint 5

Suites escritas en el Sprint 5, Tarea 3, que este plan mantiene como regresión obligatoria: cualquier cambio de Sprint 6 que las rompa bloquea el merge igual que un caso nuevo.

| Suite | Módulo cubierto | Archivo |
|---|---|---|
| R1 | Validación de JWT: token válido, ausente o expirado | `backend/tests/requireAuth.test.js` |
| R2 | Autorización por rol, permitido y denegado | `backend/tests/requireRole.test.js` |
| R3 | Validación de body con Zod | `backend/tests/validate.test.js` |
| R4 | Funciones puras de chat | `backend/tests/chat.test.js` |
| R5 | Autorización a nivel de controlador, HU-31 | `backend/tests/authz.controller.test.js` |
| R6 | Cálculo de presupuesto: gasto acumulado frente a presupuesto, alerta de sobregiro | `backend/tests/budgetCalculations.test.js` |
| R7 | Cálculo del punto de venta: subtotal, descuento e IVA, 11 casos | `frontend/tests/sales.test.js` |
| R8 | Store de autenticación | `frontend/tests/authStore.test.js` |
| R9 | Componente Button, render de props y emisión de eventos | `frontend/tests/Button.test.js` |
| R10 | Lógica pura de invitaciones | `frontend/tests/invitation.test.js` |

### 19.3 Suites nuevas del Sprint 6 ya mergeadas, en regresión

Fuera del alcance directo de SCRUM-22, pero mantenidas como regresión igual que las anteriores.

| Suite | Módulo cubierto | Archivo |
|---|---|---|
| S1 | Controlador de reportes, SCRUM-23 | `backend/tests/reports.controller.test.js` |
| S2 | Ciclo de vida de publicaciones de marketing, HU-28 | `backend/tests/marketingPublicationLifecycle.test.js` |
| S3 | Administración interna de publicaciones, HU-28 | `backend/tests/marketingPublications.test.js` |
| S4 | Navbar, modal base, formularios de marketing | `frontend/tests/AppNavbar.test.js`, `frontend/tests/BaseModal.test.js`, `frontend/tests/marketingPublicationsView.test.js`, `frontend/tests/publicationStatus.test.js` |
| S5 | Utilidades de descarga de archivos | `frontend/tests/download.test.js` |

### 19.4 Escenarios de carga y estrés del Sprint 7, HU-38 y SCRUM-28

Ningún script de k6 existe todavía al momento de esta versión del plan; SCRUM-28 los implementa siguiendo estos escenarios de §7 y §8, por eso todos parten en estado Pendiente.

| Caso | Historia/Ticket | Descripción | Elemento bajo prueba | Test automatizado | Estado |
|---|---|---|---|---|---|
| C1 | HU-38 / SCRUM-28 | Carga: inicio de sesión concurrente dentro del umbral de latencia y error | `POST /api/auth/login` | Script de k6 por escribir | Pendiente |
| C2 | HU-38 / SCRUM-28 | Carga: listado de proyectos y métricas dentro del umbral de latencia y error | `GET /api/projects`, `GET /api/projects/:id/metrics` | Script de k6 por escribir | Pendiente |
| C3 | HU-38 / SCRUM-28 | Carga: registro de avance de proyecto dentro del umbral de latencia y error | `POST /api/projects/:id/progress` | Script de k6 por escribir | Pendiente |
| C4 | HU-38 / SCRUM-28 | Carga: listado y exportación de reportes dentro del umbral de latencia y error | `GET /api/reports`, `POST /api/reports/exports` | Script de k6 por escribir | Pendiente |
| C5 | HU-38 / SCRUM-28 | Carga: flujo de venta con código de barras dentro del umbral de latencia y error | Búsqueda de producto y movimiento de inventario | Script de k6 por escribir | Pendiente |
| E1-E5 | HU-38 / SCRUM-28 | Estrés: punto de degradación de cada escenario C1 a C5, según la rampa de §8.1 y la condición de parada de §8.2 | Mismos endpoints que C1 a C5 | Script de k6 por escribir | Pendiente |

### 19.5 Casos de seguridad del Sprint 7, HU-38

| Caso | Historia/Ticket | Descripción | Elemento bajo prueba | Test automatizado | Estado |
|---|---|---|---|---|---|
| SEC1 | HU-38 | Revisión de dependencias: cero vulnerabilidades críticas sin remediar | `backend/package.json`, `frontend/package.json` | Auditoría de dependencias en ambos workspaces; línea base en §9.1, 12 y 10 hallazgos, ninguno crítico | Cubierto: línea base documentada; la remediación de las altas es deuda técnica, ver riesgo 9 de §17 |
| SEC2 | HU-38 | Cabeceras de seguridad HTTP presentes en las respuestas del backend | `backend/src/index.js`, stack de middleware | Verificación manual de las respuestas del backend; no hay cabeceras de seguridad configuradas, ver §9.2 | Pendiente: hallazgo de cabeceras ausentes, corrección fuera de alcance de HU-38, ver riesgo 8 de §17 |
| SEC3 | HU-38 / SCRUM-9 | Trazabilidad de los nueve casos de autorización multi-rol y multi-empresa | `requireAuth.js`, `requireRole.js`, `requireCompanyRole.js` | `backend/tests/authz.controller.test.js`, la misma suite de regresión R5 de §19.2 | Cubierto |
