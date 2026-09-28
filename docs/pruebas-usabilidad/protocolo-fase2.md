# Sesiones de usabilidad de Fase 2

## Alcance

Tres sesiones moderadas con personas de 18 a 30 años, usuarias frecuentes de
aplicaciones web, sin conocimiento previo de Kontrol ni participación en su
desarrollo. Alejandra Avilés modera y Juan Montenegro anota.

## Preparación obligatoria

1. Restablecer SCRUM-25 y ejecutar `npm run verify:ux-phase2` dentro de
   `backend-test`. No iniciar si el resultado no indica `AMBIENTE LISTO`.
2. Confirmar que la cuenta asignada puede abrir Inventario, Proveedores y
   Marketing.
3. Verificar que Inventario permite abrir la ficha de un producto y muestra el
   formulario `Vincular proveedor`.
4. Mantener la aplicación en español y usar una ventana limpia del navegador.
5. Preparar cronómetro, consentimiento impreso, hoja de registro y cámara.
6. Probar una venta de ensayo con la cuenta de reserva. Restablecer el ambiente
   después del ensayo.

## Datos estandarizados

Usar el número del participante en el nombre del producto y la publicación.

| Dato | Valor |
|---|---|
| Proyecto | Renovación de línea de ferretería eléctrica |
| Producto | Linterna LED UX P0X |
| Precio de venta | Q75.00 |
| Precio de costo | Q40.00 |
| Stock inicial | 3 |
| Código de barras | 74000000000X |
| Proveedor | Distribuidora Central |
| Precio cotizado | Q35.00 |
| Publicación | Oferta Linterna LED P0X |
| Canal y formato | Instagram, publicación |
| Programación | Mañana a las 10:00 |

`X` corresponde a 1, 2 o 3. El costo y el stock permiten vender el mismo
producto en F3; son datos de apoyo, no objetivos adicionales del estudio.

## Lectura inicial del moderador

“Gracias por participar. Evaluaremos Kontrol, no tu habilidad. Realizarás cinco
tareas y te pediré que digas en voz alta qué buscas, qué esperas y qué te causa
duda. No puedo indicarte dónde hacer clic. Puedes detenerte en cualquier
momento. Antes de empezar, confirma que leíste y firmaste el consentimiento.”

## Tareas

El moderador entrega una tarea a la vez y activa el cronómetro al terminar de
leerla. No debe nombrar controles, rutas ni botones.

### F1 Alta de producto 3 minutos

“Registra en el proyecto indicado el producto y los datos que aparecen en tu
tarjeta. Al terminar, déjalo disponible para una venta posterior.”

Éxito: el producto existe con nombre, precio de venta, código, costo y stock 3.

### F2 Vinculación de proveedor 2 minutos

“Vincula Distribuidora Central al producto que acabas de crear y registra el
precio cotizado de Q35.00.”

Éxito: la ficha del producto muestra el proveedor y el precio cotizado.

### F3 Registro de venta 3 minutos

“Busca el producto por su código, agrega una unidad a la venta y completa el
cobro.”

Éxito: la venta se confirma sin error y el stock baja de 3 a 2. La escritura
manual del código es válida; la cámara solo se prueba si se usa HTTPS.

### F4 Publicación programada 3 minutos

“Crea una publicación de Instagram llamada Oferta Linterna LED P0X, con el
texto Promoción de lanzamiento de Linterna LED, y prográmala para mañana a las
10:00 en el proyecto indicado.”

Éxito: la nueva publicación queda con estado Programada y fecha visible.

### F5 Filtro por estado 2 minutos

“Muestra únicamente las publicaciones programadas y confirma que aparece la
que acabas de crear.”

Éxito: el filtro Programada está activo y la publicación creada aparece.

## Regla de moderación y registro

- Recordar “continúa pensando en voz alta” no cuenta como ayuda.
- “¿Qué esperabas que ocurriera?” y “¿qué buscarías ahora?” son preguntas
  neutrales permitidas.
- No nombrar un botón, ruta o campo durante el tiempo de la tarea.
- Al llegar al límite, detener la tarea y registrar Fallo por tiempo.
- Si el participante pide ayuda imprescindible, darla solo después de marcar
  Fallo con ayuda y registrar la intervención literal.
- Registrar el tiempo aunque la tarea falle.
- Capturar al menos un comentario textual por tarea. No corregir la gramática
  del participante.

## Cierre de cada sesión

1. Preguntar: “¿Cuál fue el momento más confuso?”, “¿qué fue lo más fácil?” y
   “si cambiaras una sola cosa, ¿cuál sería?”.
2. Tomar una fotografía sin rostro, nombres, correos, contraseñas ni contenido
   de otras aplicaciones. Confirmar nuevamente la autorización fotográfica.
3. Nombrar archivos con el identificador anónimo: `P01_consentimiento.pdf`,
   `P01_evidencia_01.jpg` y así sucesivamente.
4. Guardar consentimientos separados de notas y fotografías.
5. Cerrar sesión, restablecer SCRUM-25 y ejecutar la verificación antes de la
   siguiente persona.

## Criterio de aceptación

La tarea queda completa únicamente cuando existen 15 registros de tarea con
resultado, tiempo, fricción y comentario textual; tres consentimientos
firmados; al menos una fotografía válida por sesión; y el checklist final sin
pendientes. Los documentos no sustituyen la ejecución con usuarios reales.
