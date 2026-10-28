# Aviso de uso del asistente de inteligencia artificial

**Versión 1.0 · 26 de octubre de 2026 · tarea L-5.** Se publica resumido en `/legal#ai` (textos `legal.ai` de `frontend/src/locales`) y se enlaza desde la pantalla del asistente (`/agent`). Sigue la misma reserva que el resto del expediente: requiere revisión profesional antes de uso comercial ([README](README.md)).

Este documento tiene dos partes: el **aviso**, escrito para quien usa Kontrol, y la **verificación**, que dice de qué línea de código sale cada afirmación. Si cambia el código del asistente, cambia la verificación y, si hace falta, el aviso.

## Parte 1 · El aviso

### En pocas palabras

- Kontrol tiene un **asistente automatizado** (Kontrol AI) en la sección **Asistente IA**. Responde preguntas sobre tu negocio consultando tus datos.
- **Puede equivocarse.** No tomes decisiones de dinero, impuestos o inventario solo con lo que te diga: revisa los números en el módulo correspondiente.
- Para responder, envía tu pregunta y parte de tus datos a un **modelo de lenguaje que funciona en un servidor del equipo de Kontrol, en Guatemala**. No es un servicio de terceros como ChatGPT o Gemini.
- Lo que envías **no se usa para entrenar modelos** y el servidor del modelo **no lo guarda**.
- Tus conversaciones sí se guardan en Kontrol para que puedas volver a verlas. Puedes borrarlas cuando quieras.

### 1. Qué es

Un asistente que responde en lenguaje natural preguntas como «¿cómo va el presupuesto del proyecto X?» o «¿qué productos tienen stock bajo?». Funciona **solo en lectura**: puede consultar tus datos, pero no puede crear, modificar ni borrar nada, ni enviar mensajes o correos en tu nombre.

La burbuja de ayuda que aparece en las pantallas (Birdie) **no es este asistente**: muestra respuestas ya escritas y no envía nada a ningún modelo.

### 2. Qué puede ver de tu negocio

Solo lo de la **empresa en la que estás trabajando** y con **tus mismos permisos**:

- Si eres owner, administrador o manager de la empresa, todos sus proyectos. Si no, solo los proyectos a los que estás asignado.
- De esos proyectos: datos del proyecto, tareas y asignaciones, presupuesto y ajustes, avances, reportes, evidencias (descripción, enlace del archivo y, si se registró, ubicación), productos, movimientos de inventario y los proveedores relacionados, con sus datos de contacto.
- De las personas: nombre, correo y teléfono tuyos y de quienes trabajan en esos proyectos. Nunca contraseñas ni datos de inicio de sesión.

No ve otras empresas, aunque pertenezcas a ellas, ni los chats entre personas, ni tus integraciones (Slack, Teams, Telegram, etc.).

### 3. Qué sale hacia el modelo

Cuando la pregunta necesita al modelo, Kontrol le envía:

- Tu pregunta y hasta **diez mensajes anteriores** de la conversación.
- Quién eres: tu correo, tu identificador y tu rol, y el nombre y tu rol en la empresa.
- Qué proyectos puedes ver y la estructura de las tablas (nombres de columnas, no datos).
- **Datos reales de tu negocio**: el modelo pide consultas y Kontrol le devuelve hasta **20 filas** de cada resultado, con un máximo de **cinco consultas** por pregunta. Esas filas pueden incluir importes, nombres de productos, proveedores y sus contactos, o personas del equipo.

Algunas preguntas **no salen de Kontrol**: los saludos, «¿qué puedes hacer?» y cuatro consultas frecuentes (presupuesto de un proyecto, estado de los proyectos, productos con stock bajo y tareas atrasadas) se responden con reglas propias, sin llamar al modelo.

### 4. Quién lo procesa y dónde

El modelo es **Qwen** (Alibaba, pesos abiertos), ejecutado con **vLLM** en **ClawStitch**, un servidor **propio del equipo de Kontrol, ubicado en Guatemala**. No es un tercero: los datos no pasan a OpenAI, Google, Anthropic ni a otro proveedor de inteligencia artificial.

### 5. Entrenamiento y conservación en el modelo

