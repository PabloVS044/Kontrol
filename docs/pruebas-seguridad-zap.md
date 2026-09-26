# Resultados: Pruebas de seguridad automatizadas con OWASP ZAP (SCRUM-52)

| Campo | Valor |
|---|---|
| Ticket | [SCRUM-52](https://kontroldevelopment.atlassian.net/browse/SCRUM-52) |
| Scripts | `zap/run-zap.sh`, `zap/plans/passive.yaml`, `zap/plans/active.yaml`, `zap/verify-controls.sh`, `zap/monitor-prod.sh` (uso en `zap/README.md`) |
| Herramienta | OWASP ZAP, imagen `zaproxy/zap-stable`, Automation Framework, ejecutada en Docker desde una máquina del equipo |
| Ambiente | Ambiente de pruebas de SCRUM-25 (`docs/test-environment.md`), `https://test.34.121.51.151.nip.io`, en ningún momento producción |
| Código evaluado | `develop` @ `ae99f0f` (incluye SCRUM-43, SCRUM-44 y SCRUM-45) |
| Fecha | 26/09/2026, entre las 18:13 y las 19:50 UTC |
| Cuenta usada | `reserva@kontrol-test.dev`, cuenta de reserva sembrada; ninguna cuenta de participante se usó |
| Resultado general | Escaneo activo sin alertas altas ni medias sobre la API. De los tres controles, dos cumplen (cabeceras y límite de intentos) y uno cumple parcialmente: **el probador de integraciones sigue alcanzando la red interna por tres vías**. SEC2 pasa a Cubierto |

## 1. Herramienta y por qué se eligió

La guía de la tarea menciona OWASP ZAP, Metasploit y John the Ripper. Cada una responde a una pregunta diferente, y solo una coincide con lo que este sprint necesitaba verificar:

| Herramienta | Qué hace | Por qué sí o por qué no para SCRUM-52 |
|---|---|---|
| **OWASP ZAP** | Escáner de aplicaciones web (DAST): observa el tráfico HTTP y ataca los parámetros de cada petición | Elegida. Las tres mitigaciones del sprint son controles HTTP de la API: cabeceras de respuesta, respuestas 429 y validación de una URL recibida en el cuerpo. ZAP los ejercita contra la aplicación desplegada, con sesión autenticada. Además, su Automation Framework deja el escaneo versionado y repetible en `zap/plans/` |
| Metasploit | Marco de explotación de vulnerabilidades conocidas en servicios e infraestructura | No aplica: la superficie es una API propia, no un servicio con CVE conocidos. Su uso sobre una VM compartida con producción añadiría riesgo sin cubrir ninguno de los tres controles |
| John the Ripper | Descifrado de hashes de contraseñas sin conexión | No aplica: requiere tener los hashes, es decir, acceso a la base de datos. Lo que se quería medir es la defensa en línea contra la fuerza bruta (SCRUM-44), que se prueba contra el endpoint de login y no contra los hashes |

## 2. Ambiente y condiciones de ejecución

### 2.1 Preparación del ambiente

El análisis previo encontró el ambiente de pruebas inutilizable, y hubo que corregirlo antes de escanear:

1. `backend-test` estaba en un bucle de reinicios con `(ENOTFOUND) tenant/user postgres.egrjubfsxogvujcwivem not found`: el proyecto Supabase de pruebas se había pausado por inactividad. Se reactivó desde el panel de Supabase.
2. El ambiente corría `main` del 07/09, sin ninguna de las mitigaciones del sprint. Se desplegó `develop` **solo en los contenedores de pruebas**, con un `git worktree` aparte y `docker compose up --no-deps` de `backend-test` y `frontend-test`. No se usó `scripts/deploy.sh`, porque trabaja sobre un único checkout y habría desplegado `develop` también en producción. Se comprobó que los cuatro contenedores de producción conservaron su hora de arranque y su imagen.
3. El build falló por `ENOSPC`: la VM tenía **198 MB libres de 8.6 GB**. Se liberaron 2.2 GB de caché de build de Docker (`docker builder prune -af`, sin tocar contenedores ni volúmenes).

### 2.2 Alcance

| Fase | Qué cubre | Qué excluye y por qué |
|---|---|---|
| Pasivo | 45 GET autenticados sobre todo el inventario de la API, más un spider del SPA | Nada relevante: no escribe datos |
| Activo | `/api`, con 15 GET y 17 escrituras semilla (un POST o PUT representativo por recurso) | `/api/chat`, `/api/agent` y `/socket.io` (MongoDB compartido con producción, el reset no lo limpia); `/api/uploadthing` (cuenta compartida con producción); `/api/integrations` (una URL inyectada quedaría guardada y `sendWebhookEvent` la llamaría en cada evento posterior); `/api/marketing/generate` (LLM); `/api/auth/google`; `/api/admin` y `/api/global` (solo superusuario) |
| Dirigida | Los tres controles del sprint, con `zap/verify-controls.sh` | — |

Política del activo: fuerza y umbral medios, 2 hilos, 100 ms entre peticiones, tope de 60 minutos. Se desactivaron las reglas de desbordamiento de búfer, cadena de formato y fuzzer de user agent, que no aplican a Node.js y multiplican el número de peticiones.

La autenticación usó un JWT pedido justo antes de cada corrida e inyectado por las variables `ZAP_AUTH_HEADER*` de ZAP, restringidas al host de pruebas, más `X-Company-ID`. Las credenciales no se escribieron en ningún archivo del repositorio.

### 2.3 Duración

| Fase | Inicio (UTC) | Duración |
|---|---|---|
| Despliegue de `develop` en pruebas (dos builds) | 18:58 | 12 min aprox. |
| Pasivo, primera corrida (descartada, ver hallazgo 10) | 19:11 | 44 s |
| Pasivo | 19:13 | 37 s |
| Verificación dirigida: cabeceras y SSRF | 19:17 | 1 min aprox. |
| Activo | 19:19 | 13 min 58 s |
| Verificación dirigida: límite de intentos | 19:34 | 30 s |
| Restablecimiento del ambiente | 19:36 | 8 s |
| Prueba de humo y transición del límite por cuenta | 19:42 | 1 min aprox. |

### 2.4 Impacto en producción

Producción y pruebas comparten una VM de 2 vCPU sin límite de CPU por contenedor. En el Sprint 7, una prueba de carga llevó un health check de producción de responder al instante a 2.9 s (`docs/pruebas-carga-estres.md`, hallazgo 4). Por eso cada fase corrió con `zap/monitor-prod.sh`, que consulta el health de producción cada 5 s y `docker stats` por SSH cada 15 s, con abort automático (`docker kill`) si hay una respuesta distinta de 200, una muestra por encima de 2 s, tres seguidas por encima de 1 s, CPU del backend de producción por encima del 70 % durante 30 s, load average por encima de 3.0 o menos de 400 MB de disco libre.

Línea base previa: mediana de 0.262 s y p95 de 0.277 s.

| Fase | Muestras | Respuestas distintas de 200 | Máximo | Media | Máximo de CPU del backend de producción | Máximo de load |
|---|---|---|---|---|---|---|
| Despliegue | 82 | 0 | 0.399 s | 0.270 s | 0.04 % | **3.01** |
| Pasivo | 8 | 0 | 0.465 s | 0.301 s | 0.16 % | 0.29 |
| Activo | 140 | 0 | 0.464 s | 0.262 s | 0.28 % | 0.97 |

**No hubo impacto medible en producción.** La única condición de abort que se disparó fue el load average de 3.01, durante el build de Vite del despliegue y no durante un escaneo. En ese momento la latencia de producción siguió en su línea base.

## 3. Hallazgos por severidad

La severidad es la asignada tras revisar cada alerta, no la cruda de ZAP. Las alertas descartadas como falsos positivos se listan al final.

| Severidad | Cantidad | Hallazgos |
|---|---|---|
| Alta | 2 | 1, 2 |
| Media | 2 | 3, 4 |
| Baja | 5 | 5, 6, 7, 8, 9 |
| Informativa | 1 | 10 |

| # | Severidad | Hallazgo | Evidencia | Origen |
|---|---|---|---|---|
| 1 | **Alta** | El guard SSRF no bloquea `0.0.0.0` ni las IPv6 mapeadas a IPv4. `http://0.0.0.0:3000/api/health` y `http://[::ffff:127.0.0.1]:3000/api/health` pasan `assertPublicHttpUrl` y llegan al propio backend, y la respuesta devuelve el status interno como oráculo | `El webhook respondió con status 404.` en ambos casos; el resto de destinos internos da `La URL debe apuntar a un host público.` (sección 4.3) | Verificación dirigida |
| 2 | **Alta** | El probador sigue redirecciones: una URL pública que responde 302 hacia `127.0.0.1` evade el guard, porque este solo valida la URL inicial | Con `https://httpbin.org/redirect-to?url=http://127.0.0.1:3000/api/health&status_code=302` el probador devolvió `Conexión exitosa.` (sección 4.3) | Verificación dirigida |
| 3 | Media | El documento HTML del SPA, servido por nginx, no lleva ninguna cabecera de seguridad: sin CSP, sin protección de clickjacking, sin `nosniff`, sin HSTS ni `Referrer-Policy`. `helmet` solo cubre las respuestas JSON de la API, y es el documento HTML el que ejecuta scripts y guarda el token en `localStorage` | ZAP 10038, 10020, 10021, 10035 sobre `/`; `verify-controls.sh headers`, resultado 0/5 sobre `/` | Pasivo + dirigida |
| 4 | Media | Queda un camino de SSRF sin guard: `sendWebhookEvent` (`backend/src/services/webhookService.js`) hace `fetch` a la URL guardada en cada evento sin llamar a `assertPublicHttpUrl`. Tampoco hay defensa contra DNS rebinding, porque el guard resuelve el host y `fetch` lo vuelve a resolver | Revisión de código; no se ejercitó para no dejar webhooks activos en el ambiente | Revisión estática |
| 5 | Baja | `helmet` se aplica dos veces (`securityMiddleware` y un segundo `helmet()` en `backend/src/index.js`). El segundo pisa al primero: la CSP efectiva es la de helmet por defecto (`frame-ancestors 'self'`, `style-src 'self' https: 'unsafe-inline'`) y no la configurada (`frame-ancestors 'none'`), lo que contradice `X-Frame-Options: DENY`. La configuración personalizada es código muerto | Cabecera CSP capturada en la sección 4.1 | Dirigida |
| 6 | Baja | Entrada sin validar produce 500: un `X-Company-ID` no entero en `requireCompany`, y en `POST /api/inventory-movements`, donde `movementPermissionGate` lee `id_proyecto` del cuerpo antes de `validate(createInventoryMovementSchema)`. La respuesta es un 500 genérico, sin filtrar detalles | 114 errores `invalid input syntax for type integer` en `POST /api/inventory-movements` durante el activo | Activo + logs |
| 7 | Baja | La API guarda y devuelve HTML sin sanear en campos de texto (`nombre` y `descripcion` de tareas, `title` y `details` de avances, `titulo` de reportes, `title` y `content` de ítems de marketing). Hoy no es explotable, porque Vue escapa la interpolación y el único `v-html` (`AgentView.vue`) pasa por DOMPurify, pero depende de que nadie renderice esos campos con `v-html` | ZAP 40014, 7 instancias, confianza baja | Activo |
| 8 | Baja | `Server: nginx/1.31.6` expone la versión exacta de nginx | ZAP 10036 | Pasivo |
| 9 | Baja | Las respuestas de la API no declaran `Cache-Control: no-store`; los datos autenticados pueden quedar en cachés intermedias o del navegador | ZAP 10015 | Pasivo |
| 10 | Informativa | La primera corrida del pasivo envió literalmente `X-Company-ID: ${COMPANY_ID}` (el Automation Framework no expande variables en las reglas `replacer`) y todas las rutas de empresa respondieron 500. Es un defecto de la configuración del escaneo, no de la aplicación; se corrigió renderizando el plan con `envsubst` y exigiendo 200 en `/api/projects`. Esa corrida quedó fuera de las cifras | `zap/out/run1-*` | Configuración del escaneo |

**Descartadas tras revisión:** SRI ausente (90003), que se refiere a la hoja de Google Fonts, cuyo contenido cambia según el navegador, así que SRI no aplica; «Timestamp Disclosure» (10096), un número del bundle que no es una marca de tiempo; «CSP: Failure to Define Directive with No Fallback» (10055), que solo aparece en la página 404 por defecto de Express; y «Modern Web Application», «Authentication Request Identified» y «Session Management Response Identified», que son informativas.

**Alertas crudas de ZAP:** pasivo, 0 altas, 4 medias, 4 bajas y 2 informativas; activo, 0 altas, 0 medias, 2 bajas y 3 informativas.

## 4. Verificación de los tres controles

### 4.1 SCRUM-45 / DT-14 — Cabeceras de seguridad (caso SEC2)

**Resultado: cumple.** Las cinco cabeceras exigidas por §9.2 del plan maestro están presentes en un endpoint público y en uno autenticado, y `X-Powered-By` ya no aparece.

```
## public: GET /api/health                       ## authenticated: GET /api/auth/me
  OK content-security-policy: default-src 'self';…   (mismos cinco valores)
  OK x-content-type-options: nosniff
  OK x-frame-options: DENY
  OK strict-transport-security: max-age=15552000; includeSubDomains; preload
  OK referrer-policy: no-referrer
  OK x-powered-by absent                            result: 5/5
  result: 5/5
```

Observaciones que no cambian el resultado: la CSP efectiva no es la configurada (hallazgo 5), y el HTML del SPA no lleva cabeceras (hallazgo 3), que está fuera del criterio de SEC2 porque este se refiere a las respuestas del backend.

### 4.2 SCRUM-44 / DT-13 — Límite de intentos

**Resultado: cumple.** El escaneo activo agotó el cupo por IP de `/api/auth` (100 peticiones cada 15 minutos), y desde ese momento todas las peticiones de login recibieron una respuesta controlada:

```
HTTP/2 429
ratelimit: limit=100, remaining=0, reset=394
ratelimit-policy: 100;w=900
retry-after: 394
{"success":false,"message":"Too many requests. Please try again later."}
```

- 20 intentos seguidos contra una cuenta inexistente: 20 × 429.
- Tres intentos con `X-Forwarded-For` falsificado (`203.0.113.7`, `198.51.100.23`, `192.0.2.99`): 3 × 429. El límite no se evade rotando esa cabecera.
- Límite por cuenta, con la ventana por IP ya liberada y una cuenta inexistente nueva: 5 × 401 y a partir del sexto intento 429, con mensaje propio. La respuesta 401 es idéntica a la de una cuenta existente, así que el límite no permite enumerar usuarios:

```
5 -> 401 ratelimit: limit=5, remaining=0 | {"success":false,"message":"Invalid credentials."}
6 -> 429 ratelimit: limit=5, remaining=0 | {"success":false,"message":"Too many failed login attempts for this account. Please try again later."}
```

Efecto sobre el propio escaneo: una vez agotado el cupo, ZAP recibió 429 en `/api/auth/*`, lo que acotó la cobertura del activo sobre login y registro. Es el comportamiento esperado del control, y queda registrado como limitación del escaneo.

### 4.3 SCRUM-43 / DT-12 — SSRF en el probador de integraciones

**Resultado: cumple parcialmente.** La empresa de prueba se creó con `POST /api/companies`, que es el vector que describe DT-12: cualquier usuario registrado queda como owner de su propia empresa. Cada URL se guardó en la integración `webhook` y se probó con `POST /api/integrations/webhook/test`.

| Destino | Esperado | Resultado |
|---|---|---|
| `127.0.0.1`, `localhost`, `10.0.0.1`, `172.17.0.1`, `192.168.1.1` | Bloquear | Bloqueado por el guard |
| `169.254.169.254` y `metadata.google.internal` (metadatos de GCP) | Bloquear | Bloqueado por el guard |
| `[::1]`, `[fe80::1]`, `[fd00::1]` | Bloquear | Bloqueado por el guard |
| `127.0.0.1.nip.io` (DNS que resuelve a loopback) | Bloquear | Bloqueado por el guard |
| `127.1` y `2130706433` (formas abreviada y decimal de loopback) | Bloquear | Bloqueado por el guard |
| `file:///etc/passwd` | Bloquear | Rechazado por el schema al guardar |
| `https://example.com/` (control público) | Permitir | Permitido (`respondió con status 405`) |
| **`0.0.0.0:3000`** | Bloquear | **Alcanzó el backend interno** (hallazgo 1) |
| **`[::ffff:127.0.0.1]:3000`** | Bloquear | **Alcanzó el backend interno** (hallazgo 1) |
| **Redirección 302 desde httpbin.org a `127.0.0.1:3000`** | Bloquear | **`Conexión exitosa.`** (hallazgo 2) |

Todos los destinos internos apuntaron a `/api/health` del propio contenedor `backend-test`, nunca a los servicios de producción.

## 5. Dependencias: `npm audit` frente al Sprint 7

| Medición | Crítica | Alta | Moderada | Baja | Total |
|---|---|---|---|---|---|
| Sprint 7, inventario de deuda técnica (DT-08), raíz | 2 | 8 | 6 | 1 | 17 |
| Sprint 7, plan maestro §9.1 (04/09), backend | 0 | 6 | 5 | 1 | 12 |
| Sprint 7, plan maestro §9.1 (04/09), frontend | 0 | 6 | 3 | 1 | 10 |
| **26/09/2026, raíz** | **0** | **3** | **0** | **0** | **3** |
| 26/09/2026, backend | 0 | 3 | 0 | 0 | 3 |
| 26/09/2026, frontend | 0 | 3 | 0 | 0 | 3 |

Bajan de 17 a 3 y desaparecen las dos críticas (`shell-quote` vía `concurrently`). Las tres restantes son una sola cadena: `uploadthing` → `@uploadthing/shared` → `effect` (pérdida o contaminación del contexto de `AsyncLocalStorage` en fibras de Effect bajo carga concurrente). La corrección que propone npm implica un cambio de versión mayor, y en ese sentido la situación es la misma que registraba el riesgo 9 del plan maestro. El caso SEC1 (cero críticas sin remediar) sigue cumpliéndose.

## 6. Acciones de mitigación

Ninguna corrección de código se ejecuta dentro de SCRUM-52, que es una tarea de verificación. Todas quedan registradas en el inventario de deuda técnica (`docs/deuda-tecnica.md`).

| Acción | Hallazgo | Sprint de ejecución | Registro |
|---|---|---|---|
| Bloquear `0.0.0.0/8` e IPv6 mapeada a IPv4 (`::ffff:0:0/96`) en `assertPublicHttpUrl`, con pruebas de esos dos casos | 1 | Sprint 9, **antes de promover `develop` a `main`** | DT-18 |
| `fetch` con `redirect: 'manual'` en el probador y en los servicios de integración, o revalidar cada salto | 2 | Sprint 9, antes del release | DT-18 |
| Llamar a `assertPublicHttpUrl` en `sendWebhookEvent` y conectar a la IP ya validada (agente con `lookup` fijo) contra el DNS rebinding | 4 | Sprint 9 | DT-18 |
| Cabeceras de seguridad en `frontend/nginx.conf.template` para el documento del SPA, con una CSP compatible con Vite y Google Fonts | 3 | Sprint 9 | DT-19 |
| Eliminar el segundo `helmet()` de `index.js` y dejar una sola configuración | 5 | Sprint 9 | DT-19 |
| Validar `X-Company-ID` como entero en `requireCompany` y mover `validate()` antes de `movementPermissionGate` | 6 | Sprint 9 | DT-20 |
| `server_tokens off` en nginx y `Cache-Control: no-store` en las respuestas autenticadas de la API | 8, 9 | Sprint 9 | DT-19 |
| Sanear o rechazar HTML en los campos de texto libre, o fijar por prueba que nunca se renderizan con `v-html` | 7 | Sprint 10 | DT-20 |
| Actualizar `uploadthing` (cambio de versión mayor) | Sección 5 | Sprint 9 | DT-08 (existente) |

Hallazgos de infraestructura encontrados durante la preparación, fuera del alcance de ZAP pero que afectan a producción:

| Hallazgo | Estado | Acción propuesta | Registro |
|---|---|---|---|
| El MongoDB Atlas que comparten producción y pruebas no resuelve DNS (`ENOTFOUND ac-rzg4awa-shard-00-00.p6drz4j.mongodb.net`): el chat y el historial del agente de producción no funcionan | Abierto al 26/09/2026 | Reactivar el cluster; separar una base Mongo para pruebas | DT-21 |
| El disco de la VM llegó al 98 % (198 MB libres); tras el despliegue quedó en 89 %. Los logs de los contenedores no rotan y el Postgres de producción escribe en el mismo disco | Mitigado a medias con `docker builder prune` | `logging.options.max-size` en los compose, ampliar el disco y alertar por espacio libre | DT-21 |
| Producción corre `main` del 07/09: ninguna de las mitigaciones de seguridad del sprint está desplegada ahí | Abierto | Release de `develop` a `main` después de corregir los hallazgos 1 y 2 | — |
| `scripts/deploy.sh` no puede actualizar solo el ambiente de pruebas | Abierto | Checkout separado para pruebas en el script | DT-21 |
| El Supabase de pruebas se pausa tras días sin actividad y deja `backend-test` caído | Resuelto hoy manualmente | Verificar el ambiente antes de cada uso | — |

## 7. Estado final del caso SEC2

**Cubierto.** El criterio de §9.2 del plan maestro pide las cinco cabeceras presentes en al menos un endpoint autenticado y uno público del backend, y se verificaron las cinco en `GET /api/health` y en `GET /api/auth/me` sobre el ambiente desplegado (sección 4.1). Hasta hoy la matriz marcaba SEC2 como Cubierto a partir del cambio de código de DT-14, sin evidencia sobre un ambiente desplegado; este reporte aporta esa evidencia.

Dos salvedades, registradas como deuda y que no reabren el caso: la CSP efectiva no es la configurada (hallazgo 5), y el documento HTML del SPA no lleva cabeceras (hallazgo 3). Además, **producción todavía no emite estas cabeceras**, porque corre `main` del 07/09. SEC2 queda cubierto en `develop` y en pruebas, no en producción hasta el próximo release.

## 8. Restablecimiento del ambiente

`npm run reset:test` sobre `backend-test` a las 19:36 UTC (8 s): trunca `usuario` y `empresa` en cascada, lo que elimina todo lo creado por el escaneo activo y la empresa de la prueba SSRF, y vuelve a sembrar el estado inicial. MongoDB y UploadThing no se tocaron porque estaban fuera del alcance.

Prueba de humo posterior, a las 19:42 UTC: las seis cuentas sembradas inician sesión con 200, ven la empresa «Ferretería Los Pinos» (`id_empresa` 1) y sus 3 proyectos, y el frontend responde 200. La empresa de la prueba SSRF ya no aparece. Los tres primeros inicios de sesión recibieron 429 porque la ventana por IP de `/api/auth` todavía no se había liberado; se repitieron segundos después, ya con 200.

Durante el diagnóstico de ese 429 se envió por error un intento de login con contraseña incorrecta contra `reserva@kontrol-test.dev`. Consume uno de los cinco intentos fallidos permitidos a esa cuenta en 15 minutos, se libera solo y no afecta a las cuentas de participantes.

El ambiente de pruebas queda en `develop` @ `ae99f0f`. El próximo `scripts/deploy.sh` desde `main` lo devolverá a `main`.

## 9. Artefactos

La evidencia que respalda este documento se versiona en `docs/evidencias/scrum-52/`:

| Archivo | Contenido |
|---|---|
| `passive-summary.md`, `active-summary.md` | Resúmenes de ZAP de las corridas válidas |
| `verify-headers-*.txt` | Sección 4.1 |
| `verify-ratelimit-*.txt` | Sección 4.2 |
| `verify-ssrf-*.txt`, `verify-ssrf-redirect-*.txt` | Sección 4.3 |
| `baseline-*.csv`, `monitor-active-*-health.csv`, `monitor-active-*-stats.csv` | Sección 2.4 |
| `reset-*.txt`, `smoke-*.txt` | Sección 8 |

Los reportes HTML y JSON completos, la corrida descartada y los CSV del despliegue y del pasivo quedan en `zap/out/`, que no se versiona porque repite lo anterior. Ningún archivo contiene credenciales ni el token: las plantillas de reporte usadas no guardan las cabeceras de las peticiones.
