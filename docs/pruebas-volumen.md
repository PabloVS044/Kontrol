# Resultados: Pruebas de volumen (Sprint 8)

Pruebas de volumen sobre la base de datos de Kontrol, exigidas por la guía del octavo sprint. Miden cómo se comporta el sistema frente a grandes cantidades de datos con concurrencia normal. Son un tipo de prueba distinto de las de carga y estrés de SCRUM-28 (`docs/pruebas-carga-estres.md`), que midieron el comportamiento frente a muchos usuarios concurrentes con pocos datos.

| Campo | Valor |
|---|---|
| Responsable | Jonathan Tubac (24484) |
| Scripts | `volume/` (población y medición en base de datos), `k6/volume-test.js` (extremo a extremo), `volume/export-bench.mjs` (PDF y CSV). El uso se documenta en `volume/README.md` |
| Ambiente | Base Supabase independiente del ambiente de pruebas de SCRUM-25 (`docs/test-environment.md`). En ningún momento producción ni la base de desarrollo; `volume/lib/guard.sh` lo impone |
| Fecha de la corrida | _Pendiente_ |
| Alimenta a | Análisis de requisitos no funcionales |

## 1. Herramienta utilizada y justificación

**pgbench**, la herramienta de benchmarking que se distribuye con PostgreSQL, ejecutando scripts propios que reproducen textualmente las consultas de los controladores. Se complementa con `EXPLAIN (ANALYZE, BUFFERS)` para verificar el uso de índices, con k6 para el tiempo extremo a extremo y con un benchmark en Node para la generación de PDF y CSV.

La guía sugiere DbFit, HammerDB, jdbcslim y NoSQLMap. Se evaluaron así:

| Herramienta | Qué hace | Por qué no se eligió |
|---|---|---|
| HammerDB | Benchmark de rendimiento de bases de datos, compatible con PostgreSQL | Mide cargas derivadas de TPC-C y TPC-H sobre **su propio esquema**. Correr las consultas de Kontrol exige escribirlas como scripts Tcl, y el resultado equivale a pgbench con un paso más |
| DbFit | Pruebas funcionales de base de datos sobre FitNesse | Verifica **resultados** de consultas y procedimientos (qué devuelven), no tiempos frente a volumen. Requiere levantar un servidor FitNesse |
| jdbcslim | Extensión de FitNesse para consultas JDBC | El mismo enfoque funcional que DbFit, sin métricas de latencia |
| NoSQLMap | Auditoría de inyección sobre bases NoSQL | Es una herramienta de seguridad para MongoDB y similares. No aplica a pruebas de volumen, y la base medida es PostgreSQL |

pgbench cubre lo mismo que HammerDB para PostgreSQL, pero ejecuta las consultas reales de la aplicación sin traducirlas. Ya viene instalado con el cliente de PostgreSQL y reporta la latencia de cada transacción, de la que se obtienen p50, p95 y p99. La generación de datos se hace con `generate_series` de PostgreSQL, directamente en el servidor. Así se insertan cientos de miles de filas en segundos, sin pasar por la API.

## 2. Niveles de volumen

**Esquema de la base de pruebas.** El ambiente de pruebas corre `main` del 07/09, anterior a la cabecera de venta: no existe la tabla `venta` ni la columna `movimiento_inventario.id_venta`. Ahí una venta del POS se guarda como líneas `SALIDA` sin cabecera, y así la genera `populate.sql` cuando no encuentra la tabla. El volumen de ventas queda representado por esas líneas, el 40% de los movimientos. Las consultas medidas no leen `venta`, así que no cambian.

Tres niveles acumulativos más la línea base. Las cifras son filas generadas en toda la base. El 20% de cada tabla va a un proyecto "caliente" de la empresa de prueba, que es el que se mide. El resto se reparte entre los demás proyectos de esa empresa y los de 20 empresas de relleno, para que las consultas también tengan que descartar filas ajenas, como ocurre en una base multiempresa real.

| Nivel | producto | movimiento_inventario | venta | tarea | avance | reporte | presupuesto_actividad |
|---|---|---|---|---|---|---|---|
| N0 | Datos del seed (13 productos, 3 proyectos) | | | | | | |
| N1 | 10,000 | 50,000 | 10,000 | 10,000 | 10,000 | 5,000 | 2,000 |
| N2 | 50,000 | 250,000 | 50,000 | 50,000 | 50,000 | 25,000 | 10,000 |
| N3 | 100,000 | 500,000 | 100,000 | 100,000 | 100,000 | 50,000 | 20,000 |

