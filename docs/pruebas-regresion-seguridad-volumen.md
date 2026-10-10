# Resultados: Regresión de seguridad y de volumen tras DT-15 (Sprint 9)

Repetición de las dos baterías no funcionales del Sprint 8 —OWASP ZAP (`docs/pruebas-seguridad-zap.md`) y volumen (`docs/pruebas-volumen.md`)— con el mismo perfil y el mismo conjunto de datos, después de DT-15. El objetivo es un antes y un después medible: qué hallazgos del Sprint 8 quedaron resueltos, cuáles siguen abiertos y por qué.

| Campo | Valor |
|---|---|
| Ambiente | Ambiente de pruebas de SCRUM-25, `https://test.34.121.51.151.nip.io`, base Supabase de pruebas (`TEST_DATABASE_URL`). En ningún momento producción |
| Código evaluado | `develop` @ `28f5580`, desplegado el 10/10/2026 con `scripts/deploy.sh` (incluye DT-15, PR #136, y todo lo mergeado a `develop` desde el Sprint 8, entre otros el PR #139) |
| Línea de comparación | Sprint 8: `develop` @ `ae99f0f` (ZAP, 26/09/2026) y `main` del 07/09 (volumen, 27–28/09/2026) |
| Cuenta usada en ZAP | `reserva@kontrol-test.dev`, rol de empresa `manager`, igual que en el Sprint 8 |
| Fecha | 10/10/2026, desde las 05:55 UTC |

## 1. Herramientas, versiones y perfil

| Batería | Herramienta | Versión exacta | Perfil |
|---|---|---|---|
| Seguridad, pasivo | OWASP ZAP, Automation Framework, en Docker desde una máquina del equipo | ZAP **2.17.0**, imagen `zaproxy/zap-stable@sha256:781a2bdaea47324e7bab583e2263f21d257b0aee61ed51521a5be45f5f5081ef`, OpenJDK 17.0.20 | `zap/plans/passive.yaml` sin cambios: 45 GET autenticados + spider del SPA (3 min, profundidad 5) |
| Seguridad, activo | Igual | Igual | `zap/plans/active.yaml` sin cambios: solo `/api`, fuerza y umbral medios, 2 hilos, 100 ms entre peticiones, tope de 60 min, reglas 30001, 30002 y 10104 desactivadas, mismas exclusiones |
| Seguridad, dirigida | `zap/verify-controls.sh` (curl + jq) | curl del sistema | `headers`, `ssrf`, `ssrf-redirect`, `ratelimit` como en el Sprint 8, más `timeout` (nuevo, para DT-15) |
| Dependencias | `npm audit` | npm 11.7.0, Node 24.12.0 | Lockfiles de `develop` @ `28f5580` (raíz, backend, frontend) |
| Volumen | Ver sección 6 | — | — |

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
| N4 | Respuestas lentas según ZAP: 91 % en el pasivo (78 % en S8) y 82 % en el activo (51 %); el activo tardó 2 min 37 s más | Informativa | Insights de `passive-summary.md` y `active-summary.md` | No concluyente: la red de origen y la carga de Supabase no están controladas. Se cruza con la batería de volumen (sección 6) antes de atribuirlo a DT-15 | — |

## 6. Batería de volumen

Pendiente de ejecución.

## 7. Hallazgos abiertos y plan de mitigación

Pendiente de completar con la batería de volumen.

## 8. Artefactos

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
