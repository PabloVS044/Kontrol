# Comparativa de pruebas no funcionales contra los requisitos del diseño — Sprint 9

## 1. Línea base, insumos y método

### 1.1 Requisitos del diseño

La línea base son los **42 requisitos no funcionales** del informe final de Ingeniería de Software 1, en 14 categorías de tres requisitos cada una. El texto literal de cada requisito y su forma de medición están en `docs/analisis-requisitos-no-funcionales.md` §2, recuperados del informe sin modificarlos; aquí no se repiten. La matriz de la sección 2 cita cada requisito en forma resumida, junto con el umbral que fijó el diseño. Cuando el diseño no dio umbral, se anota «sin umbral» y, si existe, el que propuso SCRUM-56 en §4.4 de aquel documento.

Las observaciones de SCRUM-56 siguen vigentes: diez requisitos citan pantallas, reportes, roles o módulos que no existen con ese nombre, y siete no tienen métrica. Este documento no las corrige; las tiene en cuenta en la columna Cobertura.

### 1.2 Pruebas contrastadas

Se contrastan todas las pruebas no funcionales ejecutadas hasta el Sprint 9, no solo las que nombra el ticket, porque algunas de ellas son las únicas que tocan ciertos requisitos.

| # | Prueba | Ticket | Sprint | Fecha | Resultados |
|---|---|---|---|---|---|
| P1 | Autorización por rol y por empresa, nueve casos en Vitest | SCRUM-9 | 5, en CI desde entonces | — | `backend/tests/authz.controller.test.js`; `docs/plan-maestro-pruebas.md` §9.3 |
| P2 | Usabilidad moderada, Fase 1 (T1 a T5) | SCRUM-26, SCRUM-27 | 7 | 06/09/2026 | `docs/pruebas-usabilidad/analisis-hallazgos.md` |
| P3 | Carga con k6 (C1 a C5) en la VM de 2 vCPU | SCRUM-28 | 7 | 07/09/2026 | `docs/pruebas-carga-estres.md` §2 |
| P4 | Estrés con k6 (E1 a E5) | SCRUM-28 | 7 | 07/09/2026 | `docs/pruebas-carga-estres.md` §3 |
| P5 | Seguridad: OWASP ZAP pasivo y activo, verificación dirigida, `npm audit` | SCRUM-52 | 8 | 26/09/2026 | `docs/pruebas-seguridad-zap.md` |
| P6 | Volumen con pgbench y k6 (N0 a N3) | SCRUM-53 | 8 | 27 y 28/09/2026 | `docs/pruebas-volumen.md` |
| P7 | Usabilidad moderada, Fase 2 (F1 a F5) | — | 8 | 27/09/2026 | `docs/pruebas-usabilidad/analisis-hallazgos-fase2.md`, `Registro_sesiones_usabilidad_Fase_2.xlsx` |
| P8 | Regresión de seguridad: ZAP 2.17.0, verificación dirigida y verificación de DT-15 | SCRUM-70 (G-1) | 9 | 10/10/2026 | `docs/pruebas-regresion-seguridad-volumen.md` §3 a §5 |
| P9 | Regresión de volumen: pgbench 17.11 y k6 v2.3.0, N0 a N3 | SCRUM-70 (G-1) | 9 | 11/10/2026 | `docs/pruebas-regresion-seguridad-volumen.md` §6 |
| P10 | Medición antes y después del resumen de presupuesto del dashboard | SCRUM-68 (DT-10) | 9 | 09/10/2026 | `backend/scripts/bench-results/dt10-*.json`; `docs/plan-maestro-pruebas.md` §19.9 |
| P11 | Pruebas de timeout, pool y TLS | SCRUM-67 (DT-15) | 9 | 08/10/2026 | `backend/tests/integrationTimeouts.test.js`, `poolConfig.test.js`, `poolStats.test.js` |
| P12 | Contraste WCAG AA de los tokens de texto y de alerta, automatizado en CI | SCRUM-63 (UX-R3) | 9 | 08/10/2026 | `frontend/tests/theme.test.js`; `frontend/docs/design-system.md` §9 |
| P13 | Carga con k6 (C1 a C5) en CI, perfil corto, en cada pull request | SCRUM-74 (G-7) | 9 | 11/10/2026 | `docs/evidencias/scrum-74/` |
| P14 | Integración y regresión contra PostgreSQL real (I1 a I3, RG1 a RG3) | Rama `test/integration-regression` | 9 | 08 y 09/10/2026 | `README.md`, «Pruebas de integración y regresión». Integrada en esta rama; aún sin merge a `develop` |

Dos aclaraciones sobre los insumos:

