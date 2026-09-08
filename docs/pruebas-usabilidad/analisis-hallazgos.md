# Análisis de hallazgos de usabilidad y backlog priorizado (HU-37)

Consolida los datos de las tres sesiones moderadas de SCRUM-26 y los convierte en un
backlog de mejoras de interfaz priorizado y trazable hacia Jira.

## 1. Ficha del análisis

- **Ticket:** SCRUM-27 · **Historia:** HU-37
- **Responsable del análisis:** Ivana Figueroa (24785)
- **Fuente de datos:** [`registro-sesiones.md`](./registro-sesiones.md), sesiones del 06/09/2026
- **Rol en las sesiones:** anotadora; moderación a cargo de Alejandra Avilés (24722)
- **Ambiente:** https://test.34.121.51.151.nip.io (SCRUM-25)

---

## 2. Alcance y método

Estudio moderado y cualitativo con pensamiento en voz alta. Se analizan las cinco tareas del
protocolo ejecutadas por tres participantes, es decir quince observaciones, cada una con
resultado de la tarea, tiempo aproximado, comentario textual del participante y notas de la
anotadora. Sobre esa base se aplica el criterio de frecuencia y severidad de §6.

| Tarea | Descripción | Tiempo máximo |
|---|---|---:|
| T1 | Iniciar sesión e identificar en el dashboard el estado de los proyectos activos | 2:00 |
| T2 | Crear un proyecto con nombre, fechas y fase inicial | 3:00 |
| T3 | Crear una tarea dentro del proyecto y asignarla a un miembro | 3:00 |
| T4 | Registrar un avance y adjuntar evidencia | 3:00 |
| T5 | Consultar el reporte del proyecto y ubicar el resumen de presupuesto | 2:00 |

---

## 3. Tabla consolidada por tarea y participante

El registro de origen está organizado por participante; aquí se reorganiza por tarea, que es
la vista que permite ver patrones entre personas. Los comentarios textuales se recogen
agrupados en §5.

| Tarea | Participante | Éxito/Fallo | Tiempo | Observación registrada |
|---|---|---|---:|---|
| **T1** | P01 | Éxito | 1:15 | Sin fricción |
| **T1** | P02 | Éxito | 0:50 | Sin fricción |
| **T1** | P03 | Éxito | 1:45 | Búsqueda prolongada de la etiqueta de estado |
| **T2** | P01 | Éxito | 2:40 | Duda al ubicar el campo de fase inicial |
| **T2** | P02 | Éxito | 1:30 | Sin fricción |
| **T2** | P03 | Éxito | 2:10 | Sin fricción |
| **T3** | P01 | Éxito | 1:50 | Sin fricción |
| **T3** | P02 | Éxito | 2:10 | Espera por carga de la lista de miembros |
| **T3** | P03 | Éxito | 1:55 | Sin fricción |
| **T4** | P01 | Éxito | 2:55 | Búsqueda prolongada del control de adjuntar; confusión visual en el flujo de carga de archivos |
| **T4** | P02 | Éxito | 2:20 | Sin fricción |
| **T4** | P03 | **Fallo** | 3:00 | Bloqueo en la vista de detalle; no visualizó el botón de la esquina superior. Se agotó el tiempo del protocolo |
| **T5** | P01 | Éxito | 1:10 | Sin fricción |
| **T5** | P02 | Éxito | 1:40 | Sin fricción |
| **T5** | P03 | Éxito | 1:20 | Sin fricción |

**Desempeño global: 14 de 15 tareas completadas (93 %).** El único fallo es T4 en P03.

Una observación de P01 no quedó asociada a una tarea concreta en el registro: intentó hacer
clic en el nombre del proyecto en lugar del icono de gestión. Se trata en §5 como F-C.

---

## 4. Comparación de tiempos contra el máximo del protocolo

Cada tiempo se expresa como porcentaje del máximo permitido para esa tarea, lo que permite
comparar entre tareas con límites distintos.

| Tarea | Máximo | P01 | P02 | P03 | Media | % medio del máximo |
|---|---:|---|---|---|---:|---:|
| T1 | 2:00 | 1:15 (63 %) | 0:50 (42 %) | 1:45 (88 %) | 1:17 | **64 %** |
| T2 | 3:00 | 2:40 (89 %) | 1:30 (50 %) | 2:10 (72 %) | 2:07 | **70 %** |
| T3 | 3:00 | 1:50 (61 %) | 2:10 (72 %) | 1:55 (64 %) | 1:58 | **66 %** |
| **T4** | 3:00 | **2:55 (97 %)** | 2:20 (78 %) | **3:00 (100 %)** | 2:45 | **92 %** |
| T5 | 2:00 | 1:10 (58 %) | 1:40 (83 %) | 1:20 (67 %) | 1:23 | **69 %** |

