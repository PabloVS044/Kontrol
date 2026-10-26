# Reporte consolidado de pruebas de regresión — refactorización del Sprint 10

**Ticket:** SCRUM-100 · TEST-3
**Corte:** 26/10/2026, `develop` @ `325a2aa` (merge del PR #168)
**Entorno de medición:** Node 24.13.1, npm 11.8.0, Linux x64

## 1. Objetivo y alcance

Este reporte reúne en un solo documento la evidencia de que las seis refactorizaciones del Sprint 10 no rompieron el comportamiento del sistema. Como el sprint es mayoritariamente de refactorización, la regresión es su evidencia de pruebas principal. Cada tarea se presenta con la técnica aplicada, lo que se midió antes y después, las pruebas que la respaldan y la deuda técnica que cerró.

| Elemento | Ticket | Qué se refactorizó | Rama | PR |
|---|---|---|---|---|
| DT-07 | SCRUM-75 | Capa de acceso a API unificada | `refactor/unified-frontend-api` | #154 |
| DT-08 | SCRUM-69 | Dependencias vulnerables | `chore/dependency-audit-ci` | #152 (+ #160 y `d2ff9b5`) |
| DT-09 | SCRUM-93 | Tema claro, escala de z-index y alias legacy | `refactor/light-theme` | #168 |
| DT-11 | SCRUM-77 | ESLint, Prettier y lint en CI | `feat/linter-prettier-ci` | #150 |
| DT-16 | SCRUM-66 | Vistas temporales del agente | `fix/dt-16-agent-temp-view-isolation` | #157 |
| DT-17 | SCRUM-92 | Bundle de entrada y carga diferida | `refactor/lazy-load-3d-and-chunks` | #164 |

## 2. Método y fuentes

Cada número del reporte sale de una de estas fuentes y la indica junto al dato:

| Tipo | Fuente |
|---|---|
| Historial | `git log`, `git show` y `git diff --stat` sobre los merges de cada PR |
| Antes y después en el código | `git grep` sobre el commit padre del merge (antes) y sobre `develop` (después) |
| Pruebas y cobertura | `npm run test:coverage -w backend` y `-w frontend` |
| Build | `npm run build` (Vite 6) y `frontend/dist/index.html` para identificar el bundle de entrada |
| Lint | `npm run lint -- --pass-on-unpruned-suppressions`, el mismo comando del job `lint` de `.github/workflows/ci.yml` |
| Dependencias | `npm audit --json` y `npm run audit:ci` |
| Mediciones previas | `docs/deuda-tecnica.md` y `docs/SCRUM-92-medicion-bundle.md` |

Cuando una verificación manual no quedó registrada en el repositorio, se declara como **«verificación manual no documentada en el repositorio»**.

## 3. Tabla principal

| Tarea · ticket | Responsable | Rama · PR · merge | Técnica de refactorización | Antes → después | Pruebas que la respaldan | Deuda que cierra |
|---|---|---|---|---|---|---|
| **DT-07** · SCRUM-75 | Avilés | `refactor/unified-frontend-api` · #154 · `a1db0e5`, 18/10/2026 | Unificación de la capa de servicios: cliente HTTP único (`services/http.js`) y adaptadores por dominio (`services/domains/`) | `fetch(` en `frontend/src`: 92 llamadas en 27 archivos → 1, dentro de `http.js`. `authHeader(s)` locales: 15 → 1. Accesos a `localStorage` `'token'`: 13 → 3, todos en `http.js` | `frontend/tests/http.test.js` (7 casos, nuevo) y 5 suites ajustadas. Cobertura de `http.js`: 94.11 % de sentencias | DT-07 (5 SP) |
| **DT-08** · SCRUM-69 | Vásquez | `chore/dependency-audit-ci` · #152 · `094f20a`, 18/10/2026; #160 · `f9fe40f`, 20/10/2026; `d2ff9b5` en #164 | Actualización de dependencias por lotes (parche, menor, mayor) y gate de auditoría en CI | `npm audit`: 13 (2 críticas, 9 altas, 2 moderadas) → 0 críticas, 0 altas, 4 moderadas | Suites, build y lint por lote; job `audit` en CI | DT-08 (3 SP) |
| **DT-09** · SCRUM-93 | Figueroa | `refactor/light-theme` · #168 · `325a2aa`, 26/10/2026 | Sustitución de literales por tokens: paleta clara, escala simbólica de z-index y retiro de alias legacy | Alias legacy: 51 archivos / 530 usos → 18 / 117. `z-index` literales: 78 declaraciones con 32 valores → 1. Aserciones de contraste ≥ 4.5:1: 18 (solo oscuro) → 50 (25 por tema) | `theme.test.js` (56 → 99 casos), `themeSelector.test.js` (4, nuevo), `useTheme.test.js` (11) y `appSurface.test.js` (6) | DT-09 (5 SP; 2 SP restantes al inicio del sprint) |
| **DT-11** · SCRUM-77 | Vásquez | `feat/linter-prettier-ci` · #150 · `5e83341`, 14/10/2026 | Incorporación de herramientas (ESLint, Prettier, `.editorconfig`) y extracción de un `logger` configurable | Sin linter → 0 errores con 38 errores previos congelados. `console.*` en `src`: 84 → 25, todos en scripts CLI | Job `lint` en CI; `logger.test.js` en backend (4) y frontend (3) | DT-11 (3 SP) |
| **DT-16** · SCRUM-66 | Avilés | `fix/dt-16-agent-temp-view-isolation` · #157 · `02bf65c`, 20/10/2026 | Las vistas temporales se crean y eliminan dentro de la transacción, con reversión ante error | Vistas que sobreviven en la conexión devuelta al pool: la prueba exige 0 | `agentSql.test.js` (8 casos) y `regression/agentScope.regression.test.js` (1 caso, Postgres real) | DT-16 (3 SP) |
| **DT-17** · SCRUM-92 | Figueroa | `refactor/lazy-load-3d-and-chunks` · #164 · `1fd2300`, 24/10/2026 | Extracción de componente con carga diferida y separación de chunks (`manualChunks`) | Bundle de entrada: 1 328.83 kB → 483.38 kB (gzip 402.45 → 163.27 kB). TBT en `/login`: 1 037 → 679 ms. Aviso de Vite: sí → no | `chunking` (4), `kontrolLogo3D` (8), `lazyMagicCircles` (3), `useVisibleOnce` (5) y `globalStyles` (2) | DT-17 (5 SP) |

## 4. Detalle por tarea

### 4.1 DT-07 · Capa de acceso a API (SCRUM-75)

**Problema de origen.** Cada vista del frontend armaba sus propias peticiones con `fetch`, su URL base y sus cabeceras de autenticación y empresa. Fuente: `docs/deuda-tecnica.md` §1 («14 definiciones locales de `authHeader`/`authHeaders`») y §3, DT-07.

**Qué se cambió.**
- `frontend/src/services/http.js` centraliza la URL base, las cabeceras, un reintento seguro para lecturas y la invalidación de sesión ante 401.
- `frontend/src/services/api.js` enruta cada petición por un adaptador de `frontend/src/services/domains/`.
- 55 archivos tocados (`git diff --stat a1db0e5^1 a1db0e5`), en 8 commits del 17/10/2026.

**Antes y después** (`git grep` sobre `a1db0e5^1` y sobre `325a2aa`):

| Métrica | Antes | Después |
|---|---:|---:|
| Llamadas `fetch(` en `frontend/src` | 92 | 1 (`http.js:108`) |
| Archivos con `fetch(` | 27 | 1 |
| Definiciones locales de `authHeader`/`authHeaders` | 15 | 1 (`http.js:51`) |
| Lecturas y escrituras directas de `localStorage` `'token'` | 13 | 3 (todas en `http.js`) |

**Cobertura de la capa** (`npm run test:coverage -w frontend`, columnas: sentencias / ramas / funciones / líneas). Antes de la tarea, la capa no existía.

| Archivo | Sent. | Ramas | Func. | Líneas |
|---|---:|---:|---:|---:|
| `src/services/http.js` | 94.11 % | 86.04 % | 100 % | 94.33 % |
| `src/services/api.js` | 88.88 % | 70 % | 100 % | 88.88 % |
| `src/services` (total) | 96.7 % | 89.08 % | 100 % | 97.36 % |

**Pruebas.**
- `frontend/tests/http.test.js`, nuevo con 7 casos: URL, cabeceras, reintentos, enrutamiento y 401.
- Ajustadas a la nueva capa: `apiServices.test.js`, `chatStore.test.js`, `cssVars.test.js`, `navigation.test.js` y `saleConfigStore.test.js`.

**Verificación manual.** Verificación manual no documentada en el repositorio. Las vistas migradas no tienen pruebas de componente propias.

### 4.2 DT-08 · Dependencias vulnerables (SCRUM-69)

**Problema de origen.** `npm audit` reportaba vulnerabilidades críticas y altas. Fuente: `docs/deuda-tecnica.md` §1 y §3, «DT-08 — Verificación del 17/10/2026».

**Qué se cambió.** El trabajo de la tarea abarca tres integraciones:

| Integración | Cambio | `npm audit` |
|---|---|---|
| #152, `13265b8` | Parches: `shell-quote` 1.9.0 → 1.12.0 y `source-map-js` 1.2.1 → 1.2.2 | 13 → 10 |
| #152, `974f42c` | `effect` 3.17.7 → 3.22.3 por `overrides` (cadena de `uploadthing`) | 10 → 7 |
| #152, `2b85ecf` | Tailwind CSS 3 → 4 (sale `braces`, sin versión corregida) | 7 → 0 |
| #152, `c0adf65` | Job `audit` en CI (`scripts/audit-check.mjs`, `audit-allowlist.json`): falla con cualquier alta o crítica | — |
| #152, `2d151cf` | Se elimina `frontend/package-lock.json`, que ningún build usaba | — |
| #160, `a4b5c89` | `vite` 6.4.4 (GHSA-587h-7wmj-h5pm) | — |
| #164, `d2ff9b5` | `body-parser`, `zod` y `happy-dom` | — |

Fuente de la columna `npm audit`: `docs/deuda-tecnica.md` §3, DT-08. #160 y `d2ff9b5` se cuentan como parte de DT-08 porque atienden advisories de dependencias resueltos después del merge de #152.

**Antes y después:**

| Severidad | Antes (`docs/deuda-tecnica.md`) | Después (`npm audit --json`, `325a2aa`) |
|---|---:|---:|
| Críticas | 2 | 0 |
| Altas | 9 | 0 |
| Moderadas | 2 | 4 |
| Bajas | 0 | 0 |
| **Total** | **13** | **4** |

Las 4 moderadas vigentes están en dependencias de desarrollo: `vitest`, `@vitest/mocker`, `@vitest/coverage-v8` e `ip-address`. `npm run audit:ci` termina con «OK: ninguna vulnerabilidad alta o crítica sin excepción vigente».

**Pruebas.**
- Las dos suites, el build y el lint en verde después de cada lote (`docs/deuda-tecnica.md` §3, DT-08).
- El job `audit` de CI queda como protección permanente contra la reaparición de altas y críticas.

**Verificación manual documentada** (`docs/deuda-tecnica.md` §3, DT-08):
- **Subida de archivos:** evidencia de tarea subida desde el modal de detalle contra una base Postgres desechable en Docker, con el token real de UploadThing. Se comprobaron la URL prefirmada, el callback y la fila en `evidencia`, y el borrado con `UTApi.deleteFiles` respondió `deletedCount: 1`.
- **Tailwind 4 sin cambio visual:** comparación del CSS de los builds de v3 y v4 normalizado regla por regla. Las únicas diferencias son colores re-serializados con el mismo valor y prefijos de navegador ya innecesarios.
- **Imágenes Docker:** el *builder* de `frontend/Dockerfile` resuelve `effect` 3.22.3 y Tailwind 4.3.3.

El resto de la verificación manual no está documentado en el repositorio.

### 4.3 DT-09 · Tema claro, z-index y alias legacy (SCRUM-93)

**Problema de origen.** El bloque `[data-theme='light']` de `theme.css` estaba vacío, el inventario registró 27 valores distintos de `z-index` y las pantallas usaban alias legacy sin prefijo (`--Primary`, `--Text`, …). Fuente: `docs/deuda-tecnica.md` §1 y §3, DT-09. La parte de contraste del tema oscuro y la superficie `AppSurface` (T-18) se cerraron antes; esta tarea completa el elemento.

**Qué se cambió.**
- Paleta clara completa en `frontend/src/styles/theme.css`, derivada del tema oscuro.
- Selector **Sistema | Oscuro | Claro** en Configuración (`ThemeSelector.vue`, `useTheme.js`).
- Escala `--k-z-*` de 16 niveles.
- Migración de vistas y componentes a tokens.
- 90 archivos tocados (`git diff --stat 9e4e5a0 325a2aa`).

**Antes y después** (`git grep` sobre `9e4e5a0`, padre del merge, y sobre `325a2aa`):

| Métrica | Antes | Después |
|---|---:|---:|
| Archivos de `frontend/src` que usan alias legacy | 51 | 18 |
| Usos de alias legacy | 530 | 117 |
| Declaraciones `z-index` con número literal | 78 | 1 |
| Valores literales distintos de `z-index` | 32 | 1 |
| Niveles de la escala `--k-z-*` en `theme.css` | 7 | 16 |

La declaración literal restante es `z-index: 10001` en `frontend/src/components/StorageConsentBanner.vue:72`, un componente que entró a `develop` en paralelo (PR #165). Los números coinciden con los medidos sobre la rama `refactor/light-theme` antes de integrarla, salvo esa declaración.

**Contraste AA.** Ejecución de `npx vitest run tests/theme.test.js` en `frontend/`:

| | Antes | Después |
|---|---:|---:|
| Casos en `theme.test.js` | 56 | 99 |
| Aserciones de contraste ≥ 4.5:1, tema oscuro | 18 | 25 |
| Aserciones de contraste ≥ 4.5:1, tema claro | 0 | 25 |

Menor contraste del texto en el tema claro: 4.61:1 (`frontend/docs/design-system.md` §11, «Verified Contrast — Light Theme»).

**Pruebas.**
- `theme.test.js`, ampliada: catálogo de tokens de los dos temas, paridad entre `[data-theme='light']` y el bloque `@media`, escala de capas, alias legacy y contraste por tema.
- `themeSelector.test.js`, nuevo, 4 casos.
- `useTheme.test.js`, 11 casos.
- `appSurface.test.js`, 6 casos.
- `globalStyles.test.js`, `statusHelpers.test.js` y `taskIndicatorColors.test.js`, ajustadas.

**Verificación manual.** Verificación visual realizada en tema claro y oscuro, con resultado correcto, usando la emulación de `prefers-color-scheme` y el inspector de contraste del navegador. `frontend/docs/design-system.md` §11 registra que el contraste del tema claro está «enforced by `tests/theme.test.js` and checked on screen with the browser's contrast inspector».

### 4.4 DT-11 · ESLint, Prettier y lint en CI (SCRUM-77)

**Problema de origen.** El repositorio no tenía ESLint, Prettier ni paso de lint en CI. Fuente: `docs/deuda-tecnica.md` §2, DT-11.

**Qué se cambió.**
- `eslint.config.mjs` para Vue 3 y Node, más `.prettierrc.json`, `.prettierignore` y `.editorconfig`.
- Job `lint` en `.github/workflows/ci.yml`, que falla con cualquier error.
- `utils/logger.js` en backend y frontend en lugar de `console`.
- Línea base de errores preexistentes congelada en `eslint-suppressions.json`.
- 38 archivos tocados, 7 commits del 14/10/2026.

**Antes y después:**

| Métrica | Antes (`5e83341^1`) | Después (`325a2aa`) |
|---|---:|---:|
| Configuración de lint y job en CI | No | Sí |
| Errores de lint | — (sin linter) | 0 |
| Errores preexistentes congelados (`eslint-suppressions.json`) | — | 38 en 24 archivos |
| Advertencias | — | 194 |
| Llamadas `console.*` en `backend/src` y `frontend/src` | 84 | 25 |

Las 25 llamadas restantes están en scripts de línea de comandos (`backend/src/db/seed.js`, `reset.js` y `verifyUxPhase2.js`), donde `no-console` está permitido (`CONTRIBUTING.md`, «Lint and formatting»).

**Pruebas.**
- `backend/tests/logger.test.js` (4 casos) y `frontend/tests/logger.test.js` (3).
- El job `lint` protege contra errores nuevos en cada PR.

**Verificación manual.** No aplica: el resultado de la herramienta es la verificación.

### 4.5 DT-16 · Vistas temporales del agente (SCRUM-66)

**Problema de origen.** Las vistas temporales con las que el agente de IA acota sus consultas a una empresa se creaban fuera de la transacción. Podían sobrevivir en la conexión devuelta al pool y resolver la consulta siguiente contra los datos de otra empresa. Fuente: `docs/deuda-tecnica.md` §3, DT-16.

**Qué se cambió.**
- `backend/src/services/agentSql.js` abre la transacción antes de crear las vistas.
- La consulta se ejecuta bajo el rol `kontrol_agent`.
- Las 24 vistas se eliminan antes de confirmar.
- Ante cualquier fallo se revierte la transacción.
- 5 archivos tocados, 3 commits del 19/10/2026.

**Antes y después.** No hay una métrica numérica previa. El criterio verificable es que, después de una consulta del agente, la conexión devuelta al pool tenga 0 vistas en `pg_temp` y que dos empresas consecutivas en la misma conexión vean solo sus propios datos.

**Pruebas.**
- `backend/tests/agentSql.test.js`, 8 casos: orden de creación y limpieza, y reversión ante error. Corre en la suite unitaria del job `backend-tests`.
- `backend/tests/regression/agentScope.regression.test.js`, 1 caso: usa Postgres real, fuerza la reutilización de la misma conexión, comprueba que no quedan vistas en `pg_temp` y que dos empresas consecutivas reciben solo su propia fila.
- Esta prueba de regresión corre en el workflow «Integración y regresión» (`.github/workflows/integration-regression.yml`) en cada push a `develop`. El resultado de esa corrida no se adjunta.

Cobertura de `agentSql.js` (`npm run test:coverage -w backend`): 79.03 % sentencias / 57.89 % ramas / 75 % funciones / 80.5 % líneas.

**Verificación manual.** Verificación manual no documentada en el repositorio.

### 4.6 DT-17 · Bundle de entrada y carga diferida (SCRUM-92)

**Problema de origen.** El bundle de entrada incluía `three`, `gsap`, `ogl` y `lenis`, que solo usan la Landing y los fondos animados, y superaba el aviso de 500 kB de Vite. Fuente: `docs/deuda-tecnica.md` §3, DT-17.

**Qué se cambió.**
- El motor 3D del logo pasa a `KontrolLogo3DScene` y se carga al hacerse visible (`useVisibleOnce`).
- `MagicCircles` se carga en diferido con `LazyMagicCircles`.
- La Landing y el fondo `Waves` se cargan en diferido.
- `manualChunks` separa las librerías de animación.
- 21 archivos tocados.

**Antes y después** (todos de `docs/SCRUM-92-medicion-bundle.md` §2, §3 y §6):

| Métrica | Antes | Después |
|---|---:|---:|
| Bundle de entrada | 1 328.83 kB | 483.38 kB |
| Bundle de entrada, gzip | 402.45 kB | 163.27 kB |
| CSS de entrada | 67.94 kB | 41.06 kB |
| Aviso de Vite (> 500 kB) | Sí | No |
| `/login`: LCP, mediana de 5 corridas, mobile | 11.84 s | 11.64 s |
| `/login`: FCP | 5.09 s | 3.96 s |
| `/login`: TBT | 1 037 ms | 679 ms |
| `/login`: JS transferido | 399.5 KiB | 337.4 KiB |
| Puntaje de rendimiento Lighthouse | 39 | 46 |
| `/login` con reducir movimiento: LCP / TBT | — | 3.97 s / 33 ms |

**Pruebas.**
- `chunking.test.js` (4 casos): asignación de chunks.
- `kontrolLogo3D.test.js` (8): carga diferida, reducir movimiento y fallo de carga.
- `lazyMagicCircles.test.js` (3) y `useVisibleOnce.test.js` (5).
- `globalStyles.test.js` (2): fondo del `body` en `globals.css`.
- `navigation.test.js`, ampliada.

**Verificación manual.**
- **Rutas públicas:** el build de producción se sirvió con `vite preview` y se cargó en Chromium sin interfaz. Las seis rutas públicas renderizan su elemento raíz sin errores de carga de chunks (`docs/SCRUM-92-medicion-bundle.md` §6.5).
- **Landing:** se revisó en la tira de capturas de Lighthouse (§6.4).
- **Rutas con sesión:** verificación manual no documentada en el repositorio.

## 5. Red de pruebas automatizadas y verificación manual

| Tarea | Red automatizada | Qué protege | Qué no protege | Verificación manual |
|---|---|---|---|---|
| DT-07 | Sí | Cliente HTTP: URL, cabeceras, reintentos, 401 y enrutamiento por dominio | El comportamiento de cada vista migrada | No documentada en el repositorio |
| DT-08 | Indirecta | Suites, build y lint por lote; el job `audit` impide nuevas altas y críticas | Cambios de comportamiento de las librerías actualizadas fuera de lo cubierto por las suites | Subida a UploadThing y diff de CSS de Tailwind 4 (`docs/deuda-tecnica.md` §3, DT-08); el resto no documentado |
| DT-09 | Sí | Catálogo de tokens de los dos temas, contraste AA por tema, escala de capas, alias legacy y selector de tema | El resultado visual de cada pantalla | Visual en los dos temas con emulación de `prefers-color-scheme` e inspector de contraste (`design-system.md` §11) |
| DT-11 | Sí | Job `lint` y `logger` | — | No aplica |
| DT-16 | Sí | Unitaria del ciclo de vida de las vistas y regresión contra Postgres real | — | No documentada en el repositorio |
| DT-17 | Sí | Asignación de chunks, carga diferida, reducir movimiento y fallo de carga | El rendimiento real en el cliente | Lighthouse y rutas públicas (`SCRUM-92-medicion-bundle.md` §3, §6.2 y §6.5); rutas con sesión no documentadas |

DT-09 y DT-17 tocan estilos y empaquetado. Las dos tienen pruebas automatizadas para lo que se puede fijar en código: tokens, contraste, chunks y carga diferida. Lo que no está automatizado es el resultado visual y el rendimiento real, y para eso valen la verificación visual y las mediciones de Lighthouse descritas arriba.

## 6. Estado final del sprint

Medido sobre `develop` @ `325a2aa`, con las seis tareas integradas:

| Comando | Resultado |
|---|---|
| `npm run test:coverage -w backend` | 35 archivos, 437 pruebas, todas en verde. Cobertura: 42.66 % sentencias / 28.53 % ramas / 41.92 % funciones / 43.14 % líneas |
| `npm run test:coverage -w frontend` | 56 archivos, 675 pruebas, todas en verde. Cobertura: 23.37 % / 22.76 % / 25.17 % / 24.02 % |
| `npm run build` | Correcto, sin aviso de Vite. Bundle de entrada `index-KKO_PGms.js`: 499.44 kB (168.41 kB gzip). `dist/assets`: 8 706 003 B en 109 archivos |
| `npm run lint -- --pass-on-unpruned-suppressions` | 0 errores, 194 advertencias |
| `npm audit` / `npm run audit:ci` | 0 críticas, 0 altas, 4 moderadas, 0 bajas; el gate pasa |

## 7. Cierre del inventario de deuda técnica (DT-01 a DT-17)

Inventario de `docs/deuda-tecnica.md` §2. Fechas y estados de ese documento, completados con los merges de este reporte.

| Elemento | Descripción | Estado | Sprint de cierre | Tarea o fuente |
|---|---|---|---|---|
| DT-01 | Errores asíncronos sin capturar | Cerrado, 24/09/2026 | 8 | `deuda-tecnica.md` §2 |
| DT-02 | El cliente fija el precio de venta | Cerrado, 10/10/2026 | 9 | PR #126 y verificación en ambiente |
| DT-03 | Código de barras duplicado | Parcial | — | El resto continúa en DT-22 |
| DT-04 | Parámetro de ruta desajustado | Cerrado, 22/09/2026 | 8 | PR #120 |
| DT-05 | Autorización dispersa | Cerrado, 24/09/2026 | 8 | `deuda-tecnica.md` §2 |
| DT-06 | Cobertura sobre denominador parcial | Cerrado, 20/09/2026 | 8 | `deuda-tecnica.md` §3 |
| DT-07 | Sin capa de acceso a API | Cerrado, 18/10/2026 | 10 | SCRUM-75, PR #154 |
| DT-08 | Dependencias vulnerables | Cerrado, 18/10/2026 | 10 | SCRUM-69, PR #152 (+ #160 y `d2ff9b5`) |
| DT-09 | Contraste y estilos | Cerrado, 26/10/2026 | 9 (contraste, PR #138) y 10 (resto) | SCRUM-63 y SCRUM-93, PR #168 |
| DT-10 | N+1 en el dashboard | Cerrado, 09/10/2026 | 9 | SCRUM-68, PR #139 |
| DT-11 | Sin lint ni auditoría en CI | Cerrado, 14/10/2026 | 10 | SCRUM-77, PR #150; auditoría en PR #152 |
| DT-12 | SSRF en el probador de integraciones | Parcial | — | El resto continúa en DT-18 |
| DT-13 | Sin límite de intentos | Cerrado, 26/09/2026 | 8 | `deuda-tecnica.md` §3 |
| DT-14 | Cabeceras de seguridad ausentes | Cerrado, 22/09/2026 | 8 | `deuda-tecnica.md` §2 |
| DT-15 | Salidas HTTP y pool sin endurecer | Cerrado, 08/10/2026 | 9 | SCRUM-67, PR #136 |
| DT-16 | Vistas temporales del agente | Cerrado, 20/10/2026 | 10 | SCRUM-66, PR #157 |
| DT-17 | Peso del bundle de entrada | Cerrado, 24/10/2026 | 10 | SCRUM-92, PR #164 |

**Resumen: 15 de 17 cerrados; el resto de DT-03 y DT-12 continúa en DT-22 y DT-18.**

| Sprint | Elementos cerrados |
|---|---|
| 8 | DT-01, DT-04, DT-05, DT-06, DT-13 y DT-14 |
| 9 | DT-02, DT-10 y DT-15 |
| 10 | DT-07, DT-08, DT-09, DT-11, DT-16 y DT-17 |

Los elementos registrados después de la línea base (DT-18 a DT-30) se siguen en `docs/plan-refactorizacion-sprint9.md` §4 y no son objeto de este reporte.

## 8. Observaciones

1. **Tabla del inventario.** La tabla de `docs/deuda-tecnica.md` §2 no refleja el cierre de DT-11, DT-16 y DT-17: las dos primeras aparecen sin estado, con sprint «Residual» y «10», y DT-17 como «Residual». El estado de este reporte sale de los merges citados en §3.
2. **Bundle de entrada.** Pasó de 483.38 kB, medido al cerrar DT-17 (`docs/SCRUM-92-medicion-bundle.md` §6.1), a 499.44 kB en `325a2aa` por los merges posteriores. Queda a 0.56 kB del aviso de 500 kB de Vite.
3. **Vulnerabilidades moderadas.** Las 4 vigentes están en dependencias de desarrollo (`vitest` y su cadena, `ip-address`) y no bloquean el gate de CI, que exige 0 altas y 0 críticas.

## 9. Verificación del criterio de aceptación

| Criterio de SCRUM-100 | Dónde se cumple |
|---|---|
| Tabla completa de las seis tareas con su evidencia de regresión | §3, con el detalle de cada tarea en §4 |
| Números de antes y después donde apliquen: cobertura, peso del bundle, contraste, vulnerabilidades | Cobertura de la capa de API en §4.1; vulnerabilidades en §4.2; contraste, alias y z-index en §4.3; lint en §4.4; bundle y Lighthouse en §4.6; estado global en §6 |
| Casos sin pruebas automatizadas declarados con lo que se verificó manualmente | §5 |
| Estado final del inventario de 17 elementos de deuda técnica | §7 |