- **P13 no mide capacidad.** Corre en el runner de GitHub contra un backend y un Postgres desechables, con 5 a 15 usuarios virtuales y unos 3.5 minutos en total (`k6/ci-load-test.js`). Es una red contra regresiones de latencia, no una medición en la VM. Sus resultados no se usan para RNF-13.3.
- **La inundación sigue sin ejecutarse.** SCRUM-53 se definió como «volumen e inundación», y la guía del Sprint 9 la cita como insumo. El Sprint 8 solo ejecutó la parte de volumen: pgbench y k6 con 5 usuarios sobre los niveles N1 a N3. Su presentación de cierre (14 al 28/09/2026) registra la inundación como faltante, junto con otras cuatro: «Faltan: inundación, navegadores, TLS, disponibilidad, respaldo». La regresión de G-1 repitió volumen y seguridad, pero tampoco corrió inundación. No hay script ni resultado en el repositorio. Se trata como faltante en §4.1.

Fuentes del Sprint 8 consultadas, además de los documentos del repositorio: la presentación de cierre del sprint ([artifact](https://claude.ai/artifact/SAHeNh8KkzDNCUCg8MA8cz)) y su guion por integrante ([artifact](https://claude.ai/artifact/9eeeLkYYAAAyNvmyrDna9v)). Coinciden con los documentos del repositorio en todas las cifras que se usan aquí.

### 1.3 Escala del veredicto

El ticket pide tres estados por requisito:

| Veredicto | Significado |
|---|---|
| **Cumple** | Una prueba ejecutada mide el requisito y el resultado queda dentro de su umbral |
| **No cumple** | Una prueba ejecutada mide el requisito y el resultado queda fuera de su umbral |
| **Sin validar** | Ninguna prueba mide lo que el requisito pide, o la que lo toca no es concluyente |

Dos columnas acompañan al veredicto:

- **Vía.** *Prueba* o *Inspección*. La inspección cuenta como validación solo cuando el propio diseño la fijó como forma de medición: «inspección del repositorio», «revisión de la arquitectura», «auditoría del historial de commits», «verificación de la configuración de localización». SCRUM-56 anotó esas inspecciones sin contarlas; este documento sí las cuenta, y §3 da las dos cifras para que el cambio de método no se lea como avance del sistema.
- **Cobertura.** *Completa* o *Parcial*. Es parcial cuando la prueba mide una parte del requisito, o un caso equivalente porque la pantalla, el rol o el módulo que cita el requisito no existe con ese nombre.

Correspondencia con la escala de SCRUM-56: «Cumple parcialmente» pasa a Cumple con cobertura parcial; «No concluyente» y «Sin prueba» pasan a Sin validar.

### 1.4 Alcance

Todas las pruebas se ejecutaron en el ambiente de pruebas de SCRUM-25, en una base local o en CI; nunca contra producción, salvo el monitoreo pasivo de su health check durante ZAP (P5 y P8).

A diferencia del Sprint 8, producción ya no corre el `main` del 07/09. Desde el 10/10/2026 corre `develop` @ `28f5580`, desplegado durante G-1 (`docs/pruebas-regresion-seguridad-volumen.md` §4, fila «§6»), que incluye DT-15 y DT-10. Los controles verificados en el ambiente de pruebas (cabeceras de la API, límite de intentos, timeouts) están por tanto también en producción, y también lo están los hallazgos abiertos. Lo mergeado después de `28f5580` (PR #140 a #144) y lo que integra esta rama no está en producción.

---

## 2. Matriz RNF × prueba

Umbral: el que fijó el diseño. Prueba: la de §1.2 que valida el requisito, con su sprint. Resultado: la cifra o el hecho medido.

| ID | Requisito (resumen) | Umbral del diseño | Prueba y sprint | Resultado | Vía | Veredicto | Cobertura |
|---|---|---|---|---|---|---|---|
| RNF-1.1 | Paleta de alto contraste en el tablero, con los indicadores de riesgo en rojo | Fondo oscuro #1A1A1A; riesgo en rojo | P12 · S9 | Superficies reales #111111 y #282825, oscuras como pide el prototipo aunque no son #1A1A1A. Los cuatro niveles de alerta y el texto de error (#e46868) superan 4.5:1; el error da 5.83:1 sobre #111111. Lo fija una prueba en CI | Prueba | **Cumple** | Parcial: «Executive Overview» no existe; se valida sobre los tokens que usa el dashboard |
| RNF-1.2 | Barras de distribución del presupuesto con porcentaje legible | Legible a 1 m en monitor de 24" | — | Ninguna prueba a distancia. UX-R3 subió el contraste tras reportes de texto ilegible «a distancia y sin lentes», pero no midió la lectura a 1 m | — | **Sin validar** | — |
| RNF-1.3 | Minimalismo y buen contraste entre colores | Sin umbral (SCRUM-56 propone WCAG AA) | P12 · S9 | Todos los tokens de texto superan 4.5:1 sobre las tres superficies, incluido el pico del fondo animado (#272727). Antes de UX-R3 bajaban a 1.5:1 | Prueba | **Cumple** | Parcial: solo el contraste es medible; el tema claro sigue sin paleta |
| RNF-2.1 | Ver la salud de todos los proyectos en poco tiempo tras iniciar sesión | Menos de 10 s | P2 · S7; P10 · S9 | T1: 50, 75 y 105 s, incluyendo el login y la pausa de pensar en voz alta. Componente técnico con 100 proyectos: el resumen de presupuesto pasa de 101 peticiones (p95 131 ms) a 2 (p95 10 ms en frío) | Prueba | **Sin validar** | Ninguna prueba cronometra desde que carga el dashboard. El componente técnico queda muy por debajo de 10 s |
| RNF-2.2 | Respuesta del agente de IA en pocas interacciones | 3 interacciones o menos | — | Sin prueba | — | **Sin validar** | — |
| RNF-2.3 | Interfaces familiares, curva de aprendizaje baja | Sin umbral (SCRUM-56 propone 90 % de tareas sin inducción) | P2 · S7; P7 · S8 | 14 de 15 tareas (93 %) en las dos fases. La fricción se concentra en adjuntar evidencia, en encontrar dónde vender (F3: 200 s sobre 180 s, el único fallo) y en leer las opciones de marketing sin el cursor. En el S9, UX-R2 reorganizó Ventas y UX-R3 corrigió las listas ilegibles, pero la repetición de las tareas de venta y marketing que la Fase 2 dejó planificada no se hizo | Prueba | **Cumple** | Parcial |
| RNF-3.1 | Reporte de sobrecosto de presupuesto | 3 s o menos | P3, P4 · S7; P6 · S8; P9, P10, P13 · S9 | Peor caso: E4, 2.41 s al degradar con unos 124 VUs. Con carga normal: listado de reportes 620 ms (C4) y 499 ms con volumen N3 (S9); resumen de reportes 197 ms en N3; resumen de presupuesto con alerta de sobregiro, p95 10 ms con 100 proyectos | Prueba | **Cumple** | Parcial: no existe un reporte llamado «Budget Overrun»; se usan los reportes y el resumen con alerta de sobregiro |
| RNF-3.2 | Actualizaciones simultáneas sin bloqueos | 50 simultáneas | P3, P4 · S7; P13 · S9 | C3: 30 VUs, p95 300 ms, 0 % de error. E3: sin errores hasta unos 232 VUs. CI: 0 % de error | Prueba | **Cumple** | Parcial: se midió sobre avances de proyecto, no sobre tareas; sin prueba de inundación |
| RNF-3.3 | Poco JavaScript por petición | Sin umbral (SCRUM-56 propone entrada de menos de 500 kB) | Build de este documento · S9 | Chunk de entrada de 1,302 kB (393 kB comprimidos). En el S7 era de 1,236 kB: creció | — | **Sin validar** | La forma de medición del diseño, un benchmark contra sitios de referencia, no se hizo. Contra el umbral propuesto no cumpliría |
| RNF-4.1 | Widgets nuevos sin recompilar el núcleo | Sin recompilar | Revisión de la arquitectura · S9 | El frontend es un solo build de Vite, sin mecanismo de plugins ni micro-frontends: un widget nuevo exige recompilar y redesplegar | Inspección | **No cumple** | Completa |
| RNF-4.2 | Código del agente documentado | Un desarrollador nuevo entiende los prompts en menos de 4 h | — | Sin prueba | — | **Sin validar** | — |
| RNF-4.3 | Espacio de comunidad para recibir feedback | Sin umbral | — | Sin prueba. La demo de G-6 recoge comentarios en sesión, pero no es una funcionalidad del sistema | — | **Sin validar** | — |
| RNF-5.1 | Tablero 100 % responsivo | Tablets desde 1024x768 | — | Sin prueba | — | **Sin validar** | — |
| RNF-5.2 | Acceso desde varios navegadores | Safari, Edge y Chrome, móvil y escritorio | — | Sin prueba | — | **Sin validar** | — |
| RNF-5.3 | Eficiente en dispositivos con pocos recursos | Sin umbral | — | Sin prueba en el cliente | — | **Sin validar** | — |
| RNF-6.1 | Datos financieros del resumen de presupuesto restringidos por rol | Solo los roles «Finanzas» y «Dueño de Proyecto» | P1 · S5; P5 · S8; P8, P10, P14 · S9 | Nueve casos de autorización en verde. El endpoint agregado del resumen responde 401 o 403, entrega a un colaborador solo sus proyectos y resuelve el acceso antes de leer la caché (RA4, RA5, RA10). RG3 confirma contra Postgres real que una empresa no ve ni vende datos de otra. ZAP activo: 0 alertas altas y 0 medias en la API, en S8 y en S9 | Prueba | **Cumple** | Parcial: los dos roles del requisito no existen; se prueba con los reales |
| RNF-6.2 | Comunicaciones cifradas | TLS 1.3 | P5 · S8; P8, P11 · S9 | HSTS en la API desde el S8, y las cinco cabeceras se mantienen en el S9. Desde DT-15, la conexión a la base de pruebas verifica el certificado (`Verify return code: 0 (ok)`). El HTML del SPA sigue sin cabeceras (hallazgo 3 de ZAP, Media, abierto). La versión de TLS negociada no se midió en ningún sprint | Prueba | **Cumple** | Parcial: el cifrado se verificó en dos tramos; TLS 1.3 sin medir. Producción usa Postgres local sin TLS |
| RNF-6.3 | Restricciones por tipo de usuario | Sin umbral numérico | P1 · S5; P5 · S8; P8, P10 · S9 | Rechazos por rol y por empresa en CI. El límite de intentos se mantiene en el S9: 19 respuestas 429 de 20, y un `X-Forwarded-For` falsificado no lo evade | Prueba | **Cumple** | Completa |
| RNF-7.1 | Moneda y fecha locales por defecto | Quetzal (Q) y DD/MM/AAAA | Verificación de la configuración de localización · S9 | `DEFAULT_CURRENCY = 'USD'` en `frontend/src/utils/currency.js`; el quetzal se elige por empresa. Cinco archivos formatean fechas con `'en-US'` fijo, entre ellos `DashboardView.vue:140`. Además, la Fase 2 de usabilidad (P7, S8) encontró que una publicación programada a las 10:00 se guarda a las 4:00, porque la hora local se guarda sin zona horaria y se lee como UTC; sigue abierto | Inspección | **No cumple** | Completa |
| RNF-7.2 | Lenguaje del asistente profesional y sin sesgo | Batería de 50 preguntas | — | Sin prueba | — | **Sin validar** | — |
| RNF-7.3 | Derecho de uso ante entidades políticas | No verificable | — | Es una condición de uso (SCRUM-56 §4.3) | — | **Sin validar** | — |
| RNF-8.1 | Exportar la información propia en CSV | Exportación disponible en cualquier momento | P6 · S8 | Se midió la exportación CSV de reportes de proyecto (0.6 ms con 100,000 reportes), no la exportación de los datos personales del usuario | Prueba | **Sin validar** | — |
| RNF-8.2 | Licencias de terceros compatibles con uso comercial | MIT, Apache 2.0 o similares | — | Sin auditoría de licencias | — | **Sin validar** | — |
| RNF-8.3 | Funcionar bajo los estándares tributarios vigentes | Sin umbral (SCRUM-56 propone IVA del 12 % en el POS) | P14 · S9; `saleCalculation.test.js` en CI desde el S8 | El IVA del 12 % se calcula sobre la base con descuento: Q100 − 10 % + IVA = Q100.80, verificado contra Postgres real (RG1) | Prueba | **Cumple** | Parcial: solo la reformulación propuesta; la conformidad general con la SAT no es verificable |
| RNF-9.1 | Disponibilidad | 99.0 % | P5 · S8; P8 · S9 | 202 muestras del health de producción sin respuestas distintas de 200 durante el activo del S9. No hay monitoreo continuo. Incidentes: el 26/09, MongoDB sin servicio y disco al 98 %; el 10/10, la VM se reinició a mitad de la regresión de volumen; el 11/10, el ambiente de pruebas no respondía | Prueba | **Sin validar** | El 99.0 % no se puede calcular; los incidentes apuntan en contra |
| RNF-9.2 | Guardado local sin conexión y sincronización sin duplicados | Sin pérdida ni duplicados | — | Sin prueba | — | **Sin validar** | — |
| RNF-9.3 | Respaldo automático y recuperación completa | Restauración completa | — | Sin prueba. `reset:test` restablece datos de siembra; no restaura un respaldo | — | **Sin validar** | — |
| RNF-10.1 | Calendarios externos por su API oficial | OAuth 2.0 | — | Sin prueba | — | **Sin validar** | — |
| RNF-10.2 | Webhooks entre módulos con firma secreta | Firma secreta validada | — | Sin prueba. El módulo de análisis de imágenes no existe. El webhook de integraciones firma con HMAC-SHA256 solo si la integración tiene secreto (`webhookService.js`) | — | **Sin validar** | — |
| RNF-10.3 | Interpretar archivos .xlsx y .docx | Sin umbral | — | Sin prueba | — | **Sin validar** | — |
| RNF-11.1 | Tutorial de bienvenida en el primer inicio | Recorrido por 3 interfaces principales | — | Sin prueba | — | **Sin validar** | — |
| RNF-11.2 | README con instrucciones de despliegue | Entorno levantado en menos de 20 min | — | Sin prueba. CI levanta backend y Postgres desde cero en cada pull request, pero no sigue el README ni se cronometra | — | **Sin validar** | — |
| RNF-11.3 | Preguntas frecuentes desde el menú principal | 80 % de las funcionalidades | — | Sin prueba | — | **Sin validar** | — |
| RNF-12.1 | Backend en el lenguaje y framework definidos | Python/FastAPI o Node.js | Inspección del repositorio · S9 | Node.js con Express | Inspección | **Cumple** | Completa |
| RNF-12.2 | Base de datos relacional | PostgreSQL | Inspección del esquema · S9; P14 | PostgreSQL es la base central, y P14 corre contra Postgres 16 real. El chat y el historial del agente usan además MongoDB | Inspección | **Cumple** | Parcial |
| RNF-12.3 | Framework del frontend | React.js y Next.js | Inspección del código · S9 | Vue 3, Vite y Vue Router | Inspección | **No cumple** | Completa |
| RNF-13.1 | Almacenamiento en disco de estado sólido | SSD | — | El tipo de disco de la VM no está documentado | — | **Sin validar** | — |
| RNF-13.2 | El agente procesa imágenes de avance de obra | 2 megapíxeles como mínimo | — | Sin prueba | — | **Sin validar** | — |
| RNF-13.3 | Buen rendimiento en servidores con pocos recursos | Sin umbral (se usa `plan-maestro-pruebas.md` §7.2 sobre 2 vCPU) | P3, P4 · S7; P6 · S8; P9 · S9 | Carga: 4 de 6 mediciones fuera de umbral (C1 4.99 s, C2 1.91 s, C4 620 ms, C5 2.61 s). E1 y E5 degradan en su nivel base. Búsqueda del POS: 2.41 s en N3 contra 800 ms, y 789 ms en N2, al límite | Prueba | **No cumple** | Completa, contra §7.2 |
| RNF-14.1 | Microservicios: IA separada de la gestión de presupuesto | Microservicios | Revisión de la arquitectura · S9 | Un solo backend Express; el agente comparte proceso, pool y rol de base con la gestión (DT-16) | Inspección | **No cumple** | Completa |
| RNF-14.2 | Merge semanal a `main` | Al menos uno por semana | Auditoría del historial · S9 | Merges a `main`: 17/08, 21/08, 05/09, 07/09, 01/10 y 08/10. Huecos de 15 días (21/08 a 05/09) y de 24 días (07/09 a 01/10). El despliegue del 10/10 a producción salió de `develop`, no de `main` | Inspección | **No cumple** | Completa |
| RNF-14.3 | Arquitectura MVC | MVC | Revisión de la estructura · S9 | El backend separa rutas, controladores, servicios y acceso a datos; la vista es el SPA | Inspección | **Cumple** | Completa |

---

## 3. Resumen de veredictos

| Veredicto | Total | Por prueba | Por inspección | Requisitos |
|---|---|---|---|---|
| Cumple | **12** | 9 | 3 | RNF-1.1, 1.3, 2.3, 3.1, 3.2, 6.1, 6.2, 6.3, 8.3, 12.1, 12.2, 14.3 |
| No cumple | **6** | 1 | 5 | RNF-4.1, 7.1, 12.3, 13.3, 14.1, 14.2 |
| Sin validar | **24** | — | — | RNF-1.2, 2.1, 2.2, 3.3, 4.2, 4.3, 5.1, 5.2, 5.3, 7.2, 7.3, 8.1, 8.2, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 13.1, 13.2 |

De los 12 que cumplen, solo 3 tienen cobertura completa (RNF-6.3, 12.1 y 14.3).

**Evolución respecto del Sprint 8, contando solo pruebas** (sin inspecciones, como lo hizo SCRUM-56):

| Veredicto | Sprint 8 | Sprint 9 | Qué cambió |
|---|---|---|---|
| Cumple (con cobertura completa o parcial) | 6 | 9 | +RNF-1.1 y 1.3 por la prueba de contraste de UX-R3. +RNF-8.3 al aplicar la reformulación de SCRUM-56 a pruebas que ya existían |
| No cumple | 1 | 1 | RNF-13.3, sin cambio |
| Sin validar | 35 | 32 | — |

De los tres requisitos que pasan a Cumple, solo dos (RNF-1.1 y 1.3) reflejan un cambio real del sistema en el Sprint 9. El tercero (RNF-8.3) es evidencia nueva sobre un comportamiento que ya existía. Ningún requisito pasó de Cumple a No cumple.

---

## 4. Respuestas a las preguntas de la guía

### 4.1 ¿Qué pruebas no funcionales faltaría hacer para validar todos los RNF planteados?

Faltan pruebas para los 24 requisitos sin validar, y para completar la cobertura de 9 de los 12 que cumplen solo en parte.

**El Sprint 9 no cerró ninguna de las faltantes que declaró el Sprint 8.** La presentación de cierre del Sprint 8 nombró cinco: inundación, navegadores, TLS, disponibilidad y respaldo. Ninguna se ejecutó en el Sprint 9, que dedicó sus pruebas no funcionales a repetir las del Sprint 8 (G-1) y a automatizarlas en CI (G-7). Tampoco se repitieron las tareas de venta y marketing que la Fase 2 de usabilidad dejó planificadas para comprobar sus correcciones. Las seis encabezan la tabla a), marcadas con «S8».

Las faltantes se agrupan según lo que hace falta para ejecutarlas.

**a) Ejecutables ya, sobre el sistema actual.** Son las que se pueden correr en el Sprint 10 sin construir nada nuevo:

| Prueba faltante | Declarada en | Requisitos | Herramienta y criterio | Esfuerzo |
|---|---|---|---|---|
| Inundación sobre la base de datos, pendiente desde SCRUM-53 | S8 | RNF-3.2 (la parte que falta), 9.1 | k6 con `constant-arrival-rate` sobre `POST` de ventas y de movimientos de una misma empresa; pgbench con scripts de escritura. Criterio: 50 escrituras simultáneas, 0 % de error y sin bloqueos | 3 SP |
| Versión de TLS negociada | S8 | RNF-6.2 (la parte que falta) | `testssl.sh` o `sslyze` contra el dominio de producción y el de pruebas. Criterio: TLS 1.3 ofrecido y sin protocolos obsoletos | 1 SP |
| Viewport y compatibilidad entre navegadores | S8 | RNF-5.1, 5.2 | Playwright con Chromium, WebKit y Firefox en 1024x768, escritorio y móvil, sobre las cinco vistas principales | 3 SP |
| Disponibilidad | S8 | RNF-9.1 | Monitor externo del health de producción cada 5 minutos durante todo el Sprint 10, con reporte al cierre | 1 SP |
| Respaldo y restauración | S8 | RNF-9.3 | `pg_dump` del ambiente de pruebas, restauración en una base limpia y prueba de humo | 2 SP |
| Repetición de las tareas de venta y marketing | S8 (Fase 2) | RNF-2.3 | Repetir F3 y F4 con tres participantes después de UX-R2 y UX-R3. Criterio de la propia Fase 2: nadie reporta opciones ilegibles y el tiempo de F4 baja a 75 % del máximo o menos | 1 SP |
| Cronometraje del dashboard con usuarios | S9 | RNF-2.1 | Sesión moderada con el cronómetro arrancando al cargar el dashboard, no en el login. Se puede sumar a las sesiones de UX-R4 o de G-6. Criterio: menos de 10 s | 2 SP |
| Rendimiento en el cliente con dispositivo limitado | S9 | RNF-3.3, 5.3 | Lighthouse con limitación de CPU y red sobre login y dashboard; presupuesto de tamaño del bundle en CI | 2 SP |
| Auditoría de licencias | S9 | RNF-8.2 | `license-checker --production --onlyAllow` con la lista de licencias permisivas | 1 SP |
| Despliegue desde cero con el README | S9 | RNF-11.2 | Una persona ajena al módulo levanta el entorno siguiendo solo el README, cronometrada | 1 SP |
| Batería de sesgo del agente | S9 | RNF-7.2 | Las 50 preguntas fijas que propone el propio requisito, con revisión por dos integrantes | 2 SP |
| Interacciones con el agente | S9 | RNF-2.2 | Conteo de interacciones en sesión moderada | 1 SP |
| Inducción técnica | S9 | RNF-4.2 | Sesión cronometrada con un desarrollador externo sobre `agentSql.js` y los prompts | 1 SP |
| Lectura a 1 m | S9 | RNF-1.2 | Protocolo de legibilidad con usuarios frente a un monitor de 24" | 1 SP |

**b) Requieren antes una funcionalidad que no existe:** exportación de los datos personales (RNF-8.1), trabajo sin conexión (9.2), calendarios externos (10.1), webhooks entre módulos (10.2), lectura de .xlsx y .docx (10.3), tutorial de bienvenida (11.1), preguntas frecuentes (11.3) y procesamiento de imágenes (13.2). No hay prueba que correr hasta que exista lo que se probaría; con el calendario restante, quedan fuera del proyecto.

**c) No son verificables tal como están escritos:** RNF-4.3 y 7.3, y la parte estética de RNF-1.3. Necesitan la reformulación de SCRUM-56 §4.4, no una prueba. RNF-13.1 solo pide documentar el tipo de disco del proveedor.

