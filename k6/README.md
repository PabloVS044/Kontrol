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

## Integración continua

`.github/workflows/load-test.yml`, disparo manual únicamente
(`workflow_dispatch`) — la batería de carga tarda ~40 min y ambas modifican
el ambiente compartido con las sesiones de UX de SCRUM-25, así que correrlas
en cada PR no tiene sentido. El resumen de cada corrida (`summary.json`,
salida de `--summary-export`) se publica como artefacto descargable.
