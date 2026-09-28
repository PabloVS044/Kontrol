# Informe de hallazgos de usabilidad: Fase 2 del rediseño de Kontrol

**Análisis:** Juan Montenegro (24750) · **Moderación:** Alejandra Avilés (24722) ·
**Sesiones:** 27/09/2026 · **Fuente de datos:**
[Registro_sesiones_usabilidad_Fase_2.xlsx](./Registro_sesiones_usabilidad_Fase_2.xlsx)

## 1. Resumen

**Objetivo.** Comprobar si las pantallas de la Fase 2 del rediseño se pueden usar sin ayuda,
y decidir qué mejorar primero. Las pantallas son inventario, proveedores, punto de venta y
marketing. El estudio del Sprint 7 no las evaluó.

**Resultados principales**

- Tres personas completaron **14 de 15 tareas (93 %)**, sin ayuda.
- Solo una tarea falló: **registrar una venta**. Una persona no la terminó en los
  3 minutos permitidos.
- Hay **dos problemas prioritarios**, y cada uno afectó a los tres participantes:
    1. **Nadie encontró de inmediato dónde vender.** La venta está dentro de Inventario, pero
       los participantes buscaban una sección de "Ventas".
    2. **En el formulario de marketing, las opciones de las listas no se leen** si no se pasa
       el cursor encima. Por eso crear una publicación fue la tarea más lenta: 89 % del tiempo
       máximo, en promedio.
- Se detectó además un **error del sistema**: una publicación programada para las 10:00 se
  guarda para las 4:00.
- El problema principal del Sprint 7, **no encontrar el botón de la acción principal**, se
  repite en la Fase 2.

**Recomendación.** Corregir los dos problemas prioritarios y el error de hora en el
Sprint 9. Después, repetir las tareas de venta y de marketing para comprobar la mejora.

Con tres participantes, los resultados son **indicativos, no concluyentes**.

## 2. Qué se evaluó y con quién

### Pantallas y tareas

| Tarea | Qué debía hacer el participante | Pantalla | Tiempo máximo |
|---|---|---|---|
| F1 | Registrar un producto con nombre, precio y código de barras | Inventario | 3 min |
| F2 | Vincular un proveedor a ese producto | Ficha del producto | 2 min |
| F3 | Buscar el producto por su código, venderlo y cobrar | Inventario (punto de venta) | 3 min |
| F4 | Crear una publicación de Instagram y programarla | Marketing | 3 min |
| F5 | Mostrar solo las publicaciones programadas | Marketing | 2 min |

### Participantes

Participaron tres personas de 18 a 30 años, que usan aplicaciones web con frecuencia. Ninguna
conocía Kontrol ni participó en su desarrollo. Las tres firmaron el consentimiento
informado. Se identifican solo como P01, P02 y P03.

| Participante | Edad | Ocupación o carrera | Uso de aplicaciones web | Experiencia con sistemas de inventario o ventas | Dispositivo y navegador |
|---|---|---|---|---|---|
| P01 | _por completar_ | _por completar_ | _por completar_ | _por completar_ | _por completar_ |
| P02 | _por completar_ | _por completar_ | _por completar_ | _por completar_ | _por completar_ |
| P03 | _por completar_ | _por completar_ | _por completar_ | _por completar_ | _por completar_ |

### Método

- Se hicieron tres sesiones moderadas, el 27/09/2026, en el ambiente de pruebas de Kontrol.
  Cada participante pensó en voz alta mientras resolvía las tareas.
- Durante la moderación no se indicó dónde hacer clic y nadie recibió ayuda.
- En cada tarea se registró el resultado, el tiempo, el comentario literal del participante
  y una nota de observación.
- **Una tarea es fallo por tiempo solo si supera el máximo.** Terminarla justo en el límite
  cuenta como éxito. El protocolo se actualizó con esta regla.
- Las notas de observación se usan como referencia para interpretar los comentarios. Por
  ejemplo, cuando alguien dice que algo le confundió y luego lo resuelve rápido, se trata
  como una duda breve, no como un problema grave.

## 3. Resultados por tarea

### Resultado y tiempo de cada participante

