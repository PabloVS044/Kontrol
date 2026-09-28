# Análisis de hallazgos de usabilidad de la Fase 2 y backlog priorizado

Consolida los datos de las tres sesiones moderadas de SCRUM-54 sobre las pantallas migradas
en la Fase 2 del rediseño y los convierte en hallazgos priorizados con su plan de
implementación.

## 1. Ficha del análisis

- **Responsable del análisis:** Juan Montenegro (24750)
- **Rol en las sesiones:** anotador; moderación a cargo de Alejandra Avilés (24722)
- **Sesiones de origen:** SCRUM-54, protocolo en [`protocolo-fase2.md`](./protocolo-fase2.md)
- **Fuente de datos:** [`Registro_sesiones_usabilidad_Fase_2.xlsx`](./Registro_sesiones_usabilidad_Fase_2.xlsx),
  hojas `Registros` (15 registros de tarea) y `Evidencia` (consentimientos y fotografías)
- **Fecha de las sesiones:** _por completar_
- **Ambiente:** https://test.34.121.51.151.nip.io (SCRUM-25), restablecido y verificado con
  `npm run verify:ux-phase2` antes de cada sesión
- **Estudio de referencia:** [`analisis-hallazgos.md`](./analisis-hallazgos.md) (SCRUM-27,
  Sprint 7)

**Convención de identificadores.** Los hallazgos de este análisis usan el prefijo `H2-`
(Fase 2). Los del Sprint 7 se citan como `S7-H01` a `S7-H04`, con la numeración de su
documento. Los registros de sesión se citan como `P01-F3`: participante y tarea.

---

## 2. Participantes y alcance evaluado

### 2.1 Perfil de los participantes

Tres personas reclutadas con el perfil definido para el estudio:

- De 18 a 30 años.
- Usuarias frecuentes de aplicaciones web.
- Sin conocimiento previo de Kontrol ni participación en su desarrollo.

Las tres cumplen el perfil según la hoja `Evidencia` (columna *Perfil confirmado*: Sí), y
las tres firmaron consentimiento y autorizaron una fotografía sin rostro. Solo se usan los
identificadores anónimos P01 a P03.

| Participante | Edad | Ocupación o área de estudio | Uso de aplicaciones web | Experiencia con sistemas de inventario o ventas | Dispositivo y navegador |
|---|---|---|---|---|---|
| P01 | _por completar_ | _por completar_ | _por completar_ | _por completar_ | _por completar_ |
| P02 | _por completar_ | _por completar_ | _por completar_ | _por completar_ | _por completar_ |
| P03 | _por completar_ | _por completar_ | _por completar_ | _por completar_ | _por completar_ |

### 2.2 Parte de la aplicación evaluada

Las pantallas migradas en la Fase 2 del rediseño, que el estudio del Sprint 7 declaró
explícitamente como no evaluadas:

| Módulo | Ruta | Qué se evaluó | Tarea |
|---|---|---|---|
| Inventario | `/inventory` | Alta de producto con nombre, precios, código de barras y stock | F1 |
| Ficha de producto y proveedores | `/inventory/:id`, `/suppliers` | Vinculación de un proveedor existente con precio cotizado | F2 |
| Punto de venta | `/inventory` (carrito y cobro) | Búsqueda por código, carrito y cobro de una venta | F3 |
| Centro de marketing | `/marketing` | Creación y programación de una publicación | F4 |
| Centro de marketing | `/marketing` | Listado de publicaciones filtrado por estado | F5 |

En F3 el código se ingresó manualmente, que es un camino válido del flujo; el escaneo por
cámara no forma parte de la evaluación.

---

## 3. Método

Estudio moderado y cualitativo con pensamiento en voz alta. Cada participante ejecutó cinco
tareas con datos estandarizados, lo que da quince observaciones. Cada una tiene resultado,
tiempo, punto de fricción observable, comentario textual literal y notas del anotador. Ningún
participante recibió ayuda.

| Tarea | Descripción | Tiempo máximo |
|---|---|---:|
| F1 | Dar de alta un producto con nombre, precio y código de barras | 3:00 |
| F2 | Vincular un proveedor a ese producto | 2:00 |
| F3 | Registrar una venta buscando el producto y cobrándola | 3:00 |
| F4 | Crear una publicación de marketing y programarla | 3:00 |
| F5 | Consultar el listado de publicaciones filtrando por estado | 2:00 |

