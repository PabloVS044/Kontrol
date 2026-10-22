# Pruebas de integración del backend — Sprint 10

Tercer tipo de prueba automatizada del proyecto, junto a las unitarias (Vitest, `ci.yml`) y las de carga (k6, job `load-tests` de `ci.yml`). Responde al requisito de la guía del décimo sprint: *"Debe incluir el resultado de las pruebas de integración realizadas como parte del proceso de integración continua."*

Las pruebas unitarias del backend simulan `db/pool.js` y llaman a los controladores con `req` armado a mano. Por eso DT-04 pasó a producción: la ruta declaraba `:supplierId`, el controlador leía `req.params.pid`, y ninguna prueba unitaria recorría la ruta real. Estas pruebas sí lo hacen: cada petición entra por Express con Supertest, pasa por los middlewares reales y sus consultas llegan a un PostgreSQL real.

## 1. Decisión de enfoque: base efímera dentro del pipeline

| Opción | Ventaja | Por qué se descartó o se eligió |
|---|---|---|
| Base de pruebas compartida (la de SCRUM-25, con datos sembrados) | No hay que levantar nada | **Descartada.** Otros la usan con datos sembrados, y la suite necesita partir de un esquema vacío y conocido. Dos corridas en paralelo, o un compañero sembrando datos, cambiarían el resultado. Además exigiría credenciales de una base real en el pipeline. |
| Base Postgres fija en un servidor solo para CI | Esquema persistente, corridas un poco más rápidas | **Descartada.** Sigue siendo estado compartido entre corridas y entre PRs simultáneos, y requiere credenciales reales y un servidor que mantener. |
| **Postgres efímero levantado por el pipeline** (service container `postgres:16-alpine`) | Cada job tiene su propia base vacía, sin credenciales reales, y se destruye al terminar | **Elegida.** Es la única que cumple a la vez "nunca contra producción ni contra la compartida", "sin credenciales reales" y "dos ejecuciones dan el mismo resultado". |

**Costo de la decisión en tiempo de corrida:** levantar el contenedor y cargar el esquema cuesta unos segundos por job (ver §5). El esquema se carga desde `backend/kontrol.sql` y luego se aplica `ensureDatabaseSchema()`, las mismas migraciones que corre el backend al arrancar en producción. Las pruebas ejercitan el esquema real, no uno escrito a mano para ellas.

En local se usa el mismo Postgres 16 con `npm run db:test:up -w backend` (`docker-compose.integration.yml`, puerto 5433, datos en `tmpfs`), o cualquier Postgres local apuntando `TEST_DATABASE_URL` a una base cuyo nombre contenga `test`.

### Salvaguardas

- `tests/db/testDatabase.js` rechaza correr si el host no es local (`localhost`, `127.0.0.1`, `::1`, `postgres`, `postgres-test`) o si el nombre de la base no contiene `test`. La suite borra el esquema completo, y este guard impide hacerlo sobre Supabase aunque alguien exporte la URL de producción por error.
- `tests/db/env.js` fija `DATABASE_URL` antes de que se importe la app, así que el `.env` de desarrollo nunca gana.
- **Secretos:** el pipeline no usa ninguno real. La contraseña de Postgres (`kontrol`) es la de un contenedor que solo existe dentro del runner y no es alcanzable desde fuera, y `JWT_SECRET: ci-integration-secret` solo firma tokens dentro de ese mismo job. Ninguno da acceso a nada fuera del runner, por eso van en el workflow y no en GitHub Secrets. Si en el futuro la suite necesitara una credencial real (por ejemplo, de un servicio externo), irá en GitHub Secrets y nunca en el repositorio.

## 2. Cobertura: los cinco grupos de flujos

58 casos en 9 archivos: 48 en `backend/tests/integration/` y 10 en `backend/tests/regression/`.