- **No se usa para entrenar.** Lo que envías no se usa para entrenar ni mejorar ningún modelo, ni de Kontrol ni de otros.
- **El servidor del modelo no guarda lo que recibe.** Procesa la petición, devuelve la respuesta y no conserva preguntas, datos ni respuestas.

Al ser un servidor propio, no hay términos de un proveedor externo que enlazar: esta es la postura del equipo que lo opera.

### 6. Qué guarda Kontrol y por cuánto tiempo

- **Tus conversaciones:** cada pregunta, cada respuesta y la consulta que se hizo para responder (el texto de la consulta y cuántas filas devolvió, no las filas). Sirven para mostrarte tu historial. Solo tú puedes verlas. No hay un plazo de borrado automático: se guardan hasta que las borras.
- **Errores técnicos:** si el asistente falla, el servidor de Kontrol registra el error para poder corregirlo. Ese registro puede incluir un fragmento de la respuesta del modelo.

Puedes borrar un mensaje o una conversación entera desde el propio asistente, y al dar de baja tu cuenta se borra todo tu historial del asistente.

### 7. Las respuestas pueden ser incorrectas

**Lo más importante de este aviso.** El asistente lee tus datos y redacta una respuesta, pero **puede equivocarse**: puede entender mal la pregunta, consultar los datos equivocados, sumar mal, dejar fuera información o sonar muy seguro de algo que no es cierto.

Por eso:

- **No uses sus respuestas como única base para decisiones financieras, fiscales o de inventario**, como cuánto gastar, qué declarar o cuánto comprar.
- **Comprueba las cifras** en los módulos de Presupuesto, Inventario, Ventas o Reportes antes de actuar.
- Sus opiniones o recomendaciones son sugerencias, no asesoría contable, tributaria ni legal.

### 8. Si no quieres que tus datos pasen por el asistente

El asistente **no se puede desactivar** desde la configuración, pero **solo funciona cuando tú le escribes**: si no abres la sección Asistente IA y no le preguntas nada, no se envía nada al modelo. Kontrol no lo usa por su cuenta ni en segundo plano.

Si ya lo usaste y quieres borrar lo que quedó, elimina las conversaciones desde el asistente. Para cualquier duda o solicitud sobre tus datos, escribe a `support@kontrol.it.com`.

## Parte 2 · Cómo se verificó

Criterio de aceptación de L-5: cada afirmación sobre qué sale del sistema, verificada contra el código. Referencias a la rama `feat/ai-assistant-notice` (base `develop` en `cf5cf8c`).