**Criterio de fallo por tiempo.** Una tarea es fallo por tiempo solo si **sobrepasa** el
máximo. Completarla exactamente en el límite cuenta como éxito. El protocolo se corrigió para
decirlo así, y coincide con la fórmula *Dentro del límite* de la hoja `Resumen` (`<=`).

**Fuente de verdad.** Las notas del anotador de cada registro son la referencia para
interpretar el comentario del participante. Un comentario de confusión inicial seguido de una
nota de facilidad (por ejemplo P01-F2) describe una duda breve resuelta sin ayuda, no una
contradicción.

---

## 4. Tabla consolidada por tarea y participante

| Tarea | Participante | Éxito/Fallo | Tiempo | Observación registrada |
|---|---|---|---:|---|
| **F1** | P01 | Éxito | 2:38 | Oprimió «Cancelar» en lugar de guardar y repitió el proceso; tiempo justo |
| **F1** | P02 | Éxito | 2:22 | Poco intuitivo ubicar dónde añadir productos; esperaba un acceso directo en la pantalla principal |
| **F1** | P03 | Éxito | 1:30 | Algo de confusión al encontrar dónde añadir el producto; lo encontró navegando |
| **F2** | P01 | Éxito | 1:09 | Duda breve al localizar dónde añadir el proveedor; después le fue fácil |
| **F2** | P02 | Éxito | 1:20 | Le costó asimilar que la vinculación está en la ficha del producto |
| **F2** | P03 | Éxito | 0:45 | Esperaba que el botón abriera otra vista o ventana; completó al llenar los datos |
| **F3** | P01 | Éxito | 2:20 | No encontraba dónde vender; ligero problema de contraste de texto sobre el fondo |
| **F3** | P02 | **Fallo** | 3:20 | Navegó por otras pestañas; no terminó de entender el proceso de venta. Fallo por tiempo |
| **F3** | P03 | Éxito | 1:19 | Buscaba una sección de «ventas»; descubrió que está en Inventario |
| **F4** | P01 | Éxito | 2:08 | Opciones de proyecto y formato ilegibles sin pasar el cursor; la hora programada cambió a las 4:00 |
| **F4** | P02 | Éxito | 3:00 | Opciones ilegibles sin pasar el cursor; redactar fue fácil; tiempo justo al programar |
| **F4** | P03 | Éxito | 2:54 | Opciones ilegibles; programó primero el borrador existente en vez de crear una nueva |
| **F5** | P01 | Éxito | 0:20 | No identificó de inmediato el control para filtrar por estado |
| **F5** | P02 | Éxito | 1:15 | Tardó en localizar el filtro; después lo usó sin dificultad |
| **F5** | P03 | Éxito | 0:15 | Sin fricción |

**Desempeño global: 14 de 15 tareas completadas (93 %).** El único fallo es F3 en P02.

---

## 5. Comparación de tiempos contra el máximo

| Tarea | Máximo | P01 | P02 | P03 | Media | % medio del máximo |
|---|---:|---|---|---|---:|---:|
| F1 | 3:00 | **2:38 (88 %)** | 2:22 (79 %) | 1:30 (50 %) | 2:10 | 72 % |
| F2 | 2:00 | 1:09 (58 %) | 1:20 (67 %) | 0:45 (38 %) | 1:05 | 54 % |
| **F3** | 3:00 | 2:20 (78 %) | **3:20 (111 %)** | 1:19 (44 %) | 2:20 | 78 % |
| **F4** | 3:00 | 2:08 (71 %) | **3:00 (100 %)** | **2:54 (97 %)** | 2:41 | **89 %** |
| F5 | 2:00 | 0:20 (17 %) | 1:15 (63 %) | 0:15 (13 %) | 0:37 | 31 % |

**Tareas que excedieron el máximo:** solo **F3 en P02** (3:20 sobre 3:00, 20 s de exceso),
registrada como fallo por tiempo. **F4 en P02** llegó exactamente al límite y cuenta como
éxito.

