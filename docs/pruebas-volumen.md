# Resultados: Pruebas de volumen (Sprint 8)

Pruebas de volumen sobre la base de datos de Kontrol, exigidas por la guía del octavo sprint. Miden cómo se comporta el sistema frente a grandes cantidades de datos con concurrencia normal. Son un tipo de prueba distinto de las de carga y estrés de SCRUM-28 (`docs/pruebas-carga-estres.md`), que midieron el comportamiento frente a muchos usuarios concurrentes con pocos datos.

| Campo | Valor |
|---|---|
| Responsable | Jonathan Tubac (24484) |
| Scripts | `volume/` (población y medición en base de datos), `k6/volume-test.js` (extremo a extremo), `volume/export-bench.mjs` (PDF y CSV). El uso se documenta en `volume/README.md` |
| Ambiente | Base Supabase independiente del ambiente de pruebas de SCRUM-25 (`docs/test-environment.md`). En ningún momento producción ni la base de desarrollo; `volume/lib/guard.sh` lo impone |
| Fecha de la corrida | 27 y 28/09/2026, desde la VM de GCP que aloja el ambiente de pruebas |
| Resultado general | Con concurrencia normal (5 usuarios), el sistema no devuelve errores en ningún nivel, pero se vuelve lento. **El primer punto de degradación es la búsqueda de producto del POS en N2** (10,000 productos en el proyecto: p95 de 1.04 s contra 800 ms). En N3 la sigue el listado de reportes (543 ms contra 500 ms). El resto de los endpoints se mantiene dentro de umbral hasta N3 |
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
| N0 | 3 | 0 (proyecto del seed) | 13 | 2 | 3 | 1 | 13 MB |
| N1 | 13 | 2,000 | 2,657 | 10,000 | 2,000 | 1,001 | 29 MB |
| N2 | 53 | 10,000 | 21,158 | 50,000 | 10,000 | 5,001 | 89 MB |
| N3 | 103 | 20,000 | 51,057 | 100,000 | 20,000 | 10,001 | 167 MB |

La población se hizo con `volume/populate.sh`: N1 tardó 4 s, N2 17 s y N3 27 s. En N3, `movimiento_inventario` ocupa 46 MB de datos y 38 MB de índices, con 500,007 filas.

## 3. Tabla de tiempos por nivel de volumen

### 3.1 En base de datos (pgbench, 5 clientes, p95 en ms)

La latencia de red hacia Supabase (`00_rtt`) está incluida en cada consulta, una vez por sentencia. Las métricas de proyecto ejecutan siete sentencias en secuencia; la aplicación las lanza en paralelo, así que la cifra es una cota superior.

| Consulta | Endpoint | N0 | N1 | N2 | N3 |
|---|---|---|---|---|---|
| RTT (`SELECT 1`) | — | 31.5 | 30.3 | 29.7 | 30.0 |
| Listado de proyectos | `GET /api/projects` | 61.3 | 59.5 | 56.6 | 62.5 |
| Métricas de proyecto | `GET /api/projects/:id/metrics` | 216.9 | 227.6 | 324.7 | 497.0 |
| Listado de reportes | `GET /api/reports` | 31.3 | 34.6 | 61.2 | 124.9 |
| Resumen de reportes | `GET /api/reports/summary` | 31.8 | 36.0 | 70.9 | 152.3 |
| **Búsqueda de producto en el POS** | `GET /api/products?projectId=` | 30.1 | 104.2 | 600.0 | **3,043.2** |
| Productos de la empresa | `GET /api/products` | 31.4 | 56.7 | 341.0 | 628.3 |
| Código de barras en un proyecto (mitigación) | — | 29.1 | 32.1 | 31.0 | 31.8 |
| Código de barras en la empresa (mitigación) | — | 31.8 | 30.7 | 31.7 | 32.2 |

La red hacia Supabase (us-east-2) cuesta unos 30 ms por viaje: en N0 casi todo el tiempo es red. La búsqueda de producto del POS es la que más crece, unas 100 veces de N0 a N3, porque agrega todos los movimientos del proyecto por producto. La búsqueda por código de barras se mantiene plana en todos los niveles, igual que el viaje de red: con índice, el volumen no la afecta. Los datos completos (con 1 cliente, p50, p99 y máximo) están en `volume/results/tiempos.csv`.

Valor atípico registrado: un máximo aislado de 7.5 s en `07_barcode_in_project` (N1, 5 clientes) con p99 de 32.7 ms, atribuible al pooler de Supabase y no a la consulta.

### 3.2 Extremo a extremo (k6, 5 usuarios virtuales, p95 en ms)