Si el Sprint 10 corre las de la tabla a), 13 requisitos más quedarían validados, y RNF-3.2 y 6.2 medirían la parte que hoy les falta (inundación y versión de TLS).

### 4.2 ¿Qué tanto se han logrado cumplir los RNF?

**12 de 42 requisitos cumplen (29 %), 6 no cumplen (14 %) y 24 siguen sin validar (57 %).** De los 18 que sí se pudieron validar, cumplen dos de cada tres.

El cumplimiento depende de qué se probó:

- **Donde se concentraron las pruebas no funcionales del curso** (carga, estrés, volumen, seguridad), el resultado es bueno. De los siete requisitos de rendimiento, seguridad y disponibilidad que esas pruebas tocan (RNF-3.1, 3.2, 6.1, 6.2, 6.3, 9.1 y 13.3), cinco cumplen, uno no cumple y uno queda sin validar. El sistema no pierde peticiones: 0 % de error en las diez corridas de k6 del S7, en todos los niveles de volumen del S8 y del S9 y en todas las corridas de CI.
- **Lo que no cumple viene de dos fuentes distintas.** RNF-13.3 es un defecto medido: con 2 vCPU, el login y el POS ya están en su límite con carga normal, y la búsqueda del POS se degrada con el volumen de datos. Los otros cinco (RNF-4.1, 7.1, 12.3, 14.1 y 14.2) salen de inspecciones y son decisiones del equipo o requisitos que nadie retomó: Vue en lugar de React, monolito en lugar de microservicios, dólar como moneda por defecto, merges a `main` sin cadencia semanal.
- **Lo que queda sin validar se concentra en categorías que ninguna prueba del curso cubre:** portabilidad (5.x), confiabilidad (9.x), interfaces con otros sistemas (10.x), ayudas y documentación (11.x) y el agente de IA (2.2, 4.2, 7.2, 13.2). Ocho de esos 24 dependen de funcionalidades que no existen.

