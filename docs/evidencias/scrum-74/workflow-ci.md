# Workflow de CI anotado — `.github/workflows/ci.yml`

Qué job corre cada tipo de prueba y qué lo dispara. Los números de línea corresponden a `ci.yml` en el commit `d4ab1b2` (rama `feat/unit-load-ci`, PR #141).

## Disparador (líneas 6–8)

```yaml
on:
  pull_request:
    branches: [main, develop]
```

Cualquier pull request hacia `main` o `develop` dispara el workflow completo, igual que cada push nuevo a un PR abierto. No hay `workflow_dispatch` ni condiciones `if:` a nivel de job: los tres jobs corren siempre, en paralelo y sin intervención manual. `concurrency` (líneas 11–13) cancela la corrida anterior del mismo PR cuando llega un commit nuevo.

## Jobs

| Job (`name:`) | Línea | Tipo de prueba | Comando | Cuándo falla | Artefacto |
|---|---|---|---|---|---|
| `backend-tests` — Backend - tests unitarios | 19 | **Unitarias** | `npm run test:coverage -w backend` (l. 37) | Una prueba falla o la cobertura queda bajo los umbrales de `backend/vitest.config.js` (l. 44) | `coverage-backend` |
| `frontend-tests` — Frontend - tests unitarios y build | 48 | **Unitarias** | `npm run test:coverage -w frontend` (l. 66) y `npm run build -w frontend` (l. 78) | Una prueba falla, la cobertura queda bajo los umbrales de `frontend/vitest.config.js` (l. 51), o el build no compila | `coverage-frontend` |
| `load-tests` — Carga - k6 | 86 | **Carga** | `k6 run --summary-export=k6-summary.json k6/ci-load-test.js` (l. 153) | Se cruza un umbral de `k6/ci-load-test.js` (l. 69), o falla un paso previo: esquema, backend o seed | `k6-summary` (resumen de k6 y log del backend) |

Ningún job lleva `continue-on-error`. Vitest y k6 salen con código distinto de cero cuando no se cumple un umbral, y eso pone el job en rojo.

## Job de carga, paso a paso (líneas 86–168)

1. **Servicio `postgres:16-alpine`** (l. 91–104): base de datos desechable que solo existe durante el job.
2. **Cargar esquema** (l. 129): `psql -f backend/kontrol.sql`.
3. **Levantar backend** (l. 134): `npm start -w backend` en segundo plano, y espera hasta que `/api/health` responda (máximo 60 s).
4. **Sembrar datos** (l. 145): `npm run seed:test -w backend`, con la empresa, los 3 proyectos y las 6 cuentas de prueba.
5. **Instalar k6** (l. 148): `grafana/setup-k6-action@v1` con k6 2.3.0 fijo.
6. **Ejecutar la prueba** (l. 153): escenarios C1 a C5 secuenciales, 5–10 usuarios virtuales, ~3.5 min, contra `http://localhost:3000`.
7. **Publicar artefacto** (l. 159): `k6-summary.json` y `backend.log`, incluso si el job falló.

Umbrales que hacen fallar el job (de `docs/plan-maestro-pruebas.md` §7.2, sin cambios):

| Escenario | Latencia p95 | Tasa de error |
|---|---|---|
| C1 inicio de sesión | < 300 ms | < 1 % |
| C2 proyectos y métricas | < 500 ms | < 1 % |
| C3 registro de avance | < 800 ms | < 1 % |
| C4 listado de reportes / exportación | < 500 ms / < 800 ms | < 1 % |
| C5 venta en POS | < 800 ms | < 1 % |
| Todos | — | `checks` > 99 % (un 401/404 rápido no cuenta como éxito) |

## Fuera de este workflow

- **`.github/workflows/load-test.yml`**: la batería completa de carga (~40 min) y las pruebas de estrés contra el ambiente de pruebas de la VM. Disparo **manual** (`workflow_dispatch`). No forma parte de la automatización por PR; se documenta aparte en `docs/pruebas-carga-estres.md`.
- **Checks requeridos**: los rulesets `protect-develop` y `protect-main` exigen «Backend - tests unitarios» y «Frontend - tests unitarios y build». «Carga - k6» corre en cada PR y queda visible en rojo o verde, pero todavía no es check requerido para el merge.
