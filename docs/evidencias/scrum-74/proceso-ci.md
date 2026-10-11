# Proceso de integración continua

## Cómo se llevó a cabo

La integración continua de Kontrol corre en GitHub Actions con un solo workflow, `.github/workflows/ci.yml`. Lo dispara cada pull request hacia `develop` (la rama de integración) o hacia `main` (la rama de entrega), y también cada commit nuevo que se sube a un pull request abierto. Nadie lo lanza a mano. El flujo de trabajo sigue GitFlow: cada cambio sale de una rama `feat/`, `fix/`, `test/`, etc., se abre un PR hacia `develop`, y el resultado del pipeline aparece en el PR antes de que alguien lo revise.

El workflow corre tres jobs en paralelo, cada uno en una máquina virtual limpia de GitHub (`ubuntu-24.04`):

1. **Backend - tests unitarios.** Instala las dependencias con `npm ci` y corre la suite de Vitest del backend con medición de cobertura v8. La cobertura funciona como control: si una métrica global (sentencias, ramas, funciones, líneas) o la de un módulo crítico (presupuesto, autenticación, reportes, POS) queda bajo su umbral, Vitest sale con error y el job queda en rojo.
2. **Frontend - tests unitarios y build.** Igual que el anterior, sobre la suite del frontend (componentes Vue montados en `happy-dom`), y además compila el build de producción con Vite para detectar errores que las pruebas no ven.
3. **Carga - k6.** Levanta dentro de la máquina de GitHub un PostgreSQL 16 desechable, carga el esquema (`backend/kontrol.sql`), arranca el backend y siembra los datos de prueba. Después ejecuta con k6 los cinco escenarios del plan maestro de pruebas (C1 inicio de sesión, C2 proyectos, C3 registro de avance, C4 reportes, C5 venta en POS) en un perfil corto de 5 a 10 usuarios virtuales concurrentes, unos 3.5 minutos en total. Los umbrales son los de la sección 7.2 del plan, sin modificar: latencia p95 de 300 ms en inicio de sesión, 500 ms en lecturas y 800 ms en escrituras, y menos de 1 % de errores. Si se cruza cualquiera, k6 sale con error y el job queda en rojo. Como el ambiente se crea y se destruye en cada corrida, no toca el ambiente de pruebas compartido de la VM ni necesita secretos.

Ningún job está marcado como opcional ni lleva `continue-on-error`. Los jobs de pruebas unitarias son checks obligatorios en `develop` y `main` (rulesets `protect-develop` y `protect-main`): un PR no se puede mergear si cualquiera de los dos está en rojo. Cada corrida publica como artefactos descargables el reporte de cobertura de backend y de frontend (HTML, JSON y Clover) y el resumen de k6, que se conservan 30 días. El README muestra un badge con el estado de la última corrida del workflow.

El job de carga es una prueba de regresión de rendimiento: confirma en cada cambio que la API sigue respondiendo dentro de los umbrales con usuarios concurrentes. No mide la capacidad máxima del sistema. Esa medición se hizo con la batería completa de k6 (C1–C5 en carga, E1–E5 en estrés) contra el ambiente de pruebas de la VM, se documenta en `docs/pruebas-carga-estres.md`, y se lanza de forma manual con el workflow `load-test.yml`, porque dura unos 40 minutos y modifica datos del ambiente compartido con las sesiones de usabilidad.

## Herramientas automatizadas

