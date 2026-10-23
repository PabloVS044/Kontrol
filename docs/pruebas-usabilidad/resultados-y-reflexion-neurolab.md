# UX-N · Resultados de UX y reflexión sobre el Neurolab

**Corte documental: 23/10/2026**  
**Conclusión principal:** el estudio instrumentado del Neurolab no se realizó. Los
resultados que siguen son de sesiones moderadas manuales y de un five-second test;
no son una comparación entre observación y datos instrumentados.

## 1. Alcance y fuentes

Este informe distingue tres clases de evidencia:

1. **Sesiones moderadas observadas:** las cinco tareas de la Fase 1, el 06/09/2026,
   y las cinco tareas de la Fase 2, el 27/09/2026. En ambas rondas participaron tres
   personas; se registraron resultado, tiempo manual, pensamiento en voz alta y notas.
2. **Five-second test de UX-R4:** cinco respuestas individuales recogidas el
   12/10/2026, con exposición de cinco segundos en un viewport de 1440 × 900.
3. **Pruebas del proceso de mejora UX y mediciones automatizadas:** hay referencias
   a card sorting, tree testing, first-click, pruebas 9 y 10, y verificaciones de
   contraste. El repositorio no contiene un expediente íntegro con los diez métodos
   y sus resultados identificados por participante. No se reconstruyen ni se inventan
   esas filas. Las pruebas automatizadas de interfaz y contraste no se cuentan como
   sesiones de participantes.

Fuentes primarias:

- [Registro de sesiones moderadas de la Fase 1](./registro-sesiones.md) y
  [análisis de hallazgos de la Fase 1](./analisis-hallazgos.md).
- [Protocolo de la Fase 2](./protocolo-fase2.md),
  [registro XLSX de las sesiones](./Registro_sesiones_usabilidad_Fase_2.xlsx) y
  [análisis de hallazgos de la Fase 2](./analisis-hallazgos-fase2.md).