**Matiz sobre la cobertura.** De los 12 que cumplen, 9 lo hacen solo en parte: el requisito cita algo que no existe con ese nombre o la prueba mide un caso cercano. El cumplimiento real frente al texto literal del diseño es menor que lo que sugiere la cifra de 12.

### 4.3 ¿Cómo se comparan los resultados de los sprints anteriores con lo planteado en el diseño?

**Requisitos con umbral medible, sprint por sprint:**

| RNF | Diseño | Sprint 7 | Sprint 8 | Sprint 9 | Lectura |
|---|---|---|---|---|---|
| 3.1 · Reporte | 3 s o menos | Listado de reportes 620 ms; E4 2.41 s al degradar | Listado 543 ms y resumen 211 ms en N3 | Listado 499 ms y resumen 197 ms en N3; resumen de presupuesto 10 ms | Siempre por debajo de 3 s, con un margen de 5 a 6 veces en carga normal. Estable |
| 3.2 · Concurrencia | 50 sin bloqueos | 30 VUs con 0 % de error; sin errores hasta 232 VUs | — | 0 % de error en CI | Cumple desde el S7. La inundación nunca se probó |
| 13.3 · Pocos recursos | §7.2 del plan maestro | 4 de 6 mediciones fuera de umbral | POS: 1.04 s en N2 | POS: 789 ms en N2 y 2.41 s en N3 | No cumple en ningún sprint. La causa, que el POS descarga el inventario completo, sigue intacta |
| 6.1 y 6.3 · Acceso | Restricción por rol | Nueve casos de autorización | ZAP: 0 altas y 0 medias en la API; límite de intentos verificado | Se mantiene, y se añaden RA4, RA5, RA10 y RG3 | Estable, con más red de pruebas |
| 6.2 · Cifrado | TLS 1.3 | — | HSTS; TLS a la base sin verificar; SPA sin cabeceras | TLS a la base verificado; SPA sin cabeceras | Mejoró un tramo. TLS 1.3 nunca se midió |
| 1.1 y 1.3 · Contraste | Alto contraste | Texto ilegible reportado sobre el fondo animado (DT-09) | — | WCAG AA en todos los tokens, fijado en CI | Mejora real del sistema |
| 2.1 · Tiempo al dashboard | Menos de 10 s | T1 de 50 a 105 s, con el login incluido | — | Componente técnico en 10 ms | Nunca se midió como lo pide el diseño |
| 2.3 · Aprendizaje | Sin umbral | 93 % de tareas | 93 % de tareas | Sin repetir | Estable |
| 9.1 · Disponibilidad | 99.0 % | — | Incidentes el 26/09 | Incidentes el 10/10 y el 11/10 | Sin medición, con señales en contra |
| 14.2 · Merge semanal | Semanal | Cumplido hasta el 07/09 | Sin merges desde el 07/09 | Merges el 01/10 y el 08/10 | Mejora, pero el hueco de 24 días ya ocurrió |

