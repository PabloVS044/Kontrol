# Evidencia de prueba del sistema — TEST-2

Responde al requisito de la guía: *"Hasta el momento deben existir evidencias de prueba de un 80 % del sistema en desarrollo."* Este documento mide qué porcentaje del sistema tiene evidencia de prueba y reporta la distancia con ese umbral. No busca llegar al 80 %: busca medirlo bien.

El documento se escribe en dos tiempos, y el historial de git lo deja verificable. Las secciones 1 y 2 (criterio y catálogo) se commitean **antes** de medir. Las secciones 3 en adelante se agregan después, sin tocar las dos primeras. Si al medir aparece una funcionalidad que el catálogo olvidó, se agrega al denominador; nunca se quita una.

## 1. Criterio de medición

### 1.1 Qué se cuenta

**La unidad es la funcionalidad**, no la línea de código. El sistema se divide en 19 módulos y cada módulo en las funcionalidades que un usuario o el propio sistema ejecuta (§2): 77 en total. Cada funcionalidad pesa lo mismo.

> **Porcentaje de evidencia = funcionalidades con evidencia ÷ 77 × 100**

Una funcionalidad **tiene evidencia** si existe al menos una prueba, de cualquier tipo, que cumpla las tres condiciones:

1. **Ejercita la funcionalidad directamente.** Llama al controlador, servicio, store o componente que la implementa, o recorre su endpoint o su pantalla, y **verifica su resultado** con una aserción, un umbral o una observación registrada. Una prueba que solo importa un archivo o monta un componente sin verificar la funcionalidad no cuenta.
2. **Se ejecutó y su resultado está registrado.** Corre en CI (`ci.yml`, `integration-regression.yml`), tiene un script reproducible en el repositorio (`npm run …`, `k6/`, `zap/`) o tiene un informe con resultados en `docs/`. Una prueba planificada que no se ejecutó no cuenta.
3. **Está en el código actual.** Se mide sobre `develop` al 24/10/2026 más la suite de TEST-1 (`test/integration-suite-ci`). Una prueba que existió y se borró no cuenta.

Además, cada funcionalidad se clasifica como **automatizada** (la cubre al menos una prueba que corre sin intervención humana: unitaria, integración, regresión o carga en CI) o **solo manual** (su única evidencia es una sesión de usabilidad, una prueba de seguridad con ZAP o una corrida manual de volumen). Se reportan los dos porcentajes; el principal es el total.

### 1.2 Tipos de evidencia

| Código | Tipo | Fuente |
|---|---|---|
| **U** | Unitaria (Vitest) | `backend/tests/*.test.js`, `frontend/tests/*.test.js` |
| **I** | Integración contra PostgreSQL real (TEST-1) | `backend/tests/integration/` |
| **R** | Regresión contra PostgreSQL real | `backend/tests/regression/` |
| **C** | Carga y estrés (k6) | `k6/`, `docs/pruebas-carga-estres.md` |
| **V** | Volumen | `k6/volume-test.js`, `docs/pruebas-volumen.md` |
| **S** | Seguridad (OWASP ZAP y regresión de seguridad) | `zap/`, `docs/pruebas-seguridad-zap.md`, `docs/pruebas-regresion-seguridad-volumen.md` |
| **Us** | Usabilidad con usuarios | `docs/pruebas-usabilidad/` |

### 1.3 Por qué este criterio y no la cobertura de líneas

- **La guía habla de evidencia de prueba del sistema, no de cobertura de código.** La cobertura de líneas solo ve lo que ejecutan las pruebas unitarias de Vitest. Las pruebas de integración, carga, volumen, seguridad y usabilidad son evidencia de prueba legítima y la cobertura de líneas no las cuenta.
- **La cobertura de líneas no dice qué funcionalidades quedan sin probar.** Un 40 % de líneas puede ser un 100 % de un módulo y un 0 % de otro. La tarea pide nombrar los módulos sin evidencia, y para eso la unidad tiene que ser el módulo o la funcionalidad.
- **Contar por módulo completo sería demasiado blando.** Bastaría una prueba de un endpoint para dar por cubierto un módulo de 17. Por eso la unidad es la funcionalidad dentro del módulo.

La cobertura de líneas **no se descarta**: se reporta aparte (§3) con el denominador corregido de DT-06, por módulo, y no se mezcla con el porcentaje principal. Su configuración (`coverage.include`/`exclude` de los dos `vitest.config.js`) **no se modifica** en esta tarea.

### 1.4 Lo que no se hace

- No se cambia el denominador después de medir: las 77 funcionalidades de §2 quedan fijas en el commit que agrega este criterio.
- No se excluyen archivos de la cobertura ni se toca la configuración de Vitest.
- No se reclasifica una funcionalidad como "no aplica" porque no tenga pruebas.
- Las funcionalidades que se agreguen durante la medición se marcan como *agregada al medir* y suman al denominador.

## 2. Catálogo de funcionalidades