Ámbito que ve la empresa de prueba en cada nivel. Estas cifras salen de `volume/results/<nivel>/inventario.txt`:

| Nivel | Proyectos de la empresa | Productos del proyecto medido | Productos de la empresa | Movimientos del proyecto | Tareas del proyecto | Reportes de la empresa | Tamaño de la base |
|---|---|---|---|---|---|---|---|
| N0 | _Pendiente_ | | | | | | |
| N1 | | | | | | | |
| N2 | | | | | | | |
| N3 | | | | | | | |

## 3. Tabla de tiempos por nivel de volumen

### 3.1 En base de datos (pgbench, 5 clientes, p95 en ms)

La latencia de red hacia Supabase (`00_rtt`) está incluida en cada consulta, una vez por sentencia. Las métricas de proyecto ejecutan siete sentencias en secuencia; la aplicación las lanza en paralelo, así que la cifra es una cota superior.

| Consulta | Endpoint | N0 | N1 | N2 | N3 |
|---|---|---|---|---|---|
| RTT (`SELECT 1`) | — | _Pendiente_ | | | |
| Listado de proyectos | `GET /api/projects` | | | | |
| Métricas de proyecto | `GET /api/projects/:id/metrics` | | | | |
| Listado de reportes | `GET /api/reports` | | | | |
| Resumen de reportes | `GET /api/reports/summary` | | | | |
| Búsqueda de producto en el POS | `GET /api/products?projectId=` | | | | |
| Productos de la empresa | `GET /api/products` | | | | |
| Código de barras en un proyecto (mitigación) | — | | | | |
| Código de barras en la empresa (mitigación) | — | | | | |

### 3.2 Extremo a extremo (k6, 5 usuarios virtuales, p95 en ms)

Umbrales de `docs/plan-maestro-pruebas.md` §7.2: 500 ms para lecturas y 800 ms para el flujo del POS.

| Escenario | Endpoint | Umbral | N0 | N1 | N2 | N3 | Respuesta en N3 |
|---|---|---|---|---|---|---|---|
| V1 | `GET /api/projects` | 500 | _Pendiente_ | | | | |
| V2 | `GET /api/projects/:id/metrics` | 500 | | | | | |
| V3 | `GET /api/reports` | 500 | | | | | |
| V4 | `GET /api/reports/summary` | 500 | | | | | |
| V5 | `GET /api/products?projectId=` | 800 | | | | | |

### 3.3 Generación de reportes y exportaciones a PDF y CSV

Los archivos se construyen en el navegador (`frontend/src/utils/reportExport.js`) a partir de lo que devuelven `/api/reports/summary` y `/api/reports`. Su costo depende de cuántas filas tiene la vista, no de la base. `volume/export-bench.mjs` ejecuta los mismos módulos con ese número de filas. Tiempos en Node, mediana de 3 repeticiones; un navegador en un equipo modesto será más lento, así que son una cota inferior.

| Proyectos | Reportes | Nivel equivalente | JSON descargado | PDF: tiempo | PDF: tamaño | PDF: páginas | CSV: tiempo | CSV: tamaño |
|---|---|---|---|---|---|---|---|---|
| 3 | 1 | N0 | 1 KB | 2 ms | 7 KB | 1 | 0.1 ms | 0.2 KB |
| 13 | 1,001 | N1 | 127 KB | 15 ms | 431 KB | 28 | 0.1 ms | 0.6 KB |
| 53 | 5,001 | N2 | 643 KB | 121 ms | 2.1 MB | 138 | 0.2 ms | 2.4 KB |
| 103 | 10,001 | N3 | 1.3 MB | 219 ms | 4.2 MB | 274 | 0.2 ms | 4.6 KB |
| 200 | 25,000 | — | 3.2 MB | 433 ms | 10.4 MB | 682 | 0.2 ms | 9.0 KB |
| 200 | 50,000 | — | 6.4 MB | 1.1 s | 20.8 MB | 1,358 | 0.3 ms | 9.0 KB |
| 400 | 100,000 | — | 12.7 MB | 2.4 s | 41.6 MB | 2,714 | 0.6 ms | 17.9 KB |

El CSV exporta solo la sección de proyectos (`renderExport`), así que el volumen de reportes no lo afecta. El PDF incluye **todos** los reportes de la empresa, uno por fila: crece de forma lineal en tiempo, tamaño y páginas.