| Tarea | Participante | Resultado | Tiempo | % del máximo | Qué se observó |
|---|---|---|---|---|---|
| F1 | P01 | Éxito | 2:38 | 88 % | Presionó "Cancelar" en lugar de "Guardar" y tuvo que repetir el registro |
| F1 | P02 | Éxito | 2:22 | 79 % | No encontraba dónde agregar productos; esperaba un acceso directo en la pantalla principal |
| F1 | P03 | Éxito | 1:30 | 50 % | Dudó dónde agregar el producto; lo encontró navegando |
| F2 | P01 | Éxito | 1:09 | 58 % | Duda breve al ubicar dónde agregar el proveedor; después le resultó fácil |
| F2 | P02 | Éxito | 1:20 | 67 % | No esperaba que la vinculación estuviera en la ficha del producto |
| F2 | P03 | Éxito | 0:45 | 38 % | Esperaba que se abriera otra ventana para vincular |
| F3 | P01 | Éxito | 2:20 | 78 % | No encontraba dónde vender; notó poco contraste entre el texto y el fondo |
| F3 | P02 | **Fallo** | **3:20** | **111 %** | Recorrió otras pantallas, no entendió el proceso de venta y no vio la confirmación |
| F3 | P03 | Éxito | 1:19 | 44 % | Buscaba una sección de "Ventas"; la encontró dentro de Inventario |
| F4 | P01 | Éxito | 2:08 | 71 % | No leía las opciones de las listas; el sistema cambió la hora programada a las 4:00 |
| F4 | P02 | Éxito | 3:00 | 100 % | No leía las opciones de las listas; terminó justo en el límite |
| F4 | P03 | Éxito | 2:54 | 97 % | No leía las opciones de las listas; primero programó una publicación que ya existía |
| F5 | P01 | Éxito | 0:20 | 17 % | No vio de inmediato el filtro |
| F5 | P02 | Éxito | 1:15 | 63 % | Tardó en encontrar el filtro; después lo usó sin problema |
| F5 | P03 | Éxito | 0:15 | 13 % | Sin dificultad |

### Comparación contra el tiempo máximo

| Tarea | Completadas | Tiempo promedio | % promedio del máximo | ¿Alguien superó el máximo? |
|---|---|---|---|---|
| F1 Registrar producto | 3 de 3 | 2:10 | 72 % | No |
| F2 Vincular proveedor | 3 de 3 | 1:05 | 54 % | No |
| F3 Registrar venta | 2 de 3 | 2:20 | 78 % | **Sí: P02, con 3:20 de 3:00** |
| F4 Crear y programar publicación | 3 de 3 | 2:41 | **89 %** | No; P02 terminó justo en 3:00 |
| F5 Filtrar publicaciones | 3 de 3 | 0:37 | 31 % | No |

- **Solo una tarea superó su máximo: la venta de P02.**
- **Crear y programar una publicación (F4) es la tarea con menos margen.** Dos de tres
  participantes terminaron a 6 segundos o menos del límite.
- **La venta (F3) es la tarea más desigual.** Tomó entre 44 % y 111 % del máximo, según
  cuánto tardó cada persona en descubrir que se vende desde Inventario.
- **Vincular proveedor (F2) y filtrar publicaciones (F5) tienen margen amplio.** Las dudas
  que surgieron en ellas no retrasaron la tarea.

## 4. Cómo se priorizó

Se usa el mismo criterio del análisis del Sprint 7, con dos medidas por problema.

**Frecuencia:** en cuántos de los tres participantes apareció.

**Severidad:**

| Severidad | Significado | Cómo se comprueba |
|---|---|---|
| Alta | Impidió completar la tarea | La tarea quedó registrada como fallo |
| Media | Retrasó la tarea | El tiempo superó el 85 % del máximo |
| Baja | Molestó, pero no afectó el resultado | Hay un comentario o una observación, pero no un retraso |

**Un problema es prioritario si aparece en dos o más participantes y además impidió o
retrasó la tarea.** Los demás quedan como secundarios: se documentan, pero no compiten con
los prioritarios.

## 5. Hallazgos