Fuente: los 17 routers montados en `backend/src/router.js`, las rutas de `frontend/src/router/index.js` y los servicios transversales. Una funcionalidad agrupa los endpoints y pantallas que implementan una misma acción del usuario.

| Módulo | ID | Funcionalidad | Implementación principal |
|---|---|---|---|
| **M01 Autenticación** | F01 | Registro de usuario | `POST /auth/register`, `RegisterView` |
| | F02 | Inicio de sesión con correo y contraseña | `POST /auth/login`, `LoginView`, store `auth` |
| | F03 | Sesión: validar token y obtener el usuario actual | `GET /auth/me`, `requireAuth` |
| | F04 | Inicio de sesión con Google (OAuth) | `GET /auth/google`, `/google/callback`, `AuthCallback` |
| | F05 | Límite de intentos de login | `rateLimit.js` (DT-13) |
| **M02 Usuarios y ajustes** | F06 | Listar y consultar usuarios | `GET /users`, `GET /users/:id` |
| | F07 | Crear, editar y eliminar usuarios | `POST/PUT/DELETE /users` |
| | F08 | Ajustes y preferencias del usuario (idioma, tema, visibilidad) | `SettingsView`, store `preferences`, `useTheme`, `useLocale` |
| **M03 Empresas** | F09 | Crear empresa y onboarding | `POST /companies`, `OnboardingView` |
| | F10 | Contexto de acceso y cambio de empresa | `GET /companies/my-companies`, `/access-context` |
| | F11 | Invitación a la empresa (crear, consultar, aceptar, revocar) | `/companies/invitation*`, `InviteView`, `companyInvitationService` |
| | F12 | Miembros de la empresa: rol, asignación a proyectos, baja | `/companies/members*`, `/members-panel` |
| | F13 | Autorización por rol de empresa | `requireCompany`, `requireCompanyRole`, `requireCompanyOwner`, `requireRole` |
| **M04 Equipos** | F14 | Crear, editar, listar y eliminar equipos | `/teams`, `TeamsView` |
| | F15 | Asignar y quitar miembros de un equipo | `/teams/:teamId/members/:userId` |
| | F16 | Asignar y quitar proyectos de un equipo | `/teams/:teamId/projects/:projectId` |
| **M05 Proyectos** | F17 | Crear, editar y eliminar proyecto | `POST/PUT/DELETE /projects` |
| | F18 | Listar y consultar proyectos | `GET /projects`, `/projects/:id`, `ProjectsView`, `ProjectDetailView` |
| | F19 | Métricas del proyecto | `GET /projects/:id/metrics`, `projectMetricsController` |
| | F20 | Registro de avance del proyecto | `/projects/:id/progress*`, `projectProgressController` |
| | F21 | Miembros e invitaciones del proyecto | `/projects/:id/members*`, `/invitation`, `/invitations/:token*` |
| | F22 | Permisos por proyecto | `requireProject`, `requireProjectPermission`, `projectAccessService` |
| **M06 Tareas** | F23 | Crear, editar, listar y consultar tareas | `/projects/:projectId/tasks`, `TaskModal` |
| | F24 | Cerrar tarea | `PATCH /tasks/:id/close` |
| | F25 | Evidencias de tarea: subir, listar, borrar | `/tasks/:id/evidence*`, `evidenciaController`, UploadThing |
| **M07 Presupuesto** | F26 | Crear, editar y eliminar actividades de presupuesto | `POST/PUT/DELETE /budgets` |
| | F27 | Registrar gasto e historial de gastos | `POST /budgets/register-expense`, `GET /:id/expenses` |
| | F28 | Fondos del proyecto (consultar y ajustar) | `/budgets/project/:projectId/funding` |
| | F29 | Resumen del proyecto y alertas de exceso | `GET /budgets/project/:projectId/summary`, `budgetCalculations` |
| | F30 | Resumen agregado de varios proyectos | `GET /budgets/summary`, `budgetOverviewService`, `budgetSummaryCache` |
| | F31 | Tendencia y finanzas por producto | `/project/:projectId/trend`, `/products-financial` |
| | F32 | Vista de presupuesto en el frontend | `BudgetView` |
| **M08 Inventario** | F33 | Crear, editar y eliminar productos | `POST/PUT/DELETE /products` |
| | F34 | Listar y consultar productos, búsqueda por código de barras | `GET /products`, `/products/:id`, `InventoryPage`, `ProductDetailView` |
| | F35 | Alerta de stock bajo | `GET /products/alerts/low-stock` |
| | F36 | Vincular, actualizar y desvincular proveedores de un producto | `/products/:id/suppliers*` |
| **M09 Proveedores** | F37 | Crear, editar, listar y eliminar proveedores | `/suppliers`, `SuppliersView` |
| **M10 Punto de venta** | F38 | Venta: cálculo de descuento e IVA | `saleCalculation.js`, `frontend/utils/sales.js` |
| | F39 | Venta: registro con descuento de stock y precio dictado por la base | `POST /inventory-movements/sale` |
| | F40 | Configuración de venta de la empresa (IVA, tope de descuento) | `/companies/sale-config`, store `saleConfig` |
| | F41 | Movimientos manuales de inventario (entrada, salida, ajuste) | `POST /inventory-movements` |
| | F42 | Historial y estadísticas de movimientos | `GET /inventory-movements`, `/stats`, `/:id` |
| | F43 | Pantalla de venta: carrito, escaneo y cobro | `SalesView`, `BarcodeScanner`, `boxPricing` |
| **M11 Reportes** | F44 | Crear, editar, listar y eliminar reportes | `/reports`, `ReportsView`, `ReportDetailView` |
| | F45 | Resumen de reportes | `GET /reports/summary` |
| | F46 | Exportación a PDF y CSV | `POST /reports/exports`, `reportExport.js`, `utils/pdf/`, `csvExport.js` |
| **M12 Dashboard** | F47 | Vista general de proyectos y presupuesto | `DashboardView` |
| **M13 Chat** | F48 | Conversaciones y mensajes (REST) | `/chat/conversations*`, `/chat/users`, `chatController` |
| | F49 | Mensajería en tiempo real | `socket/index.js`, store `chat` |
| | F50 | Interfaz de chat (vista y chat flotante) | `ChatView`, `FloatingChat` |
| **M14 Agente de IA** | F51 | Conversar con el agente | `POST /agent/chat`, `aiAgentService`, `AgentView` |
| | F52 | Aislamiento de las consultas SQL del agente por empresa | `agentSql.js`, `agentContext.js` (DT-16) |
| | F53 | Historial de conversaciones y mensajes del agente | `/agent/conversations*`, `/agent/messages/:id` |
| **M15 Integraciones** | F54 | Configurar, activar y eliminar integraciones | `/integrations`, `/:slug`, `/toggle`, `IntegrationsView` |
| | F55 | Probar una integración, con protección SSRF | `POST /integrations/:slug/test`, `ssrfGuard.js` (DT-12, DT-18) |
| | F56 | Envío de notificaciones por canal | `notificationService` y los servicios de Slack, Teams, Telegram, Twilio, SendGrid, webhook y WhatsApp |
| | F57 | Timeouts de llamadas salientes | `fetchWithTimeout.js` (DT-15) |
| **M16 Marketing** | F58 | Campañas | `/marketing/campaigns` |
| | F59 | Elementos de campaña | `/marketing/items` |
| | F60 | Publicaciones y su ciclo de vida | `/marketing/publications`, `marketingPublicationLifecycle.js` |
| | F61 | Métricas de publicaciones | `/marketing/publications/:id/metrics*` |
| | F62 | Generación de contenido con IA | `POST /marketing/generate`, `marketingGenerationService` |
| | F63 | Vista de publicaciones y calendario | `MarketingPublicationsView`, `MarketingCalendar` |
| **M17 Administración global** | F64 | Estadísticas globales | `GET /admin/stats`, `GET /global/stats`, `AdminDashboardView` |
| | F65 | Gestión de empresas (listar, activar, desactivar) | `/admin/companies`, `/global/companies*`, `AdminCompaniesView` |
| | F66 | Gestión de usuarios (listar, activar, desactivar) | `/admin/users*`, `AdminUsersView` |
| | F67 | Acceso restringido a superusuario | `requireSuperUser` |
| **M18 Sitio público y legal** | F68 | Landing page | `LandingPage` |
| | F69 | Términos, privacidad y aceptación legal | `LegalView`, `useLegalConsent`, `utils/legal.js` |
| | F70 | Navegación, menú y página 404 | `AppNavbar`, guardas del router, `NotFoundView` |
| **M19 Plataforma** | F71 | Manejo centralizado de errores | `errorHandler.js`, `asyncHandler.js` |
| | F72 | Validación de entrada | `validate.js`, `schemas/` |
| | F73 | Cabeceras de seguridad HTTP | `security.middleware.js` (DT-14, DT-19) |
| | F74 | Aislamiento de datos entre empresas | filtros por `id_empresa` en controladores |
| | F75 | Salud del servicio y pool de conexiones | `GET /health`, `poolStats.js`, `pool.js` |
| | F76 | Cliente HTTP del frontend (cabeceras, reintentos, 401) | `services/http.js`, `services/api.js` |
| | F77 | Internacionalización (inglés y español) | `locales/`, `useLocale` |

