# Pruebas de seguridad con OWASP ZAP — SCRUM-52

Escaneo pasivo y activo con OWASP ZAP, más la verificación dirigida de las
tres mitigaciones del sprint: SSRF en el probador de integraciones
(SCRUM-43, DT-12), límite de intentos (SCRUM-44, DT-13) y cabeceras de
seguridad (SCRUM-45, DT-14, caso SEC2 del plan maestro). Los resultados y su
análisis están en `docs/pruebas-seguridad-zap.md`.

## Contra qué corren

**Siempre** el ambiente de pruebas de SCRUM-25 (`docs/test-environment.md`),
nunca producción. `lib/common.sh` se niega a arrancar si `BASE_URL` no
contiene `test.34.121.51.151.nip.io`, con la misma guardia que usa
`k6/lib/config.js`.

## Requisitos

Docker (ZAP corre en la imagen `zaproxy/zap-stable`), `curl`, `jq`, y acceso
SSH a la VM para el monitor de producción.

## Credenciales

Los scripts no guardan credenciales. La cuenta sembrada que autentica el
escaneo se pasa por entorno en cada corrida:

```bash
export ZAP_USER=reserva@kontrol-test.dev
export ZAP_PASSWORD=...   # docs/test-environment.md
```

El token se pide justo antes de cada corrida y ZAP lo recibe por sus
variables nativas `ZAP_AUTH_HEADER*`, restringidas al host de pruebas.

## Orden de una corrida

Cada paso en su propia terminal. El monitor tiene que estar corriendo antes
de lanzar cualquier escaneo.

```bash
zap/monitor-prod.sh baseline 120      # 1. línea base de producción
zap/monitor-prod.sh watch passive     # 2. vigilancia (aborta sola)
zap/run-zap.sh passive                # 3. pasivo: solo GET, no escribe
zap/run-zap.sh active                 # 4. activo: ESCRIBE Y BORRA datos
zap/verify-controls.sh headers        # 5. verificación dirigida
zap/verify-controls.sh ratelimit
zap/verify-controls.sh ssrf
```

## Alcance del escaneo activo

Solo `/api`. Quedan excluidos del activo:

| Ruta | Motivo |
|---|---|
| `/api/chat`, `/api/agent`, `/socket.io` | MongoDB compartido con producción; el reset no lo limpia |
| `/api/uploadthing` | Cuenta de UploadThing compartida con producción |
| `/api/integrations` | Una URL inyectada quedaría guardada y `sendWebhookEvent` la llamaría en cada evento posterior; el guard SSRF se verifica con `verify-controls.sh ssrf` |
| `/api/marketing/generate` | Llama a un LLM |
| `/api/auth/google` | Redirige a Google, fuera de alcance |
| `/api/admin`, `/api/global` | Solo superusuario; cubiertas por el pasivo |

## Cuándo abortar

`monitor-prod.sh watch` ejecuta `docker kill kontrol-zap` y termina con
código 2 si ocurre cualquiera de estas condiciones:

- el health de producción responde algo distinto de 200, o tarda más de 2 s;
- 3 muestras seguidas por encima de 1 s;
- el backend de producción pasa del 70 % de CPU durante 30 s;
- el load average de la VM pasa de 3.0 (tiene 2 vCPU);
- `backend-test` se reinicia.

Los umbrales se ajustan con `HARD_LIMIT_S`, `SOFT_LIMIT_S`, `CPU_LIMIT` y
`LOAD_LIMIT`.

## Reinicio obligatorio después del activo

```bash
docker compose -p kontrol -f docker-compose.prod.yml -f docker-compose.test.yml \
  exec backend-test npm run reset:test
```

## Qué se versiona

`out/` no se versiona: los reportes HTML y JSON de ZAP pesan varios MB y
guardan las peticiones completas, con el token Bearer incluido. Solo el
resumen de los hallazgos se incorpora a `docs/pruebas-seguridad-zap.md`.
