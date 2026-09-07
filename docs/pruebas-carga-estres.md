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
| Fecha de la corrida de estrés | 07/09/2026, misma sesión, VM ya subida a ~3.8GB RAM |
| Estado | Carga (C1-C5): **completa**. Estrés (E1-E5): **completa** |
| Decisión de infraestructura | Se mantiene la VM en 2 vCPU (decisión explícita, no accidental) — ver §4 |

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

Un escenario a la vez, cada uno partiendo del VU máximo de su C-n
correspondiente y escalando 25% cada 2 minutos (§8.1) hasta la condición de
parada de §8.2 — en la práctica, el umbral de p95 (3× el de §7.2) abortó
cada corrida automáticamente vía `abortOnFail` de k6, nunca la tasa de error
ni el techo de seguridad de 500 VUs. **0% de tasa de error en las 5
corridas** — igual que en carga, el sistema nunca devuelve error, solo se
vuelve progresivamente más lento hasta el punto de degradación.

| Caso | Escenario | VUs base (C-n) | Punto de degradación | Tiempo hasta abortar | p95 al abortar |
|---|---|---|---|---|---|
| E1 | Login | 50 | **50 VUs** (el propio nivel base) | 32s | 2.20s (umbral: 900ms) |
| E2 | Proyectos + métricas | 100 | **125 VUs** | 4m28s | 1.50s (umbral: 1500ms) |
| E3 | Avance de proyecto | 30 | **≈232 VUs** | 19m32s | 2.40s (umbral: 2400ms) |
| E4 | Reportes (export) | 20 | **≈124 VUs** | 17m00s | 2.41s (umbral: 2400ms) |
| E5 | Búsqueda + venta POS | 40 | **40 VUs** (el propio nivel base) | 1m06s | 2.42s (umbral: 2400ms) |

**El punto de degradación reproduce exactamente el patrón de la carga (§2):**
los dos escenarios que ya fallaban su umbral en carga normal (login, venta)
colapsan bajo estrés apenas al nivel base, sin necesitar ningún escalón de
más — el sistema ya estaba en su límite antes de que el estrés lo empujara.
Los dos que pasaban limpio en carga (avance, export de reporte) aguantan
entre 4x y 6x su concurrencia normal antes de degradar. Proyectos+métricas,
que en carga fallaba por poco (1.91s vs 500ms), degrada a apenas 1.25x su
nivel de carga — el margen que tenía era pequeño.

En ningún momento se observó una petición fallida, un timeout, ni el
health check del backend de pruebas dejando de responder — la degradación
es puramente de latencia, consistente con un cuello de botella de CPU
compartida entre VUs concurrentes, no con un error de aplicación, fuga de
memoria, ni agotamiento de conexiones a la base de datos.

## 4. Hallazgos y acciones de mitigación

**Decisión tomada sobre la VM:** se mantiene en 2 vCPU. No se sube a 4 vCPU
como se había evaluado en la versión anterior de este documento — la
corrida de estrés se hizo igual, con este límite aceptado de forma
explícita, no por omisión.

| # | Hallazgo | Causa raíz | Acción de mitigación propuesta |
|---|---|---|---|
| 1 | C1, C2, C4-listado y C5 superan su umbral de p95 bajo carga sostenida; E1, E2, E4 y E5 degradan en estrés a un nivel de concurrencia bajo (40-125 VUs) — todo con 0% de errores | CPU insuficiente (2 vCPU, decisión aceptada) para el costo combinado de `bcrypt.compare` en cada login y las consultas con agregación/joins de proyectos, métricas, reportes y venta, bajo concurrencia | Con 2 vCPU fijo como restricción de presupuesto, la mitigación pasa de "más CPU" a reducir el costo por petición: cachear agregaciones (acción 3), y evaluar `SALT_ROUNDS` más bajo específicamente en el ambiente de pruebas (no en producción) para que el costo de bcrypt no domine la medición de login. Si se reconsidera el presupuesto más adelante, subir a 4 vCPU sigue siendo la mitigación más directa — documentado aquí para cuando aplique |
| 2 | La subida de RAM (de ~1GB a ~3.8GB) mejoró el resultado (40.24s → 4.99s en C1) pero no bastó para pasar el umbral, ni en carga ni en estrés | RAM no era el limitante real; el primer intento fallaba tan mal que enmascaraba que el problema de fondo es CPU | Confirmado por el patrón de §2 y §3: las operaciones baratas en CPU (C3/E3, C4-export/E4 con más margen que el resto) aguantan varias veces su concurrencia normal; las caras en CPU o en número de consultas (C1/E1, C2/E2, C5/E5) degradan casi de inmediato. No repetir el diagnóstico de RAM — ya está cerrado |
| 3 | C2 y C5 hacen más de una consulta por petición de usuario (proyectos+métricas; búsqueda+venta), y son los que menos margen tienen antes de degradar (E2 a solo 1.25x su carga normal) | El costo se multiplica por consulta bajo concurrencia, no solo por petición HTTP | Cachear `GET /api/projects/:id/metrics` con una ventana corta (p. ej. 30s), dado que es una agregación que no cambia petición a petición; para C5/E5, confirmar que la búsqueda de producto (`GET /api/products`) tiene índice por `codigo_barras` y `id_proyecto` — no verificado en esta corrida |
| 4 | El primer intento de carga (VM sin subir) degradó producción real: un health check pasó de instantáneo a 2.9s mientras corría la prueba, por compartir los mismos 2 vCPU entre `backend-test` y los contenedores de producción. Con la VM ya subida, ni carga ni estrés volvieron a afectar producción (monitoreado en cada corrida) | VM única para prod y test, sin límites de CPU por contenedor (`docker compose` no fija `cpus:` en ninguno de los dos archivos) | Fijar un límite de CPU explícito por contenedor (`deploy.resources.limits.cpus`) en `docker-compose.test.yml`, para que una corrida futura no pueda volver a robarle CPU a producción si la VM vuelve a quedar justa de recursos. Vale más ahora que se decidió quedarse en 2 vCPU compartidos — no implementado en esta tarea, queda como deuda técnica de infraestructura |
| 5 | E1 y E5 degradan en su propio nivel base, sin necesitar ningún escalón de estrés adicional — el sistema ya estaba en su límite bajo carga normal, no solo bajo estrés | Mismo cuello de botella de CPU que el hallazgo 1, más agudo en estos dos por ser los de mayor costo por petición (bcrypt; búsqueda+transacción con `FOR UPDATE`) | Prioridad más alta de los dos: son los dos endpoints donde un uso real y no simulado (login al iniciar el día, ventas en punto de venta) ya rozaría el límite actual. Atender antes que C2/E2, que tiene más margen |

## 5. Próximos pasos

1. Decidir sobre la acción de mitigación 1/3 (cachear métricas, revisar índices, considerar `SALT_ROUNDS` de prueba) — la VM se queda en 2 vCPU.
2. Evaluar la acción 4 (límite de CPU por contenedor en `docker-compose.test.yml`) como tarea de infraestructura aparte.
3. Re-correr C1/C5 (y sus E1/E5) después de aplicar alguna mitigación, para confirmar que el margen mejora.