**Total: 19 módulos, 77 funcionalidades.**

---

*Las secciones siguientes se escribieron después de medir, el 24/10/2026. El criterio y el catálogo de arriba quedaron en el commit `3747592` y no se tocaron.*

## 3. Resultado

| Medida | Resultado |
|---|---|
| **Funcionalidades con evidencia de prueba** | **52 de 77 = 67.5 %** |
| Con evidencia automatizada | 49 de 77 = 63.6 % |
| Con evidencia solo manual | 3 (F17, F25, F47) |
| Sin evidencia | 25 |
| Umbral de la guía | 80 % = 62 funcionalidades |
| **Brecha** | **12.5 puntos: faltan 10 funcionalidades** |

**El sistema no llega al 80 %.** Tiene evidencia de prueba en dos de cada tres funcionalidades, y la brecha se concentra en módulos completos que nadie probó: Administración global (0 de 4), Proveedores (0 de 1), y la mitad de Usuarios, Equipos y Marketing. El plan para cerrarla está en §7.

Como referencia, contar por módulo daría 17 de 19 (89 %), porque basta una prueba en cualquier funcionalidad del módulo. Es justo la lectura blanda que §1.3 descartó antes de medir: Marketing contaría como probado con 4 de sus 6 funcionalidades sin prueba.

