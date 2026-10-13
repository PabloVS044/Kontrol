# Evidencia — automatización de pruebas unitarias y de carga en CI

Sprint del 08 al 12/10/2026. Corte: domingo 11/10/2026.

| Archivo | Qué muestra |
|---|---|
| `proceso-ci.md` | Descripción del proceso de integración continua, herramientas con versión exacta y frecuencia real de ejecución |
| `historial-corridas.md` | Corridas de CI del sprint, día por día y una por una, con los huecos señalados |
| `workflow-ci.md` | `ci.yml` anotado: qué job corre cada tipo de prueba y con qué disparador |
| `actions-run-38161910366-20261011.png` | Corrida 38161910366 (PR #141, 11/10/2026 11:59): primera corrida con los tres jobs, todos en verde, disparo `pull_request` |
| `actions-run-38163669132-20261011.png` | Corrida 38163669132 (PR #141, 11/10/2026 12:24): los tres jobs en verde con los umbrales de cobertura nuevos de backend y frontend |
| `actions-runs-ci-20261011.png` | Lista de corridas del workflow CI, con las del sprint |
| `coverage-backend-run38163669132.json`, `coverage-frontend-run38163669132.json` | `coverage-summary.json` de backend y frontend de la corrida 38163669132, la más reciente al corte (artefactos `coverage-backend` y `coverage-frontend`) |
| `k6-summary-run38163669132.json` | Resumen de k6 (`--summary-export`) de la corrida 38163669132 (artefacto `k6-summary`) |
| `coverage-*-run38161910366.json`, `k6-summary-run38161910366.json` | Los mismos reportes de la primera corrida, antes de las pruebas nuevas de frontend: frontend en 10.61 / 10.43 / 12.72 / 10.96 |

Las capturas se tomaron el 11/10/2026 desde la vista pública del repositorio, sin sesión iniciada; por eso los logs aparecen como «Sign in to view logs». En `actions-runs-ci-20261011.png`, GitHub etiqueta la corrida #96 (PR #140) como «Today at 11:19 PM». Según la API, esa corrida empezó el sábado 10/10/2026 a las 23:19 hora local (run 38114402060, `2026-10-11T05:19:16Z`). La fecha exacta de cada corrida está en `historial-corridas.md`.

Los reportes HTML completos de cobertura se publican en cada corrida como artefactos (`coverage-backend`, `coverage-frontend`) y GitHub los conserva 30 días. Aquí solo se versiona el resumen JSON.
