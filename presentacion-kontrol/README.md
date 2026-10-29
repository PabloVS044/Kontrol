# Kontrol — presentación final

Deck animado para la presentación final (auditorio). Funciona sin internet: fuentes, GSAP, Three.js y videos van dentro del proyecto.

## Correrlo

```bash
npm install
npm run dev
```

Abre `http://localhost:5180`, pulsa **F** para pantalla completa y **P** para abrir la vista de presentador en otra ventana (arrástrala a la laptop; el deck va al proyector). Para el día de la presentación conviene usar la versión compilada:

```bash
npm run build
npm run preview
```

(`http://localhost:4180`).

## Controles

| Tecla | Acción |
|---|---|
| → · Espacio · PageDown · Enter | Siguiente paso o slide (los clickers de presentación funcionan) |
| ← · PageUp · Backspace | Paso o slide anterior |
| número + Enter | Saltar a esa slide |
| F | Pantalla completa |
| P | Vista de presentador: notas del guion, cronómetro por sección contra su tope y total contra 17:40, vista previa de la siguiente slide |
| B o . | Pantalla negra |
| V o K | Pausar / reanudar el video de la slide |
| R | Repetir la animación de entrada de la slide |
| Home / End | Primera / última slide |

La URL guarda la posición (`#12.2` = slide 12, paso 2), así que recargar no pierde el lugar.

## Dónde va cada cosa

- `src/slides/*.js` — contenido de cada slide, sus pasos (`data-step`) y sus notas del guion.
- `src/sections.js` — presentadores y tiempo tope de cada sección.
- `public/media/demos/` — **videos de demo pendientes**. Cada slide de demo muestra el nombre de archivo que espera (`acceso.mp4`, `dashboard.mp4`, `proyectos.mp4`, `equipos.mp4`, `chat.mp4`, `inventario.mp4`, `pos-ventas.mp4`, `presupuesto.mp4`, `reportes.mp4`, `marketing.mp4`, `integraciones.mp4`, `configuracion.mp4`, `agente-ia.mp4`). Al soltar el archivo, la slide lo reproduce sola.
- `public/media/capturas/v1.png` y `v2.png` — capturas para la slide "antes y después" (misma pantalla, mismo tamaño).
- `public/media/motion/` — videos motion design renderizados con HyperFrames.
- `videos/<nombre>/index.html` — fuente de cada video motion (arquitectura, un-dato, agente-capas, pipeline-ci). Para volver a renderizar uno: `npx hyperframes render -o ../../public/media/motion/<nombre>.mp4` dentro de su carpeta (requiere FFmpeg).
- `public/media/qr-kontrol.svg` — QR a https://www.kontrol.it.com/ (slide 1 y slide de preguntas). Se regenera con `npm run qr` si cambia la URL (en `scripts/qr.mjs`).
- `brag-output/` — video de lanzamiento (`public/media/motion/antesala.mp4`), que corre en bucle de fondo en la última slide, la de preguntas: plan, composición, `brag.mp4` con póster y `share-copy.txt`.
