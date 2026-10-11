# Resultados: Regresión de seguridad y de volumen tras DT-15 (Sprint 9)

Repetición de las dos baterías no funcionales del Sprint 8 —OWASP ZAP (`docs/pruebas-seguridad-zap.md`) y volumen (`docs/pruebas-volumen.md`)— con el mismo perfil y el mismo conjunto de datos, después de DT-15. El objetivo es un antes y un después medible: qué hallazgos del Sprint 8 quedaron resueltos, cuáles siguen abiertos y por qué.

| Campo | Valor |
|---|---|
| Ambiente | Ambiente de pruebas de SCRUM-25, `https://test.34.121.51.151.nip.io`, base Supabase de pruebas (`TEST_DATABASE_URL`). En ningún momento producción |
| Código evaluado | `develop` @ `28f5580`, desplegado el 10/10/2026 con `scripts/deploy.sh` (incluye DT-15, PR #136, y todo lo mergeado a `develop` desde el Sprint 8, entre otros el PR #139) |
| Línea de comparación | Sprint 8: `develop` @ `ae99f0f` (ZAP, 26/09/2026) y `main` del 07/09 (volumen, 27–28/09/2026) |
| Cuenta usada en ZAP | `reserva@kontrol-test.dev`, rol de empresa `manager`, igual que en el Sprint 8 |
| Fecha | Seguridad: 10/10/2026, desde las 05:55 UTC. Volumen: 11/10/2026, de 06:23 a 07:22 UTC |

## 1. Herramientas, versiones y perfil

| Batería | Herramienta | Versión exacta | Perfil |
|---|---|---|---|
| Seguridad, pasivo | OWASP ZAP, Automation Framework, en Docker desde una máquina del equipo | ZAP **2.17.0**, imagen `zaproxy/zap-stable@sha256:781a2bdaea47324e7bab583e2263f21d257b0aee61ed51521a5be45f5f5081ef`, OpenJDK 17.0.20 | `zap/plans/passive.yaml` sin cambios: 45 GET autenticados + spider del SPA (3 min, profundidad 5) |
| Seguridad, activo | Igual | Igual | `zap/plans/active.yaml` sin cambios: solo `/api`, fuerza y umbral medios, 2 hilos, 100 ms entre peticiones, tope de 60 min, reglas 30001, 30002 y 10104 desactivadas, mismas exclusiones |
| Seguridad, dirigida | `zap/verify-controls.sh` (curl + jq) | curl del sistema | `headers`, `ssrf`, `ssrf-redirect`, `ratelimit` como en el Sprint 8, más `timeout` (nuevo, para DT-15) |
| Dependencias | `npm audit` | npm 11.7.0, Node 24.12.0 | Lockfiles de `develop` @ `28f5580` (raíz, backend, frontend) |
| Volumen, base de datos | pgbench, en un contenedor efímero en la VM | **pgbench 17.11 (Debian 17.11-1.pgdg13+2)**, imagen `postgres@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3`; servidor PostgreSQL 17.6 (Supabase). Misma versión de pgbench que en el Sprint 8 | `volume/populate.sh` y `volume/measure.sh` sin cambios: niveles N0–N3, 9 scripts, 1 y 5 clientes, 30 s cada uno |
| Volumen, extremo a extremo | k6, en un contenedor efímero en la VM | **k6 v2.3.0** (go1.27.1), imagen `grafana/k6@sha256:e66db15b860113878fa74670e31f5e274830b7b6e42c8bff28b2f2d86a257603`. El Sprint 8 no registró su versión de k6 | `k6/volume-test.js` sin cambios, 5 VUs, escenarios V1–V5, **1 minuto por escenario en todos los niveles** (Sprint 8: 2 min en N1 y N2, 1 min en N3) |

**Sobre la versión de ZAP del Sprint 8:** el informe del Sprint 8 registró la imagen `zaproxy/zap-stable` sin etiqueta ni digest. La imagen usada ahora es la que está en la máquina desde la que se corrió el Sprint 8, creada el 07/08/2026, es decir, anterior a aquel escaneo. Es muy probable que sea la misma, pero no está demostrado. Desde este informe la versión queda fijada por digest.

## 2. Hipótesis registrada antes de medir

Escrita antes de lanzar cualquier escaneo, para que la comparación no se acomode al resultado:

- **ZAP:** DT-15 no debería cerrar ninguno de los hallazgos del Sprint 8. Los diez se asignaron a DT-18, DT-19, DT-20 y DT-21, que no están mergeados. Timeouts salientes, pool de Postgres y TLS hacia la base no son observables desde un DAST.
- **Volumen (pgbench):** sin cambio, porque pgbench va directo a la base y no pasa por el pool del backend.
- **Volumen (k6):** sin cambio significativo. Con 5 usuarios virtuales el pool de 10 no se satura.
- **Lo que DT-15 sí debería cerrar, y se verifica de forma dirigida:** timeout de 10 s en la salida HTTP, pool con `max` explícito y conexión a la base con el certificado verificado.

## 3. Ejecución de la batería de seguridad

| Fase | Inicio (UTC) | Duración | Sprint 8 |
|---|---|---|---|
| Línea base de producción (`monitor-prod.sh baseline 120`) | 05:55 | 2 min | — |
| Pasivo | 05:58 | 36 s | 37 s |
| Activo | 06:02 | 16 min 59 s (job `activeScan`: 16 min 35 s) | 13 min 58 s |
| Reset (falló, ver hallazgo nuevo N2) | 06:22 | 1 s | — |
| Verificación dirigida: cabeceras | 06:22 | 2 s | ~1 min |
| Reset con `seed.js` corregido | 06:24 | 7 s | 8 s |
| Verificación dirigida: SSRF, redirección, timeout | 06:25 | ~1 min | ~1 min |
| Verificación dirigida: límite de intentos | 06:26 | ~20 s | 30 s |
| Reset final | 06:26 | 7 s | — |

Las verificaciones de SSRF, redirección y timeout se lanzaron primero a las 06:22 y fallaron por orden de ejecución: el activo había creado `ZAP scan company` con `reserva@` como owner, y la API permite una empresa por owner. En el Sprint 8 el SSRF corrió antes del activo. Se repitieron tras el reset; las corridas fallidas no se versionan.

**Impacto en producción:** sin impacto medible. Línea base: mediana de 0.407 s y p95 de 0.411 s. Durante el activo, 202 muestras del health de producción sin ninguna respuesta distinta de 200 (máximo 0.643 s, media 0.345 s), y en 67 muestras de `docker stats` una CPU máxima del backend de producción de 1.48 %, un load average máximo de 0.47 y el disco estable en 1.4 GB libres. No se disparó ninguna condición de abort (`monitor-active-*.csv`).

## 4. Comparativa Sprint 8 → Sprint 9 (seguridad)

Una fila por hallazgo del Sprint 8, con la numeración de `docs/pruebas-seguridad-zap.md` §3 y §6. Estado: **resuelto** = ya no se reproduce; **mitigado** = el riesgo bajó pero la causa sigue; **abierto** = se reproduce igual.

| # S8 | Hallazgo | Severidad | Estado S9 | Qué cambio lo resolvió | Evidencia S9 |
|---|---|---|---|---|---|
| 1 | Guard SSRF no bloquea `0.0.0.0` ni IPv6 mapeada a IPv4 | Alta | **Abierto** | Ninguno (DT-18 sin mergear) | `verify-ssrf-*.txt`: ambas filas `REACHED`, `El webhook respondió con status 404.` |
| 2 | El probador sigue redirecciones 302 hacia `127.0.0.1` | Alta | **Abierto** | Ninguno (DT-18) | `verify-ssrf-redirect-*.txt`: `Conexión exitosa.` |
| 3 | El HTML del SPA (nginx) sin cabeceras de seguridad | Media | **Abierto** | Ninguno (DT-19) | `verify-headers-*.txt`: 0/5 sobre `/`; ZAP 10038, 10020, 10021, 10035 en el pasivo |
| 4 | `sendWebhookEvent` sin guard SSRF; sin defensa contra DNS rebinding | Media | **Abierto** | Ninguno. DT-15 le añadió timeout, pero no el guard | Revisión estática de `backend/src/services/webhookService.js` en `28f5580`: usa `fetchWithTimeout` y no llama a `assertPublicHttpUrl` |
| 5 | `helmet` aplicado dos veces; la CSP efectiva no es la configurada | Baja | **Abierto** | Ninguno (DT-19) | `helmet(` en `index.js:42` y `security.middleware.js:7`; CSP con `frame-ancestors 'self'` en `verify-headers-*.txt` |
| 6 | Entrada sin validar produce 500 (`X-Company-ID` no entero, `POST /api/inventory-movements`) | Baja | **Abierto** | Ninguno (DT-20) | 114 errores `invalid input syntax for type integer` en `POST /api/inventory-movements` durante el activo, la misma cifra que en el Sprint 8; `X-Company-ID: abc` → HTTP 500 |
| 7 | HTML sin sanear guardado en campos de texto libre | Baja | **Abierto** | Ninguno (DT-20, Sprint 10) | ZAP 40014, 7 instancias, igual que en el Sprint 8 |
| 8 | `Server: nginx/1.31.6` expone la versión | Baja | **Abierto** | Ninguno (DT-19) | ZAP 10036 en pasivo y activo |
| 9 | Respuestas de la API sin `Cache-Control: no-store` | Baja | **Abierto** | Ninguno (DT-19) | ZAP 10015 en pasivo y activo |
| 10 | Corrida de pasivo con `${COMPANY_ID}` literal (defecto del escaneo) | Informativa | **Resuelto** | `envsubst` en `zap/run-zap.sh` y aserciones `responseCode: 200` en los planes (Sprint 8) | Pasivo y activo pasaron las aserciones de 200; ids resueltos en `run-zap.sh` |
| §4.1 | Cinco cabeceras en respuestas del backend (SEC2) | Control | **Se mantiene** | DT-14 (Sprint 8) | `verify-headers-*.txt`: 5/5 en `/api/health` y `/api/auth/me` |
| §4.2 | Límite de intentos (SCRUM-44) | Control | **Se mantiene** | DT-13 (Sprint 8) | `verify-ratelimit-*.txt`: 19 × 429 de 20; `X-Forwarded-For` falsificado → 3 × 429 |
| §5 | `npm audit`, raíz: 0 críticas, 3 altas | — | **Empeoró** | — | Ver hallazgo nuevo N3 |
| §6 | Producción corre `main` del 07/09 sin las mitigaciones del sprint | Infra | **Resuelto** | Despliegue de `develop` @ `28f5580` en producción el 10/10/2026 | `/api/health` de producción con el campo `db` de DT-15 |
| §6 | MongoDB Atlas compartido no resuelve DNS | Infra | **Resuelto** | Cluster reactivado (fuera del código) | Log de `backend-test`: `MongoDB connected` |
| §6 | Disco de la VM al 98 % | Infra | **Mitigado** | Limpiezas manuales de caché de build; DT-21 sin implementar | 83 % antes del despliegue; durante el build bajó a 923 MB libres; 84 % al terminar |
| §6 | `deploy.sh` no puede actualizar solo el ambiente de pruebas | Infra | **Abierto** | Ninguno (DT-21) | Este despliegue llevó `develop` también a producción |
| §6 | El Supabase de pruebas se pausa por inactividad | Infra | **Abierto** | Ninguno | No ocurrió en esta corrida |

**Alertas crudas de ZAP:** pasivo, 0 altas, 4 medias, 4 bajas y 2 informativas; activo, 0 altas, 0 medias, 2 bajas y 3 informativas. Las dos tablas de alertas son **idénticas** a las del Sprint 8 (mismo nombre, riesgo y número de instancias). Lo único que cambió es el porcentaje de respuestas lentas que reporta ZAP: 91 % en el pasivo (78 % en el Sprint 8) y 82 % en el activo (51 %), y la duración del activo, que pasó de 13 min 58 s a 16 min 35 s. Ver sección 5.

**Contraste con la hipótesis:** se cumplió. Ningún hallazgo de ZAP cambió de estado por DT-15; los tres que cambiaron (10 y dos de infraestructura) lo hicieron por causas ajenas a DT-15.

### 4.1 Verificación dirigida de DT-15

Lo que DT-15 sí debía cerrar, medido sobre el ambiente desplegado:

| Criterio de DT-15 | Estado | Evidencia |
|---|---|---|
| Timeout en las llamadas salientes de integraciones | **Resuelto** | `verify-timeout-*.txt`: con el webhook apuntando a `https://httpbin.org/delay/10` (responde a ~10.5 s), tres intentos terminan en 10.64–10.74 s (ida y vuelta) con `El servicio externo no respondió en 10000 ms.`. Sin el envoltorio, el probador habría esperado la respuesta y devuelto `Conexión exitosa.` |
| Pool de Postgres con `max`, `connectionTimeoutMillis` e `idleTimeoutMillis` explícitos | **Resuelto** | `GET /api/health` → `{"status":"ok","db":{"total":0,"idle":0,"waiting":0,"max":10}}`. `max` explícito y observable; los dos timeouts no se exponen por HTTP y se verificaron en código (`poolConfig.js`) |
| TLS hacia la base con verificación del certificado | **Resuelto** | El backend conecta a Supabase con `rejectUnauthorized: true` y la CA `Supabase Root 2021 CA` (SHA-256 `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`, misma huella en la CA publicada por Supabase y en la cadena que presenta el servidor). `openssl s_client -CAfile … -verify_hostname` → `Verify return code: 0 (ok)`; login de prueba → 200, que necesita la base |

Las seis integraciones pasan por `fetchWithTimeout` en el código (`webhook`, `slack`, `teams`, `telegram`, `twilioSms`, `sendgrid`). La prueba dirigida ejercita solo el webhook, porque es la única integración que acepta una URL arbitraria; las otras cinco apuntan a dominios fijos de terceros.

## 5. Hallazgos nuevos (no estaban en el Sprint 8)

| # | Hallazgo | Severidad | Evidencia | Acción propuesta | Sprint |
|---|---|---|---|---|---|
| N1 | `scripts/deploy.sh` interpola los secretos (incluida la URL de la base de pruebas con su contraseña) dentro del comando remoto: durante el build, cualquier usuario de la VM los ve en `ps` | Media | Observado en la lista de procesos de la VM durante el despliegue del 10/10/2026; el valor no se copió a ningún archivo | Enviar el `.env` por `scp` o por stdin en lugar de incrustarlo en el comando; rotar la contraseña de la base de pruebas | 9 |
| N2 | `reset:test` y `seed:test` no arrancan en `develop`: el merge `6354cbb` dejó `ensureProveedor` declarada dos veces en `seed.js` (`SyntaxError`). El ambiente de pruebas no se podía restablecer desde ese merge | Media (operativa) | `reset-20261010T062259Z.txt` | Corregido en `fix(db): merge the duplicate ensureProveedor in the seed`, pendiente de merge. Mientras tanto, el reset se ejecutó con una copia temporal corregida dentro del contenedor, que se borró después | 9 |
| N3 | `npm audit` empeora: raíz con 2 críticas (`shell-quote` vía `concurrently`, nuevo aviso de inyección de comandos con un fin de línea), 9 altas y 2 moderadas; backend y frontend con 9 altas y 2 moderadas. Se suma la cadena `tailwindcss` → `chokidar`/`fast-glob` → `micromatch`/`braces` (DoS por patrones anidados) y `source-map-js`. La cadena `uploadthing` → `effect` del Sprint 8 sigue igual | Alta | `npm audit --json` sobre los lockfiles de `28f5580` | `npm audit fix` para lo que no exige versión mayor (`concurrently`, `shell-quote`, `fast-glob`, `source-map-js`, `postcss-nested`); evaluar `tailwindcss@4` y `uploadthing` mayor dentro de DT-08 | 9 (sin cambio mayor), 10 (mayores) |
| N4 | Respuestas lentas según ZAP: 91 % en el pasivo (78 % en S8) y 82 % en el activo (51 %); el activo tardó 2 min 37 s más | Informativa | Insights de `passive-summary.md` y `active-summary.md` | No concluyente: la red de origen y la carga de Supabase no están controladas. La batería de volumen (sección 6) no muestra una degradación general del backend, así que no se atribuye a DT-15 | — |

## 6. Batería de volumen

### 6.1 Condiciones de ejecución

Mismos niveles, mismos scripts y misma base Supabase de pruebas que en el Sprint 8, desde la VM de GCP (misma ruta de red hacia Supabase us-east-2, unos 30 ms por viaje). Ámbito medido idéntico al del Sprint 8 en cada nivel: en N3, 103 proyectos de la empresa, 20 000 productos y 100 000 movimientos en el proyecto caliente y 10 001 reportes (`inventario.txt`).

Diferencias respecto del Sprint 8, todas a tener en cuenta al leer la comparación:

| Diferencia | Sprint 8 | Sprint 9 | Efecto esperado |
|---|---|---|---|
| Esquema de la base | `main` del 07/09, sin tabla `venta` | `develop` @ `28f5580`, con `venta`: `populate.sql` genera 10 000 / 50 000 / 100 000 ventas | Base más grande (191 MB contra 167 MB en N3). Ninguna consulta medida lee `venta` |
| Código del backend | `main` del 07/09 | `develop` @ `28f5580` (DT-15 y todo lo mergeado desde entonces) | El SQL de pgbench es fijo y no depende del código; k6 sí lo ejercita |
| Duración de cada escenario k6 | 2 min (N1, N2), 1 min (N3) | 1 min en todos; N2 repetido también con 2 min | Menos muestras y menos tráfico sostenido; elegido para reducir el consumo de la VM y el tráfico de salida de Supabase. La repetición de N2 a 2 min muestra que la duración sí afecta a V5 (6.5) |
| Tiempo de población | N1 4 s, N2 17 s, N3 27 s | N1 10 s, N2 101 s, N3 247 s | Inserción más lenta (más tablas y Supabase); no afecta las mediciones posteriores |

**Incidencias de la corrida:**
- La primera corrida (10/10/2026) se perdió: los resultados estaban en un tmpfs de la VM y la VM se reinició a mitad de N2. Se restableció la base y se repitió completa el 11/10/2026, escribiendo en disco y copiando cada nivel al terminar.
- En N1 y N2, k6 no pudo escribir `k6.json` (`permission denied`, porque `measure.sh` creó el directorio como root dentro del contenedor). Las corridas sí se completaron y su resumen íntegro quedó en `k6-summary.txt`; en N3 se corrigió el permiso y hay `k6.json` y `k6-summary.txt`.
- `export-bench.mjs` (PDF y CSV) **no se repitió**: genera los archivos en el navegador a partir del JSON ya descargado, sin pasar por la base ni el backend, así que DT-15 no lo afecta, y repetirlo en otra máquina no daría cifras comparables.

### 6.2 En base de datos (pgbench, 5 clientes, p95 en ms, Sprint 8 → Sprint 9)

| Consulta | Endpoint | N0 | N1 | N2 | N3 |
|---|---|---|---|---|---|
| RTT (`SELECT 1`) | — | 31.5 → 30.5 | 30.3 → 32.1 | 29.7 → 31.4 | 30.0 → 30.0 |
| Listado de proyectos | `GET /api/projects` | 61.3 → 62.7 | 59.5 → 62.6 | 56.6 → 64.5 | 62.5 → 64.4 |
| Métricas de proyecto | `GET /api/projects/:id/metrics` | 216.9 → 222.6 | 227.6 → 233.4 | 324.7 → 272.6 | 497.0 → 365.8 |
| Listado de reportes | `GET /api/reports` | 31.3 → 31.9 | 34.6 → 40.9 | 61.2 → 83.5 | 124.9 → 122.4 |
| Resumen de reportes | `GET /api/reports/summary` | 31.8 → 32.9 | 36.0 → 35.6 | 70.9 → 71.3 | 152.3 → 189.4 |
| Búsqueda de producto en el POS | `GET /api/products?projectId=` | 30.1 → 33.0 | 104.2 → 101.8 | 600.0 → 482.0 | 3,043.2 → 2,671.2 |
| Productos de la empresa | `GET /api/products` | 31.4 → 31.5 | 56.7 → 68.6 | 341.0 → 412.0 | 628.3 → 543.9 |
| Código de barras en un proyecto | — | 29.1 → 32.0 | 32.1 → 29.4 | 31.0 → 31.4 | 31.8 → 31.7 |
| Código de barras en la empresa | — | 31.8 → 30.4 | 30.7 → 32.4 | 31.7 → 31.8 | 32.2 → 32.0 |

Las diferencias van en las dos direcciones, entre −26 % y +36 %, sin un patrón por consulta ni por nivel. Las dos referencias estables (RTT y búsqueda por código de barras) se mueven menos del 10 %. Es la variación normal de Supabase entre dos días, no un efecto del código: pgbench ejecuta SQL fijo directamente contra la base y no pasa por el backend ni por su pool. La forma de las curvas es la misma: el POS crece unas 80 veces de N0 a N3 (100 en el Sprint 8) y el código de barras se mantiene plano.

### 6.3 Extremo a extremo (k6, 5 VUs, p95 en ms, Sprint 8 → Sprint 9)

| Escenario | Endpoint | Umbral | N1 | N2 | N3 | Resultado S9 |
|---|---|---|---|---|---|---|
| V1 | `GET /api/projects` | 500 | 80 → 78 | 77 → 74 | 84 → 72 | Cumple en todos los niveles (igual que S8) |
| V2 | `GET /api/projects/:id/metrics` | 500 | 153 → 154 | 199 → 173 | 370 → 263 | Cumple en todos los niveles (igual que S8) |
| V3 | `GET /api/reports` | 500 | 185 → 171 | 267 → 246 | **543 → 499** | Al límite en N3: 0.5 ms por debajo del umbral |
| V4 | `GET /api/reports/summary` | 500 | 79 → 80 | 98 → 95 | 211 → 197 | Cumple en todos los niveles (igual que S8) |
| V5 | `GET /api/products?projectId=` | 800 | 265 → 277 | **1,050 → 483** (1 min) / **789** (2 min) | **3,691 → 2,410** | **No cumple en N3**; en N2 queda al límite con escenarios de 2 min |

N2 se repitió el 11/10/2026 con escenarios de 2 minutos, como en el Sprint 8, para aislar el efecto de la duración (`N2-2m/`): V1 76, V2 219, V3 267, V4 94 y **V5 789 ms**, todos con 0 % de error.

Tasa de error del 0 % en todos los escenarios y niveles; ningún 429. En el Sprint 8, V2 en N3 había perdido el 17.2 % por el limitador; el espaciado que se añadió entonces a `k6/volume-test.js` lo evita. El tamaño de las respuestas no cambió: V5 sigue descargando unos 4 MB en N2 y 8.1 MB en N3, y V3 1.8 MB en N3.

### 6.4 Punto de degradación: Sprint 8 → Sprint 9

| Endpoint | Sprint 8 | Sprint 9 | Lectura |
|---|---|---|---|
| Búsqueda de producto del POS | N2 (1.04 s) | Al límite en N2 (789 ms con escenarios de 2 min, 11 ms bajo el umbral); N3 (2.41 s) | **Sin cambio real.** Ver 6.5 |
| Listado de reportes | N3 (543 ms) | No se cruza por 0.5 ms (499 ms) | **No concluyente.** La diferencia está dentro del ruido; la causa (sin paginación y sin uso del índice) sigue intacta |
| Métricas de proyecto | No se alcanzó | No se alcanzó | Sin cambio |
| Resumen de reportes, listado de proyectos | No se alcanzó | No se alcanzó | Sin cambio |

### 6.5 Resultado que contradice la hipótesis: el POS en N2

La hipótesis decía que k6 no cambiaría de forma significativa. V5 en N2 bajó de 1,050 a 483 ms y quedó dentro del umbral. Se revisó si había una causa en el código o en la base antes de interpretarlo:

- **La consulta del listado no cambió.** El diff de `productController.js` entre `main` del 07/09 y `28f5580` toca el detalle, el borrado y los proveedores, no el listado por proyecto.
- **El tiempo en servidor es el mismo.** `EXPLAIN ANALYZE` de la consulta del POS en N2: 171.5 ms en el Sprint 8 y 157.6 ms ahora. En N3: 400.9 ms y 352.9 ms.
- **La compresión es la misma.** La hace Caddy en las dos versiones.
- **DT-15 no lo explica.** Los valores que DT-15 fijó para el pool (`max: 10`, `idleTimeoutMillis: 10000`) son los mismos que `pg` ya aplicaba por defecto; solo cambia `connectionTimeoutMillis`, que actúa cuando el pool se agota, y con 5 VUs el pool no se agota.
- **Lo que sí cambió son las condiciones de la corrida.** El escenario duró 1 minuto en vez de 2; en el Sprint 8 el N2 descargó 2 GB sostenidos con 5 cajeros, y ahora 1.2 GB.

**Verificación:** se repitió N2 con escenarios de 2 minutos, igual que en el Sprint 8. V5 subió de 483 a **789 ms**: con carga sostenida, la cola de latencia crece y el endpoint queda 11 ms por debajo del umbral de 800 ms (Sprint 8: 1,050 ms). El resto de los escenarios apenas cambió (V3 de 246 a 267 ms, V2 de 173 a 219 ms).

**Conclusión:** la mejora aparente de V5 en N2 venía sobre todo de la duración menor del escenario. Con la misma duración que en el Sprint 8, el POS sigue en el borde del umbral en N2; la diferencia restante (1,050 contra 789 ms) está dentro de lo que varían la red y Supabase entre días y no es atribuible a DT-15 ni a ningún cambio de código identificado. **El punto de degradación del POS no se movió de forma real**: la causa medida en el Sprint 8 (descargar y agregar el inventario completo del proyecto en cada escaneo) sigue intacta, y en N3 el endpoint sigue tres veces por encima del umbral.

### 6.6 Comparativa por hallazgo (volumen)

Hallazgos de `docs/pruebas-volumen.md` §6, más los de esta corrida.

| # S8 | Hallazgo | Severidad | Estado S9 | Qué cambio lo resolvió | Evidencia S9 |
|---|---|---|---|---|---|
| 1 | El POS descarga el inventario completo del proyecto para resolver un código | Alta (degrada desde N2 en S8) | **Abierto** | Ninguno: no existe el endpoint de búsqueda por código | V5 N3 2.41 s; 8.1 MB por respuesta; el script de código de barras sigue en ~32 ms en todos los niveles |
| 2 | `GET /api/reports` no usa su índice y no está paginado | Media (degrada en N3 en S8) | **Abierto** | Ninguno | V3 N3 499 ms y 1.8 MB por respuesta; `Seq Scan on reporte` en `explain.txt` de N3 |
| 3 | El PDF de reportes incluye todos los reportes de la empresa | Media | **Abierto (no medido)** | Ninguno: `frontend/src/utils/reportExport.js` sin cambios en la generación | No se repitió `export-bench.mjs` (6.1) |
| 4 | El resumen de reportes agrupa tareas y actividades de todas las empresas | Media | **Abierto** | Ninguno | `Seq Scan on tarea` en N3; pgbench N3 189.4 ms |
| 5 | `presupuesto_actividad` sin índice por `id_proyecto` | Baja | **Abierto** | Ninguno | `inventario.txt` N3: `id_proyecto | (ninguno)`; 2 × `Seq Scan on presupuesto_actividad` |
| 6 | Métricas de proyecto: siete consultas por petición, sin caché | Baja | **Abierto** | Ninguno (estaba planificado para Sprint 10) | V2 N3 263 ms, dentro de umbral |
| 7 | La base de pruebas corre el esquema de `main` sin la cabecera de venta | Infra | **Resuelto** | Despliegue de `develop` @ `28f5580` en pruebas el 10/10/2026 | `venta` poblada en N1–N3 (`inventario.txt`) |
| §3.2 | V2 en N3 perdió el 17.2 % por el limitador de DT-13 | Configuración de la prueba | **Resuelto** | Espaciado de `/metrics` en `k6/volume-test.js` (Sprint 8) | 0 % de error y 0 × 429 en V2 |

**Contraste con la hipótesis:** se cumplió para pgbench y para cuatro de los cinco escenarios k6. V5 en N2 pareció contradecirla con escenarios de 1 minuto; repetido con 2 minutos, quedó en 789 ms, al límite del umbral, y la diferencia con el Sprint 8 no tiene una causa en el código (6.5). Ningún hallazgo de volumen cambió de estado por DT-15.

## 7. Hallazgos abiertos y plan de mitigación

Los sprints de destino son una propuesta para el backlog. Los marcados como Sprint 9 ya estaban asignados a este sprint y siguen pendientes.

| Hallazgo | Severidad | Acción de mitigación propuesta | Registro | Sprint |
|---|---|---|---|---|
| S8-1: guard SSRF no cubre `0.0.0.0` ni IPv6 mapeada | Alta | Bloquear `0.0.0.0/8` y `::ffff:0:0/96` en `assertPublicHttpUrl`, con pruebas de los dos casos | DT-18 | 9, **antes de promover `develop` a `main`** |
| S8-2: el probador sigue redirecciones | Alta | `redirect: 'manual'` en `fetchWithTimeout` (ya es el único punto de salida gracias a DT-15) o revalidar cada salto | DT-18 | 9 |
| N3: dependencias con 2 críticas y 9 altas | Alta | `npm audit fix` sin versión mayor (`concurrently`/`shell-quote`, `fast-glob`, `source-map-js`, `postcss-nested`) | DT-08 | 9 |
| S8-4: `sendWebhookEvent` sin guard SSRF | Media | Llamar a `assertPublicHttpUrl` antes de `fetchWithTimeout` y conectar a la IP ya validada | DT-18 | 9 |
| S8-3: HTML del SPA sin cabeceras | Media | Cabeceras en `frontend/nginx.conf.template` con una CSP compatible con Vite y Google Fonts | DT-19 | 9 |
| N1: `deploy.sh` expone secretos en `ps` | Media | Enviar el `.env` por `scp` o stdin; rotar la contraseña de la base de pruebas | Nuevo (proponer DT-22) | 9 |
| N2: `reset:test` roto en `develop` | Media (operativa) | Mergear `fix(db): merge the duplicate ensureProveedor in the seed` | — | 9 |
| Vol-1: el POS descarga el inventario completo | Alta | Endpoint de búsqueda por código en el servidor (medido en ~32 ms en todos los niveles); paginar el listado | Nuevo (proponer DT-23) | 10 |
| Vol-2: `GET /api/reports` sin índice útil ni paginación | Media | Filtrar por `r.id_empresa = $1` con la columna `NOT NULL`; paginar | Nuevo (proponer DT-23) | 10 |
| Vol-4: el resumen agrupa todas las empresas | Media | Filtro por empresa dentro de las subconsultas o `LATERAL` por proyecto | Nuevo (proponer DT-23) | 10 |
| Vol-3: PDF con todos los reportes | Media | Limitar el PDF a un rango de fechas o a los más recientes | Nuevo (proponer DT-23) | 10 |
| S8-5: `helmet` duplicado | Baja | Una sola configuración de `helmet` | DT-19 | 9 |
| S8-6: entrada sin validar produce 500 | Baja | Esquema para `X-Company-ID`; `validate()` antes de `movementPermissionGate` | DT-20 | 10 |
| S8-8 y S8-9: versión de nginx; sin `Cache-Control: no-store` | Baja | `server_tokens off`; `no-store` en respuestas autenticadas | DT-19 | 9 |
| Vol-5: `presupuesto_actividad` sin índice | Baja | `CREATE INDEX` por `id_proyecto` en `bootstrap.js` | Nuevo (proponer DT-23) | 10 |
| Vol-6: métricas sin caché | Baja | Caché de 30 s en `/api/projects/:id/metrics` | — | 10 |
| S8-7: HTML sin sanear en texto libre | Baja | Sanear o fijar por prueba que nunca se usa `v-html` | DT-20 | 10 |
| Disco de la VM; `deploy.sh` sin modo solo-pruebas; Supabase que se pausa | Infra | Rotación de logs, disco más grande con alerta, checkout propio para pruebas | DT-21 | 9 |

## 8. Lo que no se pudo medir

| Qué | Por qué |
|---|---|
| Versión exacta de ZAP y de k6 del Sprint 8 | No se registraron. ZAP es muy probablemente la misma imagen (anterior al escaneo del Sprint 8 y en la misma máquina); k6 no se puede reconstruir |
| Exportación PDF y CSV | No depende de la base ni del backend (6.1) |
| Los dos timeouts del pool (`connectionTimeoutMillis`, `idleTimeoutMillis`) en el ambiente desplegado | No se exponen por HTTP; solo `max` aparece en `/api/health`. Se verificaron en código y en las pruebas unitarias de DT-15 |
| Timeout de Slack, Teams, Telegram, Twilio y SendGrid en ejecución | Apuntan a dominios fijos de terceros; solo el webhook acepta una URL arbitraria para forzar la espera. Se verificaron en código |
| `sendWebhookEvent` (hallazgo 4) en ejecución | Igual que en el Sprint 8: exigiría dejar un webhook activo en el ambiente |

## 9. Artefactos

Evidencia de volumen en `volume/results/sprint9/`, con la misma estructura que la del Sprint 8 en `volume/results/`:

| Archivo | Contenido |
|---|---|
| `tiempos.csv` | p50, p95, p99 y máximo por consulta, nivel y número de clientes |
| `N*/pgbench/*.summary.txt` | Salida cruda de pgbench por consulta y número de clientes |
| `N*/explain.txt` | `EXPLAIN (ANALYZE, BUFFERS)` de cada consulta |
| `N*/inventario.txt` | Filas, tamaños e índices de las tablas medidas |
| `N1..N3/k6-summary.txt`, `N3/k6.json` | Resumen de k6 por nivel (escenarios de 1 min) |
| `N2-2m/k6-summary.txt`, `N2-2m/k6.json` | N2 repetido con escenarios de 2 min |
| `reset.txt` | Restablecimiento final del ambiente |

Los logs por transacción de pgbench no se versionan, igual que en el Sprint 8.

Evidencia de seguridad en `docs/evidencias/security-regression/`:

| Archivo | Contenido |
|---|---|
| `passive-summary.md`, `passive-report.json` | Reporte del pasivo (resumen y crudo) |
| `active-summary.md`, `active-report.json` | Reporte del activo (resumen y crudo) |
| `verify-headers-*.txt`, `verify-ssrf-*.txt`, `verify-ssrf-redirect-*.txt`, `verify-ratelimit-*.txt` | Verificaciones dirigidas del Sprint 8, repetidas |
| `verify-timeout-*.txt` | Verificación dirigida de DT-15 |
| `baseline-*.csv`, `monitor-passive-*.csv`, `monitor-active-*.csv` | Vigilancia de producción |
| `reset-*.txt` | Reset fallido (N2) y los dos resets correctos |

**Saneamiento:** las plantillas `traditional-md` y `traditional-json` de ZAP no guardan cabeceras ni cuerpos de petición o respuesta. Se revisó cada archivo buscando `Bearer`, `Authorization`, cookies, JWT (`eyJ…`), contraseñas, cadenas de conexión y emails. Solo aparecen nombres de campo (`password`, `token`), la cuenta sembrada `reserva@kontrol-test.dev` y la sintética `zap-probe@kontrol-test.dev`. Los reportes HTML no se versionan porque repiten el JSON.
