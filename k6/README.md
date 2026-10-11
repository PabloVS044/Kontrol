# Pruebas de carga y estrés — SCRUM-28

Implementa los escenarios definidos en `docs/plan-maestro-pruebas.md` §7
(carga) y §8 (estrés). Ese documento es el insumo — este directorio es la
implementación. Antes de tocar los scripts, léelo primero.

## Contra qué corren

**Siempre** el ambiente de pruebas de SCRUM-25 (`docs/test-environment.md`),
nunca producción. `lib/config.js` se niega a arrancar si `BASE_URL` no
contiene `test.34.121.51.151.nip.io` — el mismo tipo de guardia que usa
`backend/src/db/reset.js`.

## Uso local

Requiere el binario de k6, o Docker:

```bash
# Carga — las 5 escenarios C1-C5, secuenciales, ~40 min en total
k6 run k6/load-test.js

# Estrés — un escenario a la vez, nunca varios al mismo tiempo
k6 run -e SCENARIO=e2 k6/stress-test.js   # e1..e5

# Con Docker, montando este repo
docker run --rm -v "$(pwd)/k6:/scripts" grafana/k6:latest run /scripts/load-test.js
```

Variables de entorno opcionales: `BASE_URL` (default: la URL del ambiente de
pruebas), `TEST_ACCOUNT_PASSWORD`, `TEST_COMPANY_ID`, `TEST_PROJECT_ID`.

## Límite de peticiones (DT-13)

El backend limita el login por IP y por cuenta, y los endpoints costosos por
usuario. k6 manda todo desde una sola IP, así que con el límite activo:

- **C2–C5 / E2–E5** fallan en el login inicial de cada VU. Para medir la
  latencia real del endpoint, levantar `backend-test` con
  `TEST_RATE_LIMIT_ENABLED=false` y volver a dejarlo en `true` al terminar.
- **C1 / E1** se corren con el límite **activo**: lo que se mide es que las
  peticiones por encima del umbral se rechazan con 429 sin pasar por bcrypt,
  y que el resto del servicio (health check, otros endpoints) sigue
  respondiendo. Los 429 cuentan como error en `http_req_failed`, así que en
  esta corrida el criterio es la latencia y la estabilidad, no la tasa de
  error.

## Reinicio obligatorio después de correr

Cualquier corrida real, de carga o de estrés, deja datos nuevos (avances,
exportaciones de reporte, un producto de prueba, ventas) en el ambiente
compartido. Reiniciar siempre antes de la siguiente corrida o sesión de UX:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.test.yml \
  exec backend-test npm run reset:test
```

## Estructura

- `lib/config.js` — `BASE_URL`, cuentas, guardia de seguridad.
- `lib/auth.js` — login con caché de token por VU.
- `lib/scenarios.js` — el cuerpo de cada escenario C1-C5/E1-E5; único lugar
  donde vive la forma real de cada payload, para que carga y estrés no
  diverjan entre sí.
- `load-test.js` — batería de carga completa, C1 a C5 secuenciales.
- `stress-test.js` — un escenario de estrés por corrida (`-e SCENARIO=e1..e5`),
  rampa creciente hasta la condición de parada de §8.2 o el techo de 500 VUs.
- `ci-load-test.js` — perfil corto de C1 a C5 (5–10 VUs, ~3.5 min) para el
  pipeline de CI. Mismos escenarios y mismos umbrales de §7.2; no mide
  capacidad, detecta regresiones.

## Integración continua

Dos workflows, con propósitos distintos:

- **`.github/workflows/ci.yml`, job «Carga - k6»** — automático en cada pull
  request a `main` o `develop`. Levanta dentro del runner un PostgreSQL
  desechable, carga `backend/kontrol.sql`, arranca el backend, corre
  `npm run seed:test` y ejecuta `ci-load-test.js` contra `localhost`. No toca
  el ambiente compartido ni necesita reinicio. Si se cruza un umbral, k6 sale
  con código distinto de cero y el job queda en rojo. El resumen
  (`k6-summary.json`) y el log del backend se publican como artefacto.
- **`.github/workflows/load-test.yml`** — disparo manual únicamente
  (`workflow_dispatch`). Corre la batería completa (`load-test.js`, ~40 min) o
  un escenario de estrés contra el ambiente de pruebas de SCRUM-25, que
  modifica y comparte con las sesiones de UX, así que correrla en cada PR no
  tiene sentido. El resumen de cada corrida (`summary.json`) se publica como
  artefacto descargable.

Las cifras del job de CI no son comparables con las de
`docs/pruebas-carga-estres.md`: corren en otra máquina, con menos usuarios y
sin la latencia de red de la VM.

### Correr el perfil de CI en local

```bash
docker run --rm --network host -v "$(pwd)/k6:/scripts:ro" \
  -e BASE_URL=http://localhost:3000 -e TEST_HOST_MARKER=localhost:3000 \
  grafana/k6:2.3.0 run /scripts/ci-load-test.js
```

`TEST_HOST_MARKER` le dice a la guardia de `lib/config.js` qué host es
aceptable; solo se usa contra un backend local o desechable, nunca contra
producción.
