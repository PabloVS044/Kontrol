# Pruebas de usabilidad: flujos principales

> **Nota de integridad:** las tablas marcadas como `SIMULACION` son datos ilustrativos para completar el formato. Deben reemplazarse por observaciones, tiempos y comentarios de participantes reales antes de presentar resultados como evidencia.

## Ficha del estudio

- **Tarea:** HU-37
- **Responsable:** Alejandra Aviles (24722)
- **Sprint point:** 3
- **Fecha prevista de cierre:** 05/09/2026
- **Participantes objetivo:** 3 personas de 18 a 30 años, usuarias frecuentes de aplicaciones web, sin participación previa en el desarrollo de Kontrol ni conocimiento previo de la plataforma.
- **Modalidad:** moderada, manual, con pensamiento en voz alta.
- **Ambiente:** https://test.34.121.51.151.nip.io
- **Ajuste de alcance:** el 06/09/2026 se redujo la muestra de cinco a tres participantes y se eliminaron SUS y facilidad percibida por tarea. El estudio instrumentado completo queda reservado para el 22 al 25 de septiembre en el Neurolab.
- **Criterio de aceptación:** 3 sesiones completadas con registro de éxito o fallo por tarea, tiempo aproximado y comentarios textuales por participante.

## Preparación y roles

1. Confirmar que cada participante cumple el perfil y asignar `P01`, `P02` o `P03`; no registrar nombres en este documento.
2. Explicar que se evalúa Kontrol, no a la persona, y solicitar autorización para tomar notas y fotografías.
3. Restablecer el ambiente antes de cada sesión desde la VM:

   ```bash
   cd /app/Kontrol
   docker compose -f docker-compose.prod.yml -f docker-compose.test.yml exec backend-test npm run reset:test
   ```

4. Alejandra Avilés modera y guía la sesión. Ivana Figueroa acompaña como anotadora y registra observaciones.
5. Medir el tiempo aproximado desde el inicio de cada tarea hasta que el participante declare que terminó o alcance el máximo.
6. Registrar éxito/fallo y comentarios textuales sin corregir el primer intento del participante.

## Guion de moderación

### Introducción

> Estamos evaluando Kontrol, no tus conocimientos. Realiza las tareas como lo harías normalmente y piensa en voz alta. No te mostraremos el camino. Puedes detenerte en cualquier momento.

### Tareas evaluadas

| ID | Instrucción | Máximo | Éxito |
|---|---|---:|---|
| T1 | Inicia sesión e identifica en el dashboard el estado de los proyectos activos. | 2 min | Identifica correctamente el estado de los proyectos. |
| T2 | Crea un proyecto con nombre, fechas y fase inicial. | 3 min | El proyecto queda creado con los datos solicitados. |
| T3 | Crea una tarea dentro del proyecto y asígnala a un miembro. | 3 min | La tarea queda creada y asignada. |
| T4 | Registra un avance y adjunta evidencia. | 3 min | El avance y la evidencia quedan guardados. |
| T5 | Consulta el reporte del proyecto y ubica el resumen de presupuesto. | 2 min | Encuentra el reporte y el resumen de presupuesto. |

## Registro por participante

### Participante `P01`

- **Fecha y hora:** 06/09/2026, ____
- **Cuenta de prueba:** participante1@kontrol-test.dev
- **Perfil confirmado:** sí / no
- **Autorización para notas:** sí / no
- **Autorización para fotografía:** sí / no / no aplica
- **Incidencias del ambiente:**

| Tarea | Tiempo aproximado | Éxito/fallo | Comentario textual |
|---|---:|---|---|
| T1 | ____ | ____ | "____" |
| T2 | ____ | ____ | "____" |
| T3 | ____ | ____ | "____" |
| T4 | ____ | ____ | "____" |
| T5 | ____ | ____ | "____" |

**Observaciones de la anotadora:**

- ____