### 3.1 Por módulo

| Módulo | Funcionalidades | Con evidencia | % |
|---|---|---|---|
| M01 Autenticación | 5 | 5 | 100 % |
| M02 Usuarios y ajustes | 3 | 1 | 33 % |
| M03 Empresas | 5 | 3 | 60 % |
| M04 Equipos | 3 | 1 | 33 % |
| M05 Proyectos | 6 | 5 | 83 % |
| M06 Tareas | 3 | 2 | 67 % |
| M07 Presupuesto | 7 | 5 | 71 % |
| M08 Inventario | 4 | 3 | 75 % |
| **M09 Proveedores** | 1 | **0** | **0 %** |
| M10 Punto de venta | 6 | 4 | 67 % |
| M11 Reportes | 3 | 3 | 100 % |
| M12 Dashboard | 1 | 1 (solo manual) | 100 % |
| M13 Chat | 3 | 2 | 67 % |
| M14 Agente de IA | 3 | 2 | 67 % |
| M15 Integraciones | 4 | 3 | 75 % |
| M16 Marketing | 6 | 2 | 33 % |
| **M17 Administración global** | 4 | **0** | **0 %** |
| M18 Sitio público y legal | 3 | 3 | 100 % |
| M19 Plataforma | 7 | 7 | 100 % |
| **Total** | **77** | **52** | **67.5 %** |

## 4. Matriz de funcionalidades contra tipo de evidencia

Códigos de tipo en §1.2. Las sesiones de usabilidad se citan así: **HU-37 T1–T5** (`docs/pruebas-usabilidad/registro-sesiones.md`), **Fase 2 tarea 1–5** (`analisis-hallazgos-fase2.md`) y **UX-R4** (`protocolo-five-second-ux-r4.md`). Los escenarios k6 C1–C5 corren en cada PR (job `load-tests` de `ci.yml`); E1–E5 y V1–V5 son corridas manuales con informe.