**Registros por encima del 85 % del máximo:** P02-F3 (111 %), P02-F4 (100 %), P03-F4 (97 %)
y P01-F1 (88 %).

Lectura:

- **F4 es la tarea con menor margen**: su media es el 89 % del límite y dos de tres
  participantes terminaron a 6 s o menos del corte. Repite el patrón de T4 en el Sprint 7
  (92 %).
- **F3 es la tarea más dispersa**: va del 44 % al 111 %. El tiempo depende de si la persona
  descubre pronto que la venta se hace desde Inventario.
- **F2 y F5 tienen margen amplio** (54 % y 31 %). Sus fricciones son de descubrimiento
  inicial y no retrasaron la tarea.

---

## 6. Comentarios textuales agrupados por punto de fricción

Los comentarios se transcriben literalmente, sin corregir la gramática, conforme al protocolo.

### FR-A · Ubicación del punto de venta

- P01-F3: «No lograba encontrar dónde vender el producto, pero toda ves lo encontré, fue
  fácil llenar lo solicitado.»
- P02-F3: «Cuándo dicen en Stock, ¿a qué se refieren? No encuentró fácilmente si realicé la
  venta, deberían poner una notificación push/rápida para confirmarlo»
- P03-F3: «¿Dónde puedo hacerlo...? ¿Habrá una ventana de ventas exclusivamente?, ah es en
  inventario también.»
- Anotador, P02: confundió añadir proyecto con añadir venta; navegó en otras pestañas y no
  terminó de entender el proceso. **Fallo por tiempo.**
- Anotador, P03: buscaba algún espacio de «ventas» o similar.

Presente en los tres participantes y asociado al único fallo del estudio.

### FR-B · Opciones de los selectores ilegibles sin pasar el cursor

- P02-F4: «Me gustaría o sería mejor que pudiera ver las opciones sin tener que mover el
  mouse sobre las posibles opciones buscando.»
- Fricción registrada en P01-F4, P02-F4 y P03-F4: al elegir proyecto y formato de
  publicación, los textos no se leían sin poner el cursor encima de cada opción.
- Anotador, P02: sigue el problema de visualización; tiempo justo al programar (3:00).

Presente en los tres participantes; coincide con la tarea de menor margen.

### FR-C · Confirmación de la venta y vocabulario de stock

- P02-F3: «Cuándo dicen en Stock, ¿a qué se refieren? No encuentró fácilmente si realicé la
  venta, deberían poner una notificación push/rápida para confirmarlo»

### FR-D · Cancelar en lugar de guardar al crear el producto

- P01-F1: «Pensé que le había dado en guardar, pero no pude ver bien, así que parece que lo
  eliminé.»
- Anotador, P01: el tiempo estuvo justo por repetir el proceso (2:38, 88 %).

### FR-E · Crear una publicación nueva frente a programar la existente

- P03-F4: «Ya lo hice, la que estaba ahí la programé. Ah, ¿Debía ser una nueva? ¿Dónde le
  doy?»
- Anotador, P03: programó el borrador existente del ambiente antes de crear la publicación
  pedida (2:54, 97 %).

### FR-F · Ubicación de la vinculación de proveedores

- P01-F2: «Que confuso poder localizar dónde añadir el proveedor.» Anotador: se le hizo
  fácil añadir el proveedor.
- P02-F2: «Estaría mejor si pudiera pensar o encontrar intuitivamente que ahí mismo está
  para vincular el proveedor, no pensé que estaría ahí.»
- P03-F2: esperaba que el botón cambiara la vista o abriera una ventana. Completó sin ayuda.

Presente en los tres participantes, sin retraso medible (máximo 67 %).

### FR-G · Acceso para dar de alta un producto

- P02-F1: «Me confunde la interfaz porque no está a la mano como imaginé cada
  botón/acción/encabezado.» Anotador: esperaba un acceso directo en la pantalla principal.
- P03-F1: «¿En inventario? A saber, ¿una nueva tarea?» Anotador: algo de confusión; lo
  encontró navegando.

### FR-H · Control de filtro por estado poco visible