Versiones exactas tomadas de los logs de las corridas [38161910366](https://github.com/PabloVS044/Kontrol/actions/runs/38161910366) y [38163669132](https://github.com/PabloVS044/Kontrol/actions/runs/38163669132) (11/10/2026), idénticas en ambas, y del `package-lock.json` que instala `npm ci`.

| Herramienta | Versión | Uso |
|---|---|---|
| GitHub Actions (runner) | 2.337.0 | Plataforma de integración continua |
| Imagen del runner | Ubuntu 24.04, release 20261004.327 | Sistema operativo de cada job |
| Node.js | 22.23.3 (fijado a la línea 22 por `.nvmrc`) | Entorno de ejecución |
| npm | 10.9.9 | Instalación reproducible con `npm ci` sobre `package-lock.json` |
| Vitest | 4.1.11 | Ejecutor de pruebas unitarias, backend y frontend |
| @vitest/coverage-v8 | 4.1.11 | Medición de cobertura y umbrales |
| Supertest | 7.3.0 | Peticiones HTTP a la app Express en las pruebas de backend |
| @vue/test-utils | 2.5.1 | Montaje de componentes Vue en las pruebas de frontend |
| happy-dom | 20.14.5 | DOM simulado para las pruebas de frontend |
| Vite | 6.4.3 | Build de producción del frontend |
| k6 (Grafana) | 2.3.0 | Pruebas de carga |
| PostgreSQL | 16.15 (imagen `postgres:16-alpine`) | Base de datos desechable del job de carga |
| actions/checkout | v4 (SHA `11d5960a`) | Descarga del repositorio |
| actions/setup-node | v4 (SHA `49933ea5`) | Instalación de Node.js y caché de npm |
| actions/upload-artifact | v4 (SHA `ea165f8d`) | Publicación de reportes de cobertura y del resumen de k6 |
| grafana/setup-k6-action | v1 (SHA `43b9fc21`) | Instalación de k6 en el runner |

## Frecuencia durante el sprint (08 al 12/10/2026)

Corte: domingo 11/10/2026, después de la corrida 38163669132. Detalle por corrida en `historial-corridas.md`.

- **Pruebas unitarias:** 11 corridas en 4 días distintos (jueves 08, viernes 09, sábado 10 y domingo 11), siempre disparadas por un pull request. 10 en verde y 1 en rojo. El rojo fue una falla real, 5 pruebas de cálculo de ventas rotas en el PR #135; se corrigió en el siguiente push, 3 minutos después, que pasó en verde.
- **Pruebas de carga:** el job automático entró al pipeline el domingo 11/10 (PR #141) y ese día corrió 3 veces, las 3 en verde junto con los dos jobs unitarios. Del 08 al 10/10 no hubo corridas de carga: hasta entonces solo existía la batería manual, que no se lanzó en el sprint, y el ambiente de pruebas de la VM, su objetivo, no respondía.
- **Ambos tipos en verde en la misma corrida:** 3 corridas, todas del 11/10. Las corridas posteriores al corte quedan registradas en la pestaña Actions del repositorio con su fecha real.

## Cobertura y umbrales

El 11/10/2026 se aplicó el trinquete de cobertura que estaba atrasado. En backend se subió el umbral global de 15/9/11/15 a 25/19/21/25 (pasos del Sprint 8 y del Sprint 9 juntos). En frontend, la cobertura no alcanzaba ni el paso del Sprint 8; se añadieron 95 pruebas unitarias de utilidades, servicios, stores y del composable de tema, y con ellas se subió el umbral de 9/8/11/9 a 14/13/16/14. El paso del Sprint 9 en frontend (19/18/21/19) queda pendiente.

Resultados de la corrida 38163669132, la más reciente al corte:

| | Pruebas | Statements | Branches | Functions | Lines | Umbral global |
|---|---|---|---|---|---|---|
| Backend | 359 | 37.79 % | 24.30 % | 35.72 % | 38.33 % | 25 / 19 / 21 / 25 |
| Frontend | 440 | 16.24 % | 16.49 % | 18.47 % | 16.65 % | 14 / 13 / 16 / 14 |

| Escenario k6 | p95 medido | Umbral | Errores |
|---|---|---|---|
| C1 inicio de sesión | 50.94 ms | 300 ms | 0 % |
| C2 proyectos y métricas | 3.49 ms | 500 ms | 0 % |
| C3 registro de avance | 7.16 ms | 800 ms | 0 % |
| C4 listado de reportes | 5.11 ms | 500 ms | 0 % |
| C4 exportación de reporte | 4.54 ms | 800 ms | 0 % |
| C5 venta en POS | 7.21 ms | 800 ms | 0 % |

1 571 de 1 571 verificaciones aprobadas (100 %).

Estas latencias corresponden a un backend local dentro del runner, sin red de por medio, con 5 a 10 usuarios. No son comparables con las de la VM en `docs/pruebas-carga-estres.md`.