| ID | Funcionalidad | Tipos | Resultado | Evidencia |
|---|---|---|---|---|
| F01 | Registro de usuario | I | Automatizada | `integration/auth.int.test.js`: hash bcrypt persistido, correo duplicado 409 |
| F02 | Inicio de sesión | U I C Us | Automatizada | `auth.int.test.js`; `authService.test.js`, `authStore.test.js`; k6 C1/E1; HU-37 T1 |
| F03 | Sesión y usuario actual | U I | Automatizada | `auth.int.test.js` (`/me`, 401 sin token); `requireAuth.test.js`; `authz.controller.test.js` casos 1–2 |
| F04 | Inicio de sesión con Google | U | Automatizada | `frontendUrl.test.js`: URL de Google, estado y cancelación; `rateLimit.test.js`. El intercambio del código por el token no tiene prueba |
| F05 | Límite de intentos | U S | Automatizada | `rateLimit.test.js`; `verify-ratelimit-*` (SCRUM-52 y regresión del Sprint 9) |
| F06 | Listar y consultar usuarios | — | **Sin evidencia** | `userController` sin ninguna función ejecutada |
| F07 | Crear, editar y eliminar usuarios | — | **Sin evidencia** | Ídem |
| F08 | Ajustes y preferencias | U | Automatizada | `settingsView.test.js`, `preferences.test.js`, `useTheme.test.js`, `theme.test.js` |
| F09 | Crear empresa y onboarding | U | Automatizada | `onboardingView.test.js`: crea la empresa al enviar el formulario |
| F10 | Contexto de acceso y cambio de empresa | U | Automatizada, solo frontend | `authStore.test.js` (`selectEmpresaById`, reinicio de `accessContext`). `getMyCompanies` y `getCompanyAccessContext` sin prueba |
| F11 | Invitación a la empresa | — | **Sin evidencia** | `companyInvitationService` sin ninguna función ejecutada. `invitation.test.js` prueba la lectura del token en la URL y el mapeo de errores, no la invitación |
| F12 | Miembros de la empresa | — | **Sin evidencia** | Las siete funciones de miembros de `companyController` sin ejecutar |
| F13 | Autorización por rol de empresa | U I | Automatizada | `integration/authorization.int.test.js` (12 casos); `requireRole.test.js`; `authz.controller.test.js` casos 3–6 y 9 |
| F14 | CRUD de equipos | U | Automatizada, solo frontend | `teamsView.test.js`: crea un equipo con `POST /api/teams`. `teamController` sin ninguna función ejecutada |
| F15 | Miembros de un equipo | — | **Sin evidencia** | |
| F16 | Proyectos de un equipo | — | **Sin evidencia** | |
| F17 | Crear, editar y eliminar proyecto | Us | Solo manual | HU-37 T2 (3 de 3 con éxito). `projectController` sin ninguna función ejecutada |
| F18 | Listar y consultar proyectos | I R C V Us | Automatizada | `regression/tenantIsolation.regression.test.js`, `authorization.int.test.js`; k6 C2/E2; volumen V1; HU-37 T1 |
| F19 | Métricas del proyecto | C V | Automatizada | k6 C2/E2; volumen V2 |
| F20 | Registro de avance | C Us | Automatizada | k6 C3/E3 (escritura); HU-37 T4 |
| F21 | Miembros e invitaciones del proyecto | — | **Sin evidencia** | |
| F22 | Permisos por proyecto | U | Automatizada | `errorContract.test.js`: 403 por permiso insuficiente a través de `requireProject` y `requireProjectPermission` |
| F23 | CRUD de tareas | U Us | Automatizada | `authz.controller.test.js` caso 8 (`getTasks`); `taskModal.test.js`; HU-37 T3 |
| F24 | Cerrar tarea | — | **Sin evidencia** | `closeTask` sin ejecutar |
| F25 | Evidencias de tarea | Us | Solo manual | HU-37 T4 (2 de 3 con éxito); subida verificada a mano en DT-08. `evidenciaController` sin ninguna función ejecutada |
| F26 | Actividades de presupuesto | I | Automatizada | `budget.int.test.js` (actividad planificada); `authorization.int.test.js` (borrado por rol) |
| F27 | Gastos e historial | I | Automatizada | `budget.int.test.js`: gasto, acumulación por nombre, historial, monto cero; `authorization.int.test.js` |
| F28 | Fondos del proyecto | U I | Automatizada | `budget.int.test.js`; `authorization.int.test.js` (solo owner y admin) |
| F29 | Resumen y alertas de exceso | U I | Automatizada | `budgetCalculations.test.js`; `budget.int.test.js` (resumen, alerta `EXCEDIDO`) |
| F30 | Resumen agregado | U | Automatizada | `budgetOverview.controller.test.js`, `budgetSummaryCache.test.js` |
| F31 | Tendencia y finanzas por producto | — | **Sin evidencia** | `getProjectBudgetTrend` y `getProductsFinancials` sin ejecutar |
| F32 | Vista de presupuesto | — | **Sin evidencia** | `BudgetView` y los nueve componentes de `components/budget/` al 0 % |
| F33 | CRUD de productos | I Us | Automatizada | `productBarcode.int.test.js`; `authorization.int.test.js`; `productSupplier.int.test.js` (edición y borrado entre empresas); Fase 2 tarea 1 |
| F34 | Listado y búsqueda por código | C V Us | Automatizada | k6 C5/E5; volumen V5; Fase 2 tarea 3 |
| F35 | Alerta de stock bajo | — | **Sin evidencia** | `getLowStockAlerts` sin ejecutar |
| F36 | Proveedores de un producto | U I Us | Automatizada | `productSupplier.int.test.js` (11 casos); `productSuppliers.controller.test.js`; Fase 2 tarea 2 |
| F37 | CRUD de proveedores | — | **Sin evidencia** | `errorContract.test.js` recorre `/api/suppliers` solo para verificar respuestas de error (401, 400, 403, 404). No hay alta, edición ni listado exitosos |
| F38 | Cálculo de descuento e IVA | U R | Automatizada | `saleCalculation.test.js`, `sales.test.js`; `regression/saleTotals.regression.test.js` |
| F39 | Registro de venta | U I R C Us | Automatizada | `createSale.controller.test.js`; `posSale.int.test.js`; `salePriceAuthority` y `tenantIsolation` (regresión); k6 C5/E5; Fase 2 tarea 3 |
| F40 | Configuración de venta | U | Automatizada | `saleConfig.controller.test.js`, `saleConfigStore.test.js`, `salesView.test.js` |
| F41 | Movimientos manuales de inventario | — | **Sin evidencia** | `createInventoryMovement` sin ejecutar |
| F42 | Historial y estadísticas de movimientos | — | **Sin evidencia** | `getInventoryMovements`, `getInventoryMovementById` y `getInventorySalesStats` sin ejecutar |
| F43 | Pantalla de venta | U Us | Automatizada | `posCheckout.test.js` (20), `barcodeScanner.test.js` (25), `salesView.test.js`, `boxPricing.test.js`; Fase 2 tarea 3 |
| F44 | CRUD de reportes | U C V Us | Automatizada | `reports.controller.test.js`; k6 C4; volumen V3; HU-37 T5 |
| F45 | Resumen de reportes | U V | Automatizada | `reports.controller.test.js` (`getCompanySummary`); volumen V4 |
| F46 | Exportación a PDF y CSV | U C | Automatizada | `reportExport.test.js`, `csvExportEdgeCases.test.js`, `reportExports.test.js`; k6 C4/E4 |
| F47 | Dashboard | Us | Solo manual | HU-37 T1. `DashboardView` y `components/dashboard/` al 0 % |
| F48 | Conversaciones y mensajes (REST) | — | **Sin evidencia** | `chatController` sin ninguna función ejecutada. `chat.test.js` prueba el serializador de `utils/chat.js`, no las conversaciones |
| F49 | Mensajería en tiempo real | U | Automatizada, solo frontend | `chatStore.test.js` (33 casos con socket simulado). Los eventos de `socket/index.js` no tienen prueba |
| F50 | Interfaz de chat | U | Automatizada | `floatingChat.test.js` |
| F51 | Conversar con el agente | U | Automatizada | `agentController.test.js`: no aborta el turno y no filtra el error del servidor de inferencia |
| F52 | Aislamiento SQL del agente | U R | Automatizada | `agentSql.test.js`; `regression/agentScope.regression.test.js` |
| F53 | Historial del agente | — | **Sin evidencia** | Solo `apiServices.test.js`, que verifica la URL del cliente (ver §4.1) |
| F54 | Configurar integraciones | — | **Sin evidencia** | `listIntegrations`, `saveIntegrationConfig`, `toggleIntegration` y `deleteIntegrationConfig` sin ejecutar |
| F55 | Probar integración con protección SSRF | U S | Automatizada | `integrationSsrf.test.js` (S1–S6); `verify-ssrf*` (SCRUM-52 y Sprint 9) |
| F56 | Envío de notificaciones | U | Automatizada | `integrationTimeouts.test.js` corre el envío de seis canales. `notificationService` (el despacho por empresa) y WhatsApp sin prueba |
| F57 | Timeouts de llamadas salientes | U S | Automatizada | `fetchWithTimeout.test.js`, `integrationTimeouts.test.js`; `verify-timeout-*` (Sprint 9) |
| F58 | Campañas | — | **Sin evidencia** | |
| F59 | Elementos de campaña | — | **Sin evidencia** | |
| F60 | Publicaciones y ciclo de vida | U | Automatizada | `marketingPublications.test.js`, `marketingPublicationLifecycle.test.js`, `publicationStatus.test.js` |
| F61 | Métricas de publicaciones | — | **Sin evidencia** | |
| F62 | Generación de contenido con IA | — | **Sin evidencia** | `marketingGenerationService` sin ninguna función ejecutada |
| F63 | Vista de publicaciones y calendario | U Us | Automatizada | `marketingPublicationsView.test.js` (33), `marketingCalendar.test.js` (13); Fase 2 tareas 4 y 5 |
| F64 | Estadísticas globales | — | **Sin evidencia** | `adminController` y `globalController` sin ninguna función ejecutada |
| F65 | Gestión de empresas | — | **Sin evidencia** | Ídem |
| F66 | Gestión de usuarios | — | **Sin evidencia** | Ídem |
| F67 | Acceso de superusuario | — | **Sin evidencia** | `requireSuperUser` sin ejecutar |
| F68 | Landing page | U Us | Automatizada | `landingPageUx.test.js`; UX-R4 (5 de 5) |
| F69 | Términos y aceptación legal | U | Automatizada | `legalView.test.js`, `legalConsent.test.js` |
| F70 | Navegación y página 404 | U | Automatizada | `navigation.test.js`, `notFoundView.test.js`, `AppNavbar.test.js` |
| F71 | Manejo de errores | U | Automatizada | `errorHandler.test.js`, `errorContract.test.js` |
| F72 | Validación de entrada | U | Automatizada | `validate.test.js`; `errorContract.test.js` (400 de Zod) |
| F73 | Cabeceras de seguridad | U S | Automatizada | `security.test.js`; `verify-headers-*` (SCRUM-52 y Sprint 9) |
| F74 | Aislamiento entre empresas | U I R | Automatizada | `regression/tenantIsolation.regression.test.js`; aislamiento en `productSupplier.int` y `budget.int`; `authz.controller.test.js` caso 7 |
| F75 | Salud y pool de conexiones | U | Automatizada | `poolStats.test.js`, `poolConfig.test.js` |
| F76 | Cliente HTTP del frontend | U | Automatizada | `http.test.js`, `apiServices.test.js` |
| F77 | Internacionalización | U | Automatizada | `locale.test.js`, `languageSelector.test.js`, `i18nCoverage.test.js` |