| # | Grupo de flujos | Archivo | Casos | Qué se comprueba contra la base real |
|---|---|---|---|---|
| 1 | Autenticación y autorización por rol y por empresa | `integration/auth.int.test.js` (I1) | 6 | Registro con hash bcrypt persistido, correo duplicado (409), login contra el hash guardado, `/me` con el JWT emitido, 401 sin token |
| | | `integration/authorization.int.test.js` (I5) | 12 | Roles de empresa: owner/admin/manager registran gastos y collaborator no (403, sin movimiento escrito); manager no borra actividades y admin sí; collaborator sin asignación no crea productos; solo owner/admin ajustan fondos. Por empresa: sin token 401, token con otro secreto 401, sin `X-Company-ID` 400, no miembro 403, empresa desactivada 403 |
| 2 | Producto–proveedor (DT-04) | `integration/productSupplier.int.test.js` (I4) | 11 | Los tres endpoints por la ruta real: vincular (201) y duplicado (409); `PUT /:id/suppliers/:supplierId` actualiza la fila que nombra la URL; relación inexistente 404, no 500; `supplierId` no numérico 400; `DELETE` borra y el segundo da 404; producto y proveedor sobreviven al desvincular. Más 4 casos de aislamiento (ver grupo 5) |
| 3 | Venta completa en el POS, con precio, descuento e IVA (DT-02) | `integration/posSale.int.test.js` (I2) | 3 | Venta, movimientos SALIDA y descuento de stock en una sola transacción; ROLLBACK completo con stock insuficiente; descuento por encima del tope de `empresa_config` (422) |
| | | `regression/saleTotals.regression.test.js` (RG1) | 3 | Q100 − 10 % + IVA 12 % = Q100.80 en la respuesta y en la tabla `venta`; el IVA por línea suma el de la cabecera |
| | | `regression/salePriceAuthority.regression.test.js` (RG2) | 3 | El precio lo dicta la base: precio manipulado → 409 `PRICE_MISMATCH` sin venta; cambio de precio en la base se respeta |
| | | `integration/productBarcode.int.test.js` (I3) | 4 | Unicidad del código de barras del POS por proyecto (índice parcial único) |
| 4 | Presupuesto y gastos | `integration/budget.int.test.js` (I6) | 12 | Resumen inicial; actividad planificada; gasto → movimiento `GASTO_ADMIN` ligado a la actividad; acumulación por nombre sin importar mayúsculas ni espacios; historial de gastos; ajuste de fondos con historial; alerta `EXCEDIDO`; gasto de monto cero rechazado sin escribir. Más 4 casos de aislamiento |
| 5 | Aislamiento entre empresas | `regression/tenantIsolation.regression.test.js` (RG3) | 4 | Listado de proyectos solo de la propia empresa; `X-Company-ID` ajeno → 403; no se vende en nombre de otra empresa ni un producto de otra |
| | | I4, segundo `describe` | 4 | B no vincula, no cambia precio, no desvincula proveedores de productos de A, ni edita o borra productos de A |
| | | I6, segundo `describe` | 4 | B no lee el resumen de A, no carga gastos a A (con ROLLBACK verificado), no ve/edita/borra actividades de A, no ajusta fondos de A |

### Hallazgo: escritura entre empresas en productos (corregido en este mismo cambio)

Los casos de aislamiento de I4 fallaron en la primera corrida. `PUT /api/products/:id`, `DELETE /api/products/:id` y los tres endpoints de `/:id/suppliers` buscaban el producto solo por id, mientras que `requireProject` autorizaba el proyecto de la cabecera `X-Project-ID`. Un usuario con acceso a **su** proyecto podía editar, borrar o revincular productos de **cualquier otra empresa** cambiando el id en la URL. El vínculo además aceptaba proveedores de otra empresa.

Las pruebas unitarias no podían verlo porque el pool simulado devuelve lo que se le pida. Se corrigió en `productController.js`: el producto debe pertenecer al proyecto autorizado y el proveedor a la empresa del usuario. El frontend ya enviaba como `X-Project-ID` el proyecto del propio producto (`InventoryPage.vue`, `ProductDetailView.vue`), así que la UI no cambia. Conviene registrarlo en `docs/deuda-tecnica.md` como defecto detectado y resuelto por esta suite.

## 3. Datos reproducibles

- **Antes de la primera suite**, `tests/db/globalSetup.js` borra y recrea el esquema `public`, carga `kontrol.sql` y aplica `ensureDatabaseSchema()`.
- **Cada suite siembra lo suyo** con los helpers de `tests/db/fixtures.js` (`createCompanyWithOwner`, `addCompanyMember`, `createProject`, `createProduct`, `createSupplier`). Los nombres y correos llevan un sufijo único, así que ningún caso depende del orden ni de datos que dejó otro.
- **Al terminar**, el teardown de `globalSetup` vuelve a borrar el esquema: la base queda vacía.
- Las suites corren en serie (`fileParallelism: false`) sobre una sola base.