| N.º | Problema | Tarea | Participantes | Severidad | Prioridad |
|---|---|---|---|---|---|
| **1** | **No se encuentra dónde vender** | F3 | **3 de 3** | **Alta** (fallo de P02) | **Prioritario** |
| **2** | **Las opciones de las listas de marketing no se leen sin el cursor** | F4 | **3 de 3** | **Media** (P02 100 %, P03 97 %) | **Prioritario** |
| 3 | No se nota que la venta se completó; no se entiende la palabra "Stock" | F3 | 1 de 3 | Alta | Secundario |
| 4 | Se presiona "Cancelar" creyendo que es "Guardar" y se pierden los datos | F1 | 1 de 3 | Media (88 %) | Secundario |
| 5 | Se programa una publicación existente en vez de crear una nueva | F4 | 1 de 3 | Media (97 %) | Secundario |
| 6 | No se espera que el proveedor se vincule desde la ficha del producto | F2 | 3 de 3 | Baja | Secundario |
| 7 | Cuesta encontrar dónde registrar un producto nuevo | F1 | 2 de 3 | Baja | Secundario |
| 8 | El filtro por estado no se ve a primera vista | F5 | 2 de 3 | Baja | Secundario |
| 9 | Poco contraste del texto en la pantalla de venta | F3 | 1 de 3 | Baja | Secundario |

**Solo los problemas 1 y 2 cumplen las dos condiciones.**

- Los problemas 6, 7 y 8 aparecieron en varias personas, pero no retrasaron la tarea.
- Los problemas 3, 4 y 5 retrasaron o impidieron la tarea, pero en una sola persona.

**Error del sistema, aparte de la priorización.** Al programar una publicación para las
10:00, el sistema la guarda para las 4:00, seis horas antes. No es un problema de
usabilidad sino un error que guarda datos incorrectos, y afecta a todas las publicaciones
programadas. Por eso se trata aparte.

## 6. Lo que dijeron los participantes

Los comentarios se copian tal como se dijeron, sin corregir la redacción.

### 1. No se encuentra dónde vender (tres participantes)

- P01: "No lograba encontrar dónde vender el producto, pero toda ves lo encontré, fue fácil
  llenar lo solicitado."
- P02: "Cuándo dicen en Stock, ¿a qué se refieren? No encuentró fácilmente si realicé la
  venta, deberían poner una notificación push/rápida para confirmarlo"
- P03: "¿Dónde puedo hacerlo...? ¿Habrá una ventana de ventas exclusivamente?, ah es en
  inventario también."
- Observación sobre P02: navegó por otras pestañas y no terminó de entender el proceso de
  venta. No completó la tarea a tiempo.

### 2. Las opciones de las listas de marketing no se leen (tres participantes)

- P02: "Me gustaría o sería mejor que pudiera ver las opciones sin tener que mover el mouse
  sobre las posibles opciones buscando."
- Observación sobre los tres: al elegir proyecto y formato, las opciones no se leían sin
  poner el cursor encima de cada una.

### 3. No se nota que la venta se completó (un participante)

- P02 pidió una notificación que confirme la venta y preguntó qué significa "Stock". Su cita
  está en el problema 1.

### 4. "Cancelar" confundido con "Guardar" (un participante)

- P01: "Pensé que le había dado en guardar, pero no pude ver bien, así que parece que lo
  eliminé."

### 5. Programar una publicación existente en vez de crear una nueva (un participante)

- P03: "Ya lo hice, la que estaba ahí la programé. Ah, ¿Debía ser una nueva? ¿Dónde le doy?"

### 6. La vinculación del proveedor no está donde se espera (tres participantes)

- P01: "Que confuso poder localizar dónde añadir el proveedor." Según la observación, después
  le resultó fácil.
- P02: "Estaría mejor si pudiera pensar o encontrar intuitivamente que ahí mismo está para
  vincular el proveedor, no pensé que estaría ahí."
- Observación sobre P03: esperaba que el botón abriera otra ventana; completó la tarea sin
  ayuda.

### 7. Cuesta encontrar dónde registrar un producto (dos participantes)

- P02: "Me confunde la interfaz porque no está a la mano como imaginé cada
  botón/acción/encabezado."
- P03: "¿En inventario? A saber, ¿una nueva tarea?"

### 8. El filtro por estado no se ve a primera vista (dos participantes)

- P01: "Para filtrar, ¿cómo lo hago?"
- P02: "Me costó un poco ver dónde estaba lo necesario para filtrar, pero una vez
  encontrado, me fue muy fácil."

### 9. Poco contraste en la pantalla de venta (un participante)

- Observación sobre P01: ligero problema de contraste entre el texto y el fondo.

### Error de hora