| Afirmación del aviso | Dónde se comprueba |
| --- | --- |
| Solo lectura; no crea, modifica ni borra | `backend/src/services/agentSql.js`: `validateReadOnlySql` solo admite `SELECT`/`WITH` y rechaza palabras de escritura; las consultas corren con el rol `kontrol_agent`, sin privilegios sobre las tablas, y `statement_timeout` de 8 s. |
| Birdie no es el asistente | `frontend/src/components/birdie/BirdieAssistant.vue` no importa ningún servicio de red: sus respuestas son textos `birdie.faqs.*` de los diccionarios. |
| Solo la empresa actual y con tus permisos | `buildEmpresaAccessContext` en `backend/src/services/projectAccessService.js`: owner, admin y manager (`EMPRESA_MANAGEMENT_ROLES`) reciben todos los proyectos de la empresa; el resto, solo sus asignaciones. `setupAgentScope` en `agentSql.js` crea las 24 vistas temporales filtradas por `id_empresa` y esos proyectos; el inventario, por `inventory_project_ids`. |
| Qué tablas ve | Lista `AGENT_TEMP_VIEW_NAMES` de `agentSql.js`: incluye `evidencia` (URL, latitud, longitud), `proveedor` (contacto, teléfono, correo) y `usuario`. |
| Nunca contraseñas ni datos de inicio de sesión | La vista `usuario` de `agentSql.js` lista columnas explícitas sin `password_hash`, `google_id` ni `token_version`; prueba en `backend/tests/agentSql.test.js`. |
| No ve chats humanos ni integraciones | Las colecciones Mongo de chat y las tablas de integraciones no están en `AGENT_TEMP_VIEW_NAMES`; el rol `kontrol_agent` no tiene acceso a las tablas reales. |
| Pregunta e historial de hasta diez mensajes | `frontend/src/views/AgentView.vue` envía los últimos `CLIENT_HISTORY_LIMIT = 10`; `sanitizeHistory` en `backend/src/services/aiAgentService.js` vuelve a recortar a 10 y corta los mensajes del usuario a 3,000 caracteres. |
| Correo, identificador, rol, empresa | `buildSystemPrompt` en `backend/src/services/agentContext.js` (bloques `CURRENT USER`, `CURRENT COMPANY`). |
| Proyectos visibles y estructura de tablas, no datos | Mismo `buildSystemPrompt`: `ACCESS SCOPE` con los ID de proyecto y `SCHEMA_REFERENCE`, que solo describe columnas. |
| Hasta 20 filas por consulta y cinco consultas | `QUERY_RESULT_SAMPLE_ROWS = 20` y `summarizeQueryResult` en `aiAgentService.js`; `DEFAULT_MAX_STEPS = 5` (configurable con `AGENT_MAX_STEPS`). |
| Saludos, ayuda y cuatro consultas frecuentes sin modelo | `buildInstantReply` y `detectBuiltinDataIntent` en `aiAgentService.js`: `runAgentTurn` las resuelve antes de llamar a `callLlm`. Las cuatro intenciones son `budget_summary`, `project_status_summary`, `low_stock_summary` y `overdue_tasks_summary`. |
| Qwen con vLLM en ClawStitch | `DEFAULT_API_URL = 'https://model.clawstitch.com/v1'` y `DEFAULT_MODEL = 'Qwen/Qwen3.6-27B-FP8'` en `aiAgentService.js`; `callLlm` usa el formato `chat/completions` y `chat_template_kwargs`, propio de vLLM. |
| Servidor propio en Guatemala; no entrena ni guarda | **Declaración del equipo**, no código: servidor en Guatemala desde el 16-10-2026 ([README](README.md)); sin registro de peticiones ni uso para entrenamiento confirmado el 26-10-2026. No se ha hecho una auditoría independiente del servidor. |
| Qué guarda Kontrol | `backend/src/services/agentPersistence.js` y `backend/src/models/AgentMessage.js`: `content`, `role` y `queries` (`sql`, `rowCount`, `error`, `rationale`); no se guarda un arreglo con las filas. Sin índice TTL. Lectura restringida al dueño en `loadOwnedConversation` de `agentController.js`. |
| Errores con fragmento de la respuesta | `callLlm` incluye hasta 500 caracteres del cuerpo de error del modelo; `agentController.chat` lo pasa a `logger.error` y al cliente solo devuelve un mensaje genérico. |
| Borrar mensajes, conversaciones y al dar de baja | `deleteMessage` y `deleteConversation` en `agentController.js`; `backend/src/services/mongoAccountCleanup.js` borra `AgentMessage` y `AgentConversation` del usuario en la baja. |
| No se puede desactivar; solo actúa si le escribes | No hay ajuste para apagarlo. La única llamada al modelo es `POST /api/agent/chat`, que se dispara al enviar un mensaje en `AgentView.vue`; ninguna tarea programada ni otra ruta llama a `runAgentTurn`. |

### Coherencia con el resto del expediente

- **L-1, Términos §8 y §9 en la app:** «puede contener errores» y «no usamos tu información para entrenar modelos» coinciden con las secciones 5 y 7 de este aviso.
- **L-2, Aviso de Privacidad §4 en la app y [Política de Privacidad §5](politica-privacidad.md#5-qué-información-llega-al-asistente-ia):** mismo flujo de datos. Esta entrega actualiza ambos con la confirmación del equipo sobre registros y entrenamiento.
- **L-4, adenda de tratamiento (en curso):** debe declarar la misma postura de no entrenamiento.

### Pendiente

- Auditoría independiente del servidor de inferencia (hosting, accesos, registros). Hasta entonces, la sección 5 descansa en la declaración del equipo (bloqueo O10 del [README](README.md)).
- Plazo de conservación del historial del asistente: hoy no hay borrado automático.