- P01-F5: «Para filtrar, ¿cómo lo hago?» Anotador: no identificó de inmediato el control.
- P02-F5: «Me costó un poco ver dónde estaba lo necesario para filtrar, pero una vez
  encontrado, me fue muy fácil.»

### FR-I · Contraste de texto en el punto de venta

- Anotador, P01-F3: ligero problema por contraste de texto respecto al fondo.

### Defecto funcional, fuera del criterio de usabilidad

- P01-F4: «Al darle programar a la publicación, le cambió la hora a las 4:00 am, y sí había
  escrito bien la hora, pero al guardar el borrador lo cambió el sistema.» El anotador
  confirmó el cambio de hora. Se trata como defecto en §10 (D-01).

### Flujos sin fricción reportada

P03-F5 no presentó fricción. La redacción del texto de la publicación en F4 fue descrita
como fácil (anotador, P02), y el llenado del cobro en F3 también (P01).

---

## 7. Criterio de priorización

Es el mismo criterio de SCRUM-27. Cada punto de fricción se clasifica por **frecuencia**, es
decir en cuántos de los tres participantes se presentó, y por **severidad**:

| Severidad | Definición | Evidencia que la sustenta |
|---|---|---|
| Alta | Impidió completar la tarea | Registro de fallo |
| Media | Retrasó la completación | Tiempo por encima del 85 % del máximo |
| Baja | Causó molestia sin afectar el resultado | Comentario o nota de fricción sin retraso medible |

**Regla.** Es **prioritario** el hallazgo que aparece en **dos o más participantes** *y*
que **impidió o retrasó** la completación; deben cumplirse ambas condiciones. Los demás son
**secundarios**: quedan documentados con su historia, pero no compiten por la capacidad del
sprint siguiente.

---

## 8. Tabla de hallazgos priorizados

| ID | Punto de fricción | Flujo afectado | Evidencia | Frecuencia | Severidad | Nivel | Cambio propuesto | Sprint |
|---|---|---|---|---:|---|---|---|---|
| **H2-01** | FR-A · Punto de venta no localizable | F3 · Inventario, carrito y cobro | P02-F3 fallo a 3:20 (111 %); P01-F3 «No lograba encontrar dónde vender»; P03-F3 buscaba «ventas» | **3/3** | **Alta** | **Prioritario** | Dar a la venta una entrada propia con el vocabulario del usuario y un botón «Vender» de mayor peso | **9** |
| **H2-02** | FR-B · Opciones de selectores ilegibles sin cursor | F4 · Formulario de publicación | Fricción registrada en P01-F4, P02-F4 y P03-F4; P02 a 3:00 (100 %), P03 a 2:54 (97 %); media de F4 89 % | **3/3** | **Media** | **Prioritario** | Fijar el color de fondo y de texto de las opciones y verificar contraste AA | **9** |
| H2-03 | FR-C · Confirmación de venta no percibida; término «Stock» | F3 · Cobro | P02-F3, en la tarea fallida | 1/3 | Alta | Secundario | Confirmación visible en el foco de la acción y rótulo de existencias en lenguaje llano | 10 |
| H2-04 | FR-D · Cancelar confundido con Guardar | F1 · Modal de producto | P01-F1 a 2:38 (88 %); repitió el proceso | 1/3 | Media | Secundario | Diferenciar la acción principal y pedir confirmación al cancelar un formulario con datos | 10 |
| H2-05 | FR-E · Crear nueva frente a programar existente | F4 · Listado de publicaciones | P03-F4 a 2:54 (97 %) | 1/3 | Media | Secundario | Hacer más visible «Nueva publicación» | 10 |
| H2-06 | FR-F · Vinculación de proveedor en un lugar inesperado | F2 · Ficha de producto | P01-F2, P02-F2, P03-F2; máximo 67 % | 3/3 | Baja | Secundario | Señalizar la ficha desde la tarjeta, traducir la sección y ofrecer el vínculo desde Proveedores | 10 |
| H2-07 | FR-G · Acceso a alta de producto | F1 · Inventario | P02-F1 (79 %), P03-F1 (50 %) | 2/3 | Baja | Secundario | Acceso directo a «Nuevo producto» desde el dashboard y rótulo de navegación que mencione productos | 10 |
| H2-08 | FR-H · Filtro por estado poco visible | F5 · Listado de publicaciones | P01-F5, P02-F5 (63 %) | 2/3 | Baja | Secundario | Rótulo visible en los filtros | 10 |
| H2-09 | FR-I · Contraste de texto en el punto de venta | F3 · Tarjeta de producto | Anotador, P01-F3 | 1/3 | Baja | Secundario | Auditar el contraste de los textos secundarios de la tarjeta | 10 |

