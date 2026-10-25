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