**Ninguna tarea superó su tiempo máximo.** El único caso límite es T4 en P03, que lo alcanzó
exactamente (3:00) y se registró como fallo por agotamiento del tiempo, conforme al protocolo.

El dato relevante no es el exceso sino el margen restante. **T4 opera al 92 % de su límite,
frente al 64–70 % de las otras cuatro tareas**, y dos de los tres participantes quedaron a
menos de cinco segundos del corte: con un límite ligeramente menor, T4 habría registrado dos
fallos de tres. Los cuatro registros individuales más altos son T4/P03 (100 %), T4/P01
(97 %), T2/P01 (89 %) y T1/P03 (88 %); los dos primeros corresponden al mismo problema y los
otros dos se recogen como F-D y F-B.

Esta comparación es lo que sostiene la priorización: el 93 % de éxito sugiere que la interfaz
funciona, mientras que el consumo de tiempo señala dónde está el esfuerzo del usuario.

---

## 5. Comentarios agrupados por punto de fricción

### F-A · Localización del control para registrar avance y adjuntar evidencia

- P01, T4: «Casi se me acaba el tiempo buscando el botón de adjuntar.»
- P03, T4: «No encontré el botón para subir la evidencia a tiempo.»
- Anotadora, P01: confusión visual momentánea en el flujo de carga de archivos.
- Anotadora, P03: bloqueo en la vista de detalle de tarea; no visualizó el botón de la
  esquina superior; se cumplió el tiempo límite.

Único punto de fricción presente en más de un participante y único asociado a un fallo.

### F-B · Identificación de la etiqueta de estado en el dashboard

- P03, T1: «Me perdí buscando el "estado", pero ya lo ubiqué.» Tiempo: 1:45 sobre 2:00.

Se resolvió sin ayuda y sin fallo.

### F-C · Correspondencia entre la tarjeta de proyecto y su zona interactiva

- Anotadora, P01: intentó hacer clic en el nombre del proyecto en lugar del icono de gestión.

Sin retraso medible asociado.

### F-D · Ubicación del campo de fase inicial en el formulario de proyecto

- P01, T2: «Dudé un poco en dónde estaba el botón de fase inicial.» Tiempo: 2:40 sobre 3:00.

### Observación de rendimiento, fuera del alcance de interfaz

- P02, T3: «Esperé un poco a que cargara la lista, pero funcionó.» El registro lo consigna
  como incidencia del ambiente: carga lenta de la lista de miembros. Se traslada como insumo
  a las pruebas de carga de HU-38 y SCRUM-28, escenario C2 del plan maestro.

### Flujos sin fricción reportada

Los comentarios sobre reportes y presupuesto (T5), asignación de miembros (T3) y entrada al
dashboard (T1) fueron consistentemente positivos en los tres participantes. Esas pantallas no
generan hallazgos y no requieren cambio.

---

## 6. Criterio de priorización

Cada punto de fricción se clasifica por **frecuencia**, en cuántos de los tres participantes
se presentó, y por **severidad**:

| Severidad | Definición | Evidencia que la sustenta |
|---|---|---|
| Alta | Impidió completar la tarea | Registro de fallo |
| Media | Retrasó la completación | Tiempo por encima del 85 % del máximo |
| Baja | Causó molestia sin afectar el resultado | Comentario negativo sin retraso medible |

**Regla.** Es prioritario el hallazgo que aparece en **dos o más participantes** *y* que
**impidió o retrasó** la completación; deben cumplirse ambas condiciones. Los hallazgos que
no la cumplen se registran como **secundarios**: quedan documentados con su historia, pero no
compiten por la capacidad del Sprint 8.

---

## 7. Tabla de hallazgos priorizados