**H2-01 y H2-02 son los únicos hallazgos que cumplen las dos condiciones de la regla.**

- H2-06, H2-07 y H2-08 cumplen la frecuencia, pero no causaron retraso medible.
- H2-03, H2-04 y H2-05 tienen severidad media o alta, pero aparecen en un solo participante.

El defecto D-01 (hora programada desplazada) no se clasifica con este criterio porque no es
un problema de usabilidad sino un error funcional. Se planifica en el Sprint 9 como bug
(§10).

---

## 9. Comparación con el Sprint 7

La numeración del ticket no coincide con la del documento del Sprint 7. Se compara por
contenido:

| Hallazgo del ticket | ID en `analisis-hallazgos.md` | ¿Se reproduce en la Fase 2? | Evidencia |
|---|---|---|---|
| H-01 · Dificultad para ubicar el botón de acción principal | S7-H01 | **Sí, y es el patrón dominante** | H2-01 (3/3, fallo), H2-07 (2/3), H2-08 (2/3), H2-05 (1/3), H2-06 (3/3) |
| H-02 · Confusión entre elemento y botón de gestión | S7-H03 | **Parcialmente** | H2-01, H2-06 |
| H-03 · Bajo contraste en etiquetas de estado | S7-H02 | **Parcialmente**: el problema de contraste se repite, no en etiquetas de estado | H2-02 (3/3), H2-09 (1/3), H2-04 |

**S7-H01, acción principal.** Se reproduce con el mismo mecanismo del Sprint 7: la acción
existe, pero no está donde el usuario la busca ni con la palabra que usa.

- En la Fase 2 afecta a cinco de los nueve hallazgos y a cuatro de las cinco tareas.
- El caso más grave es la venta. No hay una entrada «Ventas» en la navegación, y la acción
  es un botón «Vender» en el pie de cada tarjeta de producto, con tipografía de leyenda y
  fondo transparente.
- En el Sprint 7 era «Agregar» en una esquina en lugar de «Registrar avance». Aquí los
  participantes buscan «ventas» y la interfaz la ubica dentro de «Inventario».

**S7-H03, elemento frente a botón de gestión.** Se reproduce en la tarjeta de producto:

- Un clic en la tarjeta abre la ficha, pero nada lo indica. La clave
  `inventory.card.viewDetails` existe en el diccionario y ninguna vista la usa.
- Por eso las acciones que viven en la ficha, como vincular un proveedor, no se anticipan
  (H2-06).
- P02 buscó la venta en la tarjeta sin reconocer el botón del pie como la acción (H2-01).

**S7-H02, estado y contraste.** Ningún participante reportó problemas con etiquetas de estado.
El filtro por estado de F5 se usó sin dificultad una vez encontrado. Sí se reproduce el
problema de legibilidad por contraste en otros elementos:

- Las opciones de los selectores de F4, en los tres participantes (H2-02).
- El texto sobre el fondo en el punto de venta (H2-09).
- Posiblemente la distinción entre Cancelar y Guardar (H2-04).

**Estado de las historias del Sprint 7.** Al cierre de este análisis, los cambios de S7-H01
a S7-H03 no están aplicados en el código:

- El botón de avances sigue rotulado «Agregar».
- `statusLabel()` sigue usando el mapa fijo en inglés.
- La navegación de la tarjeta de proyecto sigue en `.card-main`.

Por lo tanto, la repetición en la Fase 2 no indica que una corrección haya fallado, sino que
el patrón es transversal. Conviene resolverlo como regla de diseño (acción principal visible,
con el verbo de la tarea, fuera de esquinas y pies de tarjeta), no pantalla por pantalla.

---

## 10. Traducción a backlog

