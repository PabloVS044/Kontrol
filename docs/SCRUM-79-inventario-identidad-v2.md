# SCRUM-79 · HU-32b — Inventario de identidad visual v2

Cierre de la Fase 2 de la identidad visual v2. Inventario de pantallas y componentes del frontend con su estado antes de la migración.

**Corte "antes":** 18/10/2026 · **Corte "después":** 18/10/2026

## 1. Criterios de clasificación

Tomados de los bloques ya migrados: D (inventario, productos, proveedores), E1 (punto de venta) y E2 (centro de marketing).

**v2.** Cumple las tres condiciones:

1. Colores, superficies, bordes, radios, sombras y estados con tokens `--k-*` de `frontend/src/styles/theme.css`, o con los alias de `globals.css` que apuntan a ellos.
2. Botones, modales, campos y pills con los componentes base: `Button`, `BaseModal`, `FormField`, `Pill`, `Card`, `ProgressBar`, `ErrorState`, `Anchor`.
3. Alertas y estados con las superficies semánticas `--k-alert-*` / `--k-state-*`.

**v1.** Presenta cualquiera de estos rasgos:

- Superficies con literales (`#111111`, `#1f1f1f`, `#1a1a1a`, `#0a0a0a`, `#333`).
- Paleta de Tailwind para estados (`#fb7185`, `#34d399`, `#60a5fa`, `#f59e0b`).
- Clases de botón propias (`.btn-primary`, `.primary-action`…), inputs con estilo propio o modales con overlay propio.
- `font-family` escrito como literal en lugar de `var(--k-font-*)`.

**Mixta.** Pantalla v2 que renderiza un componente v1.

**Precisiones:**

- Los alias legacy (`--Primary`, `--Text`…) no cuentan como v1: resuelven a `--k-*` y se ven igual. Su retiro corresponde a DT-09.
- Los colores de series de datos sin token (`#f97316`, `#60a5fa` en gráficas y categorías) se mantienen como en las pantallas ya migradas. No se crean tokens ni alias nuevos.

**Exposición:**

- **Alta:** flujo de entrada, o visible en todas las pantallas autenticadas.
- **Media:** módulo de uso frecuente para Encargado/Admin.
- **Baja:** uso interno.

## 2. Inventario

### Vistas

