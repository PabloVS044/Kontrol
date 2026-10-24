# UX-N · Resultados de UX y reflexión sobre el Neurolab

**Corte documental: 23/10/2026**  
**Conclusión principal:** el estudio instrumentado del Neurolab no se realizó. Los
resultados que siguen provienen de sesiones moderadas, de la batería de diez pruebas
UX y de un five-second test posterior; no son una comparación entre observación y
datos instrumentados.

## 1. Alcance y fuentes

Este informe distingue tres clases de evidencia:

1. **Sesiones moderadas observadas:** las cinco tareas de la Fase 1, el 06/09/2026,
   y las cinco tareas de la Fase 2, el 27/09/2026. En ambas rondas participaron tres
   personas; se registraron resultado, tiempo manual, pensamiento en voz alta y notas.
2. **Batería de diez pruebas UX:** el informe
   [Tarea de mejora al proceso 3. User Experience](<./Tarea de mejora al proceso 3. User Experience.pdf>),
   fechado el 06/10/2026, registra diez métodos ejecutados con cinco participantes
   por prueba (25 en total). Los resultados por persona se resumen en §4 y se citan
   por página. No se transcriben nombres ni datos personales de sus autores o
   participantes.
3. **Five-second test posterior de UX-R4:** cinco respuestas individuales recogidas
   el 12/10/2026, en español y con viewport de 1440 × 900. Es distinta de la
   Prueba 10 del PDF, realizada el 02/10
   en inglés y en dispositivos variados; sus cifras no son una comparación controlada.

Fuentes primarias:

- [Registro de sesiones moderadas de la Fase 1](./registro-sesiones.md) y
  [análisis de hallazgos de la Fase 1](./analisis-hallazgos.md).
- [Protocolo de la Fase 2](./protocolo-fase2.md),
  [registro XLSX de las sesiones](./Registro_sesiones_usabilidad_Fase_2.xlsx) y
  [análisis de hallazgos de la Fase 2](./analisis-hallazgos-fase2.md).
- [Protocolo y respuestas del five-second test](./protocolo-five-second-ux-r4.md).
- [Tarea de mejora al proceso 3. User Experience](<./Tarea de mejora al proceso 3. User Experience.pdf>)
  (06/10/2026), pp. 1–68. La batería y el registro por participante están en las
  pp. 2–3 y 9–53; los hallazgos consolidados, en las pp. 54–62.
- Los cambios posteriores UX-R1 a UX-R5 se contrastan con los criterios y PR
  enlazados en §5. Las pruebas automatizadas citadas allí no sustituyen los resultados
  de participantes ni acreditan un re-test cuando este no está documentado.

Los IDs son anónimos y se interpretan dentro de cada estudio; no se asume que P01
de una prueba sea la misma persona que P01 de otra. Los tiempos de las rondas
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

## 4. Resultados de las diez pruebas UX

El PDF aportado identifica diez pruebas ejecutadas, cinco participantes en cada una
y 25 personas distintas en total. La siguiente consolidación mantiene los IDs anónimos
y los resultados registrados; las páginas del PDF permiten revisar las respuestas,
rutas, puntuaciones y notas originales. Son resultados de esta muestra, no de toda la
población usuaria.