| ID | Punto de fricción | Flujo afectado | Evidencia | Frecuencia | Severidad | Nivel | Cambio propuesto | Sprint |
|---|---|---|---|---:|---|---|---|---|
| **H-01** | F-A · Control de registro de avance no localizable | T4 · Detalle de proyecto, pestaña de avances | P03 fallo a 3:00 (100 % del máx.); P01 éxito a 2:55 (97 %); media de la tarea 92 % frente a 64–70 % del resto | **2/3** | **Alta** | **Prioritario** | Renombrar el botón al vocabulario de la tarea y sacarlo de la esquina superior derecha | **8** |
| H-02 | F-B · Etiqueta de estado poco identificable | T1 · Dashboard y listado de proyectos | P03 a 1:45 (88 % del máx.) | 1/3 | Media | Secundario | Unificar el rótulo de estado con el diccionario i18n y elevar su peso visual | 9 |
| H-03 | F-C · Zona interactiva de la tarjeta de proyecto | Listado de proyectos | Anotadora, P01: clic en el nombre en lugar del icono de gestión | 1/3 | Baja | Secundario | Hacer interactiva toda la tarjeta | 9 |
| H-04 | F-D · Campo de fase inicial poco visible | T2 · Formulario de creación de proyecto | P01 a 2:40 (89 % del máx.) | 1/3 | Media | Secundario | Reordenar el formulario y rotular el campo con el vocabulario del protocolo | 9 |

H-01 es el único hallazgo que cumple las dos condiciones de la regla.

---

## 8. Traducción a backlog

### H-01 · Control de registro de avance no localizable — Prioritario, Sprint 8

**Objetivo.** Que el control para registrar un avance y adjuntar evidencia se localice sin
búsqueda al entrar en la pestaña de avances del proyecto.

**Causa identificada.** El control está en
`frontend/src/components/DetailProject/ProgressTab.vue`, dentro de `.title-container`, una
rejilla de tres columnas `4% 76% 20%` donde el botón ocupa la tercera con
`justify-self: end`. Concurren dos factores:

1. **Vocabulario.** La etiqueta del botón es `projects.progress.add`, que resuelve a
   «Agregar». La tarea pide «registrar un avance y adjuntar evidencia», y la anotadora
   registró que P03 buscaba un botón de «Registrar Avance»: el usuario busca una palabra que
   la interfaz no muestra.
2. **Ubicación.** El botón queda en el extremo superior derecho, fuera del recorrido visual
   hacia el contenido de la pestaña, que es donde los participantes dirigieron la atención.

**Criterios de aceptación.**

- La etiqueta del botón nombra la acción de registrar un avance en lugar del genérico
  «Agregar», actualizada en `es.json` y `en.json`.
- El control es visible sin desplazamiento al entrar en la pestaña, en escritorio y en móvil.
- El botón cumple los estados de interacción y el área táctil mínima de la identidad v2
  (`--k-target-min-size`, foco visible).
- En una repetición de T4 con tres participantes, el tiempo medio baja del 92 % al 70 % del
  máximo y no se registran fallos por agotamiento de tiempo.

**Coordinación.** `ProgressTab.vue`, `ProgressTab.css` y las claves de i18n pertenecen al
alcance de SCRUM-17; la implementación se coordina con su responsable.

---

### H-02 · Estado de proyecto poco identificable — Secundario, Sprint 9

**Objetivo.** Que el estado de un proyecto se lea de un vistazo y con el mismo vocabulario en
todo el módulo.

**Causa identificada.** El texto del estado lo produce `statusLabel()` de
`frontend/src/utils/statusHelpers.js`, que devuelve valores fijos en inglés desde el mapa
`STATUS_LABEL` (`Planned`, `In Progress`, `Paused`, `Completed`, `Cancelled`) sin pasar por
`vue-i18n`. El selector del formulario de proyecto sí usa el diccionario
(`projects.statuses.*`), que ya tiene las traducciones en `es.json` y `en.json`. El mismo
estado aparece entonces en dos idiomas dentro del módulo: el usuario elige «Planificado» al
crear el proyecto y la tarjeta se lo muestra como «Planned». A eso se suma la jerarquía: en
`DashboardView.vue` el estado se pinta con la clase `.member-email`, el estilo secundario
reservado a datos de contacto.

**Criterios de aceptación.**

- `statusLabel()` obtiene el rótulo de `projects.statuses.*` en lugar del mapa fijo, de modo
  que el estado respeta el idioma activo en tarjetas, listado y dashboard.
- El estado mostrado en una tarjeta coincide textualmente con la opción elegida en el
  formulario de creación.
- La etiqueta deja de heredar el estilo secundario de `.member-email` y se distingue del
  resto de metadatos por peso visual, no solo por color.
- El contraste cumple el mínimo AA de la guía de estilo sobre la superficie donde se pinta.

