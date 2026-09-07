# Pruebas de usabilidad: flujos principales (HU-37)

Este documento registra los resultados de las pruebas de usabilidad moderadas realizadas sobre los flujos críticos de la plataforma Kontrol, cumpliendo con los requisitos de la rúbrica de evaluación.

## Ficha del estudio

- **Tarea:** HU-37
- **Responsable y Anotadora:** Alejandra Avilés (24722)
- **Sprint point:** 3
- **Fecha de ejecución:** 06/09/2026
- **Participantes objetivo:** 3 personas de 18 a 30 años, usuarias frecuentes de aplicaciones web.
- **Modalidad:** Moderada, manual, con pensamiento en voz alta.
- **Ambiente de pruebas:** [https://test.34.121.51.151.nip.io](https://test.34.121.51.151.nip.io)
- **Criterio de aceptación:** 3 sesiones completadas con registro de éxito/fallo por tarea, tiempo aproximado y comentarios cualitativos.

---

## Registro por participante

### Participante `P01`
- **Fecha y hora:** 06/09/2026, 10:00 AM
- **Cuenta de prueba:** participante1@kontrol-test.dev
- **Perfil confirmado:** Sí
- **Autorización para notas/fotos:** Sí / Sí
- **Incidencias del ambiente:** Ninguna.

| Tarea | Tiempo aproximado | Éxito/fallo | Comentario textual |
|---|---:|---|---|
| T1 | 01:15 | Éxito | "El dashboard es claro, veo los proyectos rápido." |
| T2 | 02:40 | Éxito | "Dudé un poco en dónde estaba el botón de fase inicial." |
| T3 | 01:50 | Éxito | "Asignar al miembro fue muy sencillo." |
| T4 | 02:55 | Éxito | "Casi se me acaba el tiempo buscando el botón de adjuntar." |
| T5 | 01:10 | Éxito | "El resumen de presupuesto se resalta muy bien." |

**Observaciones de la anotadora:**
- El usuario intentó hacer clic en el nombre del proyecto en lugar del icono de gestión.
- Mostró confusión visual momentánea en el flujo de carga de archivos (T4).

---

### Participante `P02`
- **Fecha y hora:** 06/09/2026, 11:30 AM
- **Cuenta de prueba:** participante2@kontrol-test.dev
- **Perfil confirmado:** Sí
- **Autorización para notas/fotos:** Sí / No
- **Incidencias del ambiente:** Carga lenta en la lista de miembros en T3.

| Tarea | Tiempo aproximado | Éxito/fallo | Comentario textual |
|---|---:|---|---|
| T1 | 00:50 | Éxito | "Entrada directa, sin complicaciones." |
| T2 | 01:30 | Éxito | "El formulario es corto y eso se agradece." |
| T3 | 02:10 | Éxito | "Esperé un poco a que cargara la lista, pero funcionó." |
| T4 | 02:20 | Éxito | "Subí el archivo y el sistema me confirmó el guardado." |
| T5 | 01:40 | Éxito | "Gráficamente se entiende cuánto presupuesto queda." |

**Observaciones de la anotadora:**
- Usuario con alta destreza técnica. No mostró signos de frustración por la demora de red.

---

### Participante `P03`
- **Fecha y hora:** 06/09/2026, 02:00 PM
- **Cuenta de prueba:** participante3@kontrol-test.dev
- **Perfil confirmado:** Sí
- **Autorización para notas/fotos:** Sí / Sí
- **Incidencias del ambiente:** Ninguna.

| Tarea | Tiempo aproximado | Éxito/fallo | Comentario textual |
|---|---:|---|---|
| T1 | 01:45 | Éxito | "Me perdí buscando el 'estado', pero ya lo ubiqué." |
| T2 | 02:10 | Éxito | "Fácil de llenar." |
| T3 | 01:55 | Éxito | "Todo fluido en este paso." |
| T4 | 03:00 | **Fallo** | "No encontré el botón para subir la evidencia a tiempo." |
| T5 | 01:20 | Éxito | "El reporte es lo que más me gustó visualmente." |

**Observaciones de la anotadora:**
- En la T4, el usuario se quedó bloqueado en la vista de detalle de tarea y no visualizó el botón de "Registrar Avance" en la esquina superior. Se cumplió el tiempo límite del protocolo.

---

## Resumen de resultados

| Participante | Tareas exitosas / 5 | Tiempo total aprox. | Comentarios registrados | Foto autorizada |
|---|---:|---:|---:|---|
| P01 | 5 / 5 | 09:50 | Positivos, duda en iconos. | Sí |
| P02 | 5 / 5 | 08:30 | Fluido, reporte funcional. | No |
| P03 | 4 / 5 | 10:10 | Bloqueo en registro de avance. | Sí |

---

## Hallazgos consolidados

| ID | Flujo afectado | Evidencia observada | Frecuencia | Severidad | Recomendación |
|---|---|---|---:|---|---|
| H-01 | Registro de avance (T4) | Los usuarios tardan o fallan al buscar el botón de adjuntar/avance. | 2 / 3 | **Alta** | Hacer el botón de "Registrar Avance" más prominente (CTA) o usar un color de contraste. |
| H-02 | Dashboard (T1) | Un usuario tardó en identificar el "Estado" entre los otros datos. | 1 / 3 | Baja | Aumentar el peso visual o contraste de las etiquetas de estado (Activo/Pausado). |
| H-03 | Navegación (T2) | Confusión entre hacer clic en el texto vs. botón de acción. | 1 / 3 | Media | Hacer que toda la tarjeta (card) del proyecto sea interactiva para ir al detalle. |

---

## Evidencia y privacidad
- Las fotografías de las sesiones `P01-sesion-01` y `P03-sesion-01` están almacenadas en una carpeta Google Drive (documentación interna).
- No se incluyen rostros ni datos personales sensibles en este repositorio de acuerdo con el protocolo.