### H2-01 · Punto de venta localizable — Prioritario, Sprint 9

**Objetivo.** Que una persona que quiere vender un producto encuentre dónde hacerlo sin
recorrer otros módulos.

**Causa identificada.** Concurren tres factores:

1. **Navegación.** `frontend/src/components/AppNavbar.vue` no tiene una entrada de ventas ni
   de punto de venta. La venta vive dentro de `/inventory`, que los participantes asocian con
   existencias y no con cobro. Tanto P03 como el anotador de P03 describen la búsqueda de una
   sección de «ventas».
2. **Peso visual del disparador.** En `frontend/src/views/InventoryPage.vue` la venta empieza
   con el botón `.sell-btn` del pie de cada tarjeta. Según `InventoryPage.css`, tiene tamaño
   de leyenda (`--k-font-size-caption`), mayúsculas, fondo transparente y comparte el pie con
   «+ Ingresar». No se distingue como acción principal.
3. **Flujo oculto hasta el primer paso.** El panel de venta (`SaleCartPanel`) solo aparece
   después de añadir un producto. Antes de eso, nada en la pantalla indica que ahí se vende.

**Criterios de aceptación.**

- La navegación principal ofrece un acceso rotulado con el vocabulario de venta (por ejemplo
  «Vender» o «Punto de venta»). Lleva al flujo de venta, con el buscador por código enfocado.
- En la pantalla de inventario, la acción de vender se distingue visualmente de las acciones
  secundarias de la tarjeta: peso, tamaño y área táctil mínima de la identidad v2
  (`--k-target-min-size`).
- Sin productos en el carrito, la pantalla muestra dónde se armará la venta. El panel vacío
  explica cómo empezar.
- Textos nuevos en `es.json` y `en.json`.
- En una repetición de F3 con tres participantes, no hay fallos y la media baja del 78 % al
  60 % del máximo o menos.

---

### H2-02 · Opciones de selectores legibles en marketing — Prioritario, Sprint 9

**Objetivo.** Que las opciones de proyecto, canal y formato se lean sin pasar el cursor por
cada una.

**Causa identificada.** En `frontend/src/views/MarketingPublications.css`, los selectores
del formulario (`.mkt-field select`) y de los filtros (`.mkt-select`) confían en
`color-scheme: dark` para pintar la lista desplegable. No declaran el fondo de las opciones.

- Cuando el navegador no aplica esa pista a la lista nativa, las opciones heredan el texto
  claro del tema sobre el fondo claro del sistema. Solo se lee la opción resaltada bajo el
  cursor, que es lo que describen los tres participantes.
- Otras vistas ya resuelven el mismo caso con un fondo explícito:
  `.form-field select option { background: var(--k-shade-2); }` en `ProgressModal.css` y en
  `ProjectDetailsView.css`.

Hay que verificar el caso en el navegador y el sistema operativo usados en las sesiones
(§2.1).

**Criterios de aceptación.**

- Las opciones de todos los selectores del centro de marketing tienen color de fondo y de
  texto explícitos, tomados de los tokens del tema.
- El contraste entre texto y fondo de las opciones cumple AA (4.5:1) en Chrome, Edge y
  Firefox sobre Windows, en tema oscuro y claro.
- La corrección se aplica también al selector de proveedor de la ficha de producto
  (`.supplier-link-form select` en `ProductDetailView.vue`), que tampoco declara fondo para
  sus opciones.
- En una repetición de F4 con tres participantes, ninguno reporta opciones ilegibles y la
  media baja del 89 % al 75 % del máximo o menos.

---

### D-01 · Hora de programación desplazada seis horas — Bug, Sprint 9

**Objetivo.** Que una publicación programada a las 10:00 se muestre y se guarde a las 10:00.

**Causa identificada.**

1. El frontend envía la hora local sin zona horaria (`toBackendTimestamp()` en
   `MarketingPublicationsView.vue`: `'YYYY-MM-DD 10:00:00'`).
2. La columna `scheduled_for` es `timestamp without time zone` (`backend/kontrol.sql`).
3. El backend no define `setTypeParser` ni `TZ`, así que `node-pg` interpreta el valor como
   hora del contenedor (UTC) y lo devuelve como `…T10:00:00.000Z`.