### 4.1 Casos límite y cómo se resolvieron

Aplicando el criterio de §1.1 tal como quedó escrito:

- **Las pruebas del cliente HTTP no cuentan como evidencia del dominio.** `apiServices.test.js` y los adaptadores de `services/domains/` verifican que el frontend llama a la URL, con el método y las cabeceras correctas. Eso prueba F76, no que el historial del agente (F53) o las integraciones (F54) funcionen.
- **Las pruebas de rutas de error no cuentan como evidencia del CRUD.** `errorContract.test.js` recorre `/api/suppliers`, pero solo para verificar respuestas 401, 400, 403 y 404. Sirve de evidencia para F22, F71 y F72, no para F37.
- **Una prueba que solo ejecuta código no cuenta.** `createCompany` y `encryptCredentials` aparecen como ejecutados en la cobertura, pero ninguna prueba verifica su resultado directamente. F09 cuenta por `onboardingView.test.js`, y F54 queda sin evidencia.
- **Evidencia solo de frontend.** F10, F14 y F49 cuentan porque una prueba ejercita el store o la vista que implementa la funcionalidad y verifica su resultado, con la API simulada. Su lado del backend tiene 0 %, y por eso van marcadas.
- **Las pruebas que fijan un defecto también son evidencia.** `authz.controller.test.js` caso 8 verifica que hoy el colaborador recibe todas las tareas, no solo las suyas. Prueba F23 y documenta la brecha.