Hallazgos de seguridad del Sprint 8 frente a la regresión del Sprint 9 (`docs/pruebas-regresion-seguridad-volumen.md` §4):

| Medida | Sprint 8 | Sprint 9 |
|---|---|---|
| Hallazgos de ZAP abiertos (de 10) | 10 | 9: se resolvió solo el informativo |
| Hallazgos altos abiertos | 2 (SSRF) | 2, sin cambio |
| `npm audit` de la raíz | 0 críticas, 3 altas | 2 críticas, 9 altas: empeoró. Sin dependencias de desarrollo, 0 críticas y 9 altas |
| Controles verificados (cabeceras de la API, límite de intentos) | 2 | 2, se mantienen, más el timeout de DT-15 |

**Conclusiones de la comparación:**

1. **Donde el diseño fijó un umbral y el equipo lo midió, los resultados están mejor que el diseño.** RNF-3.1 pide 3 s y el peor caso medido en tres sprints es 2.41 s, bajo estrés. RNF-3.2 pide 50 escrituras simultáneas y el sistema aguantó unas 232 sin errores.
2. **Las pruebas se midieron contra una vara más estricta que la del diseño.** El plan maestro fijó en §7.2 umbrales de entre 4 y 10 veces más exigentes (500 ms para lecturas contra 3 s), sin citar los requisitos. Por eso el listado de reportes «no cumple» en el informe de carga del S7 y sí cumple RNF-3.1. SCRUM-56 lo señaló y sigue sin corregirse.
3. **Entre sprints, los resultados del sistema casi no se movieron.** Lo que cambió del S8 al S9 es sobre todo evidencia nueva (RNF-1.1, 1.3 y 8.3), no comportamiento nuevo. Las dos mejoras reales son el contraste (UX-R3) y el TLS hacia la base (DT-15). En rendimiento con volumen, la regresión de G-1 confirmó que el punto de degradación del POS no se movió. En seguridad, los dos hallazgos altos siguen igual y las dependencias empeoraron.
4. **El diseño describe un producto distinto del construido.** Diez requisitos citan pantallas, roles o módulos inexistentes, y tres de las restricciones de diseño (RNF-12.3, 14.1 y 14.2) se incumplen por decisión del equipo. La comparación contra el diseño no mide solo calidad: mide también cuánto se alejó el producto de la ideación de IS1.
5. **Los riesgos que más pesaron en las pruebas no tienen requisito propio en el diseño:** SSRF, fuerza bruta contra el login, degradación por volumen de datos y vulnerabilidades en dependencias. SCRUM-56 propuso dos requisitos nuevos de seguridad y volumen (§4.4); siguen como propuesta.