- P01: "Al darle programar a la publicación, le cambió la hora a las 4:00 am, y sí había
  escrito bien la hora, pero al guardar el borrador lo cambió el sistema."

### Lo que funcionó bien

- Los participantes describieron como fáciles tres cosas: redactar el texto de la
  publicación, llenar los datos del cobro una vez encontrada la venta, y usar el filtro una
  vez encontrado.

## 7. Comparación con el Sprint 7

| Hallazgo del Sprint 7 | ¿Se repite en la Fase 2? | Evidencia |
|---|---|---|
| H-01: Dificultad para ubicar el botón de acción principal | **Sí. Es el patrón más frecuente** | Problemas 1, 5, 6, 7 y 8: aparece en cuatro de las cinco tareas |
| H-02: Confusión entre el elemento y su botón de gestión | **En parte** | Problemas 1 y 6, en la tarjeta de producto |
| H-03: Bajo contraste en etiquetas de estado | **En parte**: el contraste falla, pero en otros elementos | Problemas 2 y 9; nadie tuvo problemas con las etiquetas de estado |

_La numeración es la del ticket. En el informe del Sprint 7, H-02 y H-03 aparecen en orden
inverso._

- **La acción principal no se encuentra.** En el Sprint 7 el botón decía "Agregar" y estaba
  en una esquina, cuando el usuario buscaba "Registrar avance". En la Fase 2 ocurre lo
  mismo: el usuario busca "Ventas", pero la venta es un botón pequeño, "Vender", en el pie de
  cada tarjeta de Inventario.
- **Elemento frente a botón de gestión.** Un clic en la tarjeta de producto abre su ficha,
  pero nada lo indica. Por eso nadie anticipa que el proveedor se vincula ahí, y P02 buscó
  la venta en la tarjeta sin reconocer el botón.
- **Contraste.** Ninguna etiqueta de estado causó problemas. El poco contraste afectó las
  opciones de las listas de marketing y el texto de la pantalla de venta.

**Las correcciones del Sprint 7 todavía no están aplicadas en el código.** Que el problema se
repita no significa que una corrección haya fallado: indica que es un patrón de toda la
aplicación. Se recomienda resolverlo como una regla de la guía de estilo y no pantalla por
pantalla.

## 8. Mejoras propuestas

### Prioritario 1: que se encuentre dónde vender

**Causa.**

- El menú principal no tiene una opción de ventas.
- La venta empieza con el botón "Vender" del pie de cada tarjeta de Inventario. Es pequeño,
  sin fondo, y queda junto a "+ Ingresar", así que no parece la acción principal.
- El panel de venta solo aparece después de agregar el primer producto.

Archivos: `AppNavbar.vue`, `InventoryPage.vue` e `InventoryPage.css`.

**Criterios de aceptación**

- El menú principal tiene un acceso con el nombre de la acción, por ejemplo "Vender" o
  "Punto de venta". Ese acceso abre la venta con el buscador por código listo para escribir.
- El botón de vender se distingue de las demás acciones de la tarjeta por tamaño y peso, y
  cumple el área táctil mínima de la guía de estilo.
- Sin productos agregados, la pantalla indica cómo empezar una venta.
- Si se repite la tarea con tres personas, no hay fallos y el tiempo promedio baja a 60 %
  del máximo o menos (hoy es 78 %).

### Prioritario 2: que las opciones de las listas de marketing se lean

**Causa probable.** Las listas del formulario y de los filtros de marketing no definen el
color de fondo de sus opciones. En algunos navegadores eso produce texto claro sobre fondo
claro, y solo se lee la opción que está bajo el cursor. Otras pantallas de Kontrol ya
definen ese color y no presentan el problema.

Archivo: `MarketingPublications.css`.

El síntoma se observó en los tres participantes. La causa, en cambio, se dedujo del código:
no se reprodujo en el equipo de las sesiones.

**Criterios de aceptación**

- Antes de corregir, se reproduce el problema en el navegador y el equipo de las sesiones, y
  se confirma la causa.
- Todas las listas de marketing, y la lista de proveedores de la ficha de producto, definen
  su color de texto y de fondo. El contraste cumple el nivel AA (4.5:1) en Chrome, Edge y
  Firefox.
- Si se repite la tarea con tres personas, nadie reporta opciones ilegibles y el tiempo
  promedio baja a 75 % del máximo o menos (hoy es 89 %).