## 5. Cobertura de líneas por módulo

Medida complementaria. No entra en el porcentaje de §3. Denominador de DT-06 sin cambios, medida con Node 22, la versión de CI y de `.nvmrc`:

| Workspace | Pruebas | Sentencias | Ramas | Funciones | Líneas |
|---|---|---|---|---|---|
| Backend | 375 / 375 en 29 archivos | 38.98 % | 25.20 % | 38.08 % | 39.47 % (1 592 / 4 033) |
| Frontend | 590 / 590 en 53 archivos | 22.53 % | 22.09 % | 24.19 % | 23.18 % (2 044 / 8 815) |

Por módulo (`npm run coverage:modules`, que agrupa los dos `coverage-summary.json` según §2 y comprueba que la suma reproduce el total de Vitest):

| Módulo | Archivos | Archivos al 0 % | Líneas cubiertas | Cobertura de líneas |
|---|---|---|---|---|
| M01 Autenticación | 13 | 3 | 195 / 450 | 43.33 % |
| M02 Usuarios y ajustes | 6 | 0 | 131 / 226 | 57.96 % |
| M03 Empresas | 13 | 1 | 155 / 454 | 34.14 % |
| M04 Equipos | 7 | 2 | 112 / 343 | 32.65 % |
| M05 Proyectos | 23 | 11 | 163 / 1485 | 10.98 % |
| M06 Tareas | 9 | 2 | 66 / 198 | 33.33 % |
| M07 Presupuesto | 17 | 10 | 195 / 784 | 24.87 % |
| M08 Inventario | 12 | 8 | 61 / 1004 | 6.08 % |
| M09 Proveedores | 5 | 1 | 31 / 176 | 17.61 % |
| M10 Punto de venta | 13 | 0 | 385 / 530 | 72.64 % |
| M11 Reportes | 24 | 15 | 377 / 1182 | 31.90 % |
| M12 Dashboard | 6 | 6 | 0 / 458 | 0.00 % |
| M13 Chat | 10 | 3 | 460 / 1299 | 35.41 % |
| M14 Agente de IA | 10 | 1 | 183 / 736 | 24.86 % |
| M15 Integraciones | 18 | 4 | 173 / 619 | 27.95 % |
| M16 Marketing | 10 | 0 | 479 / 807 | 59.36 % |
| M17 Administración global | 12 | 5 | 22 / 277 | 7.94 % |
| M18 Sitio público y legal | 21 | 10 | 211 / 1060 | 19.91 % |
| M19 Plataforma | 14 | 1 | 217 / 241 | 90.04 % |
| UI compartida (sin módulo) | 17 | 12 | 20 / 519 | 3.85 % |
| **Total** | | | **3 636 / 12 848** | **28.30 %** |

Las dos medidas no coinciden, y eso es esperable. Inventario tiene 6 % de líneas y 75 % de funcionalidades porque su evidencia viene de integración, k6 y usabilidad, que la cobertura de líneas no ve. Usuarios y ajustes tiene 58 % de líneas y 33 % de funcionalidades porque todas esas líneas son de las preferencias del frontend, mientras el CRUD de usuarios está al 0 %. Por eso §1.3 eligió la funcionalidad como unidad.

## 6. Lo que queda sin evidencia

**Módulos sin ninguna evidencia:**
- **M09 Proveedores**
- **M17 Administración global**

**Funcionalidades sin evidencia (25):**

| Módulo | Funcionalidades |
|---|---|
| M02 Usuarios y ajustes | F06 Listar y consultar usuarios · F07 Crear, editar y eliminar usuarios |
| M03 Empresas | F11 Invitación a la empresa · F12 Miembros de la empresa |
| M04 Equipos | F15 Miembros de un equipo · F16 Proyectos de un equipo |
| M05 Proyectos | F21 Miembros e invitaciones del proyecto |
| M06 Tareas | F24 Cerrar tarea |
| M07 Presupuesto | F31 Tendencia y finanzas por producto · F32 Vista de presupuesto |
| M08 Inventario | F35 Alerta de stock bajo |
| M09 Proveedores | F37 CRUD de proveedores |
| M10 Punto de venta | F41 Movimientos manuales de inventario · F42 Historial y estadísticas de movimientos |
| M13 Chat | F48 Conversaciones y mensajes (REST) |
| M14 Agente de IA | F53 Historial del agente |
| M15 Integraciones | F54 Configurar integraciones |
| M16 Marketing | F58 Campañas · F59 Elementos de campaña · F61 Métricas de publicaciones · F62 Generación con IA |
| M17 Administración global | F64 Estadísticas · F65 Gestión de empresas · F66 Gestión de usuarios · F67 Acceso de superusuario |

