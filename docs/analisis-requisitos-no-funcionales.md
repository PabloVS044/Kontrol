# Análisis de requisitos no funcionales — Sprint 8

| Campo | Valor |
|---|---|
| Documento | Análisis de los requisitos no funcionales de Kontrol frente a las pruebas no funcionales ejecutadas |
| Ticket | [SCRUM-56](https://kontroldevelopment.atlassian.net/browse/SCRUM-56) · Parte 1 |
| Responsable | Ivana Figueroa (24785) |
| Versión | 1.0 |
| Fecha | 28/09/2026 |
| Rama analizada | `develop` @ `273a763` |
| Línea base | Documento «Requisitos no funcionales — Kontrol» del curso de Ingeniería de Software 1, Grupo 3. Su tabla coincide palabra por palabra con la sección «c. Requisitos no funcionales» del informe «Corte 2 IDS Grupo 3» |
| Documento hermano | `docs/plan-refactorizacion.md` (SCRUM-56, Parte 2) |

---

## 1. Línea base y método

### 1.1 Línea base

La línea base son los **42 requisitos no funcionales** del diseño original, agrupados en 14 categorías de tres requisitos cada una. Se transcriben en la sección 2 tal como aparecen en el documento de origen, sin corregir redacción ni ortografía. Los que resultan ambiguos o citan elementos que no existen en el sistema se marcan en la columna de observación, pero no se modifican: la propuesta de ajuste va aparte, en §4.4.

La tabla de actividades del mismo informe del Corte 2 registra la tarea «Definición de requisitos no funcionales (17 RNF con métricas)». La tabla de requisitos contiene 42. Este análisis usa los 42.

Identificador: `RNF-<categoría>.<orden dentro de la categoría>`, en el orden del documento de origen.

### 1.2 Pruebas contrastadas

Se contrastan todas las pruebas no funcionales ejecutadas hasta la fecha, no solo las que nombra el ticket, porque varias de ellas son las únicas que tocan algún requisito.

| Prueba | Ticket | Fecha | Documento de resultados |
|---|---|---|---|
| Carga y estrés con k6 (C1 a C5, E1 a E5) | SCRUM-28 | 07 y 08/09/2026 | `docs/pruebas-carga-estres.md` |
| Seguridad automatizada con OWASP ZAP, verificación dirigida de controles y `npm audit` | SCRUM-52 | 26/09/2026 | `docs/pruebas-seguridad-zap.md` |
| Volumen de datos con pgbench y k6 (N0 a N3) | SCRUM-53 | 27 y 28/09/2026 | `docs/pruebas-volumen.md` |
| Usabilidad moderada, Fase 1 (T1 a T5, tres participantes) | SCRUM-26 y SCRUM-27 | 06/09/2026 | `docs/pruebas-usabilidad/registro-sesiones.md`, `docs/pruebas-usabilidad/analisis-hallazgos.md` |
| Usabilidad moderada, Fase 2 (F1 a F5, tres participantes) | — | 28/09/2026 | `docs/pruebas-usabilidad/protocolo-fase2.md`, `docs/pruebas-usabilidad/Registro_sesiones_usabilidad_Fase_2.xlsx` |
| Autorización multi-rol y multi-empresa, nueve casos en Vitest | SCRUM-9 | En CI desde el Sprint 5 | `backend/tests/authz.controller.test.js`, trazado en `docs/plan-maestro-pruebas.md` §9.3 |

El ticket SCRUM-53 se titula «Pruebas de volumen **e inundación** sobre la base de datos». Su documento de resultados cubre volumen; no hay pruebas de inundación ejecutadas en el repositorio. Se tratan como faltantes en §4.1.

### 1.3 Escala del veredicto

| Veredicto | Significado |
|---|---|
| **Cumple** | Una prueba ejecutada mide lo que pide el requisito y el resultado está dentro de su métrica |
| **Cumple parcialmente** | La prueba mide una parte del requisito, o lo mide sobre un caso cercano pero no idéntico, y esa parte cumple |
| **No cumple** | Una prueba ejecutada mide el requisito y el resultado queda fuera de su métrica |
| **No concluyente** | Hay una prueba que toca el requisito, pero no mide lo que este pide |
| **Sin prueba** | Ninguna prueba ejecutada lo toca. Cuando la forma de medición del propio requisito es una inspección del código o del repositorio, se anota el resultado de esa inspección en §3.2, sin contarlo como prueba |

### 1.4 Alcance de los veredictos

Todas las pruebas se ejecutaron sobre el ambiente de pruebas de SCRUM-25 (`docs/test-environment.md`) o sobre una base Supabase aislada, nunca sobre producción. Producción corre `main` @ `66dc481`, del 07/09/2026 (`docs/pruebas-seguridad-zap.md` §6), y no incluye ninguna de las correcciones del Sprint 8 que el plan de refactorización cuenta como ejecutadas. **Los veredictos de este documento valen para `develop` y para el ambiente de pruebas, no para producción.**

---

## 2. Requisitos no funcionales de la línea base

Transcripción literal. La columna Observación es de este análisis.

| ID | Requisito no funcional | Categoría | Forma en que se medirá su cumplimiento | Observación |
|---|---|---|---|---|
| RNF-1.1 | La interfaz del "Executive Overview" deberá utilizar una paleta de colores de alto contraste (fondo oscuro #1A1A1A según prototipo) para resaltar los indicadores de riesgo en rojo. | 1. Apariencia o interfaz externa | Inspección visual de la hoja de estilos y validación contra el diseño aprobado en la etapa de ideación. | Cita una pantalla, «Executive Overview», que no existe con ese nombre; el equivalente es el dashboard |
| RNF-1.2 | El sistema deberá presentar los gráficos de "Budget Distribution" mediante barras de progreso con etiquetas porcentuales legibles a una distancia de 1 metro en monitor estándar. | 1. Apariencia o interfaz externa | Prueba de legibilidad con usuarios a la distancia especificada en un monitor de 24 pulgadas. | Cita un gráfico, «Budget Distribution», que no existe con ese nombre |
| RNF-1.3 | Minimalismo para que sea agradable a la vista, siguiendo los patrones en tendencia y colores que combinen bien y tengan buen contraste entre si | 1. Apariencia o interfaz externa | Por medio de un software externo que calcula el buen match entre colores y la buena legibilidad | Ambiguo: sin métrica ni umbral |
| RNF-2.1 | Un director de proyecto deberá ser capaz de visualizar el estado de salud de todos sus proyectos en menos de 10 segundos tras iniciar sesión. | 2. Usabilidad | Test de usuario cronometrado con el rol de "Administrador"/"Director". | Cita un rol, «Director», que no existe; los roles del sistema son Administrador, Encargado y Colaborador |
| RNF-2.2 | La "AI Agent Console" deberá permitir que un usuario obtenga una respuesta a una consulta en lenguaje natural en no más de 3 interacciones. | 2. Usabilidad | Análisis de flujo de clics (clickstream) durante pruebas de usuario. | — |
| RNF-2.3 | Interfaces similares a herramientas del día a día que utilizan actualmente los usuarios, evitando esa curva de aprendizaje alta. | 2. Usabilidad | Pruebas de campo con usuarios contandonos sus sensaciones con la app. | Ambiguo: sin métrica ni umbral |
| RNF-3.1 | El tiempo de respuesta para la generación de un reporte de "Budget Overrun" no deberá exceder los 3 segundos tras la solicitud del usuario. | 3. Rendimiento | Pruebas de carga y estrés midiendo los tiempos de respuesta del servidor (TTFB). | Cita un reporte, «Budget Overrun», que no existe con ese nombre |
| RNF-3.2 | El sistema deberá ser capaz de sincronizar y procesar hasta 50 actualizaciones de tareas simultáneas provenientes de diferentes usuarios sin bloqueos. | 3. Rendimiento | Simulación de concurrencia mediante herramientas de Testing automatizado. | — |
| RNF-3.3 | Utilizar la menor cantidad de js per request para optimizar el rendimiento de cada funcionalidad. | 3. Rendimiento | Software especializado para benchmarking comparando con sitios referentes. | Ambiguo: sin métrica ni umbral |
| RNF-4.1 | El sistema deberá permitir la integración de nuevos módulos de visualización (widgets) sin necesidad de recompilar el núcleo de la aplicación. | 4. Soporte | Revisión de la arquitectura para confirmar el uso de patrones modulares o micro-frontends. | — |
| RNF-4.2 | El código del agente de IA deberá estar documentado internamente para permitir que un desarrollador nuevo comprenda la lógica de prompts en menos de 4 horas. | 4. Soporte | Prueba de inducción técnica con un desarrollador externo al equipo original. | — |
| RNF-4.3 | Espacio de comunidad para recibir feedback de los usuarios para estar en constante actualización según necesidades. | 4. Soporte | Pruebas con los usuarios que dejaron el feedback. | Describe una funcionalidad, no un atributo de calidad |
| RNF-5.1 | El tablero de control debe ser 100% responsivo, manteniendo la funcionalidad del "Executive Overview" en tablets con resolución mínima de 1024x768. | 5. Portabilidad | Pruebas de visualización en diferentes dispositivos y tamaños de pantalla (Viewport testing). | Cita «Executive Overview» (ver RNF-1.1) |
| RNF-5.2 | La aplicación debe ser accesible vía web a través de los navegadores Safari, Edge y Chrome en sus versiones móviles y de escritorio. | 5. Portabilidad | Ejecución de pruebas de compatibilidad cruzada (Cross-browser testing). | — |
| RNF-5.3 | La aplicación debe ser eficiente con el consumo de recursos para correr en dispositivos con bajos recursos. | 5. Portabilidad | Benchmarking con dispositivos limitados. | Ambiguo: sin métrica ni umbral |
| RNF-6.1 | El sistema deberá restringir el acceso a los datos financieros del "Budget Summary" únicamente a usuarios con el rol de "Finanzas" o "Dueño de Proyecto". | 6. Seguridad y privacidad | Auditoría de la tabla de permisos (RBAC - Role Based Access Control) en la base de datos. | Cita roles, «Finanzas» y «Dueño de Proyecto», que no existen |
| RNF-6.2 | Todas las comunicaciones entre el cliente y el servidor, especialmente las consultas a la IA, deberán viajar cifradas mediante protocolo TLS 1.3. | 6. Seguridad y privacidad | Verificación del certificado SSL/TLS y análisis de tráfico con Wireshark o similar. | — |
| RNF-6.3 | El sistema debe presetar restricciones por tipo de usuario. | 6. Seguridad y privacidad | Testing del flujo de cada tipo de usuario. | — |
| RNF-7.1 | El sistema deberá manejar la moneda local (Quetzales - Q) y el formato de fechas regional (DD/MM/AAAA) por defecto para el mercado guatemalteco. | 7. Políticos y culturales | Verificación de la configuración de localización (L10n) en los archivos de configuración del sistema. | — |
| RNF-7.2 | El lenguaje utilizado por el Asistente de IA deberá ser profesional, neutro y libre de sesgos de género o discriminación. | 7. Políticos y culturales | Auditoría de respuestas del modelo de lenguaje mediante una batería de 50 preguntas de prueba. | — |
| RNF-7.3 | Nos reservamos el derecho de uso ante cualquier entidad politica. | 7. Políticos y culturales | Monitoreo de usuarios que no pertenezcan a partidos políticos. | Ambiguo: es una condición de uso, no un requisito verificable del sistema |
| RNF-8.1 | El sistema deberá cumplir con la Ley de Protección de Datos Personales aplicable, garantizando que el usuario pueda exportar su información en formato CSV en cualquier momento. | 8. Legales | Verificación funcional del botón "Exportar datos" y revisión de la política de privacidad. | — |
| RNF-8.2 | El uso de librerías de terceros para el análisis de imágenes debe contar con licencias Open Source compatibles con uso comercial (ej. MIT o Apache 2.0). | 8. Legales | Auditoría del archivo de dependencias (package.json o similar) y sus respectivas licencias. | Cita un módulo de análisis de imágenes que no existe como tal |
| RNF-8.3 | Funcionar bajo los estándares tributarios vigentes. | 8. Legales | Revisiones periódicas ante la SAT. | Ambiguo: no dice qué estándares ni qué parte del sistema |
| RNF-9.1 | El sistema debe garantizar una disponibilidad del 99.0%, asegurando que la fuente única de información esté siempre accesible para los equipos. | 9. Confiabilidad | Monitoreo del tiempo de actividad (Uptime) mediante servicios externos como UptimeRobot. | — |
| RNF-9.2 | En caso de pérdida de conexión, el sistema deberá guardar los cambios localmente y sincronizarlos automáticamente al recuperar la señal sin duplicar datos. | 9. Confiabilidad | Prueba de interrupción de red durante la edición de un presupuesto y verificación de consistencia posterior. | — |
| RNF-9.3 | El sistema contara con sistema de respaldo automático para tener recuperación completa en caso de fallos | 9. Confiabilidad | Pruebas de restauración en entornos de prueba | — |
| RNF-10.1 | La integración con calendarios externos (Google/Outlook) deberá realizarse mediante sus APIs oficiales utilizando el estándar de autenticación OAuth 2.0. | 10. Interfaz interna | Revisión de los registros de conexión y tokens de acceso en el módulo de integraciones. | — |
| RNF-10.2 | El intercambio de datos entre el módulo de análisis de imágenes y el tablero de control debe realizarse mediante Webhooks con validación de firma secreta. | 10. Interfaz interna | Inspección de los encabezados de las peticiones HTTP entre microservicios. | Cita el módulo de análisis de imágenes (ver RNF-8.2) y microservicios que no existen |
| RNF-10.3 | El sistema debe poder interpretar y analizar archivos comunes de uso, tales cómo el .xslx, .docx, etc. | 10. Interfaz interna | Testing | Describe una funcionalidad; forma de medición sin detalle |
| RNF-11.1 | El sistema deberá incluir un "Tutorial de Bienvenida" interactivo que guíe al usuario por las 3 interfaces principales en su primer inicio de sesión. | 11. Ayudas y documentación | Verificación de la ejecución automática del componente de "Onboarding" para usuarios nuevos. | No define cuáles son las «3 interfaces principales» |
| RNF-11.2 | Se deberá proveer un archivo README.md en el repositorio de GitHub con las instrucciones de despliegue que permitan levantar el entorno en menos de 20 minutos. | 11. Ayudas y documentación | Prueba de despliegue desde cero siguiendo estrictamente los pasos del manual. | — |
| RNF-11.3 | Incluir sistema de preguntas frecuentes accesible desde el menu principal que cubra con el 80% de las funcionalidades principales | 11. Ayudas y documentación | Verificacion mediante revision del contenido publicado y validación funcional del acceso desde cualquier modulo principal. | No define cuáles son las «funcionalidades principales» |
| RNF-12.1 | El backend del sistema deberá ser desarrollado exclusivamente en el lenguaje y framework definido por el equipo técnico (ej. Python/FastAPI o Node.js). | 12. Software | Inspección del repositorio de código fuente en GitHub. | — |
| RNF-12.2 | El motor de base de datos para centralizar la información debe ser relacional (PostgreSQL) para garantizar la integridad referencial de los proyectos. | 12. Software | Revisión del esquema de base de datos y scripts de migración. | — |
| RNF-12.3 | Para la visualización del sistema se utilizará el framework React.js y next.js para el control de las rutas del sistema. | 12. Software | Se revisará el código para que se esté usando en el framework correcto. | El frontend implementado usa Vue.js |
| RNF-13.1 | El servidor de alojamiento debe contar con almacenamiento en discos de estado sólido (SSD) para garantizar la velocidad de consulta del Budget Summary. | 13. Hardware | Verificación de las especificaciones del plan de hosting o servicio cloud seleccionado (AWS/Azure/Heroku). | — |
| RNF-13.2 | La consola del agente de IA debe ser capaz de procesar imágenes de avances de obra con una resolución mínima de 2 megapíxeles. | 13. Hardware | Prueba de carga de imágenes de diferentes resoluciones y validación de procesamiento. | — |
| RNF-13.3 | Garantizar un buen rendimiento en servidores que cuentan con recursos bajos | 13. Hardware | Pruebas de rendimiento con especificaciones mínimas. | Ambiguo: sin métrica propia; se contrasta contra los umbrales del plan maestro §7.2 |
| RNF-14.1 | El desarrollo debe seguir el patrón de diseño de Microservicios para separar la lógica de la IA de la lógica de gestión de presupuesto. | 14. Restricciones en el diseño | Revisión del diagrama de arquitectura del sistema y estructura de contenedores. | Contradice RNF-14.3 en el nivel de arquitectura |
| RNF-14.2 | El uso de herramientas de control de versiones (Git) es obligatorio, realizando al menos un "merge" semanal a la rama principal (main). | 14. Restricciones en el diseño | Auditoría del historial de commits en el repositorio de GitHub. | — |
| RNF-14.3 | Desarrollar bajo la arquitectura MVC | 14. Restricciones en el diseño | Organización de estructura del proyecto | — |

**Resumen de observaciones:** 7 requisitos sin métrica o no verificables tal como están escritos (RNF-1.3, 2.3, 3.3, 5.3, 7.3, 8.3, 13.3); 10 que citan pantallas, reportes, roles o módulos que no existen con ese nombre en el sistema (RNF-1.1, 1.2, 2.1, 3.1, 5.1, 6.1, 8.2, 10.2 y, por el stack, 12.3 y 14.1); y 3 que describen una funcionalidad o una condición de uso más que un atributo de calidad (RNF-4.3, 7.3, 10.3).

---

## 3. Contraste contra las pruebas ejecutadas

### 3.1 Requisitos tocados por al menos una prueba

**10 de los 42 requisitos** tienen alguna prueba ejecutada que los toca. En varios, la prueba mide un caso cercano al requisito y no el requisito mismo; el veredicto lo indica.

| ID | Prueba | Dato medido | Fuente | Veredicto |
|---|---|---|---|---|
| RNF-2.1 | Usabilidad Fase 1, tarea T1 «Iniciar sesión e identificar en el dashboard el estado de los proyectos activos». k6 C2 | T1: 0:50, 1:15 y 1:45, tres éxitos de tres. C2 (lectura del dashboard, 100 VUs): p95 de 1.91 s en el servidor | `analisis-hallazgos.md` §3 y §4; `pruebas-carga-estres.md` §2 | **No concluyente.** T1 cronometra el inicio de sesión junto con la lectura del dashboard y la pausa para pensar en voz alta; no aísla los segundos posteriores al login, que es lo que pide el requisito. La prueba no se hizo con el rol «Director», que no existe |
| RNF-2.3 | Usabilidad Fase 1 (T1 a T5) y Fase 2 (F1 a F5), con participantes sin conocimiento previo de Kontrol | Fase 1: 14 de 15 tareas completadas (93 %), la de registrar avance al 92 % de su tiempo máximo. Fase 2: 14 de 15 (93 %); el fallo es F3, registro de venta, por tiempo (200 s sobre 180 s), tras confundir dónde se inicia la venta | `analisis-hallazgos.md` §3 y §4; `Registro_sesiones_usabilidad_Fase_2.xlsx`, hojas de resumen y de registro | **Cumple parcialmente.** Usuarios nuevos completan casi todas las tareas sin inducción, pero la curva se concentra en dos flujos concretos: adjuntar evidencia a un avance y registrar una venta |
| RNF-3.1 | k6 C4 y E4 (reportes); volumen V3, V4 y exportación | C4: listado p95 620 ms, exportación p95 303 ms (20 VUs). E4 degrada a unos 124 VUs con p95 de 2.41 s. Volumen N3: listado 543 ms, resumen 211 ms. PDF con 10,001 reportes: 219 ms en Node | `pruebas-carga-estres.md` §2 y §3; `pruebas-volumen.md` §3.2 y §3.3 | **Cumple**, con la salvedad de que no existe un reporte llamado «Budget Overrun»: se contrasta contra los reportes y el resumen de presupuesto existentes. Todas las mediciones quedan por debajo de 3 s. El PDF se genera en el navegador, así que su tiempo no es TTFB |
| RNF-3.2 | k6 C3 y E3 (registro de avance de proyecto, escritura concurrente) | C3: 30 VUs, p95 de 300 ms, 0 % de errores. E3: sin errores hasta unos 232 VUs | `pruebas-carga-estres.md` §2 y §3 | **Cumple parcialmente.** La concurrencia supera las 50 escrituras simultáneas sin bloqueos ni errores, pero se midió sobre avances, no sobre actualización de tareas |
| RNF-6.1 | Autorización en Vitest (nueve casos) y ZAP activo sobre `/api` | Nueve casos en verde en CI, incluido el rechazo entre empresas. ZAP activo: 0 alertas altas y 0 medias sobre la API | `plan-maestro-pruebas.md` §9.3; `pruebas-seguridad-zap.md` §3 | **Cumple parcialmente.** El acceso por rol y por empresa está probado con los roles que existen. Los roles «Finanzas» y «Dueño de Proyecto» del requisito no existen, así que la regla literal no se puede probar |
| RNF-6.2 | ZAP, verificación dirigida de cabeceras | `strict-transport-security: max-age=15552000; includeSubDomains; preload` en un endpoint público y en uno autenticado | `pruebas-seguridad-zap.md` §4.1 | **Cumple parcialmente.** HSTS obliga a HTTPS, pero ninguna prueba verificó la versión de TLS negociada. La conexión del backend a PostgreSQL usa `rejectUnauthorized: false` (`docs/deuda-tecnica.md`, DT-15), y el documento HTML del SPA no emite HSTS (hallazgo 3 de ZAP) |
| RNF-6.3 | Autorización en Vitest (nueve casos) y límite de intentos verificado con ZAP | Colaborador y encargado rechazados en endpoints de administrador; cambio de permiso efectivo al cambiar de rol. Límite por IP y por cuenta activo, sin enumeración de usuarios | `plan-maestro-pruebas.md` §9.3; `pruebas-seguridad-zap.md` §4.2 | **Cumple** |
| RNF-8.1 | Volumen, exportación a CSV | CSV de la vista de reportes: 0.6 ms y 17.9 KB con 100,000 reportes | `pruebas-volumen.md` §3.3 | **No concluyente.** Lo medido es la exportación de un reporte de proyectos, no la exportación de los datos personales del usuario que exige el requisito |
| RNF-9.1 | Monitoreo de producción durante el escaneo de ZAP; incidentes registrados al preparar el ambiente | Sin respuestas distintas de 200 durante el escaneo. En la misma jornada: MongoDB Atlas sin resolver DNS (chat y agente de producción sin servicio), disco de la VM al 98 %, Supabase de pruebas pausado por inactividad | `pruebas-seguridad-zap.md` §2.4 y §6 | **No concluyente, con indicios en contra.** No existe monitoreo de disponibilidad, así que el 99.0 % no se puede calcular; los incidentes del 26/09 muestran servicios de producción caídos |
| RNF-13.3 | k6 en una VM de 2 vCPU y 3.8 GB; volumen con 5 usuarios | Carga: 4 de 6 mediciones fuera del p95 de §7.2 (C1 4.99 s, C2 1.91 s, C4 listado 620 ms, C5 2.61 s). Estrés: E1 y E5 degradan en su propio nivel base. Volumen: la búsqueda del POS pasa de 800 ms a partir de N2 (1.04 s), unos 7,500 productos por proyecto | `pruebas-carga-estres.md` §2, §3 y §4; `pruebas-volumen.md` §3.2 y §5 | **No cumple** |

### 3.2 Requisitos sin ninguna prueba

**32 de los 42 requisitos** no tienen ninguna prueba ejecutada. En los que su propia forma de medición es una inspección, se anota el resultado de esa inspección; no se cuenta como prueba.

| Categoría | Requisitos sin prueba | Resultado de la inspección, cuando el requisito la prevé |
|---|---|---|
| 1. Apariencia | RNF-1.1, 1.2, 1.3 | — |
| 2. Usabilidad | RNF-2.2 | — |
| 3. Rendimiento | RNF-3.3 | El bundle de entrada pesa 1,236 kB (372 kB comprimidos) según `docs/deuda-tecnica.md`, DT-17. Es una medición de build, no un benchmark contra sitios referentes |
| 4. Soporte | RNF-4.1, 4.2, 4.3 | — |
| 5. Portabilidad | RNF-5.1, 5.2, 5.3 | — |
| 7. Políticos y culturales | RNF-7.1, 7.2, 7.3 | RNF-7.1: la moneda es configurable por empresa desde el PR #126 y el quetzal está disponible, pero la moneda por defecto es USD (`frontend/src/utils/currency.js`, `DEFAULT_CURRENCY`) |
| 8. Legales | RNF-8.2, 8.3 | — |
| 9. Confiabilidad | RNF-9.2, 9.3 | — |
| 10. Interfaz interna | RNF-10.1, 10.2, 10.3 | — |
| 11. Ayudas y documentación | RNF-11.1, 11.2, 11.3 | — |
| 12. Software | RNF-12.1, 12.2, 12.3 | 12.1: el backend es Node.js con Express. 12.2: PostgreSQL es la base central; el chat y el historial del agente usan además MongoDB (`backend/src/db/mongo.js`). 12.3: el frontend es Vue.js, no React ni Next.js |
| 13. Hardware | RNF-13.1, 13.2 | — |
| 14. Restricciones en el diseño | RNF-14.1, 14.2, 14.3 | 14.1: el agente de IA vive en el mismo backend y usa el mismo pool y el mismo rol de base de datos que la gestión (`docs/deuda-tecnica.md`, DT-16); no hay microservicios. 14.2: los merges a `main` fueron el 26 y 28/07, 17 y 21/08, 05 y 07/09; hay intervalos de dos y tres semanas, y ninguno desde el 07/09. 14.3: el backend separa modelos, controladores y rutas |

### 3.3 Umbrales usados por las pruebas frente a los de los requisitos

Las pruebas de rendimiento no tomaron sus umbrales de los requisitos no funcionales. Los fijó el plan maestro de pruebas en §7.2:

| Umbral | Plan maestro §7.2, usado por k6 y por volumen | Requisito no funcional más cercano |
|---|---|---|
| Inicio de sesión | p95 de 300 ms o menos | Ninguno |
| Lecturas | p95 de 500 ms o menos | RNF-3.1: 3 s para un reporte |
| Escrituras | p95 de 800 ms o menos | RNF-3.2: 50 actualizaciones simultáneas sin bloqueos, sin umbral de latencia |
| Tasa de error | Menos del 1 % | RNF-3.2: «sin bloqueos» |

Los umbrales del plan son entre 4 y 10 veces más estrictos que el único requisito que fija un tiempo. Por eso un mismo resultado puede ser «No cumple» frente al plan y «Cumple» frente a la línea base: el listado de reportes con 620 ms falla el plan maestro y cumple RNF-3.1.

---

## 4. Respuestas a las cuatro preguntas de la guía

### 4.1 ¿Qué pruebas no funcionales faltarían para validar todos los requisitos planteados?

**Faltante declarada: pruebas de inundación.** SCRUM-53 se definió como «Pruebas de volumen e inundación sobre la base de datos». Se ejecutó la parte de volumen (`docs/pruebas-volumen.md`); la de inundación no tiene scripts ni resultados en el repositorio. Una prueba de inundación mediría el comportamiento ante una ráfaga de escrituras en muy poco tiempo —por ejemplo, cientos de ventas del POS o de movimientos de inventario por segundo contra la misma empresa—, que es distinto del volumen acumulado y de la concurrencia sostenida de k6.

Con ella, las pruebas que harían falta para cubrir los 32 requisitos sin prueba y los 3 no concluyentes:

| Prueba faltante | Requisitos que validaría | Herramienta posible |
|---|---|---|
| Inundación sobre la base de datos | RNF-3.2 (escrituras simultáneas sin bloqueos), RNF-9.1 | k6 con escenario de llegada constante (`constant-arrival-rate`) sobre `POST` de ventas y movimientos; pgbench con scripts de escritura |
| Tarea cronometrada desde la sesión iniciada | RNF-2.1 | Protocolo de usabilidad con cronómetro que arranque al cargar el dashboard |
| Conteo de interacciones con el agente | RNF-2.2 | Registro de clics en sesión moderada, o eventos instrumentados en la vista del agente |
| Contraste y legibilidad | RNF-1.1, 1.2, 1.3 | Lighthouse o axe para contraste WCAG; prueba de lectura a 1 m con usuarios |
| Viewport y compatibilidad entre navegadores | RNF-5.1, 5.2 | Playwright con Chromium, WebKit y Firefox, en resoluciones de escritorio, tablet 1024x768 y móvil |
| Rendimiento en el cliente con dispositivos limitados | RNF-3.3, 5.3 | Lighthouse con limitación de CPU y red; presupuesto de tamaño del bundle en CI |
| Versión de TLS y verificación del certificado | RNF-6.2 | `testssl.sh` o `sslyze` contra el dominio desplegado, más revisión de la conexión a PostgreSQL |
| Disponibilidad | RNF-9.1 | Monitoreo externo del health check de producción (UptimeRobot o equivalente) durante un periodo definido |
| Corte de red durante la edición | RNF-9.2 | Playwright en modo sin conexión durante la edición de un presupuesto, con verificación de duplicados al reconectar |
| Respaldo y restauración | RNF-9.3 | `pg_dump` y restauración en el ambiente de pruebas, con prueba de humo posterior |
| Batería de sesgo del agente | RNF-7.2 | 50 preguntas fijas con revisión de respuestas, tal como propone el propio requisito |
| Auditoría de licencias | RNF-8.2 | `license-checker` sobre las dependencias |
| Exportación de datos personales | RNF-8.1 | Prueba funcional del flujo de exportación de la cuenta, una vez exista |
| Despliegue desde cero | RNF-11.2 | Cronometrar un despliegue limpio siguiendo solo el README |
| Inducción técnica | RNF-4.2 | Sesión cronometrada con un desarrollador ajeno al equipo |
| Integraciones y archivos | RNF-10.1, 10.2, 10.3 | Pruebas de integración sobre los flujos, una vez existan |

Los requisitos RNF-1.3, 4.3, 7.3, 8.3, 12.x, 13.1 y 14.x no necesitan una prueba ejecutable: se validan por inspección o no son verificables tal como están escritos (§4.3).

### 4.2 ¿Qué tanto se han logrado cumplir?

| Veredicto | Cantidad | Requisitos |
|---|---|---|
| Cumple | 2 | RNF-3.1, 6.3 |
| Cumple parcialmente | 4 | RNF-2.3, 3.2, 6.1, 6.2 |
| No cumple | 1 | RNF-13.3 |
| No concluyente | 3 | RNF-2.1, 8.1, 9.1 |
| Sin prueba | 32 | §3.2 |

**Con pruebas, solo se puede afirmar el cumplimiento de 6 de los 42 requisitos, y de 4 de ellos solo en parte.** Donde sí hay pruebas, el resultado es coherente:

- **Rendimiento del servidor.** El sistema no pierde peticiones: 0 % de errores en las diez corridas de k6 y en todos los niveles de volumen. Lo que falla es la latencia. Frente a los requisitos cumple (RNF-3.1 y 3.2); frente a «buen rendimiento con recursos bajos» (RNF-13.3) no cumple, porque en 2 vCPU el login y la venta del POS ya están en su límite con carga normal, y el POS se degrada a partir de unos 7,500 productos por proyecto.
- **Seguridad.** El control de acceso por rol y por empresa cumple y está en CI. Las cabeceras y el límite de intentos se verificaron en el ambiente desplegado. El cifrado se cumple solo en parte.
- **Usabilidad.** Usuarios nuevos completan el 93 % de las tareas en las dos fases, con fricción localizada en dos flujos.

La inspección añade dos resultados negativos sobre requisitos de diseño: el frontend no es React/Next (RNF-12.3) y no hay microservicios (RNF-14.1). Ambos son decisiones del equipo tomadas durante el desarrollo, no defectos.

**Matiz sobre producción.** Todo lo anterior se midió sobre `develop` o sobre el ambiente de pruebas. Producción corre `main` del 07/09/2026: las cabeceras de seguridad, el límite de intentos, la validación de URL del probador de integraciones y el middleware de errores no están desplegados ahí (`docs/pruebas-seguridad-zap.md` §6 y §7). En producción, RNF-6.2 y 6.3 se cumplen en menor medida que lo que reporta esta tabla.

### 4.3 ¿Los requisitos fueron bien diseñados o necesitarían ajustes?

Necesitan ajustes. La estructura es buena: cada requisito tiene categoría y forma de medición, y las 14 categorías cubren el espectro habitual de atributos de calidad. Los problemas son de contenido:

1. **Muchos no tienen métrica.** Siete requisitos no dicen qué valor los cumple (RNF-1.3, 2.3, 3.3, 5.3, 7.3, 8.3, 13.3). Sin umbral, ninguna prueba puede dar un veredicto; por eso, por ejemplo, RNF-13.3 se tuvo que contrastar contra los umbrales del plan maestro.
2. **Describen un producto que cambió.** Diez requisitos citan pantallas, reportes, roles o módulos que no existen con ese nombre: «Executive Overview», «Budget Distribution», «Budget Overrun», los roles «Director», «Finanzas» y «Dueño de Proyecto», el módulo de análisis de imágenes y los microservicios. Se escribieron sobre el prototipo de ideación y no se actualizaron cuando el diseño evolucionó.
3. **Hay contradicciones internas y con el stack.** RNF-14.1 pide microservicios y RNF-14.3 pide MVC. RNF-12.3 fija React y Next.js, y el equipo implementó Vue.js.
4. **Mezclan requisitos de calidad con funcionalidades o condiciones de uso.** RNF-4.3 (espacio de comunidad), 10.3 (leer archivos .xlsx y .docx) y 7.3 (derecho de uso ante entidades políticas) no describen cómo debe comportarse el sistema, sino qué debe tener o una política comercial.
5. **Sus métricas no llegaron al plan de pruebas.** El plan maestro fijó sus propios umbrales (§3.3 de este documento), más estrictos que los de los requisitos, sin citarlos. Resultado: el equipo midió rendimiento con rigor, pero contra una vara distinta de la acordada en el diseño.
6. **Faltan requisitos para los riesgos que sí aparecieron.** Las pruebas encontraron problemas que ningún requisito anticipa: la degradación con el volumen de datos (`docs/pruebas-volumen.md` §5), la fuerza bruta contra el login y el SSRF en el probador de integraciones (`docs/pruebas-seguridad-zap.md` §3). No hay requisitos de escalabilidad de datos, de límite de intentos ni de validación de entradas.

### 4.4 ¿Qué cambios se harían?

Propuesta. No modifica la línea base de la sección 2; la sustituiría si el equipo la aprueba.

| Requisito | Cambio propuesto | Motivo |
|---|---|---|
| RNF-1.1, 1.2, 5.1 | Sustituir «Executive Overview» y «Budget Distribution» por el dashboard y la barra de presupuesto reales. Fijar contraste mínimo WCAG AA (4.5:1 en texto) | Pantallas inexistentes; §4.3.2 |
| RNF-1.3 | Retirar, o fusionar con RNF-1.1 como contraste AA en todas las vistas | Sin métrica |
| RNF-2.1 | «Un Administrador o Encargado identifica el estado de todos sus proyectos en menos de 10 s desde que carga el dashboard» | Rol inexistente; el cronómetro debe arrancar después del login |
| RNF-2.3 | «Un usuario nuevo completa al menos el 90 % de las tareas del protocolo de usabilidad sin inducción» | Hoy sin métrica; el 93 % medido daría una línea base |
| RNF-3.1 | Nombrar los reportes reales y alinear el umbral con el plan maestro, o declarar en el plan que su umbral de 500 ms es un objetivo interno más estricto | Reporte inexistente; §3.3 |
| RNF-3.2 | Sustituir «tareas» por las escrituras críticas (avances, ventas, movimientos) y añadir latencia: p95 de 800 ms con 50 escrituras concurrentes | Hoy sin umbral de latencia |
| RNF-3.3 y 5.3 | Presupuesto de tamaño: bundle de entrada por debajo de 500 kB sin comprimir, verificado en CI | Sin métrica; DT-17 da la medida actual |
| RNF-6.1 | Sustituir «Finanzas» y «Dueño de Proyecto» por los roles y permisos reales (Administrador de empresa y permiso de presupuesto del proyecto) | Roles inexistentes |
| RNF-6.2 | Mantener TLS 1.3 hacia el cliente y añadir «la conexión a la base de datos verifica el certificado del servidor» | Hueco medido en DT-15 |
| RNF-7.1 | Mantener; hoy la moneda por defecto es USD | Aclarar si el valor por defecto aplica a cada empresa nueva |
| RNF-7.3, 8.3 | Retirar de la lista de RNF y llevarlos a términos de uso y a un requisito fiscal concreto (por ejemplo, cálculo del IVA del 12 % en el POS) | No son verificables como atributos del sistema |
| RNF-4.3, 10.3 | Pasar al backlog funcional como historias de usuario | Son funcionalidades |
| RNF-8.2, 10.2, 13.2 | Retirar o reformular sobre el agente de IA real | Módulo de análisis de imágenes inexistente |
| RNF-9.1 | Mantener y añadir cómo se mide: health check externo cada 5 minutos, reporte mensual | Hoy no hay medición |
| RNF-12.3 | Actualizar a Vue.js | Decisión del equipo ya consolidada |
| RNF-14.1 | Sustituir microservicios por «el agente de IA se aísla en su propio servicio o, como mínimo, en su propio pool con un rol de base de datos de solo lectura» | Contradice RNF-14.3; el aislamiento es lo que se buscaba, y DT-16 lo concreta |
| RNF-13.3 | Fijar la especificación mínima (2 vCPU, 4 GB) y exigir los umbrales del plan maestro §7.2 en ella | Hoy sin métrica |
| **Nuevo** · volumen | «Con 10,000 productos y 50,000 movimientos por proyecto, la búsqueda del POS responde en menos de 800 ms p95» | Riesgo medido en `docs/pruebas-volumen.md` §5 sin requisito que lo cubra |
| **Nuevo** · seguridad | «El sistema limita los intentos de autenticación y rechaza URL de salida hacia direcciones internas» | Riesgos medidos en SCRUM-52 sin requisito que los cubra |

Además, se propone que el plan maestro de pruebas cite el requisito que valida cada umbral en su matriz de trazabilidad (`docs/plan-maestro-pruebas.md` §19), para que los dos documentos no vuelvan a divergir.

---

## 5. Vínculo con el plan de refactorización

Elementos del plan (`docs/plan-refactorizacion.md`) que mejoran el cumplimiento de algún requisito:

| Requisito | Elemento del plan | Efecto esperado |
|---|---|---|
| RNF-13.3, 3.2 | DT-22 (búsqueda del POS por código en el servidor), DT-10 (endpoint agregado del dashboard) | Quita el cuello de botella medido en volumen y en C2/C5 |
| RNF-3.1 | DT-23 (listado de reportes filtrado por empresa y paginado) | Mantiene el listado bajo umbral con más volumen |
| RNF-3.3, 5.3 | DT-17 (bundle de entrada) | Medida objetiva para un requisito hoy sin métrica |
| RNF-6.2 | DT-15 (verificación del certificado de la base de datos), DT-19 (cabeceras en el HTML) | Cierra las dos salvedades de §3.1 |
| RNF-6.3 | DT-18 (caminos de SSRF abiertos), DT-20 (validación de entradas) | Refuerza las restricciones verificadas por ZAP |
| RNF-9.1, 9.3 | DT-21 (disco, logs, Mongo separado, despliegue del ambiente de pruebas) | Reduce los incidentes observados el 26/09 |
| RNF-14.1 | DT-16 (vistas temporales del agente) | Aislamiento del agente dentro de la arquitectura actual |
| RNF-1.1, 1.3 | DT-09 (contraste y tema claro) | Contraste verificable en la interfaz |

---

## 6. Verificación del criterio de aceptación

| Requisito del ticket, Parte 1 | Estado |
|---|---|
| Listar los requisitos no funcionales del diseño original | Cumplido: 42 requisitos transcritos en la sección 2, con los ambiguos marcados sin modificarlos |
| Contrastarlos contra todas las pruebas no funcionales ejecutadas: k6 (SCRUM-28), ZAP (SCRUM-52) y volumen e inundación (SCRUM-53) | Cumplido en la sección 3, que añade usabilidad y autorización. Las pruebas de inundación de SCRUM-53 no se ejecutaron; se declaran como faltantes en §4.1 |
| Pregunta a: qué pruebas faltarían | Respondida en §4.1 |
| Pregunta b: qué tanto se han cumplido | Respondida en §4.2 |
| Pregunta c: si los requisitos fueron bien diseñados | Respondida en §4.3 |
| Pregunta d: qué cambios se harían | Respondida en §4.4 |