**Fuera de alcance.** Los dos colores de estado que siguen en hexadecimal (`#60a5fa`,
`#f97316`) ya están documentados como pendientes en `ProjectsView.vue` con un `TODO SCRUM-16`.

---

### H-03 · Zona interactiva de la tarjeta de proyecto — Secundario, Sprint 9

**Objetivo.** Que cualquier punto de la tarjeta de proyecto lleve a su detalle.

**Causa identificada.** En `frontend/src/views/ProjectsView.vue` la navegación está en
`.card-main` (`@click="router.push(...)"`), no en `.project-card`. Un clic sobre el resto de
la tarjeta —cabecera de estado, cuerpo, pie— no produce efecto, que es lo que observó la
anotadora.

**Criterios de aceptación.**

- Toda la superficie de la tarjeta navega al detalle del proyecto.
- Los controles internos con acción propia conservan su comportamiento y no disparan la
  navegación.
- La tarjeta es alcanzable y accionable por teclado, con foco visible.

---

### H-04 · Campo de fase inicial poco visible — Secundario, Sprint 9

**Objetivo.** Que el campo de fase inicial se ubique sin relecturas al crear un proyecto.

**Causa identificada.** Es el selector `form.estado` del modal de creación en
`frontend/src/views/ProjectsView.vue`, rotulado con `projects.form.status` («Estado»).
Concurren dos factores:

1. **Vocabulario.** El protocolo y el participante lo nombran «fase inicial»; la interfaz
   dice «Estado», que también es el nombre del dato en proyectos ya creados. El término
   «Estado inicial» ya existe en el diccionario (`tasks.modal.initialStatus`), aplicado al
   modal de tareas pero no al de proyectos.
2. **Posición.** Es el último campo del formulario y comparte fila con «Presupuesto», que sí
   es obligatorio y concentra la atención.

**Criterios de aceptación.**

- El rótulo distingue el estado inicial del estado general del proyecto, con clave propia en
  `es.json` y `en.json`.
- El campo no comparte fila con «Presupuesto» ni queda como último control antes de las
  acciones del modal.
- En una repetición de T2, el tiempo medio se mantiene por debajo del 70 % del máximo.

---

## 9. Limitaciones declaradas

1. **Muestra de tres participantes.** Los resultados son indicativos y no concluyentes. Un
   hallazgo de «2 de 3» describe a dos personas, no una proporción proyectable: la
   priorización ordena la atención del equipo, no mide prevalencia.

2. **Cobertura parcial de la interfaz.** Las cinco tareas recorren dashboard, proyectos,
   tareas, avances y reportes, es decir las pantallas migradas en la **Fase 1 del rediseño**
   durante el Sprint 6. Las pantallas de la **Fase 2 no fueron sometidas a prueba** y este
   análisis no dice nada sobre ellas.

3. **Sin medición de percepción declarada.** La severidad se deriva por completo del
   desempeño observado y del comentario textual.

4. **Tiempos aproximados.** El protocolo registra tiempo tomado manualmente, no cronometraje
   instrumentado; los porcentajes de §4 deben leerse como orden de magnitud.

---

## 10. Trazabilidad hacia Jira

| Hallazgo | Historia a crear | Nivel | Sprint | Clave de Jira |
|---|---|---|---|---|
| H-01 | Control de registro de avance localizable | Prioritario | 8 | _por asignar_ |
| H-02 | Estado de proyecto legible y consistente en dashboard y listado | Secundario | 9 | _por asignar_ |
| H-03 | Tarjeta de proyecto interactiva en toda su superficie | Secundario | 9 | _por asignar_ |
| H-04 | Campo de fase inicial identificable en el formulario | Secundario | 9 | _por asignar_ |

Cada historia se crea en el backlog de Jira con el criterio de aceptación de §8 y enlaza a
este documento como evidencia. La columna de clave se completa al crearlas.

---

## 11. Destino de los hallazgos

- Las mejoras priorizadas se planifican para el **Sprint 8**, junto con los hallazgos
  instrumentados que produzca el Neurolab entre el **22 y el 25 de septiembre** en el
  laboratorio CIT 415-B. Ese estudio aplicará el protocolo T1–T5 con medición de percepción
  declarada, lo que permitirá contrastar estos hallazgos preliminares.
- **T4 se repite con prioridad** en ese estudio: es la tarea con menor margen de tiempo y la
  única con un fallo registrado, y sus tiempos verifican el criterio de aceptación de H-01.
- La observación de latencia en la carga de la lista de miembros (§5) pasa a las pruebas de
  carga de HU-38 y SCRUM-28.