4. El navegador en Guatemala (UTC−6) lo muestra como 04:00, que es lo que vio P01.

El defecto afecta a toda publicación programada, no solo a la de P01.

**Criterios de aceptación.**

- Una publicación programada a una hora local se muestra con la misma hora en la tarjeta, en
  el calendario y al reabrir el formulario de edición.
- La hora almacenada representa el instante correcto, ya sea con `timestamptz` y envío con
  desplazamiento horario desde el cliente, o con otra decisión documentada.
- Prueba automatizada que cubre el viaje de ida y vuelta de la fecha programada.

---

### H2-03 · Confirmación de venta y vocabulario de stock — Secundario, Sprint 10

**Causa identificada.**

- El ticket de venta (`.sale-receipt` en `InventoryPage.vue`) aparece fijo en la esquina
  inferior derecha, lejos del botón de cobro y de donde se dirige la atención.
- El stock se rotula «stock total» (`inventory.card.totalStock`), un término que P02 no
  reconoció.

**Criterios de aceptación.**

- Al confirmar la venta aparece una confirmación visible junto al punto donde se pulsó
  «Realizar venta», con el total y el número de venta.
- El mensaje de confirmación es anunciado por lectores de pantalla.
- El rótulo de existencias usa lenguaje llano, por ejemplo «Disponibles» o «Unidades en
  existencia», en `es.json` y `en.json`.

### H2-04 · Cancelar confundido con Guardar — Secundario, Sprint 10

**Causa identificada.** En `ProductModal.vue`:

- «Cancelar» tiene borde y texto de alto contraste.
- «Guardar» permanece deshabilitado hasta que el formulario es válido (`canSubmit`) y en ese
  estado pierde peso visual.
- Cancelar descarta los datos sin confirmación.

**Criterios de aceptación.**

- «Guardar» es la acción de mayor peso visual. Su estado deshabilitado indica qué falta para
  habilitarlo.
- Cancelar un formulario con datos modificados pide confirmación antes de descartarlos.

### H2-05 · Crear publicación nueva — Secundario, Sprint 10

**Causa identificada.**

- «Nueva publicación» está en el extremo derecho del encabezado.
- Cada borrador del listado muestra a la vista la transición «Programar», el mismo verbo de
  la tarea. P03 siguió ese camino más corto y programó el borrador existente.

**Criterios de aceptación.**

- «Nueva publicación» es la acción de mayor jerarquía de la vista y se ve sin desplazamiento
  en escritorio y móvil.
- Con el listado vacío o filtrado sin resultados, el mensaje ofrece crear una publicación.

### H2-06 · Vinculación de proveedor señalizada — Secundario, Sprint 10

**Causa identificada.**

- La vinculación vive en la ficha del producto (`ProductDetailView.vue`), a la que se llega
  con un clic en la tarjeta sin ninguna señal visible (`inventory.card.viewDetails` sin uso).
- La sección está escrita en inglés fijo: «Suppliers», «Linked supplier quotes», «Last
  quote» y el símbolo `$`.
- El enlace de navegación «Suppliers» de `AppNavbar.vue` tampoco pasa por el diccionario.

**Criterios de aceptación.**

- La tarjeta de producto muestra una acción visible para abrir la ficha.
- La sección de proveedores de la ficha y el enlace de navegación usan claves de `vue-i18n`,
  y los precios se muestran con la moneda configurada.
- Desde Proveedores se puede llegar a vincular un producto, o se indica que se hace desde la
  ficha.

### H2-07 · Acceso a alta de producto — Secundario, Sprint 10

**Criterios de aceptación.**

- El dashboard ofrece un acceso directo a «Nuevo producto» para los roles con permiso de
  escritura en inventario.
- El rótulo o la descripción de Inventario en la navegación indica que ahí se gestionan los
  productos.

### H2-08 · Filtro por estado visible — Secundario, Sprint 10

**Causa identificada.** Los filtros de `MarketingPublicationsView.vue` son selectores sin
rótulo visible. Su nombre solo existe como `aria-label`, y la primera opción («Todos los
estados») se lee como un valor, no como un control de filtro.

**Criterios de aceptación.**

