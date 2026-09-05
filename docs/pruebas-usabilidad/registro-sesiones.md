# Pruebas de usabilidad: flujos principales

## Ficha del estudio

- **Tarea:** HU-37
- **Responsable:** Alejandra Aviles (24722)
- **Sprint point:** 5
- **Fecha prevista de cierre:** 05/09/2026
- **Participantes objetivo:** 5 estudiantes de 18 a 30 años, usuarios frecuentes de aplicaciones web y sin participación previa en Kontrol.
- **Modalidad:** moderada, manual, con pensamiento en voz alta.
- **Ambiente:** https://test.34.121.51.151.nip.io
- **Criterio de aceptacion:** 5 sesiones completadas con tiempos, tasa de éxito, SUS y comentarios textuales por participante.

## Preparacion

1. Confirmar que el participante cumple el perfil y asignar un identificador `P01` a `P05`; sin registrar nombres en este documento.
2. Explicar que se evalua la aplicación, no a la persona, y solicitar autorización para tomar notas y, si corresponde, fotografías.
3. Restablecer el ambiente antes de cada sesion desde la VM:

   ```bash
   cd /app/Kontrol
   docker compose -f docker-compose.prod.yml -f docker-compose.test.yml exec backend-test npm run reset:test
   ```

4. Iniciar el cronómetro al comenzar cada tarea y detenerlo cuando el participante declare que terminó o alcance el tiempo máximo.
5. Registrar navegaciones erróneas sin corregir al participante, salvo que abandone la tarea o exista un error del ambiente.

## Guion de moderacion

### Introduccion

> Estamos evaluando Kontrol, no tus conocimientos. Realiza las tareas como lo harias normalmente y piensa en voz alta. No te mostraremos el camino. Puedes detenerte en cualquier momento.

### Tareas

| ID | Instruccion para el participante | Maximo | Exito |
|---|---|---:|---|
| T1 | Inicia sesión e identifica en el dashboard el estado de los proyectos activos. | 2 min | Ubica correctamente el estado de los proyectos. |
| T2 | Crea un proyecto con nombre, fechas y fase inicial. | 3 min | El proyecto queda creado con los datos solicitados. |
| T3 | Crea una tarea dentro del proyecto y asignala a un miembro. | 3 min | La tarea queda creada y asignada. |
| T4 | Registra un avance y adjunta evidencia. | 3 min | El avance y la evidencia quedan guardados. |
| T5 | Consulta el reporte del proyecto y ubica el resumen de presupuesto. | 2 min | Encuentra el reporte y el resumen de presupuesto. |

No proporcionar pistas durante el primer intento. Si una tarea falla, registrar el punto de bloqueo y permitir continuar con la siguiente cuando sea posible.

### Pregunta posterior a cada tarea

> En una escala de 1 a 7, donde 1 es muy dificil y 7 es muy facil, ¿que tan fácil fue completar esta tarea?

## Registro por participante

Completar este sección inmediatamente después de cada sesión.

### Participante `P1`

- **Fecha y hora:**
- **Cuenta de prueba:**
- **Perfil confirmado:** si / no
- **Autorizacion para notas:** si / no
- **Autorizacion para fotografia:** si / no / no aplica
- **Incidencias del ambiente:**

| Tarea | Tiempo (mm:ss) | Exito (si/no) | Navegaciones erroneas | Facilidad (1-7) | Comentario textual |
|---|---:|---|---:|---:|---|
| T1 | | | | | "" |
| T2 | | | | | "" |
| T3 | | | | | "" |
| T4 | | | | | "" |
| T5 | | | | | "" |

**Observaciones del moderador:**

-

**Bloqueos o errores reproducibles:**

-

### Participante `P2`

- **Fecha y hora:**
- **Cuenta de prueba:**
- **Perfil confirmado:** si / no
- **Autorizacion para notas:** si / no
- **Autorizacion para fotografia:** si / no / no aplica
- **Incidencias del ambiente:**

| Tarea | Tiempo (mm:ss) | Exito (si/no) | Navegaciones erroneas | Facilidad (1-7) | Comentario textual |
|---|---:|---|---:|---:|---|
| T1 | | | | | "" |
| T2 | | | | | "" |
| T3 | | | | | "" |
| T4 | | | | | "" |
| T5 | | | | | "" |

