# Inventario técnico de datos de Kontrol

Fecha de consulta y corte: 2026-10-16, America/Guatemala. Estado: investigación cerrada con evidencia estática suficiente para el alcance solicitado; [inventario completo persistido](../../docs/legal/inventario-datos.md). Investigación exclusivamente estática, sin conexión a bases de datos ni pruebas contra producción. No se modificaron aplicación ni git. Se leyó primero `deep-research/references/researcher.md`; no se encontraron AGENTS.md aplicables en los directorios ascendentes ni en el árbol propio revisado. Las fuentes citadas son código local primario; no se investigaron proveedores en la web para no duplicar esa tarea.

## ¿Qué datos cubre el esquema comprobado?

### Takeaway

El cruce de declaraciones CREATE TABLE y ALTER TABLE identifica 38 tablas persistentes y 278 columnas distintas. El entregable enumera además los cuatro modelos Mongo mediante 56 rutas de campo/implícitos. Es cobertura del código disponible, no certificación del esquema instalado. — [mapa completo](../../docs/legal/inventario-datos.md).

Validación documental final completada: 278 filas PostgreSQL únicas, 38 tablas y 56 rutas Mongo; enlaces locales y anclas dentro de sus archivos; tablas Markdown con columnas consistentes. Se retiró la comprobación sensible indicada por el usuario y no quedan enlaces a archivos de configuración secretos. No se ejecutaron pruebas de aplicación, migraciones ni conexiones externas durante esa validación.

### Cited Findings