**Verificación (21/10/2026, local):** dos ejecuciones seguidas de ambas suites dieron el mismo resultado caso por caso (48/48 y 10/10 las dos veces, listados idénticos), y después de cada corrida la base quedó con 0 tablas en `public`.

## 4. Integración al pipeline

Workflow `.github/workflows/integration-regression.yml`:

| Aspecto | Configuración |
|---|---|
| Disparadores | `push` a `develop` (la rama de integración, es decir, cada merge) · `pull_request` hacia `main` o `develop` · `workflow_dispatch` manual |
| Jobs | Uno por tipo de prueba (matriz): *Pruebas de integración (API + PostgreSQL)* y *Pruebas de regresión (API + PostgreSQL)*. En un PR se ve por separado cuál falló |
| Base | Service container `postgres:16-alpine` por job, con healthcheck |
| Concurrencia | En un PR, un commit nuevo cancela la corrida anterior. En `develop` no se cancela: cada merge conserva su corrida como evidencia |
| Bloqueo | Cualquier caso en rojo deja el job en rojo |

El workflow está separado de `ci.yml` y sus jobs corren **en paralelo** a lint, unitarias y carga. No alargan el camino crítico del PR salvo que sean el job más lento.

## 5. Tiempo que agrega al pipeline

| Medición | Integración | Regresión | Fuente |
|---|---|---|---|
| Ejecución de los casos (sin arranque) | 0.89 s | 0.24 s | Reporte de Vitest, local |
| Corrida completa de la suite (import de la app + esquema + casos + teardown) | 17 s | 9-10 s | `npm run test:<suite>` cronometrado, local, Windows, Postgres 18 |
| Paso «Ejecutar pruebas» en GitHub Actions | 10 s | 6 s | Corrida [39726900662](https://github.com/PabloVS044/Kontrol/actions/runs/39726900662), PR, commit `6385e6a`, 22/10/2026 |
| Job completo en GitHub Actions (contenedor 11-14 s, `npm ci` 10 s, suite, reporte, artefacto) | 44 s | 37 s | Misma corrida |
| Workflow completo (los dos jobs en paralelo) | 47 s | | Misma corrida |

La mayor parte del tiempo de la suite no está en los casos sino en importar la app y cargar el esquema, un costo fijo que no crece con el número de casos. En CI pesan más el arranque del contenedor de Postgres y `npm ci` que las pruebas mismas.

**Impacto en el pipeline: cero minutos en el camino crítico.** El workflow corre en paralelo a `ci.yml`, y en esa misma corrida el job más lento de `ci.yml` fue *Carga - k6*, con 223 s (3 min 43 s), contra los 47 s de este workflow. El PR quedaba listo para merge al mismo tiempo con o sin estas suites. Lo que sí agregan son unos 81 s de tiempo de runner por corrida (44 s + 37 s). Si en algún momento la suite pasara a ser el job más lento, se puede partir en más jobs de la matriz en lugar de recortar casos.

## 6. Reporte de resultados

- **En cada corrida de CI:** `backend/scripts/integration-report.js` genera un Markdown con totales y el detalle caso por caso (archivo, grupo, prueba, duración y, si hay, el primer renglón de cada fallo). Va al resumen del job y a `backend/reports/<suite>-report.md`, que junto al JUnit XML y al JSON de Vitest se publica como artefacto `reporte-integration` / `reporte-regression` con 30 días de retención.
- **Versionado en el repositorio:** `docs/evidencias/pruebas-integracion/`. La corrida local que valida esta entrega está en `resultados-local-2026-10-21.md`. Para el informe se recomienda agregar ahí el reporte del artefacto de la primera corrida en `develop`.
- **En local:** `npm run test:integration -w backend && npm run test:regression -w backend && npm run test:integration:report -w backend`.

## 7. Coordinación

- **CI-1 (evidencia de integración continua):** esta suite es parte de lo que ese documento describe. Lo que le sirve está en §4 (disparadores y jobs), §5 (tiempos, a completar con la primera corrida en CI) y §6 (artefactos y reporte versionado).
- **TEST-2 (cobertura de evidencia de prueba):** la tabla de §2 mapea cada grupo de flujos a sus archivos y casos. `docs/plan-maestro-pruebas.md` §5 todavía lista la integración contra PostgreSQL como fuera de alcance; esa fila hay que actualizarla.