| N.º | Método y participantes | Resultado por participante y síntesis | Hallazgo principal | Fuente |
|---|---|---|---|---|
| 1 | Entrevista contextual: chat y videollamada. P01–P05. | P01, P02, P03, P04 y P05: éxito al localizar Chat, enviar un mensaje e iniciar una llamada (5/5). P02 sugirió permitir ajustar el tamaño de fuente. | Las etiquetas e iconos de Chat fueron reconocibles para esta muestra. La sugerencia de fuente no demuestra por sí sola una barrera. | PDF, pp. 13–15, 54–55. |
| 2 | Desirability testing de identidad visual. P01–P05. | P01: claro, práctico, limpio, profesional, atractivo. P02: profesional, organizado, limpio, elegante, equilibrado. P03: frío, profesional, serio, organizado, genérico. P04: moderno, confuso, elegante, atractivo, innovador. P05: limpio, confiable, elegante, simple, atractivo. | Profesional, limpio, elegante y atractivo fueron elegidos por 3/5 cada uno; organizado, 2/5. “Confuso” se vinculó a no conocer la aplicación, no necesariamente a un defecto visual. | PDF, pp. 15–17. |
| 3 | Card sorting abierto: 29 tarjetas para organizar el menú. P11–P15. | Número de grupos: P11 12; P12 10; P13 7; P14 12; P15 9. Los cinco agruparon de forma consistente funciones de proyectos, presupuesto/gastos, chat/llamada y redes sociales; cuatro crearon un grupo propio para cobros/ventas. | Nadie llamó “Punto de venta” a ese grupo; los cinco reunieron idioma y otras preferencias en Configuración/Ajustes. La ubicación de funciones transversales no fue uniforme. | PDF, pp. 17–21. |
| 4 | Tree testing: ocho tareas de localización. P11–P15. | Aciertos registrados por persona: P11 7/8; P12 6/8; P13 4/8; P14 7/8; P15 7/8. Total informado: 31/40 (78 %). Por tarea: presupuesto 5/5; registrar venta 4/5; IVA 2/5; proveedor 4/5; programar publicación 5/5; dar acceso a un proyecto 2/5; exportar lista 5/5; alertas de stock 4/5. | IVA y permisos de proyecto fueron los puntos más difíciles; varias rutas de venta pasaron primero por otras secciones. | PDF, pp. 23–31. |
| 5 | Prueba remota no moderada del agente IA: cuatro consultas por persona. P06–P10. | Las 20 consultas recibieron respuesta; ninguna persona dijo haber reformulado. Intentos: P06 1,1,1,1; P07 2,2,2,2; P08 1,1,1,1; P09 1,1,1,1; P10 2,1,2,1. P06 comprendió parcialmente y tuvo dudas en las cuatro; P10 tuvo comprensión parcial en C1/C4 y dudas de confianza en C2; P07–P09 reportaron comprensión completa y confianza plena. | 14/20 respuestas se resolvieron en un intento; 14/20 se entendieron por completo y 15/20 generaron confianza plena. Obtener respuesta no garantizó comprensión ni confianza; la exactitud frente a los datos del negocio no se comprobó. | PDF, pp. 31–33, 55–56. |
| 6 | Cuestionario SUS del sistema completo. P06–P10. | P06 62.5; P07 65; P08 72.5; P09 57.5; P10 90. Promedio 69.5/100; tres de cinco puntuaron por debajo de 68. | Promedio apenas por encima de la referencia de 68 y variación amplia (57.5–90); resultado descriptivo, no prueba de superioridad poblacional. | PDF, pp. 33–36, 56. |
| 7 | First-click en Integraciones y Administración, seis tareas. P16–P20. | Aciertos T1–T6: P16 No/No/No/No/Sí/Sí; P17 No/No/No/Sí/Sí/No; P18 Sí/Sí/Sí/Sí/Sí/Sí; P19 Sí/Sí/No/Sí/Sí/Sí; P20 No/Sí/No/No/Sí/No. Aciertos por tarea: T1 2/5, T2 3/5, T3 1/5, T4 3/5, T5 5/5, T6 3/5. | El interruptor de pausa (T3) solo fue el primer clic correcto para 1/5; una persona que quería pausar eligió “Cerrar conexión”. Correo (T1) obtuvo 2/5. Es evidencia previa a UX-R5, no un re-test de la solución. | PDF, pp. 36–40. |
| 8 | Cuestionario UEQ completo. P16–P20. | Medias por dimensión (escala −3 a +3): P16 2.67/2.25/0.75/0.50/2.25/0.00; P17 0.50/0.75/2.25/−0.50/0.00/−0.50; P18 2.00/0.50/2.25/1.25/1.25/0.75; P19 −0.50/−0.50/−1.00/1.50/0.50/−1.25; P20 1.67/0.75/0.50/1.75/0.50/0.50. Orden: atractivo, claridad, eficiencia, controlabilidad, estimulación, novedad. | Medias: 1.27, 0.75, 0.95, 0.90, 0.90, −0.10. Cuatro dimensiones positivas y dos neutrales; P19 presentó varias valoraciones bajas. El informe advierte variación y posibles respuestas inconsistentes a la polaridad. | PDF, pp. 40–42. |
| 9 | Accesibilidad con usuarios: idioma, preferencias, lectura y formularios. P21–P25. | P21 cambió idioma en ~20 s sin ayuda y completó formularios, pero encontró textos sin traducir y controles móviles difíciles. P22 pidió ayuda a 2:30 para cambiarlo; no halló preferencias y tuvo dificultades de lectura con brillo bajo. P23 cambió idioma en ~10 s; encontró traducciones incompletas y completó formularios. P24 lo cambió en ~45 s tras buscar en Configuración; reportó texto tenue a distancia. P25 lo cambió en ~25 s; no encontró modo claro/tamaño de fuente y reportó textos pequeños. | 1/5 no cambió idioma sin ayuda; las cinco personas encontraron textos sin traducir. Cuatro señalaron problemas de contraste/legibilidad; los cinco buscaron preferencias que no estaban disponibles. | PDF, pp. 43–48, 56–58. |
| 10 | Five-second test de landing y onboarding en inglés, dispositivos variados. P21–P25. | P21: software de negocio, audiencia incierta; P22: control general del negocio, pensó en empresas grandes; P23: gestión empresarial, mencionó emprendedores/pyme pero no se reconoció como usuario; P24: gestión o logística, sí mencionó pymes; P25: plataforma de gestión, audiencia empresarial sin tipo de negocio claro. El resumen registra 2/5 identificaciones claras del producto y 0/5 se reconocieron como parte del público objetivo. | El mensaje dependía del subtítulo; la animación y el fondo competían con él. Se reportaron público objetivo oculto, ausencia de capturas reales, falta de español y problemas de ancho en móvil. No es la misma sesión ni el mismo criterio que el five-second posterior de UX-R4. | PDF, pp. 49–53, 56–57. |

