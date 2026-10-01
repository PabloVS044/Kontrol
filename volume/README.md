# Pruebas de volumen — Sprint 8

Pueblan la base del ambiente de pruebas con volúmenes crecientes y miden
cuánto se degradan las consultas que SCRUM-28 identificó como costosas. Los
resultados y su análisis están en `docs/pruebas-volumen.md`.

A diferencia de `k6/` (carga y estrés: muchos usuarios, pocos datos), aquí
la concurrencia se mantiene normal y lo que crece es la cantidad de datos.

## Contra qué corren

**Solo** contra la base Supabase del ambiente de pruebas de SCRUM-25
(`TEST_DATABASE_URL` en `.env.deploy`, cadena del *Session pooler*).
`lib/guard.sh` se niega a correr si:

- la URL no viene de `VOLUME_DATABASE_URL` (nunca se lee `DATABASE_URL`, así
  que `backend/.env` no puede colarse);
- la URL apunta a la VM `34.121.51.151` (producción y desarrollo) o no es de
  Supabase;
- la base no contiene la empresa sembrada por `seed.js`
  (`contacto@lospinos-test.dev`).

## Requisitos

`psql` y `pgbench` (vienen con PostgreSQL), Node 20+ y, para el escenario
HTTP, k6. En Windows, correr desde Git Bash.

## Secuencia completa

Coordinar antes con quien use el ambiente: las sesiones de UX no deben
coincidir con una base de medio millón de movimientos.

```bash
export VOLUME_DATABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres'

volume/measure.sh N0          # línea base, datos del seed
volume/populate.sh 1 && volume/measure.sh N1
volume/populate.sh 2 && volume/measure.sh N2
volume/populate.sh 3 && volume/measure.sh N3

# Por nivel, justo después de measure.sh (VOLUME_PROJECT_ID lo imprime measure.sh):
k6 run -e VOLUME_PROJECT_ID=<id> --summary-export=volume/results/N1/k6.json k6/volume-test.js

# Independiente de la base:
node volume/export-bench.mjs

# Al terminar, dejar el ambiente como estaba (en la VM):
docker compose -f docker-compose.prod.yml -f docker-compose.test.yml exec backend-test npm run reset:test
```

`populate.sh` es acumulativo: cada nivel inserta solo lo que falta respecto
del anterior, y repetir un nivel no duplica nada. Todo lo generado lleva el
prefijo `VOL` y `reset:test` lo borra.

## Niveles

Filas generadas en toda la base. El 20% de cada tabla va al proyecto
"VOL Proyecto 1" de la empresa de prueba, que es el que se mide; el resto se
reparte entre los demás proyectos VOL de esa empresa y de 20 empresas de
relleno, para que las consultas también tengan que descartar filas ajenas.

| Nivel | producto | movimiento_inventario | venta | tarea | avance | reporte | presupuesto_actividad | proyectos de la empresa |
|---|---|---|---|---|---|---|---|---|
| N1 | 10,000 | 50,000 | 10,000 | 10,000 | 10,000 | 5,000 | 2,000 | 10 |
| N2 | 50,000 | 250,000 | 50,000 | 50,000 | 50,000 | 25,000 | 10,000 | 50 |
| N3 | 100,000 | 500,000 | 100,000 | 100,000 | 100,000 | 50,000 | 20,000 | 100 |
| N4 (opcional) | 200,000 | 1,000,000 | 200,000 | 200,000 | 200,000 | 100,000 | 40,000 | 200 |

N3 ocupa unos 190 MB; revisar el disco del plan de Supabase antes de N4.

## Qué mide cada script

| Script | Endpoint | Origen |
|---|---|---|
| `00_rtt` | ninguno: `SELECT 1` | Latencia de red, para restarla del resto |
| `01_projects_list` | `GET /api/projects` | `projectController.js`, `getProjects` |
| `02_project_metrics` | `GET /api/projects/:id/metrics` | `projectMetricsController.js` |
| `03_reports_list` | `GET /api/reports` | `reportsController.js`, `getReports` |
| `04_reports_summary` | `GET /api/reports/summary` | `reportsController.js`, `getCompanySummary` |
| `05_pos_products_project` | `GET /api/products?projectId=` (búsqueda del POS) | `productController.js`, `getProducts` |
| `06_pos_products_company` | `GET /api/products` (POS, todos los proyectos) | `productController.js`, `getProducts` |
| `07_barcode_in_project` | ninguno hoy: búsqueda por código en un proyecto | Mitigación propuesta |
| `08_barcode_company` | ninguno hoy: búsqueda por código en la empresa | Mitigación propuesta |

Cada script se corre con 1 y con 5 clientes (`VOLUME_BENCH_CLIENTS`) durante
30 s (`VOLUME_BENCH_SECONDS`). Los tiempos se agregan a
`results/tiempos.csv`, y los planes de ejecución a `results/<nivel>/explain.txt`.

## Prueba en seco local

Para validar los scripts sin tocar Supabase, contra un clúster desechable
con `kontrol.sql`, el bootstrap y el seed cargados:

```bash
VOLUME_ALLOW_LOCAL=1 VOLUME_DATABASE_URL=postgresql://postgres@localhost:55432/kontrol volume/populate.sh 1
```

Los tiempos de una corrida local no sirven para el informe: no tienen red
ni los recursos de Supabase.