**Con evidencia solo manual (3):** F17 CRUD de proyectos, F25 Evidencias de tarea y F47 Dashboard. Cuentan para el 67.5 %, pero ninguna prueba automática las protege de una regresión.

## 7. Plan para cerrar la brecha

Hacen falta 10 funcionalidades más para llegar a 62 de 77. El plan apunta a 13, con margen, y reutiliza la infraestructura de TEST-1: Postgres efímero en CI, `tests/db/fixtures.js` y Supertest por la ruta real. Ninguna requiere herramientas nuevas.

| # | Archivo nuevo | Funcionalidades | Por qué primero | Esfuerzo |
|---|---|---|---|---|
| 1 | `integration/admin.int.test.js` | F64, F65, F66, F67 | Un módulo entero al 0 %, y F67 es un control de acceso: un usuario normal que llegue a `/api/admin` vería todas las empresas | 3 SP |
| 2 | `integration/inventoryMovements.int.test.js` | F41, F42 | Los movimientos manuales cambian el stock, igual que la venta, que sí está probada | 2 SP |
| 3 | `integration/users.int.test.js` | F06, F07 | CRUD sin prueba en ninguna capa | 2 SP |
| 4 | `integration/teams.int.test.js` | F15, F16, y el backend de F14 | `teamController` al 0 %, con cuatro `assert*InCompany` de aislamiento sin probar | 2 SP |
| 5 | `integration/suppliers.int.test.js` | F37 | Saca a M09 del 0 % | 1 SP |
| 6 | `integration/tasks.int.test.js` | F24, y el backend de F23 y F25 | Puede fijar como regresión el 404 al borrar evidencias, el hallazgo lateral de DT-08 | 1 SP |
| 7 | Caso en `productBarcode.int.test.js` | F35 | Una consulta, un caso | 1 SP |
| | **Total** | **13 funcionalidades** | | **12 SP** |

**Resultado esperado: 65 de 77 = 84.4 %**, todas automatizadas. Si el plan se cumple solo hasta el punto 4, se llega a 62 de 77, exactamente el 80 %.

**Después del 80 %**, en orden de riesgo: F11, F12 y F21 (invitaciones y miembros, 3 SP); F58, F59 y F61 (Marketing, 2 SP); F48 y F53 (historial de chat y del agente, 2 SP); F54 (configurar integraciones, 1 SP); F31 y F62 (2 SP, F62 con el LLM simulado). Para F32 y F47 (vistas de Presupuesto y Dashboard) conviene una prueba de componente que monte la vista con la API simulada, como `teamsView.test.js`.

## 8. Método reproducible

Con Node 22 (`.nvmrc`; `package.json` declara `engines: >=20 <23`):

```bash
npm ci
npm run test:coverage -w backend      # 375 pruebas, escribe backend/coverage/
npm run test:coverage -w frontend     # 590 pruebas, escribe frontend/coverage/
npm run coverage:modules              # tabla de §5, y verifica que cuadra con Vitest
npm run test:integration -w backend   # requiere TEST_DATABASE_URL (docs/pruebas-integracion.md)
npm run test:regression -w backend
```

La columna de funcionalidades ejecutadas sale de `coverage/coverage-final.json`, que registra cuántas veces corrió cada función. Para las pruebas que no pasan por Vitest, la evidencia es el archivo o informe que cita cada fila de §4. El porcentaje es el conteo de filas de §4 cuyo resultado no es «Sin evidencia», dividido entre 77.

## 9. Hallazgos de la medición

1. **La suite del frontend falla en Node 25.** 93 de las 590 pruebas fallan con `localStorage.clear is not a function`: Node 25 expone su propio `localStorage` global, que tapa el de happy-dom. Con Node 22 pasan las 590. No afecta a CI, pero quien tenga Node 25 instalado ve la suite en rojo sin motivo. Node 25 está fuera de `engines` (`>=20 <23`), así que la corrección es usar Node 22. Se puede agregar `engine-strict` en `.npmrc` para que `npm ci` lo avise.
2. **Tres funcionalidades tienen evidencia solo del lado del frontend** (F10, F14, F49). Si el backend cambia el contrato, las pruebas con la API simulada siguen en verde. El punto 4 del plan cierra F14.
3. **Un defecto conocido sigue sin prueba de regresión.** Borrar una evidencia desde la interfaz responde 404 (hallazgo lateral de DT-08, `backend/src/routes/taskRoutes.js:31`). La única prueba de F25 es manual. El punto 6 del plan lo fija.