- [Protocolo y respuestas del five-second test](./protocolo-five-second-ux-r4.md).
- La propuesta R5 hace referencia al Test 7 first-click en el
  [PR #140](https://github.com/PabloVS044/Kontrol/pull/140). Su descripción fija
  criterios para repetirlo, pero no publica una tabla con resultados por participante.
- La reorganización R2 refiere a card sorting y tree testing en
  [PR #144](https://github.com/PabloVS044/Kontrol/pull/144); el plan maestro contiene
  once pruebas de regresión de la nueva navegación, no las respuestas de quienes
  participaron en esos métodos.

Las personas se identifican únicamente como P01–P05. Los tiempos de ambas rondas
moderadas son aproximados y tomados manualmente; el pensamiento en voz alta es
evidencia cualitativa, no una medición de carga cognitiva.

## 2. Resultados de las sesiones moderadas

### 2.1 Sprint 7 · Fase 1 · 06/09/2026

Se realizaron tres sesiones moderadas sobre cinco tareas, con pensamiento en voz alta.
Hubo 14 éxitos de 15 tareas. El único fallo fue T4 para P03. Los límites fueron:
T1 2:00; T2 y T3 3:00; T4 3:00; T5 2:00.

| Tarea | Participante | Resultado | Tiempo / límite | Hallazgo observado |
|---|---|---|---|---|
| T1 · Identificar estado en el dashboard | P01 | Éxito | 1:15 / 2:00 | Sin fricción registrada. |
| T1 | P02 | Éxito | 0:50 / 2:00 | Sin fricción registrada. |
| T1 | P03 | Éxito | 1:45 / 2:00 | Dijo que se perdió buscando “estado”, pero lo encontró. |
| T2 · Crear proyecto y elegir fase inicial | P01 | Éxito | 2:40 / 3:00 | Dudó dónde estaba el campo de fase inicial. |
| T2 | P02 | Éxito | 1:30 / 3:00 | Sin fricción registrada. |
| T2 | P03 | Éxito | 2:10 / 3:00 | Sin fricción registrada. |
| T3 · Crear y asignar tarea | P01 | Éxito | 1:50 / 3:00 | Sin fricción registrada. |
| T3 | P02 | Éxito | 2:10 / 3:00 | Esperó la carga de la lista de miembros; el registro lo atribuye al ambiente. |
| T3 | P03 | Éxito | 1:55 / 3:00 | Sin fricción registrada. |
| T4 · Registrar avance y adjuntar evidencia | P01 | Éxito | 2:55 / 3:00 | Casi agotó el tiempo buscando el control para adjuntar evidencia. |
| T4 | P02 | Éxito | 2:20 / 3:00 | Sin fricción registrada. |
| T4 | P03 | **Fallo** | 3:00 / 3:00 | No encontró “Registrar Avance” en la esquina superior antes del límite. |
| T5 · Consultar reporte y presupuesto | P01 | Éxito | 1:10 / 2:00 | Resaltó el resumen de presupuesto. |
| T5 | P02 | Éxito | 1:40 / 2:00 | Dijo que se entendía cuánto presupuesto quedaba. |
| T5 | P03 | Éxito | 1:20 / 2:00 | Resaltó visualmente el reporte. |

**Método que detectó los hallazgos:** observación moderada y pensamiento en voz alta.
H-01 (el control de avance/evidencia) apareció en 2/3 participantes; T4 promedió
2:45, el 92 % de su límite, frente a 64–70 % en las otras tareas. La anotadora ubicó
el control en `frontend/src/components/DetailProject/ProgressTab.vue`: el rótulo
“Agregar” y su posición en la esquina superior no coincidían con la acción que pedía
el guion. Las recomendaciones secundarias fueron la etiqueta de estado, la zona
interactiva de la tarjeta y el campo de fase inicial.

**Nota sobre el límite:** el registro de Sprint 7 marca P03/T4 como fallo exactamente
al llegar a 3:00. El protocolo de la Fase 2 establece otra regla: solo es fallo si se
supera el máximo; exactamente en el límite cuenta como éxito. Se conserva lo anotado
en cada estudio y no se comparan sus porcentajes como si la regla fuera idéntica.

### 2.2 Sprint 8 · Fase 2 · 27/09/2026

Se realizaron tres sesiones nuevas sobre Inventario, Proveedores, Punto de venta y
Marketing, pantallas que la ronda de Sprint 7 no había evaluado. Hubo 14 éxitos de
15 tareas; P02 no terminó F3 dentro de sus tres minutos. Nadie recibió ayuda.

| Tarea | Participante | Resultado | Tiempo / límite | Hallazgo observado |
|---|---|---|---|---|
| F1 · Alta de producto | P01 | Éxito | 2:38 / 3:00 | Pulsó “Cancelar” creyendo que guardaba y repitió el alta. |
| F1 | P02 | Éxito | 2:22 / 3:00 | Esperaba un acceso directo para añadir productos. |
| F1 | P03 | Éxito | 1:30 / 3:00 | Dudó dónde añadirlo; lo encontró navegando. |
| F2 · Vincular proveedor | P01 | Éxito | 1:09 / 2:00 | Duda breve sobre dónde añadirlo. |
| F2 | P02 | Éxito | 1:20 / 2:00 | No esperaba que se vinculara desde la ficha del producto. |
| F2 | P03 | Éxito | 0:45 / 2:00 | Esperaba otra vista o ventana para vincular. |
| F3 · Registrar una venta | P01 | Éxito | 2:20 / 3:00 | Al inicio no encontraba dónde vender; reportó poco contraste. |
| F3 | P02 | **Fallo** | 3:20 / 3:00 | Buscó en otras pantallas; no entendió el proceso ni encontró confirmación. |
| F3 | P03 | Éxito | 1:19 / 3:00 | Buscaba una sección “Ventas”; la encontró dentro de Inventario. |
| F4 · Crear y programar publicación | P01 | Éxito | 2:08 / 3:00 | No leía las opciones sin pasar el cursor; reportó cambio de 10:00 a 4:00. |
| F4 | P02 | Éxito | 3:00 / 3:00 | Las opciones no se leían sin el cursor; terminó justo en el límite. |
| F4 | P03 | Éxito | 2:54 / 3:00 | Las opciones no se leían; programó un borrador existente. |
| F5 · Filtrar publicaciones | P01 | Éxito | 0:20 / 2:00 | No identificó inmediatamente el filtro. |
| F5 | P02 | Éxito | 1:15 / 2:00 | Tardó en encontrarlo; después lo usó sin problema. |
| F5 | P03 | Éxito | 0:15 / 2:00 | Sin dificultad registrada. |

**Hallazgos importantes y método:** la moderación manual mostró que los tres
participantes buscaron una entrada de Ventas distinta de Inventario; P02 falló F3
(3:20/3:00). También detectó las opciones ilegibles de Marketing en 3/3; F4 promedió
2:41, el 89 % del límite. El registro de P01 y la observación del anotador detectaron,
además, un defecto funcional: una hora ingresada como 10:00 se mostró a las 4:00.
El informe de Fase 2 separa este error de los hallazgos de usabilidad.

### 2.3 Resultado comparado con prudencia

Cada ronda manual registró 14/15 tareas completadas, pero no son repeticiones del
mismo estudio: usan tareas distintas, la Fase 2 cubre pantallas no probadas en la
Fase 1 y la regla de fallo al alcanzar exactamente el límite cambió. Por eso el
porcentaje agregado no demuestra mejora ni equivalencia entre sprints.

## 3. Five-second test de UX-R4

El protocolo define como acierto de producto mencionar gestión de ventas e inventario
y fija umbral de al menos 4/5. Para el público objetivo fija 3/5. El registro original
marcó 5/5 en ambas categorías. Al contrastar las citas con la regla publicada sin
reinterpretar las respuestas, P02 no menciona ventas ni inventario y P03 menciona
“cobros” e “inventarios”, pero no identifica explícitamente las ventas como función;
ambas respuestas se puntúan como **No**. No se alteran las respuestas textuales.

| Participante | Qué hace (resumen literal) | Producto: ventas + inventario | Público objetivo |
|---|---|---:|---:|
| P01 | “al cobrar una venta se descuenta el inventario automáticamente” | Sí | Sí |
| P02 | “gestión en la nube para proyectos, finanzas, chat y marketing” | **No** | Sí |
| P03 | “llevar cobros, caja, proveedores e inventarios” | **No** | Sí |
| P04 | “integra ventas, facturación, reportes y control de inventario” | Sí | Sí |
| P05 | “controlar las ventas cotidianas, el stock y los presupuestos” | Sí | Sí |
| **Total** |  | **3/5** | **5/5** |

El criterio de producto **no se cumple** (3/5 frente al mínimo 4/5); el de público
objetivo sí se cumple (5/5). P03 mencionó cobros e inventario, pero no ventas como
función. Para no reinterpretar una respuesta y hacerla coincidir con el criterio, se
codifica como No. El registro original marcaba 5/5 en producto; esa marca no concuerda
con las citas ni con la regla escrita. El método detectó que al menos dos respuestas
no identificaron la función principal; no permite saber qué elemento visual atendieron.

## 4. Pruebas del proceso UX y límites del expediente

| Prueba citada en las fuentes disponibles | Qué puede afirmarse | Qué falta para el requisito “resultados por participante” |
|---|---|---|
| Card sorting | Se cita como insumo para ordenar la navegación y los nombres de R2. | No hay aquí fecha, número de participantes, tarjetas, decisiones ni resultados individuales. |
| Tree testing | Se cita como insumo de R2; el plan maestro define once pruebas automatizadas para evitar regresiones en la arquitectura resultante. | Los once casos automatizados no son participantes ni sustituyen el resultado individual del tree test; falta el registro humano. |
| Test 7 · first-click | El PR #140 lo cita como fuente de R5 y propone repetir tareas T1–T4. | No está el recuento por persona ni el mapa de primeros clics. El criterio de aceptación de R5 no está acreditado como medido. |
| Test de cinco segundos | Protocolo y cinco respuestas individuales disponibles; resultado corregido: 3/5 producto y 5/5 público. | No hay seguimiento ocular; las puntuaciones originales de P02 y P03 no se sostienen al aplicar el criterio publicado. |
| Pruebas 9 y 10 | El código de preferencias de idioma y la prueba de cobertura i18n indican que estas pruebas revelaron problemas de persistencia/traducción. | No están los protocolos ni respuestas individuales para atribuir resultados a participantes. |
| Contraste/accesibilidad | UX-R3 define contraste mínimo 4.5:1 y el PR #138 reporta verificaciones automatizadas de tokens y estados. | Es evidencia técnica, no una prueba con participantes; no hay medidas individuales de legibilidad a distancia. |
| Otras pruebas de la batería de diez | No se encontró en el repositorio el listado completo que permita nombrarlas con certeza. | Faltan los nombres, resultados y evidencia por participante de las pruebas restantes. |

Esta limitación no se rellena con las pruebas de regresión de código, con comentarios
de la demostración G-6 ni con los resultados de las sesiones moderadas: son métodos y
eventos distintos. Para cerrar este apartado al nivel solicitado hace falta incorporar
el expediente de la tarea de mejora de proceso con los diez nombres, las filas por
participante y la fuente/fecha.

## 5. Recomendaciones UX-R1–UX-R5 y criterios verificables

| Recomendación | Cambio implementado en Sprint 9 | Criterio verificable | Evidencia / estado de validación |
|---|---|---|---|
| **UX-R1 · Idioma** | La preferencia de idioma se guarda a nivel de navegador, se aplica antes del primer render, sobrevive al cierre de sesión y actualiza `<html lang>`. | La elección `es`/`en` debe persistir al recargar y cerrar sesión, y mostrarse en todas las rutas; el documento debe declarar el idioma activo. | Pruebas automatizadas en `frontend/tests/locale.test.js` y `AppNavbar.test.js`. No se encontró re-test con participantes. |
| **UX-R2 · Navegación** | Se reorganiza la navegación con “Ventas”, Configuración unificada y el camino Proyecto → Miembros. | Mantener permisos; enlaces y destinos acordes con la arquitectura; los 11 casos NV1–NV11 del plan maestro deben pasar. | Plan maestro §19.10 y [PR #144](https://github.com/PabloVS044/Kontrol/pull/144) acreditan pruebas automatizadas/cambio. No hay puntuaciones individuales del re-test de tree testing. |
| **UX-R3 · Contraste y estados** | Se elevan tokens de texto y se distinguen estados seleccionados/deshabilitados también por forma; se limita el brillo de fondo animado. | Contraste de texto de al menos **4.5:1** sobre las superficies auditadas; fondo detrás de texto con pico medido `#272727`; estados no diferenciados solo por color. | [PR #138](https://github.com/PabloVS044/Kontrol/pull/138) reporta 18 comprobaciones automatizadas de contraste y build. No equivale a una medición humana de lectura a distancia. |
| **UX-R4 · Propuesta de valor** | Se rediseña la portada para explicar el producto y su público. | En five-second test: al menos **4/5** identifican ventas e inventario y **3/5** identifican tiendas/pequeños negocios. | [Protocolo](./protocolo-five-second-ux-r4.md): al aplicar literalmente la regla, obtiene **3/5** en producto (no cumple) y **5/5** en público (cumple). |
| **UX-R5 · Controles de Integraciones** | Se hace reconocible el interruptor de pausa, se explican sus estados, se diferencian los botones y “Cerrar conexión” pasa a “Eliminar configuración” con confirmación. | Al repetir first-click, al menos **80 %** de éxito en T1–T4 y **cero** participantes deben elegir “Eliminar configuración” cuando quieren pausar. | [PR #140](https://github.com/PabloVS044/Kontrol/pull/140) describe esos criterios “por verificar con el equipo”; no se encontró un re-test con resultados por participante. No se declara cumplido. |

## 6. Por qué no hubo estudio instrumentado

| Momento | Registro |
|---|---|
| Sprint 7 · 06/09/2026 | Se hicieron las sesiones manuales. El análisis planificó Neurolab para el 22–25/09/2026. El estudio no se hizo por conflicto de calendario, según la decisión de alcance comunicada para UX-N. El día exacto en que surgió el conflicto no aparece en las fuentes revisadas. |
| Sprint 8 · 27/09/2026 | Se hicieron las sesiones manuales de Fase 2. La reserva del CIT 415-B no estuvo disponible para el estudio instrumentado, según la decisión de alcance comunicada para UX-N. No se encontró una fecha de reserva o cancelación verificable. |
| Sprint 10 · decisión documentada en este corte, 23/10/2026 | El estudio instrumentado queda fuera del alcance. No se pospone una medición ficticia ni se presentan resultados que no existen. La fecha de la reunión o acuerdo original de Sprint 10 no está documentada en el material revisado. |

Las fechas conocidas delimitan la planificación y las sesiones manuales; no completan
las fechas que faltan de las incidencias de calendario/reserva. Si se aporta el acta o
el correo de reserva, se puede actualizar esa cronología sin inferencias.

## 7. Reflexión: qué habría aportado el Neurolab

El protocolo instrumentado habría podido registrar el recorrido visual y las áreas de
interés; tiempo hasta la primera fijación; tiempo de permanencia; revisitas; trazado
del ratón y, si el diseño de estudio lo incluyera, una medida definida de carga
cognitiva. Ninguna de esas variables se midió en estas sesiones. Los tiempos manuales
y el pensamiento en voz alta no son sustitutos ni estimaciones de seguimiento ocular
o carga cognitiva.

Los casos concretos muestran dónde habría complementado la observación:

- **Guardar/Cancelar (P01, Fase 2):** la observación registra el clic equivocado y la
  repetición del alta; una herramienta visual podría haber distinguido si P01 miró
  “Guardar”, si fijó la atención en “Cancelar” o si no recorrió esa zona. Eso ayudaría
  a precisar la hipótesis de jerarquía visual, sin cambiar el hecho medido: la tarea
  se completó después de repetirla.
- **Comprensión de la portada (five-second test):** el resultado verbal corregido es
  3/5, no 5/5. La observación breve no identifica qué parte de la portada vieron P02
  y P03; áreas de interés y primera fijación podrían mostrar si llegaron al texto de ventas e
  inventario antes de los cinco segundos. No demostrarían por sí mismas comprensión.
- **Interruptor de Integraciones (R5/Test 7):** el equipo refiere que hubo personas que
  no reconocieron el control. Si el registro de first-click se recupera, una medida
  visual podría mostrar si miraron el interruptor o se dirigieron a la acción de
  eliminación. No hay datos de participantes en el expediente actual para cuantificar
  esa afirmación ni para concluir qué elemento vieron.
- **Opciones de Marketing (Fase 2):** tres personas reportaron que no se leían las
  opciones sin pasar el cursor. El análisis manual detectó la fricción y el análisis
  de código planteó una causa probable; el laboratorio habría descrito el recorrido de
  atención y las revisitas, pero la causa debía seguir confirmándose en navegador.

### Qué funcionó sin laboratorio

Las sesiones moderadas detectaron problemas accionables con su contexto: en Fase 1,
T4 consumió el 92 % del tiempo disponible y falló para una persona; el análisis ubicó
el control en `ProgressTab.vue` y propuso rótulo, posición y un criterio de repetición
con tres personas. En Fase 2, las tres personas buscaron dónde vender, una no completó
la tarea, y las tres reportaron las listas de Marketing ilegibles; se formularon
umbrales de repetición de 60 % y 75 % del tiempo máximo, respectivamente. También se
encontró un defecto de hora con evidencia concreta. Para detectar tareas fallidas,
dudas expresadas y errores funcionales, el método manual fue suficiente, barato y
directamente útil para priorizar.

### Costo, beneficio y recomendación

Las sesiones manuales requieren preparar un entorno, un guion, cronómetro y una
persona moderadora/anotadora; permiten escuchar expectativas y preguntar sin sugerir
la respuesta. No necesitan reserva del laboratorio ni instrumentación y análisis
especializados, pero sus tiempos son aproximados y no muestran de forma fiable qué
elemento visual recibió atención ni las revisitas.

El laboratorio cuesta reservar, preparar e instrumentar el entorno, calibrar
dispositivos, revisar la calidad de las señales y analizar recorridos/áreas de
interés. Ese costo vale la pena cuando una fricción se repite tras una corrección,
cuando hay que distinguir entre “no lo vio” y “lo vio pero no lo entendió”, o cuando
la ubicación/jerarquía visual de una acción crítica es la pregunta central. Para
descubrir fallos, comprender lenguaje y priorizar mejoras iniciales, tres sesiones
moderadas con tareas claras fueron suficientes en este proyecto.

**Recomendación:** conservar el método moderado como primera evaluación y re-test
barato; reservar el Neurolab de forma selectiva cuando el re-test manual deje
ambigüedad sobre atención visual o cuando una acción de alto impacto siga fallando.
Combinar ambos métodos permite que la medición instrumentada explique el “dónde miró”
y que el moderador investigue el “qué esperaba”; ninguno debe reemplazar al otro ni
convertir una muestra pequeña en una conclusión sobre toda la población.

## 8. Limitaciones declaradas

- Muestras pequeñas: tres participantes por ronda moderada y cinco en el five-second
  test; los hallazgos son indicativos, no estimaciones poblacionales.
- Los tiempos de las rondas moderadas son manuales y aproximados.
- Las reglas de éxito en el límite de tiempo difieren entre Fase 1 y Fase 2.
- No se hizo el estudio instrumentado: no hay datos de mirada, fijación, permanencia,
  revisitas, ratón ni carga cognitiva.
- No se encontró el registro por participante de la batería completa de diez pruebas
  ni el re-test de first-click de UX-R5.
- Las respuestas de P02 y P03 del five-second test no identifican ventas e inventario
  de forma explícita; se recodifican como No conforme a la regla escrita, corrigiendo
  el total original a 3/5 para identificación del producto.