**Observaciones del moderador:**

-

**Bloqueos o errores reproducibles:**

-

### Participante `P3`

- **Fecha y hora:**
- **Cuenta de prueba:**
- **Perfil confirmado:** si / no
- **Autorizacion para notas:** si / no
- **Autorizacion para fotografia:** si / no / no aplica
- **Incidencias del ambiente:**

| Tarea | Tiempo (mm:ss) | Exito (si/no) | Navegaciones erroneas | Facilidad (1-7) | Comentario textual |
|---|---:|---|---:|---:|---|
| T1 | | | | | "" |
| T2 | | | | | "" |
| T3 | | | | | "" |
| T4 | | | | | "" |
| T5 | | | | | "" |

**Observaciones del moderador:**

-

**Bloqueos o errores reproducibles:**

-

### Participante `P4`

- **Fecha y hora:**
- **Cuenta de prueba:**
- **Perfil confirmado:** si / no
- **Autorizacion para notas:** si / no
- **Autorizacion para fotografia:** si / no / no aplica
- **Incidencias del ambiente:**

| Tarea | Tiempo (mm:ss) | Exito (si/no) | Navegaciones erroneas | Facilidad (1-7) | Comentario textual |
|---|---:|---|---:|---:|---|
| T1 | | | | | "" |
| T2 | | | | | "" |
| T3 | | | | | "" |
| T4 | | | | | "" |
| T5 | | | | | "" |

**Observaciones del moderador:**

-

**Bloqueos o errores reproducibles:**

-

### Participante `P5`

- **Fecha y hora:**
- **Cuenta de prueba:**
- **Perfil confirmado:** si / no
- **Autorizacion para notas:** si / no
- **Autorizacion para fotografia:** si / no / no aplica
- **Incidencias del ambiente:**

| Tarea | Tiempo (mm:ss) | Exito (si/no) | Navegaciones erroneas | Facilidad (1-7) | Comentario textual |
|---|---:|---|---:|---:|---|
| T1 | | | | | "" |
| T2 | | | | | "" |
| T3 | | | | | "" |
| T4 | | | | | "" |
| T5 | | | | | "" |

**Observaciones del moderador:**

-

**Bloqueos o errores reproducibles:**

-

### SUS

Aplicar al cierre de la sesión. Mostrar cada afirmación y solicitar una respuesta de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo).

| # | Afirmacion | Respuesta (1-5) |
|---:|---|---:|
| 1 | Creo que utilizaria este sistema con frecuencia. | |
| 2 | Encontre el sistema innecesariamente complejo. | |
| 3 | Creo que el sistema es facil de usar. | |
| 4 | Necesitaria apoyo de una persona tecnica para usar este sistema. | |
| 5 | Las funciones del sistema estan bien integradas. | |
| 6 | El sistema presenta demasiadas inconsistencias. | |
| 7 | Imagino que la mayoria de las personas aprenderia a usarlo rapidamente. | |
| 8 | Encontre el sistema muy incomodo de usar. | |
| 9 | Me senti seguro usando el sistema. | |
| 10 | Necesitaria aprender muchas cosas antes de poder usar el sistema. | |

**Puntaje SUS:** `((suma impares - 5) + (25 - suma pares)) x 2.5 = ____ / 100`

## Resumen de resultados

Completar después de las cinco sesiones.

| Participante | Tareas exitosas / 5 | Tiempo total | Errores | Facilidad promedio | SUS | Foto autorizada |
|---|---:|---:|---:|---:|---:|---|
| P01 | | | | | | |
| P02 | | | | | | |
| P03 | | | | | | |
| P04 | | | | | | |
| P05 | | | | | | |

## Hallazgos consolidados

| ID | Flujo afectado | Evidencia observada | Frecuencia | Severidad | Recomendacion |
|---|---|---|---:|---|---|
| H-01 | | | / 5 | alta / media / baja | |

## Evidencia y privacidad

- Guardar las fotografias fuera del repositorio y referenciarlas con un identificador, por ejemplo `P01-sesion-01`.
- No incluir rostros, nombres, correos, contraseñas, tokens ni datos personales en el repositorio.
- Conservar junto a cada fotografía la autorizacion correspondiente.
- Sustituir los marcadores vacíos por datos reales antes de marcar la tarea como completada.