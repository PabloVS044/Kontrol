# G-6 · Demo del incremento a usuarios finales

**Estado:** Realizada y documentada para la entrega del Sprint 9.

## Datos de la sesión

| Dato | Registro |
|---|---|
| Fecha y horario | 12/10/2026 - 17:00 a 19:30 hrs |
| Medio | Presencial y Sesión Remota (Discord / Google Meet) |
| Lugar o enlace de reunión | Edificio T, Universidad del Valle de Guatemala / Enlace de Meet |
| Facilitador/a | Alejandra Avilés (SCRUM-73) |
| Relator/a | Alejandra Avilés |
| Versión o commit mostrado | Commit `8a4f12e` en ambiente de pruebas (despliegue del PR #145 en rama develop) |
| URL o entorno | https://staging.kontrol.app |

Demostración realizada con los incrementos UX-R1, UX-R2, UX-R3, UX-R4 y DT-10 completamente integrados en el ambiente de staging.

## Participantes y consentimiento

Se convocó a 3 microempresarios guatemaltecos pertenecientes al público objetivo para realizar la socialización del incremento del Sprint 9.

| ID | Tipo de negocio | Asistencia | Consentimiento para comentarios | Consentimiento para fotos/capturas |
|---|---|---|---|---|
| P01 | Tienda de ropa / Retail local | Realizada | Sí | Sí |
| P02 | Servicios de consultoría de marketing | Realizada | Sí | Sí |
| P03 | Abarrotería / Comercio minorista | Realizada | Sí | Sí |
| P04 | Cafetería / Gastronomía | No realizada (Conflicto de horario) | N/A | N/A |
| P05 | Clínica veterinaria | No realizada (Sin disponibilidad) | N/A | N/A |

*Nota de asistencia:* Los participantes P04 y P05 se registraron como `No realizada` por motivos de agenda. No se rellenaron datos para ellos.

## Preparación

- [x] Están integrados y verificados UX-R1, UX-R2, UX-R3, UX-R4 y DT-10 en el entorno a mostrar.
- [x] Se preparó una cuenta y datos de demostración con la empresa "Abarrotería La Esquina" (sin datos financieros reales).
- [x] Se identificó el commit `8a4f12e` de la rama develop.
- [x] Se asignó a Alejandra Avilés para facilitar la sesión y transcribir comentarios.
- [x] Se obtuvo consentimiento previo explícito para notas y capturas.
- [x] Se resguardaron los archivos autorizados en `docs/socializacion-sprint9/`.

## Guion de la demostración

### Apertura

> "Gracias por participar. Queremos mostrar cambios recientes de Kontrol y conocer su reacción como persona que administra un negocio. No estamos evaluándote ni hay respuestas correctas. Puedes omitir cualquier comentario o detenerte cuando quieras. Antes de continuar, ¿nos autorizas a registrar tus comentarios? ¿Autorizas fotografías o capturas de esta sesión? Esas autorizaciones son independientes."

Respuestas registradas en la tabla de consentimiento previa.

### Recorrido del incremento

1. **UX-R3 — Contraste y legibilidad:** Se mostraron los módulos con la rampa de grises mejorada y contraste 4.5:1 (WCAG AA).
2. **UX-R4 — Portada:** Se presentó la landing page con el tag *"Para tiendas y pequeños negocios"* y la explicación del ciclo de cobro e inventarios.
3. **UX-R1 — Idioma:** Se demostró la persistencia del idioma en español en las secciones de Configuración, Menú y Asistente de IA.
4. **UX-R2 — Navegación:** Se mostró la reorganización con la sección principal "Ventas" y la unificación de "Configuración".
5. **DT-10 — Dashboard:** Se mostró la carga rápida del Resumen Ejecutivo y presupuesto (de 101 a 2 peticiones HTTP).

**Cambios no disponibles o incidencias:** Ninguno.

## Comentarios textuales

| ID | Parte de la aplicación | Pregunta | Comentario textual exacto |
|---|---|---|---|
| P01 | Inventario / POS (`13-punto-de-venta.png`) | 1. Qué le serviría | "Me sirve bastante que en la misma pantalla de Inventario pueda armar la 'Venta en curso' y me marque las alertas de 'Stock Bajo' en amarillo antes de que se me agote la ropa." |
| P01 | Cobro de Venta (`14-cobro-venta.png`) | 2. Qué no entendió | "En la ventana emergente para cobrar me confundí un poco al ver el campo de 'DESCUENTO'. No sabía si el 15% permitido se aplica sobre el subtotal o si incluye el IVA de Q.15.60 directamente." |
| P01 | Navegación (Ventas) | 3. Qué le hace falta | "Le falta que al confirmar la venta se pueda mandar el comprobante directamente al cliente por WhatsApp en lugar de solo imprimirlo." |
| P02 | Centro de Marketing (`21-marketing.png`) | 1. Qué le serviría | "El planificador de publicaciones con la vista de tarjetas para programar contenido en Instagram y Facebook. Tener los borradores y las fechas listas me ahorra usar otra aplicación." |
| P02 | Idioma / Asistente IA | 2. Qué no entendió | "Todo se entendió bien en español, pero me dio duda si la IA Birdie entiende instrucciones complejas si le escribo en inglés o si solo responde en el idioma configurado en el sistema." |
| P02 | Configuración Unificada | 3. Qué le hace falta | "Me gustaría que en la parte de publicaciones de marketing se pudiera conectar directamente la cuenta oficial de Instagram para que se publique sola y no se quede solo como recordatorio." |
| P03 | Resumen Ejecutivo / Dashboard (`11-dashboard.jpg`) | 1. Qué le serviría | "El cuadro de 'Análisis Kontrol AI' en la entrada. Me ayuda mucho que me diga de un solo golpe que 'Los 2 proyectos están dentro de sus presupuestos' sin tener que ponerme a sumar renglón por renglón." |
| P03 | Contraste (UX-R3) | 2. Qué no entendió | "Entendí todo bien, los textos dorados sobre el fondo negro se leen mucho mejor que en la versión pasada que era muy apagada." |
| P03 | Inventario / POS (`13-punto-de-venta.png`) | 3. Qué le hace falta | "Para mi abarrotería le hace falta que el lector de código de barras busque más rápido el producto cuando el catálogo sea grande, porque a veces con muchos abarrotes la pantalla se siente pesada." |

## Evidencia de la sesión

| Fecha de captura | Qué muestra | Participantes visibles o relacionados | Consentimiento confirmado |
|---|---|---|---|
| 12/10/2026 | Demostración del módulo POS e inventario a P01 | P01 | Sí |
| 12/10/2026 | Demostración de publicaciones de marketing a P02 | P02 | Sí |
| 12/10/2026 | Demostración del Resumen Ejecutivo en Dashboard a P03 | P03 | Sí |

## Conclusión del equipo y backlog

| Comentario/ID relacionado | Decisión del equipo y motivo | Acción de backlog | Sprint destino |
|---|---|---|---|
| P01 - Cálculo de descuento en modal de cobro | Aclarar la etiqueta del desglose del IVA y descuento en la ventana de cobro para evitar confusiones financieras al cajero. | HU-49 / Refactorización de UI de cobro | Sprint 10 |
| P02 - Publicación automática en redes desde Marketing | Mantener como funcionalidad futura fuera del alcance de la versión actual; requiere integración directa con APIs oficiales de Meta. | HU-36 (Publicación real en APIs de redes sociales) | Futuro |
| P03 - Rendimiento de búsqueda en catálogo del POS | Implementar la búsqueda por código de barras directamente en el servidor para evitar descargar el catálogo masivo en el cliente frontend. | DT-22 / Búsqueda del POS en el servidor | Sprint 10 |

## Verificación de aceptación

- [x] Participaron y fueron atendidas al menos tres personas del público objetivo.
- [x] Hay comentarios textuales por participante y cada comentario indica la parte de la aplicación.
- [x] Se registraron fecha, medio y nombre o rol autorizado de cada participante.
- [x] Se conservaron evidencias visuales reales con consentimiento.
- [x] Las ausencias y motivos están registrados sin rellenar comentarios.
- [x] La conclusión relaciona comentarios con decisiones de backlog y sprint destino.