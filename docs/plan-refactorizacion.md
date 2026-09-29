# Plan de refactorización — Sprints 8 a 10

| Campo | Valor |
|---|---|
| Ticket | [SCRUM-56](https://kontroldevelopment.atlassian.net/browse/SCRUM-56) · Parte 2 |
| Responsable | Ivana Figueroa (24785) |
| Fecha | 28/09/2026 |

---

## 1. Línea base

El punto de partida es el inventario de SCRUM-30 tal como lo fija el ticket: **17 elementos, 7 en P1, 9 en P2 y 1 en P3, 60 SP** (`docs/deuda-tecnica.md` §2). El inventario asignó los 17 al Sprint 8.

| Grupo | Elementos | SP | Sección |
|---|---|---|---|
| Ejecutados en el Sprint 8 | DT-01, DT-04, DT-05, DT-06, DT-12, DT-13, DT-14 | 22 | §2 |
| Trasladados | DT-02, DT-03 | 8 | §3 |
| Restantes | DT-07, DT-08, DT-09, DT-10, DT-11, DT-15, DT-16, DT-17 | 30 | §4 |
| **Total de la línea base** | **17** | **60** | |

Este plan conserva las dos reglas de orden del inventario (`docs/deuda-tecnica.md` §5):

1. El denominador de cobertura real va primero, porque sin él ninguna prueba de caracterización protege nada. Ya se cumplió con DT-06.
2. La prueba de caracterización se mergea antes que la refactorización que cambia ese comportamiento.

Y añade una tercera, derivada de las pruebas de seguridad:

3. **Ningún release de `develop` a `main` sin cerrar antes los hallazgos altos de SCRUM-52** (DT-18), tal como pide `docs/pruebas-seguridad-zap.md` §6.

Los elementos que aparecieron después de la línea base —DT-18 a DT-21 de SCRUM-52 y los riesgos de volumen de SCRUM-53— van en la sección 5, marcada aparte.

---

## 2. Tareas ejecutadas en el Sprint 8 (7 elementos, 22 SP)

| Elemento | SP | Tareas | PR y fecha de merge a `develop` | Pruebas que lo fijan | Verificación en ambiente desplegado |
|---|---|---|---|---|---|
| DT-06 · Denominador de cobertura | 5 | T-11, T-12 | #119, 21/09/2026 | `coverage.include` en `backend/vitest.config.js` y `frontend/vitest.config.js`; política y cifras en el `README.md`, sección «Cobertura de código» | No aplica: control de CI |
| DT-04 · Parámetro de producto-proveedor | 1 | T-08 | #120, 22/09/2026 | `backend/tests/productSuppliers.controller.test.js`; `docs/plan-maestro-pruebas.md` §19.7 | — |
| DT-14 · Cabeceras de seguridad | 2 | T-24 | #121, 22/09/2026 | `backend/tests/security.test.js` | ZAP: 5 de 5 cabeceras en un endpoint público y uno autenticado; SEC2 pasa a Cubierto (`docs/pruebas-seguridad-zap.md` §4.1 y §7) |
| DT-05 · Autorización de inventario y proveedores | 5 | T-09, T-10 | #122, 24/09/2026 | `backend/tests/productSuppliers.controller.test.js`; los nueve casos de `authz.controller.test.js` siguen en verde | — |
| DT-12 · SSRF en el probador de integraciones | 3 | T-22 | #124, 24/09/2026 | `backend/tests/integrationSsrf.test.js`; `docs/plan-maestro-pruebas.md` §19.8 | ZAP: cumple parcialmente (`docs/pruebas-seguridad-zap.md` §4.3) |
| DT-01 · Middleware de errores | 3 | T-01, T-02 | #123, 26/09/2026 | `backend/tests/errorContract.test.js`, `backend/tests/errorHandler.test.js` | — |
| DT-13 · Límite de intentos | 3 | T-23 | #123, 26/09/2026 | `backend/tests/rateLimit.test.js` | ZAP: 429 por IP y por cuenta, sin evasión con `X-Forwarded-For` ni enumeración de usuarios (`docs/pruebas-seguridad-zap.md` §4.2) |
| **Total** | **22** | **11 tareas** | | | |

**Notas de estado:**

- **DT-12 queda cerrado en parte.** La corrección bloquea loopback, rangos privados, enlace local y los metadatos de GCP, pero el escaneo de SCRUM-52 encontró tres caminos que el guard no cubre: `0.0.0.0`, IPv6 mapeada a IPv4 y redirecciones, además de `sendWebhookEvent` sin guard. El inventario ya lo refleja como «parcial 25/09/2026, ver DT-18». Lo pendiente se planifica como DT-18 en §5.1.
- **DT-04 está mergeado pero no marcado en el inventario.** El PR #120 corrige el controlador —`productController.js` lee `supplierId`— y añade su prueba. `docs/deuda-tecnica.md` no lo anota como resuelto, a diferencia de los otros seis. Este plan lo cuenta como ejecutado y no edita el inventario.
- **Ninguno de los siete está en producción.** Producción corre `main` @ `66dc481`, del 07/09/2026. El release se planifica en §6.

---

## 3. Pendientes que se trasladan (2 elementos, 8 SP)

DT-02 y DT-03 se trasladan al Sprint 9. Los dos tuvieron avance en `develop` el 27/09/2026 con el PR #126, que se registra aquí porque cambia qué queda por hacer.

| Elemento | SP de la línea base | Avance registrado en `develop` | Lo que se traslada al Sprint 9 | SP restantes estimados |
|---|---|---|---|---|
| DT-02 · Precio de venta fijado por el cliente (P1) | 5 | PR #126, commit `d7a762b`: el servidor toma el precio de `producto.precio_venta`, rechaza con 409 si el cliente declara otro, calcula descuento e IVA y los persiste en la nueva cabecera `venta`. Pruebas en `backend/tests/createSale.controller.test.js` y `backend/tests/saleCalculation.test.js`, con vectores compartidos en `shared/test-vectors/sale-calculation.json` | Desplegar `develop` en el ambiente de pruebas, que hoy corre el esquema de `main` sin la tabla `venta` (`docs/pruebas-volumen.md` §2); repetir C5 de k6 y la población de volumen con `venta` (mitigación 7 de volumen); incluirlo en el release | 1 |
| DT-03 · Unicidad del código de barras (P1) | 3 | PR #126, commit `23e0fbc`: el escaneo reúne todas las coincidencias y, si hay varias, pregunta al cajero de qué proyecto vender, en lugar de tomar la primera. Prueba en `frontend/tests/barcodeScanner.test.js`. Equivale a T-05 y T-06 | Decidir T-07. El commit mantiene a propósito la unicidad por proyecto, porque cada proyecto es un inventario separado; el inventario proponía elevarla a la empresa. Si el equipo confirma la unicidad por proyecto, T-07 se cierra como descartada. Además, el escaneo sigue resolviendo en el navegador sobre el inventario completo, que es lo que degrada en volumen: se ejecuta junto con DT-22 | 3 |

**Por qué se trasladan y no se cuentan como ejecutados:** el ticket los declara pendientes, ninguno de los dos se verificó en el ambiente desplegado y en DT-03 queda abierta una decisión de diseño. Van al Sprint 9 por ser P1 con riesgo de dinero y de stock.

---

## 4. Calendario de los 8 elementos restantes (30 SP)

| Orden | Elemento | Prio. | SP | Sprint | Depende de | Justificación |
|---|---|---|---|---|---|---|
| 1 | DT-15 · Timeouts de salida y configuración del pool | P2 | 3 | 9 | — | Comparte el `fetch` endurecido con DT-18: `redirect: 'manual'` y el timeout van en la misma función, así que se hacen juntos. Además, parametrizar el pool es el paso de diagnóstico que dejó abierto SCRUM-28 para la latencia del login (`docs/pruebas-carga-estres.md` §5, punto 4), y activar la verificación del certificado cierra una salvedad de RNF-6.2 |
| 2 | DT-08 · Dependencias | P2 | 3 | 9 | — | `npm audit` bajó de 17 a 3 vulnerabilidades, con 0 críticas (`docs/pruebas-seguridad-zap.md` §5), así que T-15 quedó cubierta en la práctica. Queda T-16: la cadena `uploadthing` → `effect`, las tres altas restantes, con un cambio de versión mayor. Va antes del release y es prerrequisito del gate de auditoría de DT-11 |
| 3 | DT-11 · Linting y auditoría en CI | P3 | 3 | 9 | DT-08 | Es P3, pero se adelanta porque el Sprint 10 concentra los cambios que tocan más archivos (DT-07 toca 24). Con lint y `npm audit --audit-level=high` en el pipeline, esos cambios se revisan con una red automática. DT-04 fue un defecto que un linter habría señalado |
| 4 | DT-16 · Vistas temporales del agente | P2 | 3 | 10 | — | Hoy no hay fuga comprobada (`docs/deuda-tecnica.md` §3, DT-16), así que no compite con los P1 del Sprint 9. Va al inicio del Sprint 10 porque la trampa se activa con la primera consulta sin cualificar, y el Sprint 10 añade consultas nuevas (DT-10, DT-23, DT-25) |
| 5 | DT-07 · Capa de acceso a API | P2 | 5 | 10 | — | Multiplicador de coste del resto del frontend. T-13 crea `services/http.js` y T-14 migra Inventario y Dashboard, que son las dos vistas que cambian en DT-10 y DT-22 |
| 6 | DT-10 · Consultas del dashboard | P2 | 3 | 10 | DT-07 | El endpoint agregado sustituye las 1+N peticiones, y absorbe la caché de métricas que proponen SCRUM-28 (hallazgo 3) y volumen (mitigación 6). Ataca C2 y E2, el escenario con menos margen (1.25 veces su carga) |
| 7 | DT-17 · Tamaño del bundle | P2 | 5 | 10 | — | Independiente del backend. Es la medida objetiva que proponen RNF-3.3 y 5.3 en el análisis de requisitos, §4.4. Va después de DT-07 para no chocar en las mismas vistas públicas |
| 8 | DT-09 · Estilos y tema claro | P2 | 5 | 10 | — | Único elemento sin riesgo de datos, dinero ni seguridad. Primero en recortarse si el Sprint 10 no alcanza (§6) |

---

## 5. Añadidos después de la línea base del ticket (inventario actual: 21 / 70)

Esta sección recoge lo que no estaba en los 17 elementos y 60 SP de la línea base. El inventario de SCRUM-30 ya incluye DT-18 a DT-21, añadidos el 26/09/2026 a partir de SCRUM-52, con lo que suma **21 elementos y 70 SP** (`docs/deuda-tecnica.md` §2, «Ampliación del 26/09/2026»). Los riesgos de volumen de SCRUM-53 no están en el inventario; este plan los incorpora como DT-22 a DT-26, sin editar `docs/deuda-tecnica.md`.

### 5.1 Riesgos de SCRUM-52 (DT-18 a DT-21, 10 SP)

| Elemento | Hallazgo de ZAP y severidad | Prio. | SP | Sprint | Justificación del momento |
|---|---|---|---|---|---|
| DT-18 · Caminos de SSRF que el guard no cubre | 1 (Alta), 2 (Alta), 4 (Media) | P1 | 3 | 9 | Bloquea el release a `main` (`docs/pruebas-seguridad-zap.md` §6). Se ejecuta junto con DT-15 |
| DT-19 · Cabeceras en el HTML del SPA, `helmet` duplicado, versión de nginx, `Cache-Control` | 3 (Media), 5, 8 y 9 (Bajas) | P2 | 2 | 9 | Antes del release: el documento HTML es el que guarda el token en `localStorage` y hoy no lleva CSP |
| DT-20 · Entradas sin validar que devuelven 500 y HTML sin sanear | 6 y 7 (Bajas) | P3 | 2 | 10 | Sin fuga de información ni XSS explotable hoy. ZAP ya lo ubicó en los sprints 9 y 10; se agrupa en el 10 |
| DT-21 · Disco, logs, MongoDB compartido y despliegue del ambiente de pruebas | Hallazgos de infraestructura de la preparación (§6 de ZAP) | P1 | 3 | 9 | Es el primero del Sprint 9: sin disco ni un despliegue propio del ambiente de pruebas no se puede verificar DT-02 ni repetir volumen con `venta` |

### 5.2 Riesgos de SCRUM-53 (DT-22 a DT-26, 9 SP)

Las siete mitigaciones de `docs/pruebas-volumen.md` §6 quedan así: cinco pasan a ser elementos nuevos y dos se vinculan a elementos que ya las cubren.

| Mitigación de volumen | Elemento | Prio. | SP | Sprint | Justificación |
|---|---|---|---|---|---|
| 1 · Búsqueda del POS por código en el servidor y paginación del listado de productos | **DT-22** (nuevo) | P1 | 3 | 9 | Primer punto de degradación medido: N2, unos 7,500 productos por proyecto, «tamaño normal para una ferretería» (§5 de volumen). La búsqueda por código ya se midió en unos 30 ms en todos los niveles. Se ejecuta junto con el traslado de DT-03 |
| 2 · `GET /api/reports` filtrado por `r.id_empresa` y paginado | **DT-23** (nuevo) | P2 | 2 | 9 | Segundo punto de degradación (N3). El índice ya existe y no se usa |
| 5 · Índice de `presupuesto_actividad` por `id_proyecto` | **DT-26** (nuevo) | P2 | 1 | 9 | Una línea en `bootstrap.js`; quita un seq scan de métricas y del resumen |
| 4 · Filtro por empresa dentro de las subconsultas del resumen de reportes | **DT-25** (nuevo) | P2 | 2 | 10 | Hoy cumple (211 ms en N3), pero crece con el volumen de todas las empresas |
| 3 · Limitar la sección de reportes del PDF | **DT-24** (nuevo) | P3 | 1 | 10 | Afecta la utilidad del documento (más de 100 páginas desde unos 3,600 reportes), no el tiempo |
| 6 · Caché de 30 s de `/api/projects/:id/metrics` | Vinculada a **DT-10** | — | — | 10 | Misma agregación y misma técnica que DT-10; se ejecutan juntas |
| 7 · Desplegar `develop` en el ambiente de pruebas y repetir N2 con `venta` | Vinculada a **DT-21** y al traslado de **DT-02** | — | — | 9 | Depende del despliegue propio del ambiente de pruebas que incorpora DT-21 |

### 5.3 Riesgo de despliegue

| Riesgo | Evidencia | Mitigación |
|---|---|---|
| Producción no tiene ninguna corrección del Sprint 8 | `main` @ `66dc481`, del 07/09/2026; `docs/pruebas-seguridad-zap.md` §6 y §7 | Release de `develop` a `main` al cierre del Sprint 9, después de DT-18 y DT-19, con prueba de humo en producción y ZAP pasivo sobre producción |
| Los merges a `main` no son semanales desde el 07/09 | Historial de `main`; RNF-14.2 en el análisis de requisitos, §3.2 | Además del release del Sprint 9, un merge a `main` por semana en los sprints 9 y 10, siempre que DT-18 esté cerrado |

---

## 6. Calendario consolidado

### Sprint 8 (en curso) — ejecutado

7 elementos, 22 SP (§2). Además: SCRUM-52 y SCRUM-53 ejecutados, y DT-02 y DT-03 con avance en `develop`.

### Sprint 9 — seguridad, P1 y release

| Orden | Elemento | SP | Origen |
|---|---|---|---|
| 1 | DT-21 · Infraestructura y despliegue del ambiente de pruebas | 3 | SCRUM-52 |
| 2 | DT-18 · SSRF, junto con DT-15 | 3 | SCRUM-52 |
| 3 | DT-15 · Timeouts y pool | 3 | Línea base |
| 4 | DT-19 · Cabeceras del SPA | 2 | SCRUM-52 |
| 5 | DT-02 · Verificación en ambiente y re-medición (traslado) | 1 | Línea base |
| 6 | DT-03 · Decisión sobre T-07 (traslado), junto con DT-22 | 3 | Línea base |
| 7 | DT-22 · Búsqueda del POS en el servidor | 3 | SCRUM-53 |
| 8 | DT-23 · Listado de reportes por empresa y paginado | 2 | SCRUM-53 |
| 9 | DT-26 · Índice de `presupuesto_actividad` | 1 | SCRUM-53 |
| 10 | DT-08 · `uploadthing` | 3 | Línea base |
| 11 | DT-11 · Lint y auditoría en CI | 3 | Línea base |
| | **Total** | **27** | |

**Hito del Sprint 9:** release de `develop` a `main`, condicionado a DT-18 y DT-19.

### Sprint 10 — capa de frontend, rendimiento y deuda de P2/P3

| Orden | Elemento | SP | Origen |
|---|---|---|---|
| 1 | DT-16 · Vistas del agente | 3 | Línea base |
| 2 | DT-07 · Capa de acceso a API | 5 | Línea base |
| 3 | DT-10 · Endpoint agregado y caché de métricas | 3 | Línea base |
| 4 | DT-25 · Resumen de reportes por empresa | 2 | SCRUM-53 |
| 5 | DT-20 · Validación de entradas | 2 | SCRUM-52 |
| 6 | DT-24 · Límite del PDF | 1 | SCRUM-53 |
| 7 | DT-17 · Bundle de entrada | 5 | Línea base |
| 8 | DT-09 · Estilos y tema claro | 5 | Línea base |
| | **Total** | **26** | |

**Si el Sprint 10 no alcanza,** se recorta en este orden: DT-09 → DT-17 → DT-24 → DT-07 reducido a T-13, sin migrar vistas. No se recortan DT-16, DT-10 ni DT-20, porque cierran riesgos medidos.

### Entrega final — hito de cierre

Sin elementos de refactorización. Se reserva para repetir las pruebas no funcionales sobre la versión liberada y actualizar el análisis de requisitos:

- k6 C1 a C5.
- Volumen N2 con `venta`.
- ZAP pasivo.

### Resumen de SP

| Grupo | SP | Sprint |
|---|---|---|
| Ejecutados de la línea base | 22 | 8 |
| Trasladados de la línea base, restante estimado | 4 | 9 |
| Restantes de la línea base | 30 | 9 y 10 |
| DT-18 a DT-21 (SCRUM-52) | 10 | 9 y 10 |
| DT-22 a DT-26 (SCRUM-53) | 9 | 9 y 10 |
| **Planificado en los sprints 9 y 10** | **53** | 27 + 26 |

Los 4 SP trasladados son el esfuerzo restante estimado de DT-02 y DT-03, no los 8 de la línea base, por el avance registrado en §3.

---

## 7. Matriz de riesgos y elementos que los mitigan

Cada riesgo detectado en las pruebas no funcionales, con el elemento que lo mitiga y el requisito no funcional afectado (`docs/analisis-requisitos-no-funcionales.md` §2).

| Origen | Riesgo | Elemento | Sprint | RNF afectado |
|---|---|---|---|---|
| SCRUM-28, hallazgos 1 y 5 | Login con p95 de 4.99 s; E1 degrada en su carga base | DT-13 (ejecutado) contra el abuso; DT-15 para el diagnóstico del pool | 8 y 9 | RNF-13.3 |
| SCRUM-28, hallazgo 3 | C2 y C5 con varias consultas por petición; E2 con 1.25 veces de margen | DT-10, DT-22 | 9 y 10 | RNF-13.3, 3.2 |
| SCRUM-28, hallazgo 4 | Pruebas en la misma VM restan CPU a producción; sin límite de CPU por contenedor | DT-21: se añade a su alcance `deploy.resources.limits.cpus` en `docker-compose.test.yml` | 9 | RNF-9.1 |
| SCRUM-28, hallazgo 6 | Despliegues sin `--force-recreate` dejaban imágenes viejas | Cerrado en SCRUM-28 (`scripts/deploy.sh`) | — | RNF-9.1 |
| SCRUM-52, hallazgos 1, 2 y 4 | SSRF por `0.0.0.0`, IPv6 mapeada, redirecciones y `sendWebhookEvent` | DT-18 | 9 | RNF-6.3 |
| SCRUM-52, hallazgos 3, 5, 8 y 9 | HTML del SPA sin cabeceras, CSP efectiva distinta de la configurada, versión de nginx y caché | DT-19 | 9 | RNF-6.2 |
| SCRUM-52, hallazgos 6 y 7 | 500 ante entrada inválida; HTML sin sanear en campos libres | DT-20 | 10 | RNF-6.3 |
| SCRUM-52, §5 | Tres vulnerabilidades altas en la cadena `uploadthing` | DT-08 | 9 | — |
| SCRUM-52, §6 | Disco al 98 %, MongoDB compartido y caído, despliegue sin ambiente de pruebas propio | DT-21 | 9 | RNF-9.1, 9.3 |
| SCRUM-52, §6 | Producción sin las correcciones del sprint | Release del Sprint 9 (§5.3) | 9 | RNF-6.2, 6.3, 14.2 |
| SCRUM-53, §5 | POS degradado desde N2, 4 MB por escaneo | DT-22, junto con DT-03 | 9 | RNF-13.3 |
| SCRUM-53, §5 | Listado de reportes degradado en N3, sin paginar | DT-23 | 9 | RNF-3.1 |
| SCRUM-53, §4 | `presupuesto_actividad` sin índice | DT-26 | 9 | RNF-3.1 |
| SCRUM-53, §5 | Resumen de reportes crece con los datos de todas las empresas | DT-25 | 10 | RNF-3.1 |
| SCRUM-53, §3.3 | PDF de más de 100 páginas desde unos 3,600 reportes | DT-24 | 10 | — |
| SCRUM-53, §6 | Métricas de proyecto con crecimiento sostenido | DT-10 | 10 | RNF-13.3 |
| SCRUM-53, §2 y §6 | Ambiente de pruebas con el esquema de `main`, sin la tabla `venta` | DT-21 y traslado de DT-02 | 9 | — |

---

## 8. Verificación del criterio de aceptación

| Requisito del ticket, Parte 2 | Estado |
|---|---|
| Plan que cubra este sprint y los que restan del semestre, partiendo del inventario de 17 elementos y 60 SP de SCRUM-30 | Cumplido: línea base en §1; calendario de los sprints 8, 9 y 10 y del hito de cierre en §6 |
| Especificar las tareas ejecutadas en este sprint: siete elementos, 22 SP | Cumplido en §2, con PR, pruebas y verificación de cada uno. Anotado que DT-12 queda cerrado en parte y que DT-04 no está marcado en el inventario |
| Declarar los dos pendientes que se trasladan: DT-02 y DT-03 | Cumplido en §3, con el avance registrado en `develop` y lo que efectivamente se traslada |
| Ubicar los 8 restantes en los sprints siguientes, con orden y justificación | Cumplido en §4 |
| Incorporar los riesgos nuevos de SCRUM-52 y SCRUM-53 | Cumplido en §5, marcado como añadido después de la línea base: DT-18 a DT-21 y DT-22 a DT-26. Vinculados a sus elementos en §7 |
