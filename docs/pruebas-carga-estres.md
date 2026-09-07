# Resultados — Pruebas de carga y estrés (SCRUM-28)

Implementa los escenarios definidos en `docs/plan-maestro-pruebas.md` §7
(carga) y §8 (estrés). Este documento es el entregable de resultados que
pide SCRUM-28: tabla por escenario, punto de degradación, y acciones de
mitigación para los cuellos de botella detectados.

| Campo | Valor |
|---|---|
| Ticket | [SCRUM-28](https://kontroldevelopment.atlassian.net/browse/SCRUM-28) |
| Scripts | `k6/load-test.js`, `k6/stress-test.js` (`k6/README.md` documenta el uso) |
| Ambiente | Test de SCRUM-25 (`docs/test-environment.md`), nunca producción |
| Fecha de la corrida de carga | 07/09/2026 |
| Estado | Carga (C1-C5): **completa**. Estrés (E1-E5): **pendiente**, ver §3 |

## 1. Ambiente de ejecución

VM de GCP, 2 vCPU, ~3.8 GB RAM (subida desde ~1 GB, e2-micro, durante esta
misma tarea — ver riesgo 1 en §4). Se comparte con el stack de producción en
la misma máquina, contenedores separados; `backend-test` corre en el
contenedor separado del ambiente de pruebas, base de datos Supabase
independiente de producción.

**Primer intento, VM sin subir (~1 GB RAM):** C1 (login, 50 VUs) colapsó a
p95=40.24s antes de que se completara su propia ventana de 6 minutos, y
`backend-test` saturó el 100% de los 2 vCPU disponibles al punto de medirse
un health check de **producción** en 2.9s en vez de instantáneo — degradación
real medida, no solo del ambiente de pruebas. Se abortó esa corrida de
inmediato y se subió la RAM de la VM antes de reintentar. Con más RAM el
resultado mejoró sustancialmente (ver §2) pero no lo suficiente para pasar
los umbrales — evidencia de que el cuello de botella es CPU, no memoria.

## 2. Resultados de carga (C1-C5)

Corrida completa, secuencial, 40 minutos. **0% de tasa de error en 56,327
peticiones** — ninguna petición devolvió un error de servidor ni expiró por
tiempo de espera, en ningún escenario. Lo que falla es latencia, no
disponibilidad.

| Caso | Escenario | VUs / perfil | Peticiones | Throughput aprox. | p95 real | Umbral (§7.2) | Tasa de error | Resultado |
|---|---|---|---|---|---|---|---|---|
| C1 | Login (`POST /api/auth/login`) | Rampa 0→50, sostenido 6min | 4,505 | ~12.5 req/s | **4.99s** | ≤300ms | 0.00% | ✗ |
| C2 | Proyectos + métricas | 100 VUs sostenidos, 10min | 31,844 | ~53.1 req/s | **1.91s** | ≤500ms | 0.00% | ✗ |
| C3 | Avance de proyecto (escritura) | Rampa 0→30, sostenido 6min | 7,790 | ~21.6 req/s | 300ms | ≤800ms | 0.00% | ✓ |
| C4 (listado) | `GET /api/reports` | 20 VUs sostenidos, 10min | — | — | **620ms** | ≤500ms | 0.00% | ✗ |
| C4 (export) | `POST /api/reports/exports` | 20 VUs sostenidos, 10min | 2,420 (par) | ~4.0 req/s | 303ms | ≤800ms | 0.00% | ✓ |
| C5 | Búsqueda + venta POS | 40 VUs sostenidos, 8min | 9,766 | ~20.4 req/s | **2.61s** | ≤800ms | 0.00% | ✗ |

**4 de 6 mediciones fallan el umbral de latencia; 0 fallan por errores o
caídas.** El patrón es consistente: lo que falla es login (`bcrypt.compare`,
intensivo en CPU) y las lecturas/escrituras que hacen más de una consulta o
un cálculo agregado por petición (proyectos+métricas, listado de reportes,
búsqueda+venta). Lo que pasa limpio es una escritura de una sola fila
(avance, exportación de reporte) — operación barata en CPU y en consultas.

## 3. Pruebas de estrés (E1-E5)

**Pendiente de ejecutar.** No se corrieron en esta sesión: dado que la carga
ya identificó el cuello de botella real (CPU de la VM, no el código), correr
estrés ahora repetiría el mismo hallazgo con más riesgo para el ambiente
compartido, sin agregar información nueva hasta no decidir si se sube CPU o
se acepta el límite actual. Se coordina como corrida aparte una vez resuelto
el riesgo 1 de §4.

## 4. Hallazgos y acciones de mitigación

| # | Hallazgo | Causa raíz | Acción de mitigación propuesta |
|---|---|---|---|
| 1 | C1, C2, C4-listado y C5 superan su umbral de p95 bajo carga sostenida, aunque con 0% de errores | CPU insuficiente (2 vCPU) en la VM del ambiente de pruebas para el costo combinado de `bcrypt.compare` en cada login y las consultas con agregación/joins de proyectos, métricas, reportes y venta, bajo concurrencia | Subir a 4 vCPU (o el nivel que el presupuesto permita) para la VM de pruebas antes de repetir la medición; si el resultado se mantiene aun con más CPU, considerar `SALT_ROUNDS` más bajo específicamente en el ambiente de pruebas (no en producción) para no medir el costo de bcrypt como cuello de botella de infraestructura |
| 2 | La subida de RAM (de ~1GB a ~3.8GB) mejoró el resultado (40.24s → 4.99s en C1) pero no bastó para pasar el umbral | RAM no era el limitante real; el primer intento fallaba tan mal que enmascaraba que el problema de fondo es CPU | Confirmado por el patrón de §2: las operaciones baratas en CPU (C3, C4-export) pasan cómodo; las caras en CPU o en número de consultas (C1, C2, C4-listado, C5) no. Ver acción 1 |
| 3 | C2 y C5 hacen más de una consulta por petición de usuario (proyectos+métricas; búsqueda+venta) | El costo se multiplica por consulta bajo concurrencia, no solo por petición HTTP | Evaluar cachear `GET /api/projects/:id/metrics` con una ventana corta (p. ej. 30s), dado que es una agregación que no cambia petición a petición; para C5, confirmar que la búsqueda de producto (`GET /api/products`) tiene índice por `codigo_barras` y `id_proyecto` — no verificado en esta corrida |
| 4 | El primer intento de carga (VM sin subir) degradó producción real: un health check pasó de instantáneo a 2.9s mientras corría la prueba, por compartir los mismos 2 vCPU entre `backend-test` y los contenedores de producción | VM única para prod y test, sin límites de CPU por contenedor (`docker compose` no fija `cpus:` en ninguno de los dos archivos) | Fijar un límite de CPU explícito por contenedor (`deploy.resources.limits.cpus`) en `docker-compose.test.yml`, para que una corrida de carga futura no pueda volver a robarle CPU a producción aunque la VM vuelva a estar justa de recursos — no implementado en esta tarea, queda como deuda técnica de infraestructura |
| 5 | Estrés (E1-E5) sigue sin ejecutarse | Decisión deliberada, ver §3 | Ejecutar una vez resuelta la acción 1, para no repetir el mismo hallazgo de CPU con mayor riesgo |

## 5. Próximos pasos

1. Decidir sobre la acción de mitigación 1 (subir CPU de la VM de pruebas) antes de reintentar carga o de correr estrés.
2. Correr E1-E5 una vez resuelto lo anterior, y completar §3 de este documento.
3. Actualizar la matriz de trazabilidad §19.4 de `docs/plan-maestro-pruebas.md`: C1-C5 pasan de Pendiente a Cubierto (con el resultado real, no todos en verde), E1-E5 quedan Pendiente hasta el punto 2.
