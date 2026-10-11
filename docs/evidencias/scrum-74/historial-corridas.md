# Historial de corridas de CI — sprint del 08 al 12/10/2026

Fuente: `gh run list` y `gh run view` sobre el repositorio `PabloVS044/Kontrol`, workflows `CI` (`ci.yml`) y `Load and Stress Tests (k6)` (`load-test.yml`). Horas en hora local de Guatemala (UTC−6). Corte: domingo 11/10/2026, después de la corrida 38163669132. Ninguna corrida de esta tabla se relanzó: cada una lleva la fecha en que se ejecutó por primera vez.

## Por día

| Día | Pruebas unitarias (Backend + Frontend) | Pruebas de carga (k6) |
|---|---|---|
| Jue 08/10 | 4 corridas, 4 en verde | **Sin corridas** |
| Vie 09/10 | 3 corridas: 1 en rojo, 2 en verde | **Sin corridas** |
| Sáb 10/10 | 1 corrida, en verde | **Sin corridas** |
| Dom 11/10 | 3 corridas, 3 en verde | 3 corridas, 3 en verde |
| Lun 12/10 | — (posterior al corte) | — (posterior al corte) |

## Huecos y por qué

- **k6, del 08 al 10/10: sin corridas.** Hasta el 11/10 la prueba de carga solo existía en `load-test.yml`, con disparo manual (`workflow_dispatch`); su última corrida fue el 07/09/2026. El ambiente de pruebas de la VM, que es su objetivo, además no respondía el 11/10. El job automático «Carga - k6» entró en `ci.yml` el 11/10 (PR #141), y desde esa fecha corre en cada pull request.
- **Unitarias: los días sin corrida son días sin pull requests.** `ci.yml` se dispara con `pull_request` hacia `main` o `develop`, no con cada push.
- No hay corridas verdes de ambos tipos de prueba antes del 11/10. No se relanzaron corridas viejas para cubrir ese hueco.

## Detalle de cada corrida

| Fecha y hora | Run | Rama del PR | Backend - tests unitarios | Frontend - tests unitarios y build | Carga - k6 |
|---|---|---|---|---|---|
| Jue 08/10 19:35 | [37870522450](https://github.com/PabloVS044/Kontrol/actions/runs/37870522450) | `test/integration-regression` | ✅ | ✅ | — |
| Jue 08/10 22:00 | [37881893117](https://github.com/PabloVS044/Kontrol/actions/runs/37881893117) | `refactor/DT-15-timeouts-pool-tls` | ✅ | ✅ | — |
| Jue 08/10 22:53 | [37885997339](https://github.com/PabloVS044/Kontrol/actions/runs/37885997339) | `main` (back-merge a `develop`) | ✅ | ✅ | — |
| Jue 08/10 22:56 | [37886182134](https://github.com/PabloVS044/Kontrol/actions/runs/37886182134) | `fix/secondary-text-contrast` | ✅ | ✅ | — |
| Vie 09/10 22:32 | [38024416498](https://github.com/PabloVS044/Kontrol/actions/runs/38024416498) | `test/integration-regression` | ❌ | ✅ | — |
| Vie 09/10 22:35 | [38024578307](https://github.com/PabloVS044/Kontrol/actions/runs/38024578307) | `test/integration-regression` | ✅ | ✅ | — |
| Vie 09/10 22:46 | [38025223622](https://github.com/PabloVS044/Kontrol/actions/runs/38025223622) | `refactor/aggregated-budget-endpoint` | ✅ | ✅ | — |
| Sáb 10/10 23:19 | [38114402060](https://github.com/PabloVS044/Kontrol/actions/runs/38114402060) | `feat/integrations-cards-ux` | ✅ | ✅ | — |
| Dom 11/10 11:59 | [38161910366](https://github.com/PabloVS044/Kontrol/actions/runs/38161910366) | `feat/unit-load-ci` | ✅ | ✅ | ✅ |
| Dom 11/10 12:11 | [38162739574](https://github.com/PabloVS044/Kontrol/actions/runs/38162739574) | `feat/unit-load-ci` | ✅ | ✅ | ✅ |
| Dom 11/10 12:24 | [38163669132](https://github.com/PabloVS044/Kontrol/actions/runs/38163669132) | `feat/unit-load-ci` | ✅ | ✅ (umbral nuevo 14/13/16/14) | ✅ |

El único rojo (run 38024416498) fue una falla real: 5 pruebas de `saleCalculation.test.js` y `createSale.controller.test.js` fallaron en el PR #135. El autor corrigió el código y el siguiente push, 3 minutos después (run 38024578307), pasó. El pipeline hizo lo que tenía que hacer: frenó un cambio con pruebas rotas.

## Resumen

- 11 corridas de `ci.yml` del 08 al 11/10, en 4 días distintos. 10 en verde y 1 en rojo por una falla real.
- Pruebas unitarias en verde los 4 días con corridas (08, 09, 10 y 11/10).
- Pruebas de carga automáticas en verde en las 3 corridas del 11/10. Antes de esa fecha no hubo corridas de carga en el sprint.