- Cada filtro tiene un rótulo visible («Estado», «Canal», «Proyecto»).
- El filtro activo se distingue del estado sin filtrar.

### H2-09 · Contraste de textos en la tarjeta de producto — Secundario, Sprint 10

**Criterios de aceptación.**

- Los textos secundarios de la tarjeta y del panel de venta cumplen AA sobre su superficie:
  etiquetas de precio y stock, «+ Ingresar» y los botones deshabilitados informativos.
- Verificación documentada con la herramienta de contraste de la guía de estilo.

---

## 11. Limitaciones declaradas

1. **Muestra de tres participantes.** Los resultados son **indicativos y no concluyentes**.
   Un hallazgo de «3 de 3» describe a tres personas, no una proporción proyectable. La
   priorización ordena la atención del equipo, no mide prevalencia.
2. **Tiempos aproximados.** Se tomaron manualmente, sin cronometraje instrumentado. Los
   porcentajes de §5 deben leerse como orden de magnitud.
3. **Sin medición de percepción ni instrumentación.** El estudio del Neurolab en el CIT 415-B
   se reprogramó al Sprint 9. La severidad se deriva del desempeño observado y del
   comentario textual.
4. **Criterio de límite.** En este estudio, completar en el límite exacto es éxito (§3). Si se
   aplicara el criterio del Sprint 7, donde 3:00 exacto contó como fallo, P02-F4 sería fallo y
   H2-02 tendría severidad alta. **El nivel prioritario de H2-02 no cambia.**
5. **Orden fijo de tareas.** F2, F3 y F5 dependen de lo creado en la tarea anterior, así que
   el aprendizaje entre tareas favorece a las últimas.
6. **Borrador sembrado en el ambiente.** La publicación en borrador que F5 necesita estaba
   visible durante F4. Contribuyó al desvío de P03-F4 (H2-05).

---

## 12. Trazabilidad hacia Jira

| Hallazgo | Historia a crear | Tipo | Nivel | Sprint | Clave de Jira |
|---|---|---|---|---|---|
| H2-01 | Punto de venta localizable desde la navegación y la tarjeta | Historia | Prioritario | 9 | _por asignar_ |
| H2-02 | Opciones legibles en los selectores del centro de marketing | Historia | Prioritario | 9 | _por asignar_ |
| D-01 | Hora de programación de publicaciones desplazada −6 h | Bug | — | 9 | _por asignar_ |
| H2-03 | Confirmación de venta visible y vocabulario de existencias | Historia | Secundario | 10 | _por asignar_ |
| H2-04 | Acción de guardar diferenciada y confirmación al cancelar | Historia | Secundario | 10 | _por asignar_ |
| H2-05 | «Nueva publicación» como acción principal de marketing | Historia | Secundario | 10 | _por asignar_ |
| H2-06 | Vinculación de proveedor señalizada y traducida | Historia | Secundario | 10 | _por asignar_ |
| H2-07 | Acceso directo a alta de producto | Historia | Secundario | 10 | _por asignar_ |
| H2-08 | Rótulos visibles en los filtros de publicaciones | Historia | Secundario | 10 | _por asignar_ |
| H2-09 | Contraste AA en textos de la tarjeta de producto | Historia | Secundario | 10 | _por asignar_ |

Cada historia se crea en el backlog de Jira con el criterio de aceptación de §10 y enlaza a
este documento como evidencia. La columna de clave se completa al crearlas.

---

## 13. Destino de los hallazgos

- **Sprint 9.** H2-01, H2-02 y D-01. El estudio instrumentado del Neurolab, reprogramado a ese
  sprint, debería **repetir F3 y F4** para verificar los criterios de aceptación de H2-01 y
  H2-02 con medición de percepción.
- **Sprint 10.** Los siete hallazgos secundarios, que no compiten por la capacidad del
  Sprint 9.
- **Regla transversal.** Como S7-H01 se reproduce en la Fase 2, conviene incorporar a la guía
  de estilo una regla de ubicación y rotulado de la acción principal: visible sin
  desplazamiento, con el verbo de la tarea y fuera de esquinas y pies de tarjeta. Así se
  evita que la Fase 3 repita el patrón.