---

## 5. Riesgos que alimentan el plan de refactorización

Riesgos abiertos, ordenados por la severidad que les dio la prueba que los detectó. La Parte 2 (`docs/plan-refactorizacion-sprint9.md`) los toma en este orden.

| # | Riesgo | Prueba y hallazgo | Severidad | RNF afectado | Elemento |
|---|---|---|---|---|---|
| 1 | SSRF por `0.0.0.0`, IPv6 mapeada a IPv4 y redirecciones; `sendWebhookEvent` sin guard. Ya está en producción | P5, P8: hallazgos 1, 2 y 4 | Alta | RNF-6.3; requisito de seguridad propuesto | DT-18 |
| 2 | Dependencias con 2 críticas y 9 altas | P8: hallazgo nuevo N3 | Alta | Ninguno (propuesto) | DT-08 |
| 3 | El POS descarga el inventario completo: 2.41 s en N3, al límite en N2 | P6, P9: Vol-1 | Alta | RNF-13.3; requisito de volumen propuesto | DT-22, con DT-03 |
| 4 | HTML del SPA sin cabeceras; `helmet` duplicado; versión de nginx; sin `Cache-Control` | P5, P8: hallazgos 3, 5, 8 y 9 | Media | RNF-6.2 | DT-19 |
| 5 | `deploy.sh` expone secretos en `ps`; despliegue acoplado de producción y pruebas; disco al 84 %; reinicio de la VM | P8: N1 e infraestructura | Media | RNF-9.1, 9.3 | DT-21, DT-27 |
| 6 | Vistas temporales del agente fuera de la transacción: fuga latente entre empresas | Inspección (DT-16); RG3 no la cubre | Media, latente | RNF-6.1, 14.1 | DT-16 |
| 7 | Listado de reportes sin paginar ni usar su índice: 499 ms en N3 | P9: Vol-2 y Vol-5 | Media | Umbral del plan maestro (RNF-3.1 se cumple) | DT-23, DT-26 |
| 8 | Entrada inválida produce 500; HTML sin sanear | P8: hallazgos 6 y 7 | Baja | RNF-6.3 | DT-20 |
| 9 | Integraciones fuera de DT-15 sin timeout | Revisión de DT-15 | Baja | RNF-9.1 | DT-28 |
| 10 | Bundle de entrada de 1,302 kB, creciendo | Build del S9 | Baja, sin prueba en el cliente | RNF-3.3, 5.3 | DT-17 |
| 11 | Login con p95 de 4.99 s en carga, sin diagnóstico | P3: hallazgo 1 | Media | RNF-13.3 | Diagnóstico con la instrumentación de DT-15 en la repetición del final del Sprint 10 |