Umbrales de `docs/plan-maestro-pruebas.md` §7.2: 500 ms para lecturas y 800 ms para el flujo del POS. Escenarios de 2 minutos en N1 y N2, y de 1 minuto en N3 para limitar el tráfico de salida de Supabase. Resúmenes en `volume/results/<nivel>/k6.json`.

| Escenario | Endpoint | Umbral | N1 | N2 | N3 | Respuesta N1 → N3 | Resultado |
|---|---|---|---|---|---|---|---|
| V1 | `GET /api/projects` | 500 | 80 | 77 | 84 | 5.8 → 8.8 KB | Cumple en todos los niveles |
| V2 | `GET /api/projects/:id/metrics` | 500 | 153 | 199 | 370 | 0.7 KB | Cumple en latencia (ver nota) |
| V3 | `GET /api/reports` | 500 | 185 | 267 | **543** | 176 KB → **1.8 MB** | **No cumple en N3** |
| V4 | `GET /api/reports/summary` | 500 | 79 | 98 | 211 | 5.7 → 43 KB | Cumple en todos los niveles |
| V5 | `GET /api/products?projectId=` | 800 | 265 | **1,040** | **3,690** | 806 KB → **8.1 MB** | **No cumple desde N2** |

La tasa de error fue 0% en todos los escenarios, salvo V2 en N3: 43 de 250 peticiones (17.2%) respondieron en 5 ms con 70 bytes. Esa firma corresponde al rechazo del limitador de DT-13 (`RATE_LIMIT_EXPENSIVE_MAX`, 60 peticiones por minuto por usuario), no a un fallo por volumen: dos usuarios virtuales del escenario coincidieron en la misma cuenta y superaron el límite. Las peticiones atendidas dieron un p95 de 370 ms. `k6/volume-test.js` ya espacia las peticiones a `/metrics` y cuenta los 429 aparte (`rate_limited`).

En N2, la búsqueda de producto del POS descargó 2 GB en 2 minutos con 5 cajeros, unos 4 MB por escaneo. En una conexión de 10 Mbps, típica de un punto de venta, eso son más de 3 s solo de descarga, sin contar la consulta ni el parseo en el navegador.

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

Pendiente del hallazgo 3 de SCRUM-28, que dejó sin comprobar si la búsqueda de producto tiene índice por `codigo_barras` y por `id_proyecto`. `volume/sql/inventory.sql` lo lee del catálogo de la base de pruebas desplegada, y `volume/results/N3/explain.txt` muestra el plan real de cada consulta en N3.

| Tabla y columna | Índice que la encabeza (catálogo de Supabase) | Plan y tiempo en servidor en N3 (`EXPLAIN ANALYZE`) |
|---|---|---|
| `producto.id_proyecto` | `producto_proyecto_id_unique`, `producto_codigo_barras_unique` | Index scan: 20,000 productos del proyecto en 7 ms |
| `producto.codigo_barras` | **Ninguno propio**. Solo el parcial `(id_proyecto, codigo_barras)` | Dentro de un proyecto: index scan en 0.04 ms. En toda la empresa: el mismo índice recorrido en 103 proyectos, 0.5 ms. **No hace falta un índice solo por código** |
| `presupuesto_actividad.id_proyecto` | **Ninguno** | Seq scan en métricas (4,000 filas, 37 ms) y en el resumen de reportes (20,003 filas) |
| `reporte.id_empresa` | `reporte_empresa_fecha_idx` | **No se usa**: con el filtro `COALESCE(r.id_empresa, p.id_empresa) = $1`, el listado hace seq scan de las 50,001 filas de todas las empresas (338 ms) |
| `tarea.id_proyecto` | `tarea_proyecto_id_unique` | Métricas: index scan (109 ms). Resumen de reportes: **seq scan paralelo de toda la tabla**, porque agrupa las tareas de todas las empresas antes de filtrar (337 ms en total) |
| `movimiento_inventario.id_proyecto` | `movimiento_inventario_proyecto_fecha_idx` | Index scan de 100,000 movimientos. Es la sentencia más cara de las métricas (1.1 s en un EXPLAIN en frío) y la base del costo del POS (95,000 movimientos agregados en 401 ms) |

Conclusión sobre el hallazgo 3: la búsqueda de producto **no** carece de índices. El POS no busca por código en el servidor: descarga el inventario completo del proyecto (`GET /api/products?projectId=`, con un JOIN y GROUP BY sobre todos sus movimientos) y resuelve el código en el navegador (`frontend/src/views/InventoryPage.vue:880`). El costo crece con el tamaño del inventario, no por falta de un índice.