## 4. Verificación de índices

Pendiente del hallazgo 3 de SCRUM-28, que dejó sin comprobar si la búsqueda de producto tiene índice por `codigo_barras` y por `id_proyecto`. `volume/sql/inventory.sql` lo lee del catálogo de la base desplegada y `explain.txt` muestra qué plan usa cada consulta. Lo siguiente se verificó en una base local con el esquema de `kontrol.sql` y el bootstrap a volumen N3; hay que confirmarlo contra Supabase.

| Tabla y columna | Índice que la encabeza | Plan observado a N3 |
|---|---|---|
| `producto.id_proyecto` | `producto_proyecto_id_unique (id_proyecto, id_producto)` | Usa el índice para listar un proyecto |
| `producto.codigo_barras` | Ninguno. Solo el parcial `(id_proyecto, codigo_barras) WHERE codigo_barras IS NOT NULL` | La búsqueda por código dentro de un proyecto tarda 0.02 ms. En toda la empresa tarda 0.9 ms, porque recorre el índice parcial proyecto por proyecto. No hace falta un índice solo por código |
| `presupuesto_actividad.id_proyecto` | **Ninguno** | Seq scan en métricas y en el resumen de reportes |
| `reporte.id_empresa` | `reporte_empresa_fecha_idx` | **No se usa**: el filtro `COALESCE(r.id_empresa, p.id_empresa) = $1` no puede usarlo, y el listado hace seq scan de toda la tabla |
| `tarea.id_proyecto` | `tarea_proyecto_id_unique` | Se usa en métricas. El resumen de reportes hace seq scan de **toda** la tabla, porque agrupa todas las tareas de todas las empresas antes de filtrar por empresa |
| `movimiento_inventario.id_proyecto` | `movimiento_inventario_proyecto_fecha_idx` | Seq scan paralelo en métricas cuando el proyecto concentra el 20% de la tabla. Es la elección correcta del planificador para esa selectividad |

Conclusión sobre el hallazgo 3: la búsqueda de producto **no** carece de índices. El POS no busca por código en el servidor: descarga el inventario completo del proyecto (`GET /api/products?projectId=`, con un JOIN y GROUP BY sobre todos sus movimientos) y resuelve el código en el navegador (`frontend/src/views/InventoryPage.vue:880`). El costo crece con el tamaño del inventario, no por falta de un índice.

## 5. Punto de degradación identificado

_Pendiente de la corrida en Supabase._ Se define como el primer nivel en que el p95 extremo a extremo con 5 usuarios virtuales supera el umbral de §7.2 para ese endpoint.

Para la exportación, el plan maestro no define umbral. Se propone considerar degradada la experiencia cuando el PDF supera los 2 s de generación o las 100 páginas. Con ese criterio, el PDF deja de ser útil a partir de unos 3,600 reportes en la empresa (unos 36 por página): entre N1 y N2, por el número de páginas, mucho antes que por el tiempo.

## 6. Acciones de mitigación

Propuestas a partir del análisis de código y de los planes de ejecución. Se ajustarán con los tiempos de la corrida en Supabase.

| # | Hallazgo | Acción de mitigación | Sprint |
|---|---|---|---|
| 1 | El POS descarga el inventario completo del proyecto para resolver un código | Endpoint de búsqueda por código en el servidor, que ya tiene índice (0.02 ms en N3), y paginar el listado de productos | 9 |
| 2 | `GET /api/reports` no usa su índice y no está paginado | Filtrar por `r.id_empresa = $1`: el bootstrap ya rellena `id_empresa`, así que la columna puede pasar a `NOT NULL`. Paginar la respuesta | 9 |
| 3 | El PDF de la vista de reportes incluye todos los reportes de la empresa | Limitar la sección de reportes del PDF a un rango de fechas o a los más recientes | 9 |
| 4 | El resumen de reportes agrupa las tareas y actividades de todas las empresas | Llevar el filtro por empresa dentro de las subconsultas, o calcularlas con `LATERAL` por proyecto | 9 |
| 5 | `presupuesto_actividad` no tiene índice por `id_proyecto` | `CREATE INDEX` en `bootstrap.js` | 9 |
| 6 | Métricas de proyecto: siete consultas por petición (SCRUM-28, hallazgo 3) | Caché de 30 s de `/api/projects/:id/metrics`, ya propuesta en SCRUM-28 | 10 |