---

## 6. Verificación del criterio de aceptación

| Criterio del ticket | Estado |
|---|---|
| Recuperar los RNF del informe final de IS1 con sus umbrales | Cumplido: 42 requisitos, texto literal en `docs/analisis-requisitos-no-funcionales.md` §2 y umbral por requisito en la matriz (§2) |
| Matriz RNF × prueba completa, con cumple, no cumple o sin validar por cada requisito | Cumplido en §2: 42 filas con prueba, sprint, resultado, vía, veredicto y cobertura. Totales en §3 |
| Insumos: k6 (S7), ZAP y volumen (S8), regresión de G-1 (S9) | Cumplido: P3, P4, P5, P6, P8 y P9 en §1.2, más las otras ocho pruebas que tocan algún requisito. La inundación de SCRUM-53 no se ejecutó y se declara faltante en §4.1 |
| Respuesta a «¿qué pruebas faltarían?» | §4.1 |
| Respuesta a «¿qué tanto se han cumplido?» | §4.2 |
| Respuesta a «¿cómo se comparan los sprints anteriores con el diseño?» | §4.3 |
| Bloqueo por G-1 (SCRUM-70) | Levantado: la regresión de seguridad y volumen está terminada y sus resultados alimentan las filas RNF-3.1, 6.1, 6.2, 6.3, 9.1 y 13.3 |