- `backend/kontrol.sql` declara 33 tablas y 239 columnas, contando `proyecto.id_equipo` añadido por ALTER. Bootstrap declara o altera 22 tablas y aporta 39 columnas adicionales respecto del SQL; total conjunto 38 tablas/278 columnas. Se extrajeron nombres sin ejecutar el DDL. — [SQL base](../../backend/kontrol.sql#L2); [bootstrap](../../backend/src/db/bootstrap.js#L5).
- Tablas solo en bootstrap: `proyecto_invitacion`, `proyecto_invitacion_permiso`, `project_progress_entry`, `integracion`, `integracion_log`. `evidencia.public_id` e `evidencia.id_progress_entry` también se añaden allí. — [invitaciones](../../backend/src/db/bootstrap.js#L39); [avances](../../backend/src/db/bootstrap.js#L82); [integraciones](../../backend/src/db/bootstrap.js#L110); [evidencia](../../backend/src/db/bootstrap.js#L783).
- Hay cuatro modelos Mongo: Conversation, Message, AgentConversation y AgentMessage. Guardan participantes, nombres/correos, mensajes, adjuntos, lecturas, historial IA y trazas SQL. No se observa índice TTL en estos modelos. — [Conversation](../../backend/src/models/Conversation.js#L1); [Message](../../backend/src/models/Message.js#L1); [AgentConversation](../../backend/src/models/AgentConversation.js#L1); [AgentMessage](../../backend/src/models/AgentMessage.js#L1).
- Hay DDL dinámico de vistas temporales para el agente y tablas temporales de pruebas de volumen; no son tablas persistentes adicionales del producto. — [vistas IA](../../backend/src/services/agentSql.js#L69); [temporales de volumen](../../volume/sql/populate.sql#L77).

### Inferences

- Los textos libres y archivos pueden contener datos de clientes, trabajadores o proveedores aunque no haya tablas dedicadas a clientes o empleados; por ello no deben excluirse por ser datos comerciales. — [motivo de venta](../../backend/kontrol.sql#L263); [evidencia](../../backend/kontrol.sql#L341); [contenido de marketing](../../backend/kontrol.sql#L564).

### Gaps

- Mapa TABLA.COLUMNA terminado en el [anexo](../../docs/legal/inventario-datos.md); el usuario comunicó contraste independiente coincidente de 278 campos, incluyendo TIMESTAMPTZ. No se conocen filas reales, catálogos instalados, validación efectiva de constraints, índices reales ni drift de producción. — [bootstrap idempotente y migraciones](../../backend/src/db/bootstrap.js#L670).

## ¿Cómo persisten, salen y se borran los datos?

### Takeaway

Se observan persistencia sin caducidad programada y borrados parciales. Hay exportaciones de reportes y borrado de conversaciones IA; estas funciones no equivalen a exportación/supresión integral de datos personales.

### Cited Findings

- `deleteUser` desactiva la cuenta con `activo=false`; no suprime sus datos. Las invitaciones se desactivan y conservan fechas. — [usuario](../../backend/src/controllers/userController.js#L214); [invitación empresa](../../backend/src/services/companyInvitationService.js#L123); [invitación proyecto](../../backend/src/services/projectInvitationService.js#L193).
- El borrado de evidencia elimina primero la fila SQL y luego intenta borrar el objeto UploadThing; un fallo externo se registra y no impide devolver éxito. — [borrado de evidencia](../../backend/src/controllers/evidenciaController.js#L29).
- Las descargas PDF/CSV se construyen en el navegador y dejan una fila de reporte; el historial IA admite borrado explícito. — [exportación de reportes](../../backend/src/controllers/reportsController.js#L84); [exportador](../../frontend/src/utils/reportExport.js#L98); [borrado IA](../../backend/src/controllers/agentController.js#L258).
- `password_hash` usa bcrypt, que es hash, no cifrado reversible. `integracion.credentials_enc` usa AES-256-GCM; `config` y logs no reciben ese cifrado de campo. El cifrado del disco/host no se comprobó. — [autenticación](../../backend/src/controllers/authController.js#L16); [cifrado integración](../../backend/src/services/integrationService.js#L1); [almacenamiento integración](../../backend/src/db/bootstrap.js#L110).
- La IA envía contexto de usuario/negocio, historial y muestras de resultados SQL al endpoint configurable, por defecto ClawStitch. El código limita a diez mensajes de historial y veinte filas de muestra por resultado; esos límites no son retención de Mongo ni del servidor de inferencia. — [configuración y límites](../../backend/src/services/aiAgentService.js#L12); [petición al modelo](../../backend/src/services/aiAgentService.js#L818); [prompt](../../backend/src/services/agentContext.js#L185).
- Actualización directa del usuario/equipo, 2026-10-16: **“ClawStitch servidor IA está en GUATEMALA”**. País del servidor IA: **Guatemala, declarado por el equipo, sin verificación independiente de infraestructura**. Proveedor de hosting no identificado; prestadores y contacto pendientes. La fuente primaria es el mensaje directo de esta conversación, sin URL pública; queda preservado en la [declaración del inventario](../../docs/legal/inventario-datos.md#declaración-directa-del-equipo-sobre-ia). Esta declaración no confirma ubicaciones de copias, tránsito o soporte, ni accesos, logs, retención o subproveedores. Los países de los demás destinos siguen desconocidos.
- Notificaciones opcionales configurables: Slack, Teams, Telegram, Twilio SMS, SendGrid y webhook. WhatsApp tiene un servicio separado sin llamada/importación observada en el catálogo/controlador/dispatcher. — [catálogo](../../backend/src/services/integrationService.js#L56); [dispatcher](../../backend/src/services/notificationService.js#L15); [controlador](../../backend/src/controllers/integrationController.js#L1); [servicio WhatsApp](../../backend/src/services/whatsappService.js#L1).
- Slack: prueba POST JSON `{text}` a webhook_url; channel solo aparece en el texto de prueba. Envío del servicio `{text,blocks}`; dispatcher pasa solo text=message y blocks undefined se omite. No se envía campo channel en la notificación normal. — [Slack](../../backend/src/services/slackService.js#L4); [despacho](../../backend/src/services/notificationService.js#L80).
- Teams: POST a webhook_url con `type:message`, attachments de contentType `application/vnd.microsoft.card.adaptive` y content AdaptiveCard versión 1.4. Notificación con título usa dos TextBlock (título con weight Bolder/size Medium y cuerpo con wrap true); sin título usa `{type:message,text}`. — [Teams prueba](../../backend/src/services/teamsService.js#L4); [Teams envío](../../backend/src/services/teamsService.js#L38).
- Webhook: POST `{event,source:kontrol,timestamp:ISO,data}`. En despacho, data contiene `{title,text,...data_del_evento}`; prueba usa event=test y data.message. Si hay secret se envía X-Kontrol-Signature con HMAC-SHA256 del JSON; no secret en el cuerpo. URL puede ser HTTP o HTTPS aceptada por el esquema, sin garantía universal de TLS. — [Webhook](../../backend/src/services/webhookService.js#L5); [esquema](../../backend/src/schemas/integrationSchemas.js#L14).
- Se enumeran las claves exactas de las seis integraciones y los campos de cada solicitud en §5 del anexo. credentials_enc usa AES, pero config admite JSON arbitrario sin ese cifrado de campo. La máscara devuelve cadenas cortas sin ocultar y conserva extremos en otras: no equivale a anonimización. — [anexo de flujos](../../docs/legal/inventario-datos.md); [cifrado/máscara/catálogo](../../backend/src/services/integrationService.js#L1); [esquema abierto](../../backend/src/schemas/integrationSchemas.js#L29).
- UploadThing recibe metadata `{userId}` para chat y `{userId,taskId,progressEntryId,descripcion}` para evidencia; el SDK local registra `{fileKeys,metadata,isDev,callbackUrl,callbackSlug,awaitServerData}` y devuelve callback-result `{fileKey,callbackData}`. Se incluyeron también archivo completo, descriptores, URLs firmadas y respuesta de callbacks; región/retención siguen sin comprobar. — [rutas propias](../../backend/src/uploadthing.js#L25); [SDK metadata](../../node_modules/uploadthing/dist/upload-builder-BlFOAnsv.js#L576); [SDK callback](../../node_modules/uploadthing/dist/upload-builder-BlFOAnsv.js#L440).
- Caché de presupuesto: TTL lógico de 30s, máximo 500 entradas, limpieza al acceder/invalidate/desalojar; no prueba eliminación física exacta a 30s. Rate-limit guarda claves IP/usuario/email en memoria. — [caché](../../backend/src/utils/budgetSummaryCache.js#L3); [rate-limit](../../backend/src/middleware/rateLimit.js#L59).
- El frontend incluye Google Fonts, imagen de Icons8, STUN Google por defecto, localStorage de autenticación/preferencias y archivos vía UploadThing. No se comprobó el comportamiento de cookies de terceros ni tráfico real. — [HTML](../../frontend/index.html#L10); [Icons8](../../frontend/src/views/LoginView.vue#L93); [STUN](../../frontend/src/stores/chat.js#L33); [localStorage](../../frontend/src/stores/auth.js#L5); [subidas](../../backend/src/uploadthing.js#L25).
- No hay política de rotación/retención de logs en los Compose revisados; nginx no define allí formato/retención propios y Caddy no contiene directiva access log. No demuestra ausencia de logs o respaldos del host/proveedor. CI configura 30 días para determinados artefactos, sin extender esa cifra a logs generales. — [Compose producción](../../docker-compose.prod.yml#L1); [nginx](../../frontend/nginx.conf.template#L1); [Caddy](../../Caddyfile#L1); [artefactos CI](../../.github/workflows/ci.yml#L41).

### Inferences

- Desactivar usuario, borrar fila SQL, revocar acceso o desconectar integración no demuestra eliminación de copias en Mongo, navegador, adjuntos, destinatarios, logs o respaldos. — [soft delete](../../backend/src/controllers/userController.js#L214); [desconexión](../../backend/src/controllers/integrationController.js#L163); [modelos Mongo](../../backend/src/models/Message.js#L15).

### Gaps

- Flujos, Mongo, storage y logs quedaron consolidados en §§4–7 del [inventario](../../docs/legal/inventario-datos.md). **Guatemala es el país declarado por el equipo para el servidor IA el 2026-10-16; su infraestructura no se verificó.** Proveedor de hosting no identificado; los países de los demás destinos y ubicaciones de copias, tránsito y soporte de IA siguen desconocidos. Regiones de bases/objetos, retención de terceros y configuración efectiva de logs/respaldos siguen sin comprobar. Las capturas/documentos binarios de evidencias se identifican como soportes potenciales; no se certifica revisión exhaustiva de su contenido ni anonimización. — [declaración directa del equipo](../../docs/legal/inventario-datos.md#declaración-directa-del-equipo-sobre-ia); [destinos configurables](../../docker-compose.prod.yml#L26); [endpoint IA](../../backend/src/services/aiAgentService.js#L12); [generadores de evidencia](../../zap/run-zap.sh#L28).
- P-1, P-2 y P-3 están declarados pendientes sin fecha; no se observó un circuito integral de derechos, respaldo/restauración ni gestión de brechas en el código revisado. Hay funciones parciales que deben conservarse en la descripción. Stripe solo está previsto como demostración TEST, sin integración comprobada ni cobros reales; es contexto confirmado del encargo. — [decisiones del expediente](../../docs/legal/README.md); [rutas montadas](../../backend/src/router.js#L1).

## ¿Qué límites impiden asegurar aislamiento o eliminación completa?

### Takeaway

Hay defectos estáticos suficientes para impedir una afirmación general de aislamiento. Se documentan únicamente sus implicaciones para este inventario; no se explota ni corrige la aplicación.

### Cited Findings

- Las rutas de tareas solo montan `requireAuth`; los controladores consultan el proyecto suministrado sin comprobar pertenencia a empresa/proyecto. La evidencia consulta por tarea y borra por evidencia/tarea sin ese control. UploadThing verifica firma JWT y existencia de tarea, sin comprobar pertenencia. — [rutas de tareas](../../backend/src/routes/taskRoutes.js#L23); [tareas](../../backend/src/controllers/taskController.js#L17); [evidencia](../../backend/src/controllers/evidenciaController.js#L13); [subida](../../backend/src/uploadthing.js#L88).
- `/api/users` admite roles globales admin/super_user y el controlador lista usuarios sin filtro de empresa. No se debe describir a todo admin como limitado automáticamente a su empresa. — [rutas de usuarios](../../backend/src/routes/userRoutes.js#L23); [consulta](../../backend/src/controllers/userController.js#L24).
- El acceso a una conversación o mensaje IA existente verifica propietario, pero no contrasta `empresaId` con la empresa actual; el listado sí usa ambos campos. — [carga por propietario](../../backend/src/controllers/agentController.js#L26); [listado](../../backend/src/controllers/agentController.js#L220).
- `requireAuth` comprueba firma/caducidad JWT; no consulta `usuario.activo` ni contrasta `token_version`. No se puede afirmar revocación inmediata por baja o que un token dure hasta el siguiente deploy. — [middleware](../../backend/src/middleware/requireAuth.js#L12); [emisión](../../backend/src/controllers/authController.js#L19).
- El callback OAuth pasa el JWT en la URL; `errorHandler` registra `req.originalUrl`, y el fallo del intercambio OAuth puede registrar el objeto de respuesta. Es riesgo de copia de datos/tokens, no prueba de que logs reales contengan un JWT concreto. — [redirección](../../backend/src/controllers/authController.js#L96); [errorHandler](../../backend/src/middleware/errorHandler.js#L35); [fallo OAuth](../../backend/src/controllers/authController.js#L269).
- SQL/migraciones no garantizan eliminación en cascada universal: hay CASCADE, SET NULL, RESTRICT y otras FKs sin ON DELETE explícito. Bootstrap puede dejar proveedor.id_empresa nullable y FKs heredadas NOT VALID; debe comprobarse drift antes de afirmar integridad de todas las filas existentes. — [proveedor](../../backend/src/db/bootstrap.js#L246); [marketing heredado](../../backend/src/db/bootstrap.js#L735); [mapa de efectos](../../docs/legal/inventario-datos.md).

### Inferences

- La documentación debe decir que existen controles y excepciones identificadas, sin prometer confidencialidad entre empresas o supresión integral como hechos consumados. — [controles de empresa](../../backend/src/middleware/requireCompany.js#L1); [excepción de tareas](../../backend/src/routes/taskRoutes.js#L23).

### Gaps

- No se accedió al entorno productivo para este inventario, ni se hicieron pruebas dinámicas de explotación, revisión integral de seguridad o confirmación de despliegue. La comprobación estática no permite afirmar país por IP, ausencia absoluta de cookies/backups, tiempos efectivos de logs ni cumplimiento normativo. La investigación se cierra sin ampliar seguridad o proveedores; las comprobaciones de entorno pendientes no son promesas de implementación. — [configuración declarada](../../docker-compose.prod.yml#L1); [fuentes de navegador](../../frontend/index.html#L10); [estado de cierre](../../docs/legal/inventario-datos.md).