El PDF documenta estas pruebas antes de los cambios UX-R1–R5.

La Prueba 10 del PDF y el protocolo posterior UX-R4 deben leerse como dos rondas
distintas. La primera fue en inglés, con dispositivos variados y cuatro preguntas;
el protocolo posterior fue en español, en 1440 × 900, con preguntas y criterios
explícitos diferentes: 3/5 identificaron ventas e inventario y 5/5 el público,
por lo que el umbral de producto (4/5) no se cumplió y el de público sí. No se
presentan como comparación experimental ni se combinan sus muestras.

## 5. Recomendaciones UX-R1–UX-R5 y criterios verificables

| Recomendación | Cambio implementado en Sprint 9 | Criterio verificable | Evidencia / estado de validación |
|---|---|---|---|
| **UX-R1 · Idioma** | La preferencia de idioma se guarda a nivel de navegador, se aplica antes del primer render, sobrevive al cierre de sesión y actualiza `<html lang>`. | La elección `es`/`en` debe persistir al recargar y cerrar sesión, y mostrarse en todas las rutas; el documento debe declarar el idioma activo. | La Prueba 9 encontró textos sin traducir en 5/5 y problemas de persistencia. Las pruebas automatizadas en `frontend/tests/locale.test.js` y `AppNavbar.test.js` verifican cambios técnicos; no se encontró re-test posterior con participantes. |
| **UX-R2 · Navegación** | Se reorganiza la navegación con “Ventas”, Configuración unificada y el camino Proyecto → Miembros. | Mantener permisos; enlaces y destinos acordes con la arquitectura; los 11 casos NV1–NV11 del plan maestro deben pasar. | El card sorting (4/5 agruparon cobros por separado y nadie usó “Punto de venta”) y el tree test (31/40 según el informe) documentan el problema de origen. Plan maestro §19.10 y [PR #144](https://github.com/PabloVS044/Kontrol/pull/144) acreditan pruebas automatizadas/cambio, no un re-test humano. |
| **UX-R3 · Contraste y estados** | Se elevan tokens de texto y se distinguen estados seleccionados/deshabilitados también por forma; se limita el brillo de fondo animado. | Contraste de texto de al menos **4.5:1** sobre las superficies auditadas; fondo detrás de texto con pico medido `#272727`; estados no diferenciados solo por color. | La Prueba 9 halló problemas de lectura con brillo bajo, a distancia y sin lentes (4/5). [PR #138](https://github.com/PabloVS044/Kontrol/pull/138) reporta 18 comprobaciones automatizadas; no equivale a una medición humana posterior de lectura a distancia. |
| **UX-R4 · Propuesta de valor** | Se rediseña la portada para explicar el producto y su público. | En five-second test: al menos **4/5** identifican ventas e inventario y **3/5** identifican tiendas/pequeños negocios. | La Prueba 10 previa registró 2/5 identificaciones claras del producto y 0/5 que se reconocieran como parte del público objetivo, en inglés y con dispositivos variados. En el test posterior de [UX-R4](./protocolo-five-second-ux-r4.md), el resultado literal es **3/5** producto (no cumple) y **5/5** público (cumple); las rondas no son directamente comparables. |
| **UX-R5 · Controles de Integraciones** | Se hace reconocible el interruptor de pausa, se explican sus estados, se diferencian los botones y “Cerrar conexión” pasa a “Eliminar configuración” con confirmación. | Al repetir first-click, al menos **80 %** de éxito en T1–T4 y **cero** participantes deben elegir “Eliminar configuración” cuando quieren pausar. | El Test 7 previo registró 1/5 aciertos para pausar Telegram; P20 hizo clic en “Cerrar conexión”. [PR #140](https://github.com/PabloVS044/Kontrol/pull/140) describe el criterio posterior “por verificar con el equipo”; no se encontró un re-test de UX-R5 con participantes y no se declara cumplido. |

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
- **Comprensión de la portada (Prueba 10 y UX-R4):** el PDF registra 2/5
  identificaciones claras del producto y 0/5 que se reconocieran como público
  objetivo en la ronda en inglés; el protocolo posterior en español registra 3/5 y
  5/5, respectivamente. Las preguntas,
  dispositivos y criterios no fueron iguales. Un laboratorio habría podido mostrar si
  las personas miraron el subtítulo o si el fondo animado compitió por su atención;
  no habría demostrado por sí solo que comprendieron el mensaje.
- **Interruptor de Integraciones (Test 7):** hay evidencia de first-click: solo 1/5
  eligió correctamente el interruptor para pausar Telegram y P20 eligió “Cerrar
  conexión”. El laboratorio podría haber complementado ese resultado con áreas de
  interés y primera fijación, pero esos datos no existen; el primer clic documenta
  la elección, no dónde miró cada persona.
- **Legibilidad (Prueba 9):** cuatro de cinco participantes señalaron problemas de
  lectura en condiciones como brillo bajo, monitor a distancia o uso sin lentes. El
  laboratorio podría describir qué zonas visuales recibieron atención en esas
  condiciones; no sustituiría la comprobación de contraste ni las respuestas verbales.
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
- El informe PDF se incluye en el repositorio como fuente auditable de la batería y
  de los resultados resumidos en §4.
- No se encontró el re-test de first-click de UX-R5 con participantes. El Test 7 del
  PDF es evidencia previa a la implementación.
- Las respuestas de P02 y P03 del five-second test no identifican ventas e inventario
  de forma explícita; se recodifican como No conforme a la regla escrita, corrigiendo
  el total original a 3/5 para identificación del producto.