| Pantalla | Archivos | Estado antes | Qué faltaba | Exposición | Estado después |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Landing | `LandingPage.vue/.css` | v2 completa | — | Alta | v2 completa (sin cambios) |
| Login | `LoginView.vue/.css` | v2 completa | — | Alta | v2 completa (sin cambios) |
| Registro | `RegisterView.vue/.css` | v2 completa | — | Alta | v2 completa (sin cambios) |
| Callback OAuth | `AuthCallback.vue` | v1 | Fondo `#0a0a0a` y spinner en blanco literal | Alta | v2 completa |
| Onboarding | `OnboardingView.vue` | v1 | Tarjeta, inputs, `.ob-submit` y `.ob-logout` propios | Alta | v2 completa |
| Invitación | `InviteView.vue` | v1 | Tarjeta y botones propios (`.primary-btn`, `.secondary-btn`, `.ghost-btn`) | Alta | v2 completa |
| Dashboard | `DashboardView.vue` | v2 completa | — | Alta | v2 completa (sin cambios) |
| Proyectos | `ProjectsView.vue` | v2 completa | — | Alta | v2 completa (sin cambios) |
| Detalle de proyecto | `ProjectDetailView.vue`, `ProjectDetailsView.css` | Mixta | `TaskModal` (v1: inputs y botones propios) y `TeamDetailModal` (`.task-action-btn` con literales) | Alta | v2 completa |
| Equipos | `TeamsView.vue` | v1 | Botones (`.primary-action`, `.secondary-action`, `.danger-action`, `.ghost-danger`), inputs y tarjetas propios | Media | v2 completa |
| Presupuesto | `BudgetView.vue`, `components/budget/*` | v2 completa | — | Media | v2 completa (sin cambios) |
| Inventario / POS | `InventoryPage.vue/.css` y modales | v2 completa | — | Alta | v2 completa (sin cambios) |
| Detalle de producto | `ProductDetailView.vue` | v2 completa | — | Media | v2 completa (sin cambios) |
| Ventas | `SalesView.vue` | v2 completa | — | Media | v2 completa (sin cambios) |
| Proveedores | `SuppliersView.vue` | v2 completa | — | Media | v2 completa (sin cambios) |
| Centro de marketing | `MarketingPublicationsView.vue`, `MarketingCalendar` | v2 completa | — | Media | v2 completa (sin cambios) |
| Configuración / perfil | `SettingsView.vue` | v2 completa | — | Media | v2 completa (sin cambios) |
| Reportes | `ReportsView.vue` | v1 | Vista y subcomponentes `SalesFinanceSection`, `ReportsAiPanel`, `ReportCreateModal`, `ReportDetailModal`, `ReportExportMenu` | Media | v1 (fuera de alcance) |
| Detalle de reporte | `ReportDetailView.vue` | v1 | Estilos propios; `ReportExportMenu` | Media | v1 (fuera de alcance) |
| Chat | `ChatView.vue/.css` | v1 | Layout y estilos propios | Media | v1 (fuera de alcance) |
| Integraciones | `IntegrationsView.vue`, `IntegrationView.css` | v1 | Estilos propios; `ConnectionSuccessAnimation` | Media | v1 (fuera de alcance) |
| Agente IA | `AgentView.vue` | v1 | Estilos propios | Media | v1 (fuera de alcance) |
| Admin | `AdminLayout`, `AdminNavbar`, `AdminDashboardView`, `AdminCompaniesView`, `AdminUsersView` | v1 | Todo | Baja | v1 (fuera de alcance) |
| Legal (`/legal`) ¹ | `LegalView.vue` | v2 completa | — | Media | v2 completa (sin cambios) |
| Página 404 ¹ | `NotFoundView.vue` | Mixta | Botón "Volver" nativo en lugar de `Button` (el logo 3D es DT-17 y no se toca) | Baja | v2 completa |
| — | `HomeView.vue` | Sin ruta | No se renderiza | — | — |