**Bloqueos o errores reproducibles:**

- ____

### Participante `P02`

- **Fecha y hora:** 06/09/2026, ____
- **Cuenta de prueba:** participante2@kontrol-test.dev
- **Perfil confirmado:** sí / no
- **Autorización para notas:** sí / no
- **Autorización para fotografía:** sí / no / no aplica
- **Incidencias del ambiente:**

| Tarea | Tiempo aproximado | Éxito/fallo | Comentario textual |
|---|---:|---|---|
| T1 | ____ | ____ | "____" |
| T2 | ____ | ____ | "____" |
| T3 | ____ | ____ | "____" |
| T4 | ____ | ____ | "____" |
| T5 | ____ | ____ | "____" |

**Observaciones de la anotadora:**

- ____

**Bloqueos o errores reproducibles:**

- ____

### Participante `P03`

- **Fecha y hora:** 06/09/2026, ____
- **Cuenta de prueba:** participante3@kontrol-test.dev
- **Perfil confirmado:** sí / no
- **Autorización para notas:** sí / no
- **Autorización para fotografía:** sí / no / no aplica
- **Incidencias del ambiente:**

| Tarea | Tiempo aproximado | Éxito/fallo | Comentario textual |
|---|---:|---|---|
| T1 | ____ | ____ | "____" |
| T2 | ____ | ____ | "____" |
| T3 | ____ | ____ | "____" |
| T4 | ____ | ____ | "____" |
| T5 | ____ | ____ | "____" |

**Observaciones de la anotadora:**

- ____

**Bloqueos o errores reproducibles:**

- ____

## Resumen de resultados

> Completar esta tabla con datos reales. La siguiente fila de ejemplo es solo una guía de formato.

| Participante | Tareas exitosas / 5 | Tiempo total aproximado | Comentarios registrados | Foto autorizada |
|---|---:|---:|---:|---|
| P01 | ____ | ____ | ____ | ____ |
| P02 | ____ | ____ | ____ | ____ |
| P03 | ____ | ____ | ____ | ____ |

## Hallazgos consolidados

| ID | Flujo afectado | Evidencia observada | Frecuencia | Severidad | Recomendación |
|---|---|---|---:|---|---|
| H-01 | ____ | ____ | ____ / 3 | alta / media / baja | ____ |

## Ejemplo de datos simulados

> **SIMULACIÓN.** Este bloque no debe presentarse como evidencia real. Sirve para mostrar cómo redactar el análisis cuando se hayan realizado las tres sesiones.

| Participante | T1 | T2 | T3 | T4 | T5 | Tiempo total | Comentario representativo |
|---|---|---|---|---|---|---:|---|
| P01 | Éxito, 01:20 | Éxito, 02:35 | Éxito, 02:10 | Fallo, 03:00 | Éxito, 01:40 | 10:45 | "No estaba seguro de dónde registrar el avance." |
| P02 | Éxito, 00:55 | Éxito, 02:20 | Éxito, 01:45 | Éxito, 02:30 | Éxito, 01:25 | 08:55 | "El resumen del presupuesto se entiende rápido." |
| P03 | Éxito, 01:10 | Fallo, 03:00 | Éxito, 02:50 | Éxito, 02:40 | Éxito, 01:50 | 11:30 | "Me costó encontrar las fechas del proyecto." |

**Ejemplo de hallazgo derivado:** dos de tres participantes necesitaron explorar antes de ubicar una acción de proyecto. Se recomienda revisar la jerarquía visual de las acciones y observar si el patrón se repite en sesiones reales.

## Evidencia y privacidad

- Guardar fotografías fuera del repositorio y referenciarlas con identificadores como `P01-sesion-01`.
- No incluir rostros, nombres, correos, contraseñas, tokens ni otros datos personales en el repositorio.
- Conservar la autorización correspondiente junto a cada fotografía.
- No presentar el bloque de simulación como resultado observado.