## 5. Punto de degradación identificado

Se define como el primer nivel en que el p95 extremo a extremo con 5 usuarios virtuales supera el umbral de §7.2 para ese endpoint.

| Endpoint | Punto de degradación | Volumen en ese punto | Causa |
|---|---|---|---|
| **Búsqueda de producto del POS** | **N2** (p95 1.04 s > 800 ms) | 10,000 productos y 50,000 movimientos en el proyecto; 4 MB por respuesta | Descarga el inventario completo y agrega todos los movimientos por producto en cada escaneo |
| Listado de reportes | N3 (p95 543 ms > 500 ms) | 10,001 reportes en la empresa; 1.8 MB por respuesta | Sin paginación y sin uso del índice por empresa |
| Métricas de proyecto | No se alcanzó en N3 (370 ms) | 20,000 tareas y 100,000 movimientos | Crece de forma sostenida (153 → 370 ms). Por extrapolación lineal, cruzaría los 500 ms con unas 30,000 tareas y 150,000 movimientos por proyecto |
| Resumen de reportes, listado de proyectos | No se alcanzó | — | El listado está paginado. El resumen crece con el volumen **de todas las empresas** (79 → 211 ms), aunque la empresa medida no cambie |

**Umbral práctico de la aplicación:** con la implementación actual, el punto de venta cruza los 800 ms a partir de unos 7,500 productos por proyecto (interpolando entre N1 y N2). Es un tamaño normal para una ferretería, que es el cliente de referencia del ambiente de pruebas.

Para la exportación, el plan maestro no define umbral. Se propone considerar degradada la experiencia cuando el PDF supera los 2 s de generación o las 100 páginas. Con ese criterio, el PDF deja de ser útil a partir de unos 3,600 reportes en la empresa (unos 36 por página): entre N1 y N2, por el número de páginas, mucho antes que por el tiempo.

## 6. Acciones de mitigación

Ordenadas por impacto medido. Los sprints son una propuesta para el backlog.

| # | Hallazgo | Acción de mitigación | Sprint |
|---|---|---|---|
| 1 | El POS descarga el inventario completo del proyecto para resolver un código: degrada desde N2 | Endpoint de búsqueda por código en el servidor: medido en unos 30 ms en todos los niveles, frente a 3 s. Paginar el listado de productos y calcular entradas y salidas solo en la vista de detalle | 9 |
| 2 | `GET /api/reports` no usa su índice y no está paginado: degrada en N3 | Filtrar por `r.id_empresa = $1`: el bootstrap ya rellena `id_empresa`, así que la columna puede pasar a `NOT NULL`. Paginar la respuesta | 9 |
| 3 | El PDF de la vista de reportes incluye todos los reportes de la empresa | Limitar la sección de reportes del PDF a un rango de fechas o a los más recientes | 9 |
| 4 | El resumen de reportes agrupa las tareas y actividades de todas las empresas | Llevar el filtro por empresa dentro de las subconsultas, o calcularlas con `LATERAL` por proyecto | 9 |
| 5 | `presupuesto_actividad` no tiene índice por `id_proyecto` | `CREATE INDEX` en `bootstrap.js` | 9 |
| 6 | Métricas de proyecto: siete consultas por petición (SCRUM-28, hallazgo 3), y la agregación de movimientos es la más cara | Caché de 30 s de `/api/projects/:id/metrics`, ya propuesta en SCRUM-28 | 10 |
| 7 | La base de pruebas corre el esquema de `main` del 07/09, sin la cabecera de venta que ya tiene `develop` | Desplegar `develop` en el ambiente de pruebas y repetir N2 con `venta` poblada, para medir el flujo de venta con el esquema vigente | 9 |

## 7. Limitaciones

- **Red:** las mediciones se tomaron desde la VM de GCP (us-central) hacia Supabase (us-east-2), a unos 30 ms por viaje, que es la misma ruta que usa `backend-test`. Los tiempos del listado de reportes y del POS incluyen el costo de transferir respuestas de varios MB.
- **Instancia de Supabase:** es la del ambiente de pruebas, no la de producción, que corre PostgreSQL dentro de la VM. En producción no habría latencia de red hacia la base, pero la CPU es compartida (SCRUM-28, hallazgo 4). La tendencia y el punto de degradación son comparables; los milisegundos absolutos no.
- **N3 con escenarios de 1 minuto:** reduce el número de muestras (100 a 285 peticiones por escenario), suficiente para un p95 estable.
- **N0 sin k6:** la línea base extremo a extremo no se corrió; la de base de datos (pgbench) sí.
- **Exportación:** medida en Node, no en un navegador.
