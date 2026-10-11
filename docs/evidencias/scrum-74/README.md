# Evidencia — automatización de pruebas unitarias y de carga en CI

Sprint del 08 al 12/10/2026. Corte: domingo 11/10/2026.

| Archivo | Qué muestra |
|---|---|
| `proceso-ci.md` | Descripción del proceso de integración continua, herramientas con versión exacta y frecuencia real de ejecución |
| `historial-corridas.md` | Corridas de CI del sprint, día por día y una por una, con los huecos señalados |
| `workflow-ci.md` | `ci.yml` anotado: qué job corre cada tipo de prueba y con qué disparador |
| `actions-run-38161910366-20261011.png` | Corrida 38161910366 (PR #141, 11/10/2026): los tres jobs en verde, disparo `pull_request` |
| `actions-runs-ci-20261011.png` | Lista de corridas del workflow CI, con las del sprint |
| `coverage-backend-run38161910366.json` | `coverage-summary.json` del backend, tomado del artefacto `coverage-backend` de la corrida 38161910366 |
| `coverage-frontend-run38161910366.json` | `coverage-summary.json` del frontend, tomado del artefacto `coverage-frontend` de la misma corrida |
| `k6-summary-run38161910366.json` | Resumen de k6 (`--summary-export`), tomado del artefacto `k6-summary` de la misma corrida |

Las capturas se tomaron el 11/10/2026 desde la vista pública del repositorio, sin sesión iniciada; por eso los logs aparecen como «Sign in to view logs». En `actions-runs-ci-20261011.png`, GitHub etiqueta la corrida #96 (PR #140) como «Today at 11:19 PM». Según la API, esa corrida empezó el sábado 10/10/2026 a las 23:19 hora local (run 38114402060, `2026-10-11T05:19:16Z`). La fecha exacta de cada corrida está en `historial-corridas.md`.

Los reportes HTML completos de cobertura se publican en cada corrida como artefactos (`coverage-backend`, `coverage-frontend`) y GitHub los conserva 30 días. Aquí solo se versiona el resumen JSON.