### Error de hora al programar publicaciones

**Causa.**

- La pantalla envía la hora local sin zona horaria.
- La base de datos la guarda sin zona horaria.
- El servidor la interpreta como hora UTC.
- Al mostrarla, el navegador en Guatemala le resta seis horas.

Archivos: `MarketingPublicationsView.vue`, `marketingController.js` y `kontrol.sql`.

**Criterios de aceptación**

- Una publicación programada para las 10:00 muestra 10:00 en la tarjeta, en el calendario y
  al editarla.
- Una prueba automática verifica que la hora se guarda y se lee sin cambios.

### Mejoras secundarias

| N.º | Mejora | Criterio de aceptación principal |
|---|---|---|
| 3 | Confirmar la venta de forma visible | Al cobrar aparece una confirmación junto al botón "Realizar venta", con el total. "Stock" se reemplaza por un término claro, como "Disponibles" |
| 4 | Diferenciar "Guardar" de "Cancelar" | "Guardar" es el botón más visible. Cancelar con datos escritos pide confirmación |
| 5 | Destacar "Nueva publicación" | Es la acción más visible de la pantalla de marketing y se ve sin desplazarse |
| 6 | Señalar dónde se vincula un proveedor | La tarjeta de producto muestra una acción visible para abrir la ficha. La sección de proveedores está en español (hoy está en inglés) |
| 7 | Acceso directo para registrar un producto | El panel principal ofrece "Nuevo producto" a quien tiene permiso |
| 8 | Hacer visible el filtro por estado | Cada filtro tiene un rótulo visible: "Estado", "Canal" y "Proyecto" |
| 9 | Mejorar el contraste en la pantalla de venta | Los textos secundarios de la tarjeta cumplen el nivel AA de contraste |

## 9. Recomendación de planificación

Esta es una **recomendación**. El sprint definitivo de cada mejora y su registro en el
backlog se confirman después.

| Mejora | Tipo | Prioridad | Sprint recomendado |
|---|---|---|---|
| 1. Que se encuentre dónde vender | Historia | Prioritario | 9 |
| 2. Que las opciones de las listas de marketing se lean | Historia | Prioritario | 9 |
| Error de hora al programar publicaciones | Error | No aplica | 9 |
| 3 a 9. Mejoras secundarias | Historias | Secundario | 10 |

- **Sprint 9 para los dos prioritarios y el error de hora.** Son los problemas que impiden o
  retrasan tareas, o que guardan datos incorrectos. El estudio del Neurolab, programado para
  ese sprint, puede repetir las tareas de venta (F3) y de marketing (F4) para verificar las
  mejoras.
- **Sprint 10 para los secundarios.** Varios se pueden hacer junto con un prioritario que
  toca la misma pantalla:
    - Los problemas 3 y 9 van con el prioritario 1, en la pantalla de venta.
    - Los problemas 5 y 8 van con el prioritario 2, en la pantalla de marketing.
- **Regla para la guía de estilo.** La acción principal de cada pantalla debe:
    - verse sin desplazarse,
    - usar el verbo de la tarea,
    - quedar fuera de esquinas y pies de tarjeta.

    Esta regla evitaría que la Fase 3 repita el problema.

## 10. Limitaciones

- **Muestra pequeña.** Con tres participantes, los resultados son indicativos, no
  concluyentes. Que un problema aparezca en "3 de 3" describe a esas tres personas, no a
  todos los usuarios.
- **Tiempos aproximados.** Se tomaron a mano, así que los porcentajes deben leerse como
  orden de magnitud.
- **Sin medición de percepción.** El estudio con instrumentos del Neurolab se reprogramó para
  el Sprint 9. Aquí la severidad se basa en lo observado y en los comentarios.
- **Criterio de límite.** Aquí terminar justo en el límite cuenta como éxito. En el Sprint 7
  se contó como fallo. Con el criterio anterior, P02 habría fallado F4, y el problema 2
  seguiría siendo prioritario.
- **Orden fijo de tareas.** Cada tarea usa lo creado en la anterior, así que los
  participantes llegan a las últimas con más práctica.
- **Publicación de prueba visible.** El ambiente tenía una publicación en borrador, necesaria
  para F5, que ya se veía durante F4. Eso influyó en que P03 la programara (problema 5).