¹ Pantallas incorporadas desde `develop` (PR #153 a #155) después del corte "antes"; se clasifican con los mismos criterios.

### Componentes globales (montados en `App.vue` en toda pantalla autenticada con empresa)

| Componente | Estado antes | Efecto sobre las pantallas | Exposición | Estado después |
| :--- | :--- | :--- | :--- | :--- |
| `AppNavbar` | v2 | — | Alta | v2 (sin cambios) |
| `LegalConsentModal` ¹ | Mixta | Botón "Aceptar" nativo en lugar de `Button` | Alta (una vez por usuario) | v2 completa |
| `UI/AppSurface` ¹ | v2 | — (capa de contraste sobre el fondo animado) | Alta | v2 (sin cambios) |
| `chat/FloatingChat` | v1 | Vuelve mixtas todas las pantallas v2, salvo `/chat` | Alta | v2 completa |
| `birdie/BirdieFloatingButton` | v1 | Vuelve mixtas todas las pantallas v2 mientras está visible | Alta | v2 completa |
| `birdie/BirdieAssistant` | v1 | Vuelve mixta la pantalla mientras está abierto | Media | v1 (fuera de alcance) |
| `chat/VideoCallOverlay` | v1 | Vuelve mixta la pantalla durante una videollamada | Media | v1 (fuera de alcance) |

### Componentes base

`Button`, `BaseModal`, `FormField`, `Pill`, `Card`, `Anchor`, `ProgressBar` y `ErrorState` son v2.

## 3. Estimación

| Grupo | SP |
| :--- | :--- |
| Detalle de proyecto: `TaskModal` y `TeamDetailModal` | 0.5 |
| Onboarding, invitación y callback | 1 |
| `FloatingChat` y `BirdieFloatingButton` | 2.25 |
| Equipos | 1 |
| Reportes y detalle de reporte | 2.5 |
| `ChatView` y `VideoCallOverlay` | 2 |
| `BirdieAssistant` | 1.5 |
| Integraciones | 1.5 |
| Agente IA | 1.5 |
| Admin | 2 |
| **Total pendiente** | **≈ 15.75** |

El pendiente no cabe en los 5 SP del ticket. Se migra lo de mayor exposición, en este orden (≈ 4.75 SP):

1. Detalle de proyecto.
2. Onboarding, invitación y callback.
3. `FloatingChat` y `BirdieFloatingButton`.
4. Equipos.

## 4. Fuera de alcance

| Pantalla / componente | Razón |
| :--- | :--- |
| Reportes y detalle de reporte | Exposición media; es el grupo más grande que queda (2.5 SP) |
| `ChatView` | Exposición media; comparte layout con la videollamada (HU-26) |
| `VideoCallOverlay` | Sigue en v1. Vuelve mixta la pantalla mientras hay una llamada abierta |
| `BirdieAssistant` | Sigue en v1. Vuelve mixta la pantalla mientras el asistente está abierto |
| Integraciones | Exposición media |
| Agente IA | Exposición media |
| Admin (layout, navbar y tres vistas) | Exposición baja: solo super user |
| Componentes huérfanos (22) | No se renderizan; retirarlos es limpieza, no migración |

### Alcance del criterio "ninguna pantalla mixta"

**Se cumple:**

- Ninguna vista migrada renderiza componentes v1 dentro de su contenido.
- Los dos componentes globales visibles en reposo, `FloatingChat` y `BirdieFloatingButton`, quedan en v2.

**No se cumple:**

- `BirdieAssistant` y `VideoCallOverlay` siguen en v1. Cualquier pantalla queda mixta mientras alguno de los dos está abierto.
- Las vistas v1 de la tabla anterior siguen en v1. No son mixtas: el contenido es v1 entero.

### Hallazgo para backlog: `FloatingChat` en móvil

Línea base medida antes de la migración. La migración no cambia la geometría.

- `FloatingChat.vue` no tiene reglas `@media`. El panel mide 340 px de ancho fijo con `right: 24px`. A 430 px cabe; a 360 px se desborda 4 px por la izquierda.
- El botón flotante (52 px, fijo a 24 px de la esquina) tapa la esquina inferior derecha del contenido en todas las pantallas autenticadas.

### Componentes huérfanos y DT-09

Estos componentes no se importan en ningún archivo. **18 de los 22 usan alias legacy de color, con 117 usos en total**, que cuentan en el inventario de DT-09.

| Componente | Usos de alias legacy |
| :--- | :--- |
| `inventory/InventorySummaryPanel` | 14 |
| `reports/ReportsTable` | 12 |
| `reports/ReportDetailSidePanel` | 11 |
| `reports/ReportDetailHeader` | 11 |
| `dashboard/DashboardBudgetCharts` | 11 |
| `projects/ProjectSummaryPanel` | 10 |
| `projects/ProjectCard` | 9 |
| `inventory/ProductCard` | 8 |
| `reports/ReportsAssistantPanel` | 7 |
| `dashboard/DashboardTrendChart` | 5 |
| `reports/ReportsHeader` | 4 |
| `dashboard/DashboardAiInsight` | 4 |
| `common/PageHeader` | 3 |
| `reports/ReportsPerformanceChart` | 2 |
| `reports/ReportsFilterBar` | 2 |
| `projects/ProjectFormModal` | 2 |
| `reports/ReportsKpiGrid` | 1 |
| `dashboard/DashboardKpiGrid` | 1 |
| `common/LoadingSkeleton` | 0 |
| `UI/TextEffects/Shiny` | 0 |
| `UI/TextEffects/Split` | 0 |
| `UI/Backgrounds/GridWave` | 0 |

## 5. Resultado de la migración

| Pantalla / componente | Archivos | Componentes v2 reutilizados | Prueba nueva | Verificación manual |
| :--- | :--- | :--- | :--- | :--- |
| Detalle de proyecto | `TaskModal.vue`, `TeamDetailModal.vue` | `FormField`, `Button`, `BaseModal` | `taskModal.test.js` | Crear, editar y cancelar tarea en desktop. `TeamDetailModal` se migró, pero no se puede abrir desde la interfaz desde `bef2d69` (anterior a esta rama): la pestaña Equipo del proyecto está oculta y redirige a Miembros. Sin verificación manual; cubierto por build y pruebas |
| Onboarding | `OnboardingView.vue` | `FormField`, `Button` | `onboardingView.test.js` | Formulario y creación de empresa en desktop |
| Invitación | `InviteView.vue` | `Button`, `Pill` | — (`invitation.test.js` existente) | Vista sin sesión con invitación activa en desktop |
| Callback OAuth | `AuthCallback.vue` | — | — | No verificada a mano; cubierta por build |
| Chat flotante | `FloatingChat.vue` | Tokens `--k-*`; los botones de icono quedan nativos, como en `SaleCartPanel` | `floatingChat.test.js` | Panel cerrado, lista y conversación en desktop, sobre dashboard, ventas e inventario |
| Botón de Birdie | `BirdieFloatingButton.vue` | Tokens `--k-*` | — | Visible y arrastrable en desktop |
| Equipos | `TeamsView.vue` | `FormField`, `Button` | `teamsView.test.js` | Crear equipo en desktop. Pendientes: editar, eliminar, miembros y proyectos |
| Restos (grupo 7) | `FloatingChat.vue` (ícono de lista vacía: `stroke="#333"` → `var(--k-shade-8)`), `LegalConsentModal.vue`, `NotFoundView.vue` | `Button` | — (`legalConsent.test.js` y `notFoundView.test.js` existentes) | Pendiente |

Ninguna migración cambia lógica, rutas, stores ni llamadas a API. La geometría de `FloatingChat` (posición, tamaño y `z-index`) no cambia.

**Verificación automática al cierre:** 48 archivos de prueba y 566 pruebas en verde, `vite build` correcto y lint de CI sin errores.

**Escaneo del POS:** `InventoryPage`, `BarcodeScanner`, `SaleCartPanel` y `SaleCheckoutModal` no se modificaron. Las pruebas `barcodeScanner`, `posCheckout`, `sales`, `salesView`, `saleConfigStore` y `boxPricing` pasan. Verificado con cámara: producto con stock (tarjeta de confirmación y carrito), código inexistente y cobro de la venta completa.

### Cumplimiento del criterio "ninguna pantalla mixta"

- **Se cumple** para todas las vistas migradas y para los dos componentes globales visibles en reposo (`FloatingChat` y `BirdieFloatingButton`).
- **No se cumple** mientras `BirdieAssistant` o `VideoCallOverlay` están abiertos: ambos siguen en v1.

### Estado de HU-32b

HU-32b queda declarada **fuera de alcance** en lo que falta: Reportes, detalle de reporte, `ChatView`, `VideoCallOverlay`, `BirdieAssistant`, Integraciones, Agente IA, Admin y los 22 componentes huérfanos (sección 4).

### Otros hallazgos para backlog

- Los mensajes de error del backend en el panel de miembros de la empresa (`companyController.js`, `projectController.js`) llegan en inglés y se muestran tal cual. Los de éxito ya se muestran traducidos.

## 6. Red de regresión

| Área | Pruebas | Cobertura |
| :--- | :--- | :--- |
| POS / escaneo | `barcodeScanner`, `posCheckout`, `sales`, `salesView`, `saleConfigStore`, `boxPricing` | Escáner, carrito y cobro montados; cálculo de venta. `InventoryPage` no se monta |
| Componentes base | `AppNavbar`, `BaseModal`, `Button` | Comportamiento de los componentes reutilizados |
| Onboarding / invitación | `invitation`, `formValidation`, `navigation` | Utilidades y guards; las vistas no se montan |
| Chat | `chatStore`, `chatUtils` | Store y utilidades; `FloatingChat` no se monta |
| Detalle de proyecto | `taskIndicatorColors` | Colores de indicadores; los modales no se montan |
| Equipos | — | Sin pruebas |
| Transversales | `cssVars`, `theme`, `i18nCoverage` | `var()` sin resolver, contraste AA (UX-R3), claves i18n |
| Visual | `frontend/scripts/visual-parity.py` | Comparación píxel a píxel de landing, login y registro |

`prefers-reduced-motion` (UX-R4) se aplica de forma global desde `globals.css`.